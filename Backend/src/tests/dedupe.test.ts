import { dedupeById } from '@utils/dedupe';

const artists = [{ name: 'Anirudh Ravichander' }, { name: 'Singer Prabha' }];

describe('dedupeById', () => {
  it('drops a re-indexed copy with a (From "…") (Language) suffix, not other languages or untagged albums', () => {
    const items = [
      { id: 'a', title: 'Yeshanagula (From "The Paradise") (Telugu)', duration: 188, genre: 'telugu', artists },
      { id: 'b', title: 'Yeshanagula', duration: 188, genre: 'telugu', artists }, // same song, second catalog id
      { id: 'c', title: 'Yeshanagula (Hindi)', duration: 188, genre: 'hindi', artists }, // a dub: keep
      { id: 'd', title: 'The Paradise (Telugu)', artists }, // albums carry no language: tags still tell them apart
      { id: 'e', title: 'The Paradise (Hindi)', artists },
    ];
    expect(dedupeById(items).map((t) => t.id)).toEqual(['a', 'c', 'd', 'e']);
  });
});
