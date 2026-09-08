const VIDEO_URL_PATTERN = /\.(mp4|webm|mov|m4v)(\?|$)/i;

/**
 * Gallery entries carry no media-type column, so the kind is inferred from
 * the file extension on the stored URL. Keep this shared so the grid, the
 * detail dialog and any counts agree on what is a video.
 */
export function isVideoUrl(url: string): boolean {
  return VIDEO_URL_PATTERN.test(url);
}
