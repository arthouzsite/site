import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { ApiError } from '../../lib/api'
import { ExhibitionForm } from './ExhibitionForm'
import { useExhibition } from './useExhibitions'

export default function ExhibitionEditorPage() {
  const { id } = useParams()
  const query = useExhibition(id)
  const [saves, setSaves] = useState(0)

  if (!id) return <ExhibitionForm key="new" />
  if (query.data) {
    const ex = query.data
    // Remount only after a whole save succeeded, so a failed step never discards the editor's input.
    return <ExhibitionForm key={`${ex.id}:${saves}`} exhibition={ex} onSaved={() => setSaves((n) => n + 1)} />
  }
  const notFound = query.error instanceof ApiError && query.error.status === 404
  return (
    <div className="flex flex-col gap-4">
      <PageHead title="Exhibition" />
      {query.isError ? (
        <p role="alert" className="m-0 text-13 text-danger">
          {notFound ? 'This exhibition does not exist.' : 'Could not load the exhibition. Try again.'}{' '}
          <Link to="/exhibitions" className="underline">Back to exhibitions</Link>
        </p>
      ) : (
        <p role="status" className="m-0 text-13 text-muted">Loading…</p>
      )}
    </div>
  )
}
