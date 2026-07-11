"use client"

// Client hook for the BYOK streaming chat (/api/chat). It POSTs the user's
// message with their Groq key in the x-groq-api-key header, reads the SSE
// response incrementally (buffering partial `data:` lines across network
// chunks), and folds the events into a transcript of user/assistant messages,
// transient tool-activity lines and widget suggestions. The key is read from
// the caller on each send and never stored here.

import { useCallback, useEffect, useRef, useState } from "react"

export type ChatMessageRole = "user" | "assistant"

// One widget_suggestion event, as sent by the server.
export interface ChatWidgetSuggestion {
  type: string
  title: string
  config: Record<string, unknown>
  size: { w: number; h: number }
}

export type ChatEntry =
  | { id: string; kind: "message"; role: ChatMessageRole; content: string; streaming?: boolean }
  | { id: string; kind: "tool"; name: string; summary?: string; pending: boolean }
  | { id: string; kind: "widget"; suggestion: ChatWidgetSuggestion; added: boolean }

interface UseGroqChatOptions {
  /** The user's Groq API key, or null when none is configured. */
  apiKey: string | null
  model: string
  /** Compact dashboard context JSON, sent with every message. */
  dashboardContext?: string
}

// Mirror the server-side caps so requests never 400 on size.
const MAX_HISTORY_MESSAGES = 20
const MAX_MESSAGE_CHARS = 8_000

const GENERIC_ERROR = "Something went wrong while generating a response. Please try again."

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `c-${Math.random().toString(36).slice(2)}`
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError"
}

async function friendlyHttpError(res: Response): Promise<string> {
  let serverMessage: string | undefined
  try {
    const body = (await res.json()) as { error?: string }
    if (typeof body?.error === "string") serverMessage = body.error
  } catch {
    // Non-JSON error body — fall through to the status-based message.
  }
  if (res.status === 401) return "Your session has expired. Please sign in again to use chat."
  if (res.status === 429) return "You're sending messages too quickly. Wait a minute and try again."
  return serverMessage || GENERIC_ERROR
}

