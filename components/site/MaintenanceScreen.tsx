import { loadFooterData } from '@/lib/footer-data'
import { currentYear } from '@/lib/site-clock'
import { Wordmark } from './Wordmark'

const GUTTER = 'px-[clamp(20px,4vw,56px)]'
/** The one gallery whose phone number is shown while the home page is under maintenance. */
const CONTACT_CITY = 'Chennai'
const WIRE_PATH = 'M0 60 100 0 200 60'

const telHref = (phone: string): string => `tel:${phone.replace(/[^\d+]/g, '')}`

/** The empty frame under the picture light: the site as a gallery wall between two hangings. */
function EmptyWall({ year }: { year: number }) {
  return (
    <div
      role="img"
      aria-label="An empty picture frame on the gallery wall, waiting for its next work"
      className="relative grid justify-items-center overflow-hidden bg-imgph/50 px-[clamp(16px,3vw,40px)] py-[clamp(28px,3.4vw,48px)]"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_62%_78%_at_50%_0%,var(--color-surface),transparent_70%)]" />
      <div className="relative h-[clamp(40px,5vw,64px)] w-[min(58%,230px)]">
        <svg viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true" className="block h-full w-full overflow-visible">
          <path d={WIRE_PATH} fill="none" stroke="var(--color-line-30)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute -top-[3px] left-1/2 -ml-[3.5px] block h-[7px] w-[7px] rounded-full bg-ink" />
      </div>
      <div className="relative aspect-[4/5] w-[min(100%,330px)] border-[clamp(10px,1.3vw,16px)] border-solid border-ink bg-surface p-[clamp(22px,3.4vw,40px)] shadow-[0_28px_40px_-18px_var(--color-scrim)]">
        <div className="relative h-full bg-imgph/50 shadow-[inset_0_0_0_1px_var(--color-line-16)]">
          <span className="absolute top-[14%] bottom-[14%] left-1/2 w-px bg-line-30" />
          <span className="absolute top-1/2 right-[14%] left-[14%] h-px bg-line-30" />
          <span className="absolute top-1/2 left-1/2 -mt-[6.5px] -ml-[6.5px] block h-[13px] w-[13px] rounded-full border border-solid border-rust bg-paper" />
        </div>
      </div>
      <div className="relative mt-5 w-[min(100%,300px)] bg-surface px-[18px] pt-4 pb-[18px] shadow-[0_10px_22px_-12px_var(--color-scrim),0_0_0_1px_var(--color-line-16)] nav:-mt-9 nav:mr-[clamp(0px,1.5vw,20px)] nav:w-[min(100%,250px)] nav:justify-self-end">
        <p className="m-0 font-display text-[19px] leading-[1.2] font-medium">Website maintenance</p>
        <p className="mt-1 mb-0 font-display text-[16px] leading-[1.35] text-body italic">Art Houz, {year}</p>
      </div>
    </div>
  )
}

/**
 * Shown in place of the home page during a maintenance break: no navigation, the reason, and how to reach
 * the galleries meanwhile.
 */
export async function MaintenanceScreen() {
  const { locations } = await loadFooterData()
  const reachable = locations.filter((location) => location.phone && location.city === CONTACT_CITY)

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr_auto]">
      <header className={`flex items-center justify-between gap-6 border-b border-solid border-line-16 py-[22px] ${GUTTER}`}>
        <Wordmark />
        <p className="m-0 flex items-center gap-[10px] text-[12.5px] tracking-[0.04em] text-muted">
          <span aria-hidden="true" className="block h-2 w-2 rounded-full bg-amber" />
          Closed for maintenance
        </p>
      </header>

      <main className={`grid items-center gap-[clamp(32px,6vw,96px)] py-[clamp(32px,4.5vw,64px)] nav:grid-cols-2 ${GUTTER}`}>
        <div className="max-w-[560px]">
          <h1 className="m-0 font-display text-[clamp(44px,6.4vw,92px)] leading-[0.98] font-normal tracking-[-0.015em] text-balance">
            Work in progress
          </h1>
          <p className="mt-[clamp(20px,2.4vw,32px)] mb-0 max-w-[30em] font-display text-[clamp(19px,1.6vw,23px)] leading-[1.5] text-pretty text-body">
            The Art Houz website is closed for a short maintenance break while new work goes up on the walls. It will be open again soon.
          </p>
        </div>
        <EmptyWall year={currentYear()} />
      </main>

      <footer className={`flex flex-wrap items-baseline justify-between gap-x-10 gap-y-3 border-t border-solid border-line-16 pt-5 pb-6 text-[13px] text-muted ${GUTTER}`}>
        <ul className="m-0 flex list-none flex-wrap gap-x-9 gap-y-2 p-0">
          {reachable.map((location) => (
            <li key={location.id}>
              <span className="font-medium text-ink">{location.city}</span>{' '}
              <a href={telHref(location.tel ?? location.phone)} className="text-muted underline-offset-[3px] hover:text-ink">
                {location.phone}
              </a>
            </li>
          ))}
        </ul>
        <span>The gallery is open as usual.</span>
      </footer>
    </div>
  )
}
