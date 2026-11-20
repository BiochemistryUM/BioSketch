// "Report a problem": an email written by the tester's own mail program, with what a report needs
// filled in (the version, the browser, the size of the window). BioSketch sends nothing itself.
// A mail link cannot carry a file, so when the tester agrees the open figure is saved as a file
// first and the email asks for it to be attached.

/** The address reports go to; empty: the tester fills it in. Set it to the address of whoever collects the reports. */
export const REPORT_TO = ''

/** Mail programs and browsers cut long mail links; the description is shortened to stay well inside what they take. */
const MAX_DESCRIPTION = 1500

export interface ReportFacts {
  version: string
  browser: string
  /** Width × height of the window, in CSS pixels. */
  screen: string
  /** Name of the figure file saved for the report, if any. */
  attached?: string
}

/** The words of the email. */
export function reportBody(description: string, facts: ReportFacts): string {
  const text = description.trim()
  const said = text.length > MAX_DESCRIPTION ? `${text.slice(0, MAX_DESCRIPTION)}… (shortened)` : text
  return [
    'What happened, and what did you expect?',
    said || '(please describe it here)',
    '',
    facts.attached ? `Figure: please attach the file “${facts.attached}”, just saved to your downloads.` : 'Figure: not attached.',
    '',
    '— Filled in by BioSketch —',
    `Version: ${facts.version}`,
    `Browser: ${facts.browser}`,
    `Window: ${facts.screen}`,
  ].join('\n')
}

/** A mailto: link that opens the tester's mail program with the report written. */
export function reportLink(description: string, facts: ReportFacts, to: string = REPORT_TO): string {
  const subject = `BioSketch ${facts.version}: problem report`
  return `mailto:${encodeURIComponent(to).replace(/%40/g, '@')}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportBody(description, facts))}`
}

/** The browser and system in a few words, read from the user agent (no other source is asked). */
export function browserName(ua: string): string {
  const system = /iPad|iPhone/.test(ua) ? 'iPadOS/iOS' : /Mac OS X/.test(ua) ? (/Mobile/.test(ua) ? 'iPadOS/iOS' : 'macOS') : /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : 'unknown system'
  const pick = (re: RegExp) => ua.match(re)?.[1]
  const edge = pick(/Edg\/([\d.]+)/)
  const firefox = pick(/Firefox\/([\d.]+)/) ?? pick(/FxiOS\/([\d.]+)/)
  const chrome = pick(/Chrome\/([\d.]+)/) ?? pick(/CriOS\/([\d.]+)/)
  const safari = /Safari\//.test(ua) ? pick(/Version\/([\d.]+)/) : undefined
  const name = edge ? `Edge ${edge}` : firefox ? `Firefox ${firefox}` : chrome ? `Chrome ${chrome}` : safari ? `Safari ${safari}` : 'another browser'
  return `${name} on ${system}`
}