export function useGroqChat({ apiKey, model, dashboardContext }: UseGroqChatOptions) {
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Effect-synced refs so sendMessage (a stable callback invoked from event
  // handlers) never closes over stale values. streamingRef is toggled inside
  // sendMessage itself so a double-submit in the same tick is still blocked.
  const entriesRef = useRef(entries)
  const apiKeyRef = useRef(apiKey)
  const modelRef = useRef(model)
  const contextRef = useRef(dashboardContext)
  const streamingRef = useRef(false)
  useEffect(() => {
    entriesRef.current = entries
    apiKeyRef.current = apiKey
    modelRef.current = model
    contextRef.current = dashboardContext
  }, [entries, apiKey, model, dashboardContext])

  // Close out any in-progress assistant message / pending tool lines (used on
  // stream end, abort, and mid-stream errors).
  const finalizeEntries = useCallback(() => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.kind === "message" && e.streaming) return { ...e, streaming: false }
        if (e.kind === "tool" && e.pending) return { ...e, pending: false }
        return e
      })
    )
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      const text = content.trim().slice(0, MAX_MESSAGE_CHARS)
      if (!text || streamingRef.current) return
      const key = apiKeyRef.current?.trim()
      if (!key) {
        setError("Add your Groq API key to start chatting.")
        return
      }

      // History: prior user/assistant turns plus this message, last 20 only.
      const history = [
        ...entriesRef.current
          .filter(
            (e): e is Extract<ChatEntry, { kind: "message" }> =>
              e.kind === "message" && e.content.trim().length > 0
          )
          .map((e) => ({ role: e.role, content: e.content.slice(0, MAX_MESSAGE_CHARS) })),
        { role: "user" as const, content: text },
      ].slice(-MAX_HISTORY_MESSAGES)

      setError(null)
      setEntries((prev) => [...prev, { id: newId(), kind: "message", role: "user", content: text }])
      setIsStreaming(true)
      streamingRef.current = true

      const controller = new AbortController()
      abortRef.current = controller

      // Returns true once the stream signalled `done`.
      const handleEvent = (event: Record<string, unknown>): boolean => {
        switch (event.type) {
          case "text": {
            const delta = typeof event.delta === "string" ? event.delta : ""
            if (!delta) return false
            setEntries((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.kind === "message" && last.role === "assistant" && last.streaming) {
                return [...prev.slice(0, -1), { ...last, content: last.content + delta }]
              }
              return [
                ...prev,
                { id: newId(), kind: "message", role: "assistant", content: delta, streaming: true },
              ]
            })
            return false
          }
          case "tool_start": {
            const name = typeof event.name === "string" ? event.name : "tool"
            setEntries((prev) => [
              // A tool round ends the current text segment; the final answer
              // starts a fresh assistant message.
              ...prev.map((e) =>
                e.kind === "message" && e.streaming ? { ...e, streaming: false } : e
              ),
              { id: newId(), kind: "tool", name, pending: true },
            ])
            return false
          }
          case "tool_result": {
            const name = typeof event.name === "string" ? event.name : ""
            const summary = typeof event.summary === "string" ? event.summary : undefined
            setEntries((prev) => {
              // Resolve the most recent pending activity line for this tool.
              let idx = -1
              for (let i = prev.length - 1; i >= 0; i--) {
                const e = prev[i]
                if (e.kind === "tool" && e.pending && e.name === name) {
                  idx = i
                  break
                }
              }
              if (idx === -1) return prev
              const next = [...prev]
              next[idx] = { ...(next[idx] as Extract<ChatEntry, { kind: "tool" }>), summary, pending: false }
              return next
            })
            return false
          }
          case "widget_suggestion": {
            const widget = event.widget as Partial<ChatWidgetSuggestion> | undefined
            if (!widget || typeof widget.type !== "string" || typeof widget.title !== "string") {
              return false
            }
            const suggestion: ChatWidgetSuggestion = {
              type: widget.type,
              title: widget.title,
              config:
                widget.config && typeof widget.config === "object" && !Array.isArray(widget.config)
                  ? (widget.config as Record<string, unknown>)
                  : {},
              size:
                widget.size && typeof widget.size.w === "number" && typeof widget.size.h === "number"
                  ? { w: widget.size.w, h: widget.size.h }
                  : { w: 6, h: 8 },
            }
            setEntries((prev) => [...prev, { id: newId(), kind: "widget", suggestion, added: false }])
            return false
          }
          case "error": {
            setError(typeof event.message === "string" ? event.message : GENERIC_ERROR)
            return false
          }
          case "done":
            return true
          default:
            return false
        }
      }

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-groq-api-key": key,
          },
          body: JSON.stringify({
            messages: history,
            model: modelRef.current,
            ...(contextRef.current ? { dashboardContext: contextRef.current } : {}),
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          setError(await friendlyHttpError(res))
          return
        }
        if (!res.body) {
          setError(GENERIC_ERROR)
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let finished = false

        while (!finished) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // Events arrive as 'data: <JSON>\n\n'; process complete lines and
          // keep any partial trailing line in the buffer.
          let newline: number
          while (!finished && (newline = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newline).trim()
            buffer = buffer.slice(newline + 1)
            if (!line.startsWith("data:")) continue
            let event: unknown
            try {
              event = JSON.parse(line.slice(5).trim())
            } catch {
              continue // Malformed event — skip it rather than kill the stream.
            }
            if (event && typeof event === "object") {
              finished = handleEvent(event as Record<string, unknown>)
            }
          }
        }
      } catch (err) {
        if (!isAbortError(err)) {
          setError("Could not reach the chat service. Check your connection and try again.")
        }
      } finally {
        abortRef.current = null
        finalizeEntries()
        streamingRef.current = false
        setIsStreaming(false)
      }
    },
    [finalizeEntries]
  )

  // Stop button: abort the in-flight request, keeping any partial answer.
  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setEntries([])
    setError(null)
  }, [])

  const markWidgetAdded = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.kind === "widget" && e.id === id ? { ...e, added: true } : e))
    )
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  return { entries, isStreaming, error, sendMessage, stop, clear, markWidgetAdded, dismissError }
}
