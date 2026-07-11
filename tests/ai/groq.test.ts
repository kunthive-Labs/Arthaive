/**
 * Unit tests for the Groq SSE stream plumbing: the incremental `data:` line
 * parser (which must reassemble lines split arbitrarily across network
 * chunks), the wire-chunk normalizer, and tool-call delta accumulation.
 */
import { describe, it, expect } from "vitest"

import {
  createSseParser,
  parseGroqChunk,
  mergeToolCallDeltas,
  type AccumulatedToolCall,
} from "@/lib/ai/groq"

describe("createSseParser", () => {
  it("parses complete data lines", () => {
    const parser = createSseParser()
    const payloads = parser.push('data: {"a":1}\n\ndata: {"b":2}\n\n')
    expect(payloads).toEqual(['{"a":1}', '{"b":2}'])
  })

  it("reassembles a payload split across multiple network chunks", () => {
    const parser = createSseParser()
    expect(parser.push("da")).toEqual([])
    expect(parser.push('ta: {"delta":"he')).toEqual([])
    expect(parser.push('llo"}\n')).toEqual(['{"delta":"hello"}'])
  })

  it("handles a chunk boundary between two events", () => {
    const parser = createSseParser()
    const first = parser.push('data: {"a":1}\n\nda')
    const second = parser.push('ta: {"b":2}\n\n')
    expect(first).toEqual(['{"a":1}'])
    expect(second).toEqual(['{"b":2}'])
  })

  it("surfaces [DONE] as a payload, even when split", () => {
    const parser = createSseParser()
    expect(parser.push("data: [DO")).toEqual([])
    expect(parser.push("NE]\n\n")).toEqual(["[DONE]"])
  })

  it("tolerates CRLF line endings", () => {
    const parser = createSseParser()
    expect(parser.push('data: {"a":1}\r\n\r\n')).toEqual(['{"a":1}'])
  })

  it("ignores comments, event names and blank lines", () => {
    const parser = createSseParser()
    const payloads = parser.push(': keep-alive\nevent: message\n\ndata: {"a":1}\n\n')
    expect(payloads).toEqual(['{"a":1}'])
  })

  it("flush drains a trailing unterminated data line", () => {
    const parser = createSseParser()
    expect(parser.push('data: {"a":1}')).toEqual([])
    expect(parser.flush()).toEqual(['{"a":1}'])
    // Buffer is consumed.
    expect(parser.flush()).toEqual([])
  })
})

describe("parseGroqChunk", () => {
  it("extracts a text delta", () => {
    const chunk = parseGroqChunk(
      '{"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}',
    )
    expect(chunk).toEqual({ textDelta: "Hi" })
  })

  it("extracts tool-call deltas with incremental arguments", () => {
    const first = parseGroqChunk(
      JSON.stringify({
        choices: [
          {
            delta: {
              tool_calls: [
                { index: 0, id: "call_1", function: { name: "query_deals", arguments: '{"sec' } },
              ],
            },
            finish_reason: null,
          },
        ],
      }),
    )
    expect(first?.toolCallDeltas).toEqual([
      { index: 0, id: "call_1", name: "query_deals", argumentsDelta: '{"sec' },
    ])

    const second = parseGroqChunk(
      JSON.stringify({
        choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'tors":[]}' } }] } }],
      }),
    )
    expect(second?.toolCallDeltas).toEqual([{ index: 0, argumentsDelta: 'tors":[]}' }])
  })

  it("extracts finish_reason and usage from the final chunks", () => {
    const finish = parseGroqChunk('{"choices":[{"delta":{},"finish_reason":"tool_calls"}]}')
    expect(finish?.finishReason).toBe("tool_calls")

    const usage = parseGroqChunk(
      '{"choices":[],"usage":{"prompt_tokens":120,"completion_tokens":45}}',
    )
    expect(usage?.usage).toEqual({ promptTokens: 120, completionTokens: 45 })
  })

  it("returns null on malformed JSON", () => {
    expect(parseGroqChunk("{not json")).toBeNull()
  })
})

describe("mergeToolCallDeltas", () => {
  it("accumulates id/name once and appends argument fragments", () => {
    const acc: AccumulatedToolCall[] = []
    mergeToolCallDeltas(acc, [
      { index: 0, id: "call_1", name: "aggregate_deals", argumentsDelta: '{"group' },
    ])
    mergeToolCallDeltas(acc, [{ index: 0, argumentsDelta: 'By":"sector"}' }])
    expect(acc).toEqual([
      { id: "call_1", name: "aggregate_deals", arguments: '{"groupBy":"sector"}' },
    ])
  })

  it("keeps parallel tool calls separate by index", () => {
    const acc: AccumulatedToolCall[] = []
    mergeToolCallDeltas(acc, [
      { index: 0, id: "call_1", name: "query_deals", argumentsDelta: "{}" },
      { index: 1, id: "call_2", name: "aggregate_deals", argumentsDelta: '{"groupBy":' },
    ])
    mergeToolCallDeltas(acc, [{ index: 1, argumentsDelta: '"year"}' }])
    expect(acc[0]).toEqual({ id: "call_1", name: "query_deals", arguments: "{}" })
    expect(acc[1]).toEqual({ id: "call_2", name: "aggregate_deals", arguments: '{"groupBy":"year"}' })
  })
})
