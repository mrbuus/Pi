import { BadRequestException } from '@nestjs/common';
const ID = /^[A-Za-z0-9_-]{11}$/;
export type MediaSource = {
  kind: 'YOUTUBE' | 'DIRECT';
  url: string;
  embedUrl: string | null;
};
/** Exact HTTPS origins, no hostname substring or arbitrary iframe acceptance. */
export function safeMediaSource(
  input: string,
  trustedOrigins = process.env.TRUSTED_VIDEO_ORIGINS ?? '',
): MediaSource {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new BadRequestException('Бичлэгийн HTTPS холбоос буруу');
  }
  if (
    input.length > 2048 ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  )
    throw new BadRequestException('Зөв HTTPS бичлэгийн холбоос шаардлагатай');
  const host = url.hostname;
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.slice(1);
  else if (
    [
      'youtube.com',
      'www.youtube.com',
      'm.youtube.com',
      'www.youtube-nocookie.com',
    ].includes(host)
  ) {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(embed|shorts)\//.test(url.pathname))
      id = url.pathname.split('/')[2] ?? null;
    if (url.pathname.split('/').length > 3) id = null;
  }
  if (id && ID.test(id))
    return {
      kind: 'YOUTUBE',
      url: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&playsinline=1`,
    };
  const origins = trustedOrigins
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (origins.includes(url.origin) && /\.(mp4|webm)$/i.test(url.pathname))
    return { kind: 'DIRECT', url: url.toString(), embedUrl: null };
  throw new BadRequestException(
    'YouTube эсвэл тохируулсан итгэмжлэгдсэн MP4/WebM эх сурвалж шаардлагатай',
  );
}
