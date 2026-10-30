import type { ReactNode } from 'react'
import type { PublicService } from '@arthouz/shared'
import { telHref } from '@/lib/format'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-[6px] border-t border-line-18 py-4 last:border-b">
      <dt className="flex-[0_0_96px] pt-[3px] text-[11.5px] tracking-[0.18em] text-muted uppercase">{label}</dt>
      <dd className="m-0 flex-[1_1_200px] text-[16px] leading-[1.5]">{children}</dd>
    </div>
  )
}

/** Sales contact lines of a service; renders nothing unless at least one is set. */
export function ServiceContact({ contact }: { contact: PublicService['contact'] }) {
  const { name, phone, email } = contact
  if (!name && !phone && !email) return null
  return (
    <section aria-labelledby="service-contact" className="flex flex-col gap-3">
      <h2 id="service-contact" className="m-0 text-[12px] font-normal tracking-[0.18em] text-rust uppercase">
        Contact
      </h2>
      <dl className="m-0 flex flex-col">
        {name && <Row label="Name">{name}</Row>}
        {phone && (
          <Row label="Call">
            <a href={telHref(phone)} className="hit-44">
              {phone}
            </a>
          </Row>
        )}
        {email && (
          <Row label="Email">
            <a href={`mailto:${email}`} className="hit-44 break-all">
              {email}
            </a>
          </Row>
        )}
      </dl>
    </section>
  )
}
