// The persisted observation schema. Keep field names stable for existing JSON exports.
export type Kind = 'nebula' | 'galaxy' | 'cluster' | 'other';
export type Entry = {
  id: string;
  createdAt?: string;
  object: string;
  kind: Kind;
  date: string;
  location: string;
  equipment: string;
  sky: string;
  telescope?: string;
  camera?: string;
  latitude?: number | null;
  longitude?: number | null;
  seeing?: number | null;
  cloudCover?: number | null;
  humidity?: number | null;
  text: string;
};

export type ObservationDraft = Omit<Entry, 'id' | 'createdAt'>;

export type User = { id: string; username: string };
