import { Link, useParams } from 'react-router'
import { useBreadcrumb } from '../../app/breadcrumb'
import { ArtistEditor } from './ArtistEditor'
import { useArtist } from './useArtists'

export default function ArtistEditorPage() {
  const { id } = useParams()
  const artist = useArtist(id)
  useBreadcrumb(!id ? 'New artist' : artist.data?.name ?? (artist.isError ? 'Unavailable' : 'Loading…'))

  if (id && artist.isPending) return <p role="status" className="m-0 text-13 text-muted">Loading artist</p>
  if (id && !artist.data) {
    return (
      <p role="alert" className="m-0 text-13 text-danger">
        Could not load this artist. <Link to="/artists" className="underline">Back to artists</Link>
      </p>
    )
  }
  return <ArtistEditor key={id ?? 'new'} artist={artist.data ?? null} />
}
