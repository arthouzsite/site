import { PageTitle } from './PageTitle'

type Props = { title: string; description: string; className?: string }

/** The heading block of a section page: its title and, when the CMS holds one, the description under it. */
export function PageIntro({ title, description, className = '' }: Props) {
  return (
    <header className={className}>
      <PageTitle>{title}</PageTitle>
      {description && <p className="mt-5 mb-0 max-w-[68ch] text-[16px] leading-[1.65] whitespace-pre-line text-body">{description}</p>}
    </header>
  )
}
