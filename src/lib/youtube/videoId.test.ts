import { extractYouTubeVideoId } from './videoId';

const ID = 'dQw4w9WgXcQ';

describe('extractYouTubeVideoId', () => {
  it.each([
    [ID],
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s&list=PL123`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://music.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}`],
    [`https://youtu.be/${ID}?si=abc&t=10`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/live/${ID}`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [`youtube.com/watch?v=${ID}`],
    [`  https://youtu.be/${ID}  `],
  ])('extrai o ID de %s', (input) => {
    expect(extractYouTubeVideoId(input)).toBe(ID);
  });

  it.each([
    [''],
    ['   '],
    ['não é um link'],
    ['https://www.youtube.com/'],
    ['https://www.youtube.com/watch?v=curto'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ!!'],
    [`https://vimeo.com/${ID}`],
    [`https://evil.com/watch?v=${ID}`],
    [`https://youtube.com.evil.com/watch?v=${ID}`],
    ['https://www.youtube.com/@canal'],
  ])('rejeita %s', (input) => {
    expect(extractYouTubeVideoId(input)).toBeNull();
  });
});
