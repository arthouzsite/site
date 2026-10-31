import type { PublicNews } from '@/lib/shared'
import { ImageSlot } from '@/components/site/ImageSlot'
import { TextLink } from '@/components/site/TextLink'

const TAMIL_CHARACTERS = /[஀-௿]/
const IMAGE_SIZES = '(min-width: 1024px) 320px, 100vw'
const LINK_CLASS = 'hit-44'

/** One press item: 4:3 image, month, title (Tamil-aware), excerpt, and its links. */
export function NewsArticle({ item }: { item: PublicNews }) {
  const lang = TAMIL_CHARACTERS.test(item.title) ? 'ta' : undefined
  return (
    <article className="flex flex-wrap gap-x-[clamp(24px,4vw,64px)] gap-y-6 border-t border-line-18 py-9">
      <ImageSlot image={item.image} ratio="4/3" sizes={IMAGE_SIZES} placeholder="Press image" className="min-w-[min(100%,220px)] flex-[0_1_320px]" />
      <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[14px]">
        <div className="text-[12px] tracking-[0.16em] text-muted uppercase">{item.monthLabel}</div>
        <h2 lang={lang} className="m-0 font-display-tamil text-[clamp(26px,2.6vw,38px)] leading-[1.12] font-normal text-balance">
          {item.title}
        </h2>
        <p className="m-0 max-w-[760px] text-[15.5px] leading-[1.65] text-pretty text-body">{item.excerpt}</p>
        <div className="mt-1 flex flex-wrap gap-x-7 gap-y-3">
          {item.externalUrl && (
            <a
              href={item.externalUrl}
              target="_blank"
              rel="noopener"
              className={`${LINK_CLASS} border-b border-current pb-1 text-[12.5px] tracking-[0.16em] uppercase`}
            >
              Read article ↗
            </a>
          )}
          {item.exhibition && (
            <TextLink href={`/exhibitions/${item.exhibition.slug}`} underline className={LINK_CLASS}>
              View exhibition →
            </TextLink>
          )}
        </div>
      </div>
    </article>
  )
}
