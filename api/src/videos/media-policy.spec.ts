import { safeMediaSource } from './media-policy';
describe('video media policy', () => {
  it.each([
    'https://youtu.be/AbCdEfGhI_1',
    'https://www.youtube.com/watch?v=AbCdEfGhI_1&t=30',
    'https://www.youtube.com/embed/AbCdEfGhI_1?autoplay=1',
    'https://www.youtube-nocookie.com/embed/AbCdEfGhI_1',
    'https://www.youtube.com/shorts/AbCdEfGhI_1',
  ])('canonicalizes %s without injected playback parameters', (url) => {
    expect(safeMediaSource(url)).toEqual({
      kind: 'YOUTUBE',
      url: 'https://www.youtube.com/watch?v=AbCdEfGhI_1',
      embedUrl:
        'https://www.youtube-nocookie.com/embed/AbCdEfGhI_1?autoplay=0&playsinline=1',
    });
  });
  it.each([
    'http://youtube.com/watch?v=AbCdEfGhI_1',
    'https://evilyoutube.com/watch?v=AbCdEfGhI_1',
    'https://youtube.com.evil.test/embed/AbCdEfGhI_1',
    'https://youtu.be.evil.test/AbCdEfGhI_1',
    'https://youtu.be/short',
    'https://www.youtube.com/embed/AbCdEfGhI_1/extra',
    'https://u:p@youtube.com/watch?v=AbCdEfGhI_1',
    'javascript:alert(1)',
    'https://untrusted.test/video.mp4',
    'https://youtube.com:8443/watch?v=AbCdEfGhI_1',
  ])('rejects %s', (url) =>
    expect(() => safeMediaSource(url, 'https://trusted.test')).toThrow(),
  );
  it('direct media requires an exact configured HTTPS origin and media path', () => {
    expect(
      safeMediaSource(
        'https://trusted.test/path/video.mp4?sig=abc',
        'https://trusted.test',
      ).kind,
    ).toBe('DIRECT');
    for (const url of [
      'https://sub.trusted.test/video.mp4',
      'https://trusted.test.evil/video.mp4',
      'https://trusted.test/page.html',
    ])
      expect(() => safeMediaSource(url, 'https://trusted.test')).toThrow();
  });
});
