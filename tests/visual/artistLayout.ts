import { putSetting } from './admin-settings'

export type ArtistIndexLayout = 'GROUPED' | 'FLOWING'

/** Sets the artist index layout through the CMS API, which revalidates the cached artist pages. */
export async function setArtistIndexLayout(value: ArtistIndexLayout): Promise<void> {
  await putSetting('artistIndexLayout', value)
}
