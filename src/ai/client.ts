// Talks to the Claude API straight from the browser, with the user's own API key.
// The SDK is loaded only when the AI feature is used, so it does not slow down the editor.

import { SCENE_SCHEMA, SYSTEM_PROMPT, parseScene, taskText, type Scene } from './scene'

export const AI_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (best results)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (faster, lower cost)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (fastest, lowest cost)' },
] as const

export const DEFAULT_MODEL = AI_MODELS[0].id

export interface SceneRequest {
  apiKey: string
  model: string
  /** What the scientist wants drawn, or notes about the sketch. May be empty when a sketch is sent. */
  description: string
  /** PNG of the sketch, base64 without the data-URL prefix. */
  imageBase64?: string
  signal?: AbortSignal
}

/** An error whose message is safe and useful to show to the user. */
export class AiError extends Error {}

export async function requestScene(req: SceneRequest): Promise<Scene> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  // The key belongs to the person using this browser and is sent only to Anthropic,
  // which is the case `dangerouslyAllowBrowser` exists for.
  const client = new Anthropic({ apiKey: req.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 })

  const task = taskText(!!req.imageBase64, req.description)

  try {
    const response = await client.beta.messages.create(
      {
        model: req.model,
        max_tokens: 16000,
        // If the model declines a harmless biology request, let the API retry on its default fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM_PROMPT,
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCENE_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              ...(req.imageBase64
                ? [{ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: req.imageBase64 } }]
                : []),
              { type: 'text' as const, text: task },
            ],
          },
        ],
      },
      { signal: req.signal },
    )

    if (response.stop_reason === 'refusal') throw new AiError('The AI declined this request. Try describing the process differently.')
    if (response.stop_reason === 'max_tokens') throw new AiError('The figure was too large for one answer. Try a simpler sketch or description.')
    const block = response.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') throw new AiError('The AI returned an empty answer. Please try again.')
    let data: unknown
    try {
      data = JSON.parse(block.text)
    } catch {
      throw new AiError('The AI returned an answer that could not be read. Please try again.')
    }
    const scene = parseScene(data)
    if (!scene.elements.length) throw new AiError('The AI could not find anything to draw. Add more detail and try again.')
    return scene
  } catch (error) {
    if (error instanceof AiError) throw error
    if (error instanceof Anthropic.APIUserAbortError) throw new AiError('Cancelled.')
    if (error instanceof Anthropic.AuthenticationError) throw new AiError('The API key was not accepted. Check it and try again.')
    if (error instanceof Anthropic.PermissionDeniedError) throw new AiError('This API key is not allowed to use the selected model.')
    if (error instanceof Anthropic.RateLimitError) throw new AiError('The API is busy or your usage limit was reached. Wait a moment and try again.')
    if (error instanceof Anthropic.APIConnectionError) throw new AiError('Could not reach the Claude API. Check your internet connection.')
    if (error instanceof Anthropic.APIError) throw new AiError(`The Claude API returned an error (${error.status ?? 'unknown'}): ${error.message}`)
    throw new AiError(error instanceof Error ? error.message : 'Something went wrong.')
  }
}
