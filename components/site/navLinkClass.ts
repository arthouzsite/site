/** Desktop navigation link: uppercase, active section in rust with a 1 px underline. */
export function navLinkClass(isCurrent: boolean): string {
  return `hit-44 border-b py-[6px] text-[12.5px] tracking-[0.16em] uppercase ${isCurrent ? 'border-rust text-rust' : 'border-transparent text-ink'}`
}
