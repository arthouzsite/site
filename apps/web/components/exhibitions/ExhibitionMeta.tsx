import type { PublicExhibitionDetail } from '@arthouz/shared'

export function ExhibitionMeta({ meta }: { meta: PublicExhibitionDetail['meta'] }) {
  return (
    <dl className="m-0 flex flex-[0_1_320px] flex-col">
      {meta.map(({ k, v }) => (
        <div key={k} className="flex flex-col gap-[6px] border-t border-line-18 py-4">
          <dt className="text-[11.5px] tracking-[0.18em] text-muted uppercase">{k}</dt>
          <dd className="m-0 text-[16px] leading-[1.45]">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
