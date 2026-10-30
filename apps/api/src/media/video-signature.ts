import { VIDEO_MIMES, type VideoMime } from './media.constants'

const FTYP = Buffer.from('ftyp')
const FTYP_OFFSET = 4
const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3])

export function isVideoMime(mime: string): mime is VideoMime {
  return (VIDEO_MIMES as readonly string[]).includes(mime)
}

/** MP4 and MOV start with an ISO base-media box whose type is `ftyp`; WebM starts with the EBML magic. */
export function hasVideoSignature(buffer: Buffer, mime: VideoMime): boolean {
  if (mime === 'video/webm') return buffer.subarray(0, EBML_MAGIC.length).equals(EBML_MAGIC)
  return buffer.subarray(FTYP_OFFSET, FTYP_OFFSET + FTYP.length).equals(FTYP)
}
