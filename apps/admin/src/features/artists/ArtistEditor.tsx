import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { Button, ErrorSummary, Icon, StatusChip } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import { ImageField } from '../media/ImageField'
import type { MediaRef } from '../media/types'
import { artistInputSchema, defaultsFrom, toPayload, type ArtistFormValues } from './artistForm'
import { ExhibitionsCard } from './ExhibitionsCard'
import { ProfileCard } from './ProfileCard'
import { SectionCard } from './SectionCard'
import { TextCard } from './TextCard'
import type { AdminArtist } from './types'
import { useSaveArtist } from './useArtists'
import { useSubmitSummary } from './useSubmitSummary'
import { VisibilityCard } from './VisibilityCard'
import { WorksGrid } from './WorksGrid'

export function ArtistEditor({ artist }: { artist: AdminArtist | null }) {
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveArtist(artist?.id ?? null)
  const summary = useSubmitSummary<ArtistFormValues>('name')
  const form = useZodForm(artistInputSchema, defaultsFrom(artist))
  const [portrait, setPortrait] = useState<MediaRef | null>(artist?.portraitImage ?? null)
  const { handleSubmit, reset, setValue, formState: { isDirty } } = form

  const onSubmit = handleSubmit(async (values) => {
    summary.clear()
    try {
      const saved = await save.mutateAsync(toPayload(values))
      toast.success(`Saved · ${saved.name}`)
      if (artist) reset(defaultsFrom(saved))
      else navigate(`/artists/${saved.id}`, { replace: true })
    } catch (err) {
      form.applyServerErrors(err)
      summary.fromServer(err instanceof ApiError ? err.fields : undefined, err instanceof ApiError ? err.message : 'Could not save this artist.')
    }
  }, summary.fromInvalid)

  const choosePortrait = (ref: MediaRef | null) => {
    setPortrait(ref)
    setValue('portraitImageId', ref?.id ?? null, { shouldDirty: true })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <Link to="/artists" className="inline-flex min-h-11 items-center gap-2 self-start text-13 text-muted hover:text-ink">
        <Icon name="chevron" className="rotate-180" /> Artists
      </Link>
      <PageHead
        title={artist?.name ?? 'New artist'}
        subtitle={undefined}
        actions={
          <>
            {artist && <StatusChip status={artist.isPublished ? 'live' : 'draft'} label={artist.isPublished ? 'Published' : 'Draft'} />}
            <Button type="submit" variant="primary" disabled={save.isPending}>Save</Button>
          </>
        }
      />
      <ErrorSummary errors={summary.errors} focusKey={summary.focusKey} />
      <div className="grid items-start gap-8 min-[1100px]:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfileCard form={form} isNew={!artist} />
          <TextCard form={form} />
          <WorksGrid artistId={artist?.id ?? null} disabled={!artist} />
          {artist && <ExhibitionsCard artist={artist} />}
        </div>
        <aside aria-label="Portrait and visibility" className="flex flex-col gap-4 min-[1100px]:sticky min-[1100px]:top-[88px]">
          <SectionCard title="Portrait">
            <ImageField label="Portrait image" ratio="4/5" value={portrait} onChange={choosePortrait} />
          </SectionCard>
          <VisibilityCard artist={artist} dirty={isDirty} />
        </aside>
      </div>
    </form>
  )
}
