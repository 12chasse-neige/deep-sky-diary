import type { Entry } from '../types';

// Fictional examples only: never persisted, counted, or exported as personal observations.
export const samples: Entry[] = [
  {
    id: 'sample-1',
    object: 'M42 · 猎户座大星云',
    kind: 'nebula',
    date: '2026-02-18',
    location: '山间观测点',
    equipment: '',
    telescope: '150 mm 反射望远镜 · 60×',
    seeing: 2.1,
    cloudCover: 5,
    humidity: 48,
    sky: '通透',
    text: '目镜里，一片浅灰色的云气缓缓展开。用余光凝视，翅膀般的轮廓变得更清楚。停留得越久，看到的细节就越多。',
  },
  {
    id: 'sample-2',
    object: 'M31 · 仙女座星系',
    kind: 'galaxy',
    date: '2026-09-20',
    location: '郊外草地',
    equipment: '',
    telescope: '10×50 双筒望远镜',
    sky: '轻霾',
    text: '离开路灯，在黑暗里等待眼睛适应。那个朦胧的光斑终于浮现，中心稍亮，边缘悄悄融入夜色。',
  },
  {
    id: 'sample-3',
    object: 'M45 · 昴星团',
    kind: 'cluster',
    date: '2026-09-28',
    location: '露台',
    equipment: '',
    telescope: '10×50 双筒望远镜',
    sky: '通透',
    text: '把视野留得宽一些，几颗明亮的星恰好落在一起。没有急着寻找下一个目标，只是静静看了一会儿。',
  },
];

// Only fictional examples have translations; personal observations stay exactly as written.
export function localizeSample(entry: Entry, language: 'zh' | 'en'): Entry {
  if (language === 'zh') return samples.find((sample) => sample.id === entry.id) ?? entry;
  const translated = englishSamples[entry.id];
  return translated ? { ...entry, ...translated } : entry;
}
const englishSamples: Record<string, Partial<Entry>> = {
  'sample-1': {
    object: 'M42 · Orion Nebula',
    location: 'Mountain observing site',
    telescope: '150 mm reflector · 60×',
    text: 'A pale grey cloud unfolds in the eyepiece. With averted vision, its wing-like outline becomes clearer. The longer I stay, the more detail emerges.',
  },
  'sample-2': {
    object: 'M31 · Andromeda Galaxy',
    location: 'Meadow outside town',
    telescope: '10×50 binoculars',
    text: 'Away from the streetlights, I wait for my eyes to adjust. A hazy patch finally appears, brighter at its centre, its edges fading quietly into the night.',
  },
  'sample-3': {
    object: 'M45 · Pleiades',
    location: 'Terrace',
    telescope: '10×50 binoculars',
    text: 'With a wide field of view, a few bright stars settle together. There is no rush to find the next target. I simply watch for a while.',
  },
};
