import type {
  PublicAbout, PublicArtist, PublicArtistDetail, PublicArtistList, PublicExhibition, PublicExhibitionDetail,
  PublicFair, PublicHome, PublicImage, PublicLocation, PublicNews, PublicService,
} from '@arthouz/shared'

export const image: PublicImage = { url: 'https://picsum.photos/seed/a/1200/800', thumbUrl: 'https://picsum.photos/seed/a/480/320', width: 1200, height: 800, alt: 'Installation view' }

export const exhibition: PublicExhibition = {
  id: 'e1', slug: 'salt-line', title: 'Salt Line', subtitle: 'New work on paper', city: 'Chennai', country: 'India',
  type: 'SOLO', status: 'CURRENT', statusLabel: 'Now on view', datesLabel: '1 Nov – 20 Dec 2026', venue: 'Art Houz Chennai',
  blurb: 'Drawings from the salt pans.', body: 'A solo presentation.', artistLine: 'Parvathi Nayar',
  artists: [{ name: 'Parvathi Nayar', slug: 'parvathi-nayar' }], image,
}

export const upcomingExhibition: PublicExhibition = { ...exhibition, id: 'e2', slug: 'tide-table', title: 'Tide Table', status: 'UPCOMING', image: null }
export const pastExhibition: PublicExhibition = { ...exhibition, id: 'e3', slug: 'old-show', title: 'Old Show', status: 'PAST', country: 'Singapore' }

export const exhibitionDetail: PublicExhibitionDetail = {
  ...exhibition,
  meta: [{ k: 'Opening', v: '1 Nov 2026' }, { k: 'Venue', v: 'Art Houz Chennai' }],
  works: [{ id: 'w1', title: 'Kolam', year: '2026', artist: 'Parvathi Nayar', medium: 'Ink on paper', image }],
  press: [{ slug: 'p1', title: 'A review', excerpt: 'Worth the trip.', monthLabel: 'Nov 2026' }],
}

export const artist: PublicArtist = {
  id: 'a1', slug: 'parvathi-nayar', name: 'Parvathi Nayar', sortName: 'Nayar, Parvathi', medium: 'Drawing', base: 'Chennai',
  born: '1967', lede: 'Lede text.', bio: 'Biography text.', image, indexLetter: 'N',
}

export const artistDetail: PublicArtistDetail = {
  ...artist,
  exhibitions: [{ slug: 'salt-line', title: 'Salt Line', city: 'Chennai', status: 'CURRENT' }],
  works: [{ id: 'w1', title: 'Kolam', year: '2026', medium: 'Ink on paper', size: '30 x 40 cm', image }],
}

export const artistList: PublicArtistList = {
  featured: [artist],
  groups: [{ letter: 'N', items: [artist] }],
  flat: [artist],
  layout: 'GROUPED',
}

export const fair: PublicFair = { id: 'f1', slug: 'f1', title: 'India Art Fair', where: 'New Delhi', booth: 'Booth A1', text: 'Fair text.', image }

export const location: PublicLocation = {
  id: 'l1', slug: 'chennai', city: 'Chennai', address: '1 Main Road', phone: '+91 44 0000 0000', tel: 'tel:+914400000000',
  days: 'Mon – Sat', hours: '10 am – 6 pm', mapUrl: 'https://maps.example/chennai', image,
}

export const news: PublicNews = {
  id: 'n1', slug: 'n1', title: 'In the press', excerpt: 'Excerpt', monthLabel: 'Oct 2026', externalUrl: 'https://press.example/a',
  exhibition: { slug: 'salt-line', title: 'Salt Line' }, image,
}

export const home: PublicHome = {
  hero: exhibition,
  heroLayout: 'SPLIT',
  upcoming: upcomingExhibition,
  recent: [exhibition, pastExhibition],
  world: [pastExhibition],
  focus: { artist: { slug: artist.slug, name: artist.name }, text: 'Focus text.', mediumLabel: 'Drawing', baseLabel: 'Chennai', image },
  artistsLine: [{ name: artist.name, slug: artist.slug }],
  locations: [location],
  news: [news],
}

export const about: PublicAbout = {
  gallery: { statement: 'Statement.', body: 'Gallery body.', locationsLabel: 'Our locations', image },
  proprietor: { eyebrow: 'Proprietor', name: 'A. Person', quote: 'A quote.', body: 'Proprietor body.', image },
  services: { title: 'Framing', body: 'Services body.', ctaLabel: 'Enquire', image },
  publications: { title: 'Arts Illustrated', body: 'Publications body.', externalUrl: 'https://pub.example', image },
}

export const service: PublicService = {
  slug: 'art-sales', title: 'Art sales', summary: 'Acquire work from our artists.', body: 'First paragraph.\n\nSecond paragraph.',
  image, ctaLabel: 'Enquire →', ctaHref: '',
  contact: { name: 'A. Seller', phone: '+914411112222', email: 'sales@arthouz.example' },
}

export const bareService: PublicService = {
  ...service, slug: 'gallery-on-rent', title: 'Gallery on rent', summary: '', body: '', image: null,
  contact: { name: '', phone: '', email: '' },
}

export const publicServiceList: PublicService[] = [service, bareService, { ...service, slug: 'art-for-rent', title: 'Art for rent' }]
