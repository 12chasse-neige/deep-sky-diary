import { useLanguage } from '../lib/language';
import { MapPin, ArrowUpRight } from 'lucide-react';
import type { Entry } from '../types';
import { kinds } from '../data/objectKinds';

type Props = { entry: Entry; onOpen: () => void };

/** Shared preview card for the homepage and the searchable archive. */
export function EntryCard({ entry, onOpen }: Props) {
  const { t } = useLanguage();
  const kind = kinds.find((kind) => kind.id === entry.kind)!;
  return (
    <button className={`entry-card ${entry.kind}`} onClick={onOpen}>
      <div className="entry-top">
        <span className="object-type">
          <kind.icon size={18} />
          {kind.en}
        </span>
        <span>{entry.date.replaceAll('-', '.')}</span>
      </div>
      <h3>{entry.object}</h3>
      <p>{entry.text}</p>
      <div className="entry-bottom">
        <span>
          <MapPin size={12} />
          {entry.location || t('地点未记录')}
        </span>
        <ArrowUpRight size={17} />
      </div>
    </button>
  );
}
