import { Link, useParams } from 'react-router'
import { PageHead } from '../../components/PageHead'
import { ApiError } from '../../lib/api'
import { ExhibitionForm } from './ExhibitionForm'
import { useExhibition } from './useExhibitions'

export default function ExhibitionEditorPage() {
  const { id } = useParams()
  const query = useExhibition(id)

  if (!id) return <ExhibitionForm key="new" />
  if (query.data) {
    const ex = query.data
    // Remount on server changes so defaults, artists and the hero reflect what was saved.
    return <ExhibitionForm key={`${ex.id}:${ex.updatedAt}:${ex.artists.map((a) => a.artistId).join(',')}`} exhibition={ex} />
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
