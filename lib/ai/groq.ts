/**
 * Minimal Groq chat-completions client (BYOK — the user brings their own key).
 *
 * Groq exposes an OpenAI-compatible API, so this module speaks that wire format
 * with plain `fetch` — no SDK dependency. It streams responses (SSE) and yields
 * parsed chunks: text deltas, incremental tool-call fragments, the finish
 * reason, and (on the final chunk, via `stream_options.include_usage`) token
 * usage.
 *
 * SECURITY: the user's API key is forwarded to Groq for a single request and
 * must NEVER be persisted or logged. Error objects thrown here intentionally
 * carry only the HTTP status class — never headers, request bodies, or the key.
 */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

// Models a client is allowed to request. Anything else is rejected with 400.
export const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3-32b",
] as const

export type GroqModel = (typeof GROQ_MODELS)[number]

export const DEFAULT_GROQ_MODEL: GroqModel = "llama-3.3-70b-versatile"

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type GroqErrorKind = "invalid_key" | "rate_limited" | "api_error"

export class GroqApiError extends Error {
  readonly kind: GroqErrorKind
  readonly status: number

  constructor(kind: GroqErrorKind, status: number, message: string) {
    super(message)
    this.name = "GroqApiError"
    this.kind = kind
    this.status = status
  }
}

export function isGroqApiError(err: unknown): err is GroqApiError {
  return err instanceof GroqApiError
}

function errorForStatus(status: number): GroqApiError {
  if (status === 401 || status === 403) {
    return new GroqApiError("invalid_key", status, "Groq rejected the API key")
  }
  if (status === 429) {
    return new GroqApiError("rate_limited", status, "Groq rate limit reached")
  }
  return new GroqApiError("api_error", status, `Groq API error (HTTP ${status})`)
}

// ---------------------------------------------------------------------------
// Wire types (OpenAI-compatible)
// ---------------------------------------------------------------------------

export interface GroqToolCall {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

export type GroqChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: GroqToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string }

