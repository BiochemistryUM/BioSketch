// Formatting inside a text label, written with a few light marks so it can be typed anywhere:
//   ^{2+}  superscript      _{2}  subscript      *italic*      **bold**      \* a literal star
// Example: "Ca^{2+}", "H_{2}O_{2}", "*GPX4* expression".

export interface Run {
  text: string
  bold: boolean
  italic: boolean
  /** 1 = superscript, -1 = subscript, 0 = normal. */
  script: -1 | 0 | 1
}

/** Size of superscripts and subscripts relative to the surrounding text. */
export const SCRIPT_SCALE = 0.65
/** How far (in font sizes) a script is shifted: up for superscript, down for subscript. */
export const SCRIPT_SHIFT = { 1: -0.36, 0: 0, [-1]: 0.2 } as const

/** Where the closing mark for an opening mark at `from` is, or -1. A single star never matches half of a double one. */
function closing(line: string, mark: string, from: number): number {
  let end = line.indexOf(mark, from)
  if (mark === '*') {
    while (end !== -1 && (line[end + 1] === '*' || line[end - 1] === '*')) end = line.indexOf('*', end + 1)
  }
  return end
}

function parseInto(line: string, bold: boolean, italic: boolean, runs: Run[]): void {
  let buffer = ''
  const flush = () => {
    if (buffer) runs.push({ text: buffer, bold, italic, script: 0 })
    buffer = ''
  }
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && i + 1 < line.length) {
      buffer += line[++i]
      continue
    }
    if ((ch === '^' || ch === '_') && line[i + 1] === '{') {
      const end = line.indexOf('}', i + 2)
      if (end > i + 2) {
        flush()
        runs.push({ text: line.slice(i + 2, end), bold, italic, script: ch === '^' ? 1 : -1 })
        i = end
        continue
      }
    }
    if (ch === '*') {
      // Stars are formatting only when a pair wraps some text with no space just inside it.
      // Lone stars, such as significance marks ("*", "**", "***"), are shown as they are.
      let handled = false
      for (const mark of ['***', '**', '*']) {
        if (!line.startsWith(mark, i)) continue
        if ((mark !== '*' && bold) || (mark !== '**' && italic)) continue
        const from = i + mark.length
        const end = closing(line, mark, from)
        const inner = end > from ? line.slice(from, end) : ''
        if (!inner || inner[0] === ' ' || inner[inner.length - 1] === ' ' || inner[0] === '*') continue
        flush()
        parseInto(inner, bold || mark !== '*', italic || mark !== '**', runs)
        i = end + mark.length - 1
        handled = true
        break
      }
      if (handled) continue
    }
    buffer += ch
  }
  flush()
}

/** Split one line of label text into runs of uniformly formatted text. */
export function parseRich(line: string): Run[] {
  const runs: Run[] = []
  parseInto(line, false, false, runs)
  return runs
}

/** Wrap part of a string in formatting marks (used by the format buttons). */
export function wrapSelection(text: string, start: number, end: number, kind: 'sup' | 'sub' | 'italic' | 'bold'): { text: string; start: number; end: number } {
  const [open, close] = kind === 'sup' ? ['^{', '}'] : kind === 'sub' ? ['_{', '}'] : kind === 'italic' ? ['*', '*'] : ['**', '**']
  const a = Math.max(0, Math.min(start, end))
  const b = Math.min(text.length, Math.max(start, end))
  const next = text.slice(0, a) + open + text.slice(a, b) + close + text.slice(b)
  return { text: next, start: a + open.length, end: b + open.length }
}

/** Text of a run with the characters that would read as marks made literal. */
const literal = (text: string): string => text.replace(/[\\*]/g, '\\$&').replace(/([\^_])(?=\{)/g, '\\$1')

/**
 * Write runs back as one line of marked text: the reverse of `parseRich`, used when a line is
 * broken into several (each new line has to carry its own marks).
 */
export function formatRich(runs: Run[]): string {
  let out = ''
  for (let i = 0; i < runs.length; ) {
    // Neighbouring runs with the same bold and italic share one pair of marks.
    const { bold, italic } = runs[i]
    let inner = ''
    for (; i < runs.length && runs[i].bold === bold && runs[i].italic === italic; i++) {
      const run = runs[i]
      inner += run.script ? `${run.script === 1 ? '^' : '_'}{${run.text}}` : literal(run.text)
    }
    const mark = bold && italic ? '***' : bold ? '**' : italic ? '*' : ''
    out += mark + inner + mark
  }
  return out
}

/** Put `insert` where the selection is (replacing what is selected). Returns the new text and where the cursor goes. */
export function insertText(text: string, start: number, end: number, insert: string): { text: string; caret: number } {
  const a = Math.max(0, Math.min(start, end, text.length))
  const b = Math.min(text.length, Math.max(start, end))
  return { text: text.slice(0, a) + insert + text.slice(b), caret: a + insert.length }
}

/** Symbols a biologist reaches for that are not on most keyboards, in the groups the picker shows. */
export const SYMBOL_GROUPS: { title: string; symbols: string[] }[] = [
  { title: 'Greek letters', symbols: [...'αβγδεζηθκλμνπρστφχψωΓΔΘΛΣΦΨΩ'] },
  { title: 'Arrows', symbols: [...'→←↑↓↔⇌⇒⊣↗↘'] },
  { title: 'Maths and units', symbols: [...'±×÷≤≥≈≠∞°µÅ‰√∑∆'] },
  { title: 'Marks', symbols: [...'•·′″†‡♀♂✓✗'] },
]

