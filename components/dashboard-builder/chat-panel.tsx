"use client"

// AI chat side panel for the dashboard builder. Streams answers from
// POST /api/chat using the user's own Groq key (BYOK). The key and model
// choice live in sessionStorage only — never sent anywhere except Groq (via
// our proxy route) for the user's own requests.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import {
  Activity, Check, Eraser, KeyRound, Loader2, Plus, Send, Settings, Sparkles, Square, X,
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { DEFAULT_GROQ_MODEL, GROQ_MODELS, type GroqModel } from "@/lib/ai/groq"
import { getWidgetDef } from "@/lib/dashboard/widget-registry"
import {
  useGroqChat, type ChatEntry, type ChatWidgetSuggestion,
} from "@/hooks/use-groq-chat"

const GROQ_KEY_STORAGE = "arthaive_groq_key"
const GROQ_MODEL_STORAGE = "arthaive_groq_model"

const PRIVACY_COPY =
  "Your key stays in this browser session and is only forwarded to Groq for your requests — Arthaive never stores it."

const MODEL_LABELS: Record<GroqModel, string> = {
  "llama-3.3-70b-versatile": "Llama 3.3 70B",
  "llama-3.1-8b-instant": "Llama 3.1 8B",
  "openai/gpt-oss-120b": "GPT-OSS 120B",
  "openai/gpt-oss-20b": "GPT-OSS 20B",
  "qwen/qwen3-32b": "Qwen3 32B",
}

const TOOL_LABELS: Record<string, string> = {
  query_deals: "Querying deals",
  aggregate_deals: "Aggregating deals",
  suggest_widget: "Preparing widget suggestion",
}

// ---------------------------------------------------------------------------
// sessionStorage helpers (throw-safe: private mode can block storage)
// ---------------------------------------------------------------------------

function readSession(key: string): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string | null) {
  if (typeof window === "undefined") return
  try {
    if (value === null) window.sessionStorage.removeItem(key)
    else window.sessionStorage.setItem(key, value)
  } catch {
    // sessionStorage unavailable — the key just won't survive a reload.
  }
}

function isGroqModel(value: string | null): value is GroqModel {
  return value !== null && (GROQ_MODELS as readonly string[]).includes(value)
}

// ---------------------------------------------------------------------------
// Dependency-free assistant text rendering: paragraphs + **bold** + `code`.
// ---------------------------------------------------------------------------

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="bg-black/10 px-1 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function AssistantText({ content, streaming }: { content: string; streaming?: boolean }) {
  const paragraphs = content.split(/\n{2,}/)
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={cn("whitespace-pre-wrap break-words", i > 0 && "mt-2")}>
          {renderInline(p)}
          {streaming && i === paragraphs.length - 1 && (
            <span
              className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-[#1A5D1A] align-middle"
              aria-hidden
            />
          )}
        </p>
      ))}
    </>
  )
}

// ---------------------------------------------------------------------------
// Widget suggestion card
// ---------------------------------------------------------------------------

