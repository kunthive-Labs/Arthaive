/**
 * POST /api/chat — BYOK streaming chat assistant.
 *
 * The user supplies their own Groq API key via the `x-groq-api-key` header;
 * we forward it to Groq for this request only — it is never persisted or
 * logged. Responses stream as SSE `data: <JSON>` events (text deltas, tool
 * activity, widget suggestions, error/done markers) per the chat wire
 * protocol. Errors BEFORE the stream starts (auth, rate limit, validation)
 * return plain JSON with a proper status; everything after streams as events.
 *
 * The org's Anthropic budget is untouched: the user pays Groq directly, so we
 * log usage for observability only (use_case 'chat_byok', $0 cost) and never
 * call assertWithinBudget.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUser } from "@/lib/supabase/session"
import { consumeAsync, RATE_TIERS } from "@/lib/rate-limit"
import {
  DEFAULT_GROQ_MODEL,
  GROQ_MODELS,
  isGroqApiError,
  mergeToolCallDeltas,
  streamChatCompletion,
  type AccumulatedToolCall,
  type GroqChatMessage,
} from "@/lib/ai/groq"
import {
  CHAT_TOOL_DEFINITIONS,
  executeTool,
  isDataToolName,
  suggestWidgetSchema,
  widgetDefaultSize,
} from "@/lib/ai/chat-tools"
import { logUsage } from "@/lib/ai/usage-logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BODY_BYTES = 100_000
const MAX_HISTORY_MESSAGES = 20
const MAX_MESSAGE_CHARS = 8_000
const MAX_DASHBOARD_CONTEXT_CHARS = 6_000
const MAX_TOOL_ROUNDS = 5

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(MAX_MESSAGE_CHARS),
      }),
    )
    .min(1),
  model: z.enum(GROQ_MODELS).optional(),
  dashboardContext: z.string().optional(),
})

function buildSystemPrompt(dashboardContext?: string): string {
  let prompt = `You are the AI analyst embedded in Arthaive, an Indian startup funding intelligence platform tracking roughly 13,700 funding deals from 2015 to 2026. Each deal records: company, amount (in USD and INR), stage, sectors, investors, lead investor, date, and location (city).

Rules:
- ALWAYS answer factual or numeric questions about deals by calling the query_deals or aggregate_deals tools. NEVER guess, estimate, or invent figures from memory.
- Use aggregate_deals for totals, rankings, comparisons, and trends; use query_deals for specific companies or lists of individual deals.
- Tool amounts are in millions of USD; null means the round size was undisclosed. Present amounts to the user in USD (e.g. "$12.5M").
- When the user asks to visualize, chart, plot, or track something on their dashboard, call suggest_widget with an appropriate widget type and filters.
- Keep answers concise and grounded in the tool results. If a tool returns no matches, say so instead of speculating.`

  if (dashboardContext) {
    prompt += `\n\nThe user is currently viewing this dashboard:\n${dashboardContext.slice(0, MAX_DASHBOARD_CONTEXT_CHARS)}`
  }
  return prompt
}

function friendlyErrorMessage(err: unknown): string {
  if (isGroqApiError(err)) {
    if (err.kind === "invalid_key") {
      return "Your Groq API key was rejected. Please check the key and try again."
    }
    if (err.kind === "rate_limited") {
      return "Groq's rate limit was reached for your key. Please wait a moment and try again."
    }
  }
  return "Something went wrong while generating a response. Please try again."
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError"
}

type SseEvent = Record<string, unknown>

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tier = RATE_TIERS.authenticated
  const limit = await consumeAsync(`chat:user:${user.id}`, tier.max, tier.windowMs)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(0, Math.ceil((limit.resetAt - Date.now()) / 1000))),
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": String(limit.remaining),
        },
      },
    )
  }

  const apiKey = req.headers.get("x-groq-api-key")?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: "x-groq-api-key header required" }, { status: 400 })
  }

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return NextResponse.json({ error: "Unable to read request body" }, { status: 400 })
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body too large (max 100KB)" }, { status: 400 })
  }

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return NextResponse.json(
      { error: `Invalid request: ${issue.path.join(".") || "body"} ${issue.message}` },
      { status: 400 },
    )
  }

  const model = parsed.data.model ?? DEFAULT_GROQ_MODEL
  const history = parsed.data.messages.slice(-MAX_HISTORY_MESSAGES)
  const systemPrompt = buildSystemPrompt(parsed.data.dashboardContext)

  // Abort the upstream Groq request the moment the client disconnects.
  const upstreamAbort = new AbortController()
  if (req.signal.aborted) upstreamAbort.abort()
  else req.signal.addEventListener("abort", () => upstreamAbort.abort())

  const encoder = new TextEncoder()
  let inputTokens = 0
  let outputTokens = 0

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let clientGone = false
      const send = (event: SseEvent) => {
        if (clientGone) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          // Controller already closed/errored (client disconnected).
          clientGone = true
        }
      }

      const convo: GroqChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...history.map(
          (m): GroqChatMessage =>
            m.role === "user"
              ? { role: "user", content: m.content }
              : { role: "assistant", content: m.content },
        ),
      ]

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          // On the final round, withhold tools so the model must answer in text.
          const isLastRound = round === MAX_TOOL_ROUNDS - 1
          const toolCalls: AccumulatedToolCall[] = []
          let assistantText = ""
          let finishReason: string | undefined

          for await (const chunk of streamChatCompletion({
            apiKey,
            model,
            messages: convo,
            tools: isLastRound ? undefined : CHAT_TOOL_DEFINITIONS,
            signal: upstreamAbort.signal,
          })) {
            if (chunk.textDelta) {
              assistantText += chunk.textDelta
              send({ type: "text", delta: chunk.textDelta })
            }
            if (chunk.toolCallDeltas) mergeToolCallDeltas(toolCalls, chunk.toolCallDeltas)
            if (chunk.finishReason) finishReason = chunk.finishReason
            if (chunk.usage) {
              inputTokens += chunk.usage.promptTokens
              outputTokens += chunk.usage.completionTokens
            }
          }

          const calls = toolCalls.filter((c) => c && c.id && c.name)
          if (finishReason !== "tool_calls" || calls.length === 0) break

          convo.push({
            role: "assistant",
            content: assistantText || null,
            tool_calls: calls.map((c) => ({
              id: c.id,
              type: "function",
              function: { name: c.name, arguments: c.arguments || "{}" },
            })),
          })

          for (const call of calls) {
            let args: Record<string, unknown> = {}
            try {
              const parsedArgs: unknown = JSON.parse(call.arguments || "{}")
              if (parsedArgs && typeof parsedArgs === "object" && !Array.isArray(parsedArgs)) {
                args = parsedArgs as Record<string, unknown>
              }
            } catch {
              // Malformed arguments JSON — execute with {} so validation reports it.
            }

            send({ type: "tool_start", name: call.name, args })

            let content: string
            let summary: string
            if (call.name === "suggest_widget") {
              const widget = suggestWidgetSchema.safeParse(args)
              if (widget.success) {
                send({
                  type: "widget_suggestion",
                  widget: {
                    type: widget.data.type,
                    title: widget.data.title,
                    config: widget.data.config ?? {},
                    size: widgetDefaultSize(widget.data.type),
                  },
                })
                content = "Widget suggestion shown to the user."
                summary = `Suggested "${widget.data.title}" widget.`
              } else {
                const issue = widget.error.issues[0]
                content = `Invalid suggest_widget arguments: ${issue.path.join(".") || "(root)"} ${issue.message}`
                summary = "Widget suggestion rejected (invalid arguments)."
              }
            } else if (isDataToolName(call.name)) {
              try {
                const result = await executeTool(call.name, args)
                content = result.content
                summary = result.summary
              } catch (err) {
                console.error(`[/api/chat] ${call.name} failed:`, err)
                content = JSON.stringify({ error: "Tool execution failed. Try different filters." })
                summary = `${call.name} failed.`
              }
            } else {
              content = JSON.stringify({ error: `Unknown tool: ${call.name}` })
              summary = `Ignored unknown tool "${call.name}".`
            }

            send({ type: "tool_result", name: call.name, summary })
            convo.push({ role: "tool", tool_call_id: call.id, content })
          }
        }

        send({ type: "done" })
      } catch (err) {
        if (!isAbortError(err) && !upstreamAbort.signal.aborted) {
          // Never log the error with the key in scope of interpolation; the
          // Groq client guarantees its errors carry only the status class.
          console.error("[/api/chat] stream error:", isGroqApiError(err) ? err.message : err)
          send({ type: "error", message: friendlyErrorMessage(err) })
          send({ type: "done" })
        }
      } finally {
        // Best-effort observability. BYOK runs cost the org $0 (the user pays
        // Groq), so this never touches assertWithinBudget.
        if (inputTokens > 0 || outputTokens > 0) {
          try {
            await logUsage({ useCase: "chat_byok", model, inputTokens, outputTokens })
          } catch {
            // logUsage already swallows failures; belt-and-braces here.
          }
        }
        try {
          controller.close()
        } catch {
          // Already closed.
        }
      }
    },
    cancel() {
      upstreamAbort.abort()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
