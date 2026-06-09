import {
  findHeaderColumnOffset,
  isHeaderField,
} from './headerDetection'

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function detectDelimiter(line: string): ',' | ';' | '\t' {
  const semicolons = (line.match(/;/g) ?? []).length
  const commas = (line.match(/,/g) ?? []).length
  const tabs = (line.match(/\t/g) ?? []).length
  if (tabs > semicolons && tabs > commas) return '\t'
  if (semicolons >= commas) return ';'
  return ','
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (!inQuotes && ch === delimiter) {
      fields.push(current)
      current = ''
      continue
    }
    current += ch
  }
  fields.push(current)
  return fields.map((f) => f.trim())
}

const MAX_HEADER_SCAN_LINES = 40

type HeaderInfo = {
  headerLineIndex: number
  delimiter: ',' | ';' | '\t'
  columnOffset: number
}

function findHeaderInfo(lines: string[]): HeaderInfo | null {
  const limit = Math.min(lines.length, MAX_HEADER_SCAN_LINES)

  for (let i = 0; i < limit; i++) {
    const delimiter = detectDelimiter(lines[i])
    const fields = parseCsvLine(lines[i], delimiter)
    if (!fields.some(isHeaderField)) continue

    return {
      headerLineIndex: i,
      delimiter,
      columnOffset: findHeaderColumnOffset(fields),
    }
  }

  return null
}

function sliceFromOffset(fields: string[], offset: number): string[] {
  return offset > 0 ? fields.slice(offset) : fields
}

export function parseDelimitedCsv(text: string): {
  headers: string[]
  records: Record<string, string>[]
} {
  const normalized = stripBom(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length === 0) {
    return { headers: [], records: [] }
  }

  const headerInfo = findHeaderInfo(lines)
  if (!headerInfo) {
    const delimiter = detectDelimiter(lines[0])
    const headers = parseCsvLine(lines[0], delimiter)
    const records: Record<string, string>[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = parseCsvLine(lines[i], delimiter)
      const record: Record<string, string> = {}
      headers.forEach((header, idx) => {
        record[header] = values[idx] ?? ''
      })
      records.push(record)
    }
    return { headers, records }
  }

  const { headerLineIndex, delimiter, columnOffset } = headerInfo
  const headerFields = sliceFromOffset(
    parseCsvLine(lines[headerLineIndex], delimiter),
    columnOffset
  )
  const headers = headerFields
  const records: Record<string, string>[] = []

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const values = sliceFromOffset(
      parseCsvLine(lines[i], delimiter),
      columnOffset
    )
    const record: Record<string, string> = {}
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? ''
    })
    records.push(record)
  }

  return { headers, records }
}
