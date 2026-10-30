import { ImageSlot } from '../../components/ui'
import type { AdminFair } from './types'

/** Read-only rendering of the first fair as the public card shows it. */
export function FairPreview({ fair }: { fair: AdminFair }) {
  return (
    <section aria-labelledby="fair-preview-h" className="flex flex-col gap-3">
      <h2 id="fair-preview-h" className="m-0 border-b border-line pb-2 text-12 font-medium uppercase tracking-eyebrow text-body">Preview on site</h2>
      <div className="flex flex-wrap gap-x-12 gap-y-6 border border-line bg-paper p-5 sm:p-8">
        <ImageSlot ratio="3/2" src={fair.image?.url} alt={fair.image?.alt} className="min-w-0 max-w-[520px] flex-[1_1_320px] border-0" />
        <div className="flex min-w-0 flex-[1_1_300px] flex-col justify-center gap-3.5">
          <p className="m-0 font-display text-[34px] leading-[1.02] sm:text-[44px]">{fair.title}</p>
          {fair.booth && <p className="m-0 text-14 text-muted">{fair.booth}</p>}
          {fair.where && <p className="m-0 text-14 text-muted">{fair.where}</p>}
          {fair.text && <p className="m-0 max-w-[560px] text-15 leading-[1.6] text-body">{fair.text}</p>}
        </div>
      </div>
    </section>
  )
}
