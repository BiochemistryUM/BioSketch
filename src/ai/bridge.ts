// Using the AI without an API key: BioSketch writes the request, the scientist pastes it into the
// Claude app they already have (claude.ai or the desktop app), and pastes the answer back here.
// Nothing is sent anywhere by BioSketch itself on this route.

import { SYSTEM_PROMPT, parseScene, taskText, type Scene } from './scene'

const EXAMPLE = `{
  "title": "",
  "elements": [
    { "id": "mito", "kind": "icon", "icon": "mitochondrion", "label": "Mitochondrion", "x": 300, "y": 500, "w": 130, "h": 65 },
    { "id": "atp", "kind": "box", "icon": "", "label": "ATP", "x": 650, "y": 500, "w": 110, "h": 55 }
  ],
  "connectors": [
    { "from": "mito", "to": "atp", "kind": "arrow", "dashed": false, "label": "produces" }
  ]
}`

/** The full text to paste into a Claude chat. */
export function buildChatRequest(hasSketch: boolean, description: string): string {
  return [
    SYSTEM_PROMPT,
    '---',
    hasSketch ? taskText(true, description).replace('The image is', 'The attached image is') : taskText(false, description),
    'Answer format: reply with one JSON object in a single code block, and nothing else, so I can paste it back into BioSketch. Use exactly this shape:',
    EXAMPLE,
    'Every element needs all eight fields and every connector all five. "kind" of an element is one of: icon, box, ellipse, text, membrane, cell. "kind" of a connector is one of: arrow, inhibit, line, double. Use "" where there is no icon or label. Connectors refer to elements by "id".',
  ].join('\n\n')
}

/** Read the scene out of whatever was pasted back: the bare JSON, a code block, or a whole reply. */
export function readChatAnswer(text: string): Scene {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error("This does not look like Claude's answer. Copy the whole reply, including everything between the first { and the last }.")
  }
  let data: unknown
  try {
    // Chat apps sometimes swap straight quotes for curly ones when text is copied.
    data = JSON.parse(candidate.slice(start, end + 1).replace(/[“”]/g, '"'))
  } catch {
    throw new Error('The answer could not be read. Make sure you copied all of it, then try again, or ask Claude to repeat the JSON.')
  }
  const scene = parseScene(data)
  if (!scene.elements.length) throw new Error('The answer contains no figure elements. Ask Claude to try again with more detail.')
  return scene
}
