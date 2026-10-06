import { Sparkles, Orbit, Aperture, Telescope } from 'lucide-react';

// Edit labels and icons here; IDs are also stored in saved observations.
export const kinds = [
  { id: 'nebula', label: '星云', en: 'NEBULA', icon: Sparkles },
  { id: 'galaxy', label: '星系', en: 'GALAXY', icon: Orbit },
  { id: 'cluster', label: '星团', en: 'STAR CLUSTER', icon: Aperture },
  { id: 'other', label: '其他', en: 'OTHER', icon: Telescope },
] as const;
