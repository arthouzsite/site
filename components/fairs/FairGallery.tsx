import type { PublicFairDetail } from '@/lib/shared'
import { ImageSlot } from '@/components/site/ImageSlot'
import { SectionRule } from '@/components/site/SectionRule'

const GALLERY_IMAGE_SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw'

/** Every gallery image of a fair in upload order; nothing at all when the fair has none. */
export function FairGallery({ images, title }: { images: PublicFairDetail['gallery']; title: string }) {
  if (images.length === 0) return null
  return (
    <section aria-label={`${title} gallery`}>
      <SectionRule as="h2" title="Gallery" className="mb-8" />
      <ul className="m-0 grid list-none gap-[clamp(16px,2vw,28px)] p-0" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,300px),1fr))' }}>
        {images.map((image, index) => (
          <li key={`${image.url}-${index}`}>
            <ImageSlot image={image} ratio="3/2" sizes={GALLERY_IMAGE_SIZES} placeholder={title} />
          </li>
        ))}
      </ul>
    </section>
  )
}