export interface GroqToolDefinition {
  type: "function"
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

// One incremental fragment of a streamed tool call. Groq (like OpenAI) sends
// `id`/`name` on the first fragment for an index and streams `arguments` as
// JSON string pieces across subsequent fragments.
export interface GroqToolCallDelta {
  index: number
  id?: string
  name?: string
  argumentsDelta?: string
}

export interface GroqUsage {
  promptTokens: number
  completionTokens: number
}

// A parsed streaming chunk, normalized for callers.
export interface GroqStreamChunk {
  textDelta?: string
  toolCallDeltas?: GroqToolCallDelta[]
  finishReason?: string
  usage?: GroqUsage
}

// Raw shape of one `data:` payload from the Groq stream (only the fields we read).
interface GroqWireChunk {
  choices?: Array<{
    delta?: {
      content?: string | null
      tool_calls?: Array<{
        index?: number
        id?: string
        function?: { name?: string; arguments?: string }
      }>
    }
    finish_reason?: string | null
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number } | null
}

// ---------------------------------------------------------------------------
// SSE parsing (exported for tests)
// ---------------------------------------------------------------------------

export interface SseParser {
  /** Feed one raw network chunk; returns any complete `data:` payloads found. */
  push(chunk: string): string[]
  /** Drain a trailing unterminated line at end of stream. */
  flush(): string[]
}

/**
 * Incremental SSE line parser. Network chunks can split anywhere — including
 * mid-line and mid-"data:" prefix — so we buffer until a newline completes a
 * line. `[DONE]` is surfaced as a payload for the caller to handle.
 */
export function createSseParser(): SseParser {
  let buffer = ""

  const payloadOf = (line: string): string | null => {
    const trimmed = line.endsWith("\r") ? line.slice(0, -1) : line
    if (!trimmed.startsWith("data:")) return null
    const payload = trimmed.slice(5).trim()
    return payload || null
  }

  return {
    push(chunk: string): string[] {
      buffer += chunk
      const out: string[] = []
      let newlineAt = buffer.indexOf("\n")
      while (newlineAt !== -1) {
        const line = buffer.slice(0, newlineAt)
        buffer = buffer.slice(newlineAt + 1)
        const payload = payloadOf(line)
        if (payload !== null) out.push(payload)
        newlineAt = buffer.indexOf("\n")
      }
      return out
    },
    flush(): string[] {
      const line = buffer
      buffer = ""
      const payload = payloadOf(line)
      return payload !== null ? [payload] : []
    },
  }
}

/** Parse one SSE `data:` payload into a normalized chunk. Returns null on junk. */
export function parseGroqChunk(payload: string): GroqStreamChunk | null {
  let wire: GroqWireChunk
  try {
    wire = JSON.parse(payload) as GroqWireChunk
  } catch {
    return null
  }

  const chunk: GroqStreamChunk = {}
  const choice = wire.choices?.[0]

  if (typeof choice?.delta?.content === "string" && choice.delta.content) {
    chunk.textDelta = choice.delta.content
  }

  const toolCalls = choice?.delta?.tool_calls
  if (Array.isArray(toolCalls) && toolCalls.length) {
    chunk.toolCallDeltas = toolCalls.map((tc, i) => {
      const delta: GroqToolCallDelta = { index: typeof tc.index === "number" ? tc.index : i }
      if (tc.id) delta.id = tc.id
      if (tc.function?.name) delta.name = tc.function.name
      if (tc.function?.arguments) delta.argumentsDelta = tc.function.arguments
      return delta
    })
  }

  if (choice?.finish_reason) chunk.finishReason = choice.finish_reason

  if (wire.usage) {
    chunk.usage = {
      promptTokens: wire.usage.prompt_tokens ?? 0,
      completionTokens: wire.usage.completion_tokens ?? 0,
    }
  }

  return chunk
}

// ---------------------------------------------------------------------------
// Tool-call accumulation helper
// ---------------------------------------------------------------------------

export interface AccumulatedToolCall {
  id: string
  name: string
  arguments: string
}

/**
 * Merge incremental tool-call fragments into `acc` (indexed by the wire
 * `index`). `id`/`name` arrive once per call; `arguments` fragments append.
 */
export function mergeToolCallDeltas(
  acc: AccumulatedToolCall[],
  deltas: GroqToolCallDelta[],
): void {
  for (const d of deltas) {
    let entry = acc[d.index]
    if (!entry) {
      entry = { id: "", name: "", arguments: "" }
      acc[d.index] = entry
    }
    if (d.id) entry.id = d.id
    if (d.name) entry.name = d.name
    if (d.argumentsDelta) entry.arguments += d.argumentsDelta
  }
}

// ---------------------------------------------------------------------------
// Streaming request
// ---------------------------------------------------------------------------

export interface GroqStreamOptions {
  apiKey: string
  model: string
  messages: GroqChatMessage[]
  tools?: GroqToolDefinition[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

/**
 * POST a streaming chat.completions request to Groq and yield parsed chunks.
 * Throws `GroqApiError` when Groq responds with a non-2xx status (before any
 * chunk is yielded). Aborting `options.signal` cancels the upstream request.
 */
export async function* streamChatCompletion(
  options: GroqStreamOptions,
): AsyncGenerator<GroqStreamChunk, void, undefined> {
  const { apiKey, model, messages, tools, temperature, maxTokens, signal } = options

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      ...(tools && tools.length ? { tools, tool_choice: "auto" } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
    }),
    signal,
  })

  if (!res.ok) {
    // Drain/cancel the body but never read it into an error message — upstream
    // error bodies are not needed and must not leak into logs.
    void res.body?.cancel().catch(() => {})
    throw errorForStatus(res.status)
  }
  if (!res.body) {
    throw new GroqApiError("api_error", res.status, "Groq returned an empty response body")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  const parser = createSseParser()

  try {
    for (;;) {
      const { done, value } = await reader.read()
      const payloads = done
        ? parser.flush()
        : parser.push(decoder.decode(value, { stream: true }))
      for (const payload of payloads) {
        if (payload === "[DONE]") return
        const chunk = parseGroqChunk(payload)
        if (chunk) yield chunk
      }
      if (done) return
    }
  } finally {
    // Covers early exit (caller break / abort): release the connection.
    void reader.cancel().catch(() => {})
  }
}
