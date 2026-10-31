import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export type Option = { id: string; label: string }
const OPTIONS_LIMIT = 200

function useOptions(kind: 'exhibitions' | 'artists', labelKey: 'title' | 'name') {
  return useQuery({
    queryKey: ['options', kind],
    queryFn: async (): Promise<Option[]> => {
      const rows = await api.get<Array<Record<string, unknown>>>(`/${kind}?limit=${OPTIONS_LIMIT}`)
      return rows.map((r) => ({ id: String(r.id), label: String(r[labelKey]) }))
    },
  })
}

export const useExhibitionOptions = () => useOptions('exhibitions', 'title')
export const useArtistOptions = () => useOptions('artists', 'name')
