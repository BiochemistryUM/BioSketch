// The Claude API is never called for real here: `fetch` is replaced, so these tests check what
// BioSketch would send and how it handles each kind of answer, without a key or a network.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { AiError, DEFAULT_MODEL, requestScene } from '../src/ai/client'

const scene = {
  title: 'Test',
  elements: [
    { id: 'a', kind: 'icon', icon: 'mitochondrion', label: 'Mito', x: 300, y: 500, w: 120, h: 60 },
    { id: 'b', kind: 'box', icon: '', label: 'ATP', x: 700, y: 500, w: 110, h: 55 },
  ],
  connectors: [{ from: 'a', to: 'b', kind: 'arrow', dashed: false, label: '' }],
}

const message = (overrides: Record<string, unknown> = {}) => ({
  id: 'msg_test',
  type: 'message',
  role: 'assistant',
  model: DEFAULT_MODEL,
  content: [{ type: 'text', text: JSON.stringify(scene) }],
  stop_reason: 'end_turn',
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 10 },
  ...overrides,
})

interface Captured {
  url: string
  headers: Headers
  body: Record<string, any>
}

function stubFetch(status: number, payload: unknown): { calls: Captured[] } {
  const calls: Captured[] = []
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body ?? '{}')) })
    return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })
  })
  return { calls }
}

afterEach(() => vi.unstubAllGlobals())

describe('Claude API request', () => {
  it('sends the sketch, the schema and the settings, and reads the scene back', async () => {
    const { calls } = stubFetch(200, message())
    const result = await requestScene({ apiKey: 'placeholder-key', model: DEFAULT_MODEL, description: 'two circles', imageBase64: 'AAAA' })
    expect(result.elements).toHaveLength(2)
    expect(result.connectors).toHaveLength(1)

    expect(calls).toHaveLength(1)
    const { url, headers, body } = calls[0]
    expect(new URL(url).host).toBe('api.anthropic.com')
    expect(new URL(url).pathname).toBe('/v1/messages')
    // Current SDK versions send the API key as a bearer token.
    expect(headers.get('authorization')).toBe('Bearer placeholder-key')
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01')
    expect(headers.get('anthropic-dangerous-direct-browser-access')).toBe('true')
    expect(body.model).toBe('claude-opus-5-5')
    expect(body.fallbacks).toBe('default')
    expect(body.output_config.effort).toBe('medium')
    expect(body.output_config.format.type).toBe('json_schema')
    expect(body.output_config.format.schema.required).toEqual(['title', 'elements', 'connectors', 'notes'])
    expect(body.thinking).toBeUndefined()
    expect(body.tool_choice).toBeUndefined()
    expect(body.temperature).toBeUndefined()
    expect(body.system).toContain('Icon catalogue')
    const content = body.messages[0].content
    expect(content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } })
    expect(content[1].text).toContain('two circles')
  })

  it('sends only text when there is no sketch', async () => {
    const { calls } = stubFetch(200, message())
    await requestScene({ apiKey: 'placeholder-key', model: 'claude-haiku-5-5', description: 'glycolysis in the cytoplasm' })
    expect(calls[0].body.model).toBe('claude-haiku-5-5')
    expect(calls[0].body.messages[0].content).toHaveLength(1)
    expect(calls[0].body.messages[0].content[0].text).toContain('glycolysis')
  })

  it('explains a rejected key', async () => {
    stubFetch(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } })
    await expect(requestScene({ apiKey: 'bad', model: DEFAULT_MODEL, description: 'x' })).rejects.toThrow(/API key was not accepted/)
  })

  it('explains a bad request with the API message', async () => {
    stubFetch(400, { type: 'error', error: { type: 'invalid_request_error', message: 'something specific' } })
    const error = await requestScene({ apiKey: 'k', model: DEFAULT_MODEL, description: 'x' }).catch((e) => e)
    expect(error).toBeInstanceOf(AiError)
    expect(error.message).toContain('something specific')
  })

  it('handles refusals, cut-off answers, empty answers and unreadable answers', async () => {
    stubFetch(200, message({ stop_reason: 'refusal', content: [] }))
    await expect(requestScene({ apiKey: 'k', model: DEFAULT_MODEL, description: 'x' })).rejects.toThrow(/declined/)
    stubFetch(200, message({ stop_reason: 'max_tokens' }))
    await expect(requestScene({ apiKey: 'k', model: DEFAULT_MODEL, description: 'x' })).rejects.toThrow(/too large/)
    stubFetch(200, message({ content: [{ type: 'text', text: 'not json' }] }))
    await expect(requestScene({ apiKey: 'k', model: DEFAULT_MODEL, description: 'x' })).rejects.toThrow(/could not be read/)
    stubFetch(200, message({ content: [{ type: 'text', text: JSON.stringify({ title: '', elements: [], connectors: [] }) }] }))
    await expect(requestScene({ apiKey: 'k', model: DEFAULT_MODEL, description: 'x' })).rejects.toThrow(/could not find anything/)
  })

  it('skips thinking blocks and reads the text block', async () => {
    stubFetch(200, message({ content: [{ type: 'thinking', thinking: '', signature: 's' }, { type: 'text', text: JSON.stringify(scene) }] }))
    const result = await requestScene({ apiKey: 'k', model: DEFAULT_MODEL, description: 'x' })
    expect(result.title).toBe('Test')
  })
})
