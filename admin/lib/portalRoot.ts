/**
 * Where dialogs portal to. Inside `.admin-root` the CMS reset, fonts and tokens (scoped there so they cannot touch the
 * public site) still apply; outside it, e.g. in unit tests that render without the layout, `document.body` is used.
 */
export function portalRoot(): HTMLElement {
  return document.querySelector<HTMLElement>('.admin-root') ?? document.body
}
