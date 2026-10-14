import { readFile } from 'node:fs/promises'
import path from 'node:path'
import type { LegalSlug } from '@/lib/legalPages'

export type LegalBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; lines: string[] }
  | { type: 'list'; items: string[] }

/** Liest `content/legal/<slug>.md`; `null`, wenn es die Datei nicht gibt oder sie leer ist */
export async function readLegalText(slug: LegalSlug): Promise<string | null> {
  try {
    const text = await readFile(path.join(process.cwd(), 'content', 'legal', `${slug}.md`), 'utf8')
    return text.trim() ? text : null
  } catch {
    return null
  }
}

/**
 * Zerlegt einen einfachen Text in Überschriften (`#`, `##`, `###`), Listen (`- `) und
 * Absätze (durch Leerzeile getrennt). Bewusst kein vollständiges Markdown – der Text wird
 * als reiner Text ausgegeben, HTML darin bleibt wirkungslos.
 */
export function parseLegalText(text: string): LegalBlock[] {
  const blocks: LegalBlock[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', lines: paragraph })
    if (list.length > 0) blocks.push({ type: 'list', items: list })
    paragraph = []
    list = []
  }

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] })
    } else if (line === '') {
      flush()
    } else if (/^[-*]\s+/.test(line)) {
      if (paragraph.length > 0) flush()
      list.push(line.replace(/^[-*]\s+/, ''))
    } else {
      if (list.length > 0) flush()
      paragraph.push(line)
    }
  }
  flush()
  return blocks
}
