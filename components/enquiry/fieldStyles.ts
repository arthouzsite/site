/*
 * The site has no form inputs yet, so these derive from the search overlay's input (ink hairline underline, no
 * box, transparent) and the contact rows' label (small tracked uppercase muted). The site has no CSS reset, so
 * the browser's control defaults are cancelled explicitly. 16 px text keeps iOS from zooming on focus.
 */
const CONTROL_BASE =
  'm-0 block min-h-11 w-full min-w-0 rounded-none border-0 border-b border-solid border-line-30 bg-transparent px-0 py-2 [font-family:inherit] text-[16px] leading-[1.4] text-ink hover:border-ink focus:border-ink aria-[invalid=true]:border-danger'

export const CONTROL_CLASS = `${CONTROL_BASE} appearance-none`
/** Date inputs keep their native picker affordance. */
export const DATE_CONTROL_CLASS = CONTROL_BASE
export const TEXTAREA_CLASS = `${CONTROL_CLASS} min-h-[112px] resize-y`
export const READONLY_CLASS = `${CONTROL_CLASS} cursor-default border-line-14 text-body hover:border-line-14`
export const LABEL_CLASS = 'text-[11.5px] tracking-[0.18em] text-muted uppercase'
export const ERROR_CLASS = 'm-0 text-[14px] leading-[1.4] text-danger'
