import { createContext, useContext } from 'react'

export type CardHandle = { save: () => Promise<boolean> }
export type CardRegistry = {
  setHandle: (id: string, handle: CardHandle | null) => void
  setDirty: (id: string, dirty: boolean) => void
}

/** Lets the page-level "Save settings" bar find and save every dirty card. */
export const CardRegistryContext = createContext<CardRegistry | null>(null)
export const useCardRegistry = () => useContext(CardRegistryContext)
