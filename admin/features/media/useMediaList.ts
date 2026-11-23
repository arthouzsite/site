import { useState } from 'react'
import type { MoveDirection } from '../../components/ui/OrderedList'
import { useToast } from '../../lib/toast'
import type { MediaRef } from './types'

type Options = {
  images: MediaRef[]
  onChange: (images: MediaRef[]) => void
  max: number
  limitMessage: string
  duplicateMessage: string
}

/** An ordered, capped list of media picked one at a time: the picker, the duplicate and limit checks, move and remove. */
export function useMediaList({ images, onChange, max, limitMessage, duplicateMessage }: Options) {
  const toast = useToast()
  const [picking, setPicking] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const isFull = images.length >= max

  const open = () => {
    if (isFull) return toast.error(limitMessage)
    setPicking(true)
  }

  const add = (ref: MediaRef) => {
    setPicking(false)
    if (isFull) return toast.error(limitMessage)
    if (images.some((image) => image.id === ref.id)) return toast.error(duplicateMessage)
    onChange([...images, ref])
  }

  const move = (id: string, dir: MoveDirection) => {
    const from = images.findIndex((image) => image.id === id)
    const to = dir === 'up' ? from - 1 : from + 1
    const target = images[to]
    const moved = images[from]
    if (!target || !moved) return
    onChange(images.map((image, i) => (i === from ? target : i === to ? moved : image)))
  }

  const confirmRemove = () => {
    onChange(images.filter((image) => image.id !== removing))
    setRemoving(null)
  }

  return { picking, removing, open, add, move, confirmRemove, closePicker: () => setPicking(false), askRemove: setRemoving, cancelRemove: () => setRemoving(null) }
}