function WidgetSuggestionCard({
  suggestion,
  added,
  onAdd,
}: {
  suggestion: ChatWidgetSuggestion
  added: boolean
  onAdd: () => void
}) {
  const def = getWidgetDef(suggestion.type)
  const configChips = Object.entries(suggestion.config).filter(
    ([, v]) => v !== null && v !== undefined && (!Array.isArray(v) || v.length > 0)
  )

  return (
    <div className="max-w-[90%] border-2 border-black bg-white p-3 shadow-[2px_2px_0_#000]">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#1A5D1A]">
        Widget suggestion
      </div>
      <div className="mt-1 text-sm font-bold">{suggestion.title}</div>
      <div className="text-xs text-gray-500">{def ? def.label : suggestion.type}</div>
      {configChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {configChips.map(([key, value]) => (
            <span
              key={key}
              className="border border-black bg-[#F6F5F1] px-1.5 py-0.5 text-[10px] font-semibold"
            >
              {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
            </span>
          ))}
        </div>
      )}
      {def ? (
        <button
          onClick={onAdd}
          disabled={added}
          className={cn(
            "mt-3 inline-flex items-center gap-1 border-2 border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
            added
              ? "bg-white text-[#1A5D1A]"
              : "bg-[#1A5D1A] text-white shadow-[2px_2px_0_#000] transition-all hover:-translate-y-0.5"
          )}
        >
          {added ? (
            <>
              <Check className="h-3.5 w-3.5" /> Added
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> Add to dashboard
            </>
          )}
        </button>
      ) : (
        <p className="mt-3 text-xs font-semibold text-red-600">
          This widget type isn&apos;t available in this version.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function ChatPanel({
  dashboardContext,
  onAddWidget,
  onClose,
  className,
}: {
  /** Compact JSON describing the active dashboard, sent with every message. */
  dashboardContext?: string
  /** Adds a suggested widget to the dashboard; returns false if the type is unknown. */
  onAddWidget: (suggestion: ChatWidgetSuggestion) => boolean
  /** When omitted (e.g. inside a Sheet with its own close), no close button renders. */
  onClose?: () => void
  className?: string
}) {
  // Key + model live in sessionStorage only. They're loaded in an effect (not
  // the initializer) so the SSR'd markup always matches the first client
  // render — the panel can be server-rendered hidden inside the builder.
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState<GroqModel>(DEFAULT_GROQ_MODEL)
  useEffect(() => {
    const storedKey = readSession(GROQ_KEY_STORAGE)?.trim()
    if (storedKey) setApiKey(storedKey)
    const storedModel = readSession(GROQ_MODEL_STORAGE)
    if (isGroqModel(storedModel)) setModel(storedModel)
  }, [])
  const [keyDraft, setKeyDraft] = useState("")
  const [input, setInput] = useState("")

  const {
    entries, isStreaming, error, sendMessage, stop, clear, markWidgetAdded, dismissError,
  } = useGroqChat({ apiKey: apiKey || null, model, dashboardContext })

  const bottomRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" })
  }, [entries, isStreaming])

  const saveKey = useCallback(() => {
    const key = keyDraft.trim()
    if (!key) return
    writeSession(GROQ_KEY_STORAGE, key)
    setApiKey(key)
    setKeyDraft("")
  }, [keyDraft])

  const clearKey = useCallback(() => {
    writeSession(GROQ_KEY_STORAGE, null)
    setApiKey("")
  }, [])

  const changeModel = useCallback((next: GroqModel) => {
    writeSession(GROQ_MODEL_STORAGE, next)
    setModel(next)
  }, [])

  const submit = useCallback(() => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput("")
    void sendMessage(text)
  }, [input, isStreaming, sendMessage])

  const handleAdd = useCallback(
    (entry: Extract<ChatEntry, { kind: "widget" }>) => {
      if (onAddWidget(entry.suggestion)) markWidgetAdded(entry.id)
    },
    [onAddWidget, markWidgetAdded]
  )

  // Show a standalone "thinking" line while streaming with no live text yet
  // (waiting on Groq or a tool round).
  const last = entries[entries.length - 1]
  const thinking =
    isStreaming && !(last && last.kind === "message" && last.role === "assistant" && last.streaming)

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-[3px] border-black bg-white shadow-[3px_3px_0_#000]",
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b-[3px] border-black bg-[#F6F5F1] p-3",
          !onClose && "pr-12" // leave room for the Sheet's built-in close button
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-[#1A5D1A]" />
          <span className="text-sm font-bold uppercase tracking-wide">AI Analyst</span>
          <span className="truncate border border-black bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-600">
            {MODEL_LABELS[model]}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <button
                aria-label="Chat settings"
                title="Chat settings"
                className="border-2 border-black bg-white p-1.5 hover:bg-[#1A5D1A]/10"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 rounded-none border-[3px] border-black p-4 shadow-[3px_3px_0_#000]"
            >
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A5D1A]">
                    Model
                  </div>
                  <select
                    value={model}
                    onChange={(e) => changeModel(e.target.value as GroqModel)}
                    className="mt-1 w-full border-2 border-black bg-white px-2 py-1.5 text-sm focus:outline-none"
                    aria-label="Groq model"
                  >
                    {GROQ_MODELS.map((m) => (
                      <option key={m} value={m}>
                        {MODEL_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#1A5D1A]">
                    Groq API key
                  </div>
                  {apiKey && (
                    <p className="mt-1 text-xs text-gray-500">A key is saved for this session.</p>
                  )}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      saveKey()
                    }}
                    className="mt-1 flex gap-2"
                  >
                    <input
                      type="password"
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      placeholder={apiKey ? "Replace key (gsk_…)" : "gsk_…"}
                      autoComplete="off"
                      className="min-w-0 flex-1 border-2 border-black bg-white px-2 py-1.5 text-sm focus:outline-none"
                      aria-label="Groq API key"
                    />
                    <button
                      type="submit"
                      disabled={!keyDraft.trim()}
                      className="border-2 border-black bg-[#1A5D1A] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-40"
                    >
                      Save
                    </button>
                  </form>
                  {apiKey && (
                    <button
                      onClick={clearKey}
                      className="mt-2 text-xs font-bold uppercase tracking-wide text-red-600 underline underline-offset-2"
                    >
                      Clear key
                    </button>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500">{PRIVACY_COPY}</p>
              </div>
            </PopoverContent>
          </Popover>
          <button
            onClick={clear}
            disabled={entries.length === 0 && !error}
            aria-label="Clear conversation"
            title="Clear conversation"
            className="border-2 border-black bg-white p-1.5 hover:bg-[#1A5D1A]/10 disabled:opacity-40"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close chat"
              title="Close chat"
              className="border-2 border-black bg-white p-1.5 hover:bg-[#1A5D1A]/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Transcript */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {entries.length === 0 && (
            <div className="border-2 border-dashed border-black bg-[#F6F5F1] p-4 text-sm text-gray-600">
              <p className="font-bold text-black">Ask the AI analyst</p>
              <p className="mt-1">
                Totals, rankings and trends across ~14,700 Indian funding deals — or ask it to
                suggest a chart for this dashboard.
              </p>
              <p className="mt-2 text-xs text-gray-500">
                Try: &ldquo;Top fintech investors since 2023&rdquo; or &ldquo;Chart seed-stage
                funding over time&rdquo;.
              </p>
            </div>
          )}

          {entries.map((entry) => {
            if (entry.kind === "message") {
              return entry.role === "user" ? (
                <div key={entry.id} className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-wrap break-words border-2 border-black bg-[#1A5D1A] px-3 py-2 text-sm text-white">
                    {entry.content}
                  </div>
                </div>
              ) : (
                <div key={entry.id} className="flex justify-start">
                  <div className="max-w-[85%] border-2 border-black bg-[#F6F5F1] px-3 py-2 text-sm">
                    <AssistantText content={entry.content} streaming={entry.streaming} />
                  </div>
                </div>
              )
            }
            if (entry.kind === "tool") {
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-1.5 pl-1 text-xs text-gray-500"
                >
                  {entry.pending ? (
                    <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                  ) : (
                    <Activity className="h-3 w-3 shrink-0 text-[#1A5D1A]" />
                  )}
                  <span className="min-w-0">
                    {entry.pending
                      ? `${TOOL_LABELS[entry.name] ?? `Running ${entry.name}`}…`
                      : entry.summary ?? `${TOOL_LABELS[entry.name] ?? entry.name} finished.`}
                  </span>
                </div>
              )
            }
            return (
              <div key={entry.id} className="flex justify-start">
                <WidgetSuggestionCard
                  suggestion={entry.suggestion}
                  added={entry.added}
                  onAdd={() => handleAdd(entry)}
                />
              </div>
            )
          })}

          {thinking && (
            <div className="flex animate-pulse items-center gap-1.5 pl-1 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Composer / key gate */}
      <div className="border-t-[3px] border-black p-3">
        {error && (
          <div className="mb-2 flex items-start gap-2 text-xs font-semibold text-red-600">
            <span className="min-w-0 flex-1">{error}</span>
            <button onClick={dismissError} aria-label="Dismiss error" className="shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {apiKey ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  submit()
                }
              }}
              rows={2}
              placeholder="Ask about India's funding data…"
              className="w-full resize-none border-2 border-black bg-white px-2.5 py-2 text-sm focus:outline-none"
              aria-label="Chat message"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10px] text-gray-400">Enter to send · Shift+Enter for newline</p>
              {isStreaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-red-600 hover:bg-red-50"
                >
                  <Square className="h-3 w-3 fill-current" /> Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="inline-flex items-center gap-1 border-2 border-black bg-[#1A5D1A] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-[2px_2px_0_#000] disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" /> Send
                </button>
              )}
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveKey()
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <KeyRound className="h-3.5 w-3.5 text-[#1A5D1A]" /> Connect your Groq API key
            </div>
            <div className="mt-2 flex gap-2">
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="gsk_…"
                autoComplete="off"
                className="min-w-0 flex-1 border-2 border-black bg-white px-2 py-1.5 text-sm focus:outline-none"
                aria-label="Groq API key"
              />
              <button
                type="submit"
                disabled={!keyDraft.trim()}
                className="border-2 border-black bg-[#1A5D1A] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-[2px_2px_0_#000] disabled:opacity-40"
              >
                Save key
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500">{PRIVACY_COPY}</p>
            <p className="mt-1 text-[11px] text-gray-400">
              Free keys are available at console.groq.com.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
