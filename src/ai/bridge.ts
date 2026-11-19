// Using the AI without an API key: BioSketch writes the request, the scientist pastes it into the
// Claude app they already have (claude.ai or the desktop app), and pastes the answer back here.
// Nothing is sent anywhere by BioSketch itself on this route.

import { parseScene, taskText, type Scene } from './scene'

const EXAMPLE = `{
  "title": "",
  "elements": [
    { "id": "mito", "kind": "icon", "icon": "nih-cells--mitochondria", "label": "Mitochondrion", "x": 300, "y": 500, "w": 130, "h": 65 },
    { "id": "atp", "kind": "box", "icon": "", "label": "ATP", "x": 650, "y": 500, "w": 110, "h": 55 }
  ],
  "connectors": [
    { "from": "mito", "to": "atp", "kind": "arrow", "dashed": false, "label": "produces" }
  ],
  "notes": []
}`

const SHAPE_RULES =
  'Every element needs all eight fields and every connector all five. "kind" of an element is one of: icon, box, ellipse, text, membrane, cell, frame. "kind" of a connector is one of: arrow, inhibit, dot, line, double. Use "" where there is no icon or label. Connectors refer to elements by "id". "notes" is a list of short sentences for me, or [].'

/** How the answer should come back: at once, or after Claude has said what it plans to draw. */
function answerFormat(planFirst: boolean): string {
  const json = 'one JSON object in a single code block, and nothing else, so I can paste it back into BioSketch. Use exactly this shape:'
  if (!planFirst) return `Answer format: reply with ${json}`
  return [
    'Work in two steps.',
    'Step 1, your first reply: no JSON yet. In plain words for a biologist, list what you would draw and how the parts connect (a few short lines), say which things have no icon in the catalogue and what you would use instead, and ask up to three questions if an answer would change the figure. Then stop and wait for me.',
    `Step 2, after I answer or say "go ahead": reply with ${json}`,
  ].join('\n')
}

/**
 * The full text to paste into a Claude chat, starting with the standing instructions and icon
 * catalogue (`system`, from systemPrompt). `task` replaces the usual "draw this" wording (used
 * when revising a figure). With `planFirst`, Claude first describes its plan and asks its
 * questions in the chat, and only builds the figure once the scientist agrees.
 */
export function buildChatRequest(system: string, hasSketch: boolean, description: string, task?: string, planFirst = false): string {
  return [
    system,
    '---',
    task ?? (hasSketch ? taskText(true, description).replace('The image is', 'The attached image is') : taskText(false, description)),
    answerFormat(planFirst),
    EXAMPLE,
    SHAPE_RULES,
  ].join('\n\n')
}

/** Read the scene out of whatever was pasted back: the bare JSON, a code block, or a whole reply. */
export function readChatAnswer(text: string): Scene {
  // After a conversation the paste may hold several code blocks: the figure is the last one that holds JSON.
  const blocks = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)].map((m) => m[1]).filter((block) => block.includes('{'))
  const candidate = blocks.length ? blocks[blocks.length - 1] : text
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
