import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import LegalLinks from '@/components/LegalLinks'
import { parseLegalText, readLegalText } from '@/lib/legalContent'
import { LEGAL_PAGES, type LegalSlug } from '@/lib/legalPages'

const URL_PATTERN = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g

/** Macht Adressen im Text anklickbar – alles andere bleibt reiner Text */
function withLinks(text: string) {
  return text.split(URL_PATTERN).map((part, index) => {
    if (index % 2 === 0) return part
    const href = part.includes('://') ? part : `mailto:${part}`
    return (
      <a key={index} href={href} className="text-accent underline [overflow-wrap:anywhere]">
        {part}
      </a>
    )
  })
}

/** Seite für einen Rechtstext aus `content/legal/<slug>.md`; ohne Datei gibt es die Seite nicht */
export default async function LegalPage({ slug }: { slug: LegalSlug }) {
  const text = await readLegalText(slug)
  if (!text) notFound()

  const title = LEGAL_PAGES.find((page) => page.slug === slug)!.label
  const blocks = parseLegalText(text)
  const hasOwnTitle = blocks[0]?.type === 'heading' && blocks[0].level === 1

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 md:py-8">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-secondary transition-colors duration-feedback hover:text-accent"
        >
          <ArrowLeftIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Zur Startseite
        </Link>

        <article className="card mt-2 space-y-4 p-5 md:p-6">
          {!hasOwnTitle && <h1 className="page-title">{title}</h1>}
          {blocks.map((block, index) => {
            if (block.type === 'heading') {
              if (block.level === 1) {
                return (
                  <h1 key={index} className="page-title">
                    {block.text}
                  </h1>
                )
              }
              const Tag = block.level === 2 ? 'h2' : 'h3'
              return (
                <Tag
                  key={index}
                  className={
                    block.level === 2
                      ? 'pt-2 text-lg font-semibold text-primary'
                      : 'text-sm font-semibold text-primary'
                  }
                >
                  {block.text}
                </Tag>
              )
            }
            if (block.type === 'list') {
              return (
                <ul key={index} className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-primary">
                  {block.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{withLinks(item)}</li>
                  ))}
                </ul>
              )
            }
            return (
              <p key={index} className="text-sm leading-relaxed text-primary">
                {block.lines.map((line, lineIndex) => (
                  <span key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {withLinks(line)}
                  </span>
                ))}
              </p>
            )
          })}
        </article>

        <LegalLinks className="mt-6 justify-center" />
      </div>
    </div>
  )
}
