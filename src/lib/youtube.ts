const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function getYouTubeVideoId(value: string | null | undefined) {
  const rawValue = value?.trim();
  if (!rawValue) return null;

  if (YOUTUBE_ID_PATTERN.test(rawValue)) return rawValue;

  try {
    const url = new URL(rawValue);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const pathParts = url.pathname.split('/').filter(Boolean);
      const id = pathParts[0] === 'watch'
        ? url.searchParams.get('v')
        : ['embed', 'shorts', 'live'].includes(pathParts[0])
          ? pathParts[1]
          : null;

      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }
  } catch {
    return null;
  }

  return null;
}

export function getYouTubeEmbedUrl(value: string | null | undefined) {
  const id = getYouTubeVideoId(value);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&iv_load_policy=3&disablekb=1` : null;
}

export function normalizeYouTubeUrl(value: string | null | undefined) {
  const rawValue = value?.trim();
  const id = getYouTubeVideoId(rawValue);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
