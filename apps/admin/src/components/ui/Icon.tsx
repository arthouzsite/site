import type { SVGProps } from 'react'

const PATHS = {
  plus: <path d="M12 5v14M5 12h14" />,
  search: (<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>),
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  external: (<><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>),
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12l5 5 9-10" />,
  alert: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  eyeOff: (<><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 6.6C3.8 8.3 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 4-.9" /></>),
  dashboard: (<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>),
  exhibitions: (<><rect x="3" y="4" width="18" height="14" /><path d="M3 18l5-6 4 4 3-3 6 5" /></>),
  artists: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  fairs: (<><path d="M3 21h18M5 21V8l7-4 7 4v13" /><path d="M9 21v-6h6v6" /></>),
  news: (<><path d="M4 5h13v14H4z" /><path d="M17 9h3v8a2 2 0 0 1-2 2H6" /><path d="M7 9h7M7 13h7" /></>),
  locations: (<><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  about: (<><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h6M9 16h6" /></>),
  settings: (<><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="8" cy="18" r="2" /></>),
  media: (<><rect x="3" y="5" width="18" height="14" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-5-8 8" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" /><circle cx="17.5" cy="9" r="2.5" /><path d="M22 19c0-2.5-2-4-4.5-4" /></>),
  copy: (<><rect x="8" y="8" width="12" height="12" /><path d="M16 8V4H4v12h4" /></>),
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
} as const

export type IconName = keyof typeof PATHS

type Props = Omit<SVGProps<SVGSVGElement>, 'name'> & { name: IconName }

export function Icon({ name, className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className ?? ''}`}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
