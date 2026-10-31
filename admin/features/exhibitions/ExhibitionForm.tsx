import { exhibitionInputSchema, type ExhibitionInput } from '@/lib/shared'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorSummary, Icon, StatusChip } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useToast } from '../../lib/toast'
import { useZodForm } from '../../lib/useZodForm'
import type { MediaRef } from '../media/types'
import { ArtistsPicker } from './ArtistsPicker'
import { DatesCard, previewDates } from './DatesCard'
import { DeleteCard } from './DeleteCard'
import { DetailsCard } from './DetailsCard'
import { summaryErrors } from './formErrors'
import { defaultValues, FIELD_PROMPTS, valuesFromExhibition, type ExhibitionFormValues } from './formValues'
import { HeroCard } from './HeroCard'
import { PressCard } from './PressCard'
import { PublishCard } from './PublishCard'
import { TextCard } from './TextCard'
import { STATUS_TO_CHIP, type AdminExhibition, type ArtistLite } from './types'
import { ArtistsNotSavedError, useCreateExhibition, useDeleteExhibition, usePublishExhibition, useSaveExhibition } from './useExhibitions'
import { WorksCard } from './WorksCard'

const FORM_ID = 'exhibition-form'

const toArtistLites = (ex?: AdminExhibition): ArtistLite[] => (ex?.artists ?? []).map((a) => ({ id: a.artist.id, name: a.artist.name }))
const sameIds = (a: ArtistLite[], b: ArtistLite[]) => a.length === b.length && a.every((x, i) => x.id === b[i]?.id)
const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Try again.')

/** `exhibition` is undefined on /exhibitions/new. */
type Props = { exhibition?: AdminExhibition; onSaved?: () => void }

export function ExhibitionForm({ exhibition, onSaved }: Props) {
  const isNew = !exhibition
  const navigate = useNavigate()
  const toast = useToast()
  const form = useZodForm(exhibitionInputSchema, exhibition ? valuesFromExhibition(exhibition) : defaultValues())
  const { errors, submitCount, isDirty } = form.formState
  const savedArtists = toArtistLites(exhibition)
  const [artists, setArtists] = useState<ArtistLite[]>(savedArtists)
  const [hero, setHero] = useState<MediaRef | null>(exhibition?.heroImage ?? null)
  const create = useCreateExhibition()
  const saveExisting = useSaveExhibition(exhibition?.id ?? '')
  const publish = usePublishExhibition()
  const remove = useDeleteExhibition()

  const [startDate, endDate, statusOverride, slug, title] = form.watch(['startDate', 'endDate', 'statusOverride', 'slug', 'title'])
  const status = previewDates(startDate, endDate, statusOverride ?? null)?.status ?? exhibition?.status ?? null
  const dirty = isDirty || !sameIds(artists, savedArtists)

  // The resolver hands back the parsed output (dates as Date), not the raw input type RHF is typed with.
  const save = form.handleSubmit(async (raw: ExhibitionFormValues) => {
    const values = raw as unknown as ExhibitionInput
    const body: ExhibitionInput = {
      ...values,
      artistIds: artists.map((a) => a.id),
      isPublished: exhibition?.isPublished ?? false,
      sortOrder: exhibition?.sortOrder ?? 0,
    }
    try {
      if (!exhibition) {
        const created = await create.mutateAsync(body)
        toast.success(`Saved · ${values.title}`)
        navigate(`/exhibitions/${created.id}`, { replace: true })
        return
      }
      await saveExisting.mutateAsync({ body, artists: sameIds(artists, savedArtists) ? null : artists })
      toast.success(`Saved · ${values.title}`)
      onSaved?.()
    } catch (err) {
      if (err instanceof ArtistsNotSavedError) {
        // Details are saved: mark the form clean but keep the unsaved artist order for a retry.
        form.reset(form.getValues())
        toast.error(err.message)
        return
      }
      form.applyServerErrors(err)
      if (!(err instanceof ApiError && err.fields)) toast.error(messageOf(err))
    }
  })

  const togglePublished = (next: boolean) => {
    if (!exhibition) return
    publish.mutate(
      { id: exhibition.id, isPublished: next },
      {
        onSuccess: () => toast.success(`${next ? 'Published' : 'Unpublished'} · ${exhibition.title}`),
        onError: (err) => toast.error(messageOf(err)),
      },
    )
  }

  const deleteExhibition = async () => {
    if (!exhibition) return
    try {
      await remove.mutateAsync(exhibition.id)
      toast.success(`Deleted · ${exhibition.title}`)
      navigate('/exhibitions')
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  const changeHero = (ref: MediaRef | null) => {
    setHero(ref)
    form.setValue('heroImageId', ref?.id ?? null, { shouldDirty: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="flex flex-col gap-2">
          <Link to="/exhibitions" className="inline-flex min-h-11 items-center gap-1.5 self-start text-13 text-muted hover:text-ink">
            <Icon name="chevron" className="rotate-180" /> Exhibitions
          </Link>
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="m-0 font-display text-32 font-normal leading-none sm:text-40">{exhibition?.title ?? 'New exhibition'}</h1>
            {status && <StatusChip status={STATUS_TO_CHIP[status]} />}
          </div>
        </div>
        <Button variant="primary" type="submit" form={FORM_ID} disabled={create.isPending || saveExisting.isPending}>Save</Button>
      </header>

      <ErrorSummary errors={summaryErrors(errors, FIELD_PROMPTS)} focusKey={submitCount} />

      <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6 max-[1100px]:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-6">
          <form id={FORM_ID} onSubmit={save} noValidate className="flex flex-col gap-6">
            <DetailsCard form={form} isNew={isNew} />
            <DatesCard form={form} />
            <TextCard form={form} />
          </form>
          <ArtistsPicker value={artists} onChange={setArtists} />
          <WorksCard exhibitionId={exhibition?.id} artists={savedArtists} />
          <PressCard exhibitionId={exhibition?.id} title={title} />
        </div>
        <aside aria-label="Image and publishing" className="flex flex-col gap-6">
          <HeroCard value={hero} onChange={changeHero} />
          <PublishCard
            status={status}
            isPublished={exhibition?.isPublished ?? false}
            isSaved={!isNew}
            dirty={dirty}
            busy={publish.isPending}
            updatedAt={exhibition?.updatedAt ?? null}
            slug={exhibition ? (slug ?? exhibition.slug) : null}
            onTogglePublished={togglePublished}
          />
          {exhibition && <DeleteCard title={exhibition.title} slug={exhibition.slug} busy={remove.isPending} onDelete={deleteExhibition} />}
        </aside>
      </div>
    </div>
  )
}
