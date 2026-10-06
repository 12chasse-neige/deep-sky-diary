import { useLanguage } from '../lib/language';
import { useEffect, useRef, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Entry } from '../types';
import { localizeSample } from '../data/sampleEntries';
import { kinds } from '../data/objectKinds';

type Props = { active: Entry | null; onClose: () => void; onDelete: (id: string) => Promise<void> };

export function EntryDialog({ active, onClose, onDelete }: Props) {
  const { language, t } = useLanguage();
  const shown = active ? localizeSample(active, language) : null;
  const [deleting, setDeleting] = useState(false);
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  // Native modal behavior supplies focus trapping, Escape, and focus restoration.
  useEffect(() => {
    setDeleteConfirm(false);
    if (active) dialog.current?.showModal();
    else dialog.current?.close();
  }, [active]);
  return (
    <dialog
      ref={dialog}
      className="entry-modal"
      aria-labelledby="modal-title"
      onCancel={() => onClose()}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const rect = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      {active && (
        <>
          <button className="close" aria-label={t('关闭记录')} onClick={() => onClose()}>
            <X />
          </button>
          <span className="eyebrow">
            {active.date} / {kinds.find((k) => k.id === active.kind)?.en}
            {active.id.startsWith('sample-') ? t(' / 示例') : ''}
          </span>
          <h2 id="modal-title">{shown!.object}</h2>
          <dl>
            <div>
              <dt>{t('地点')}</dt>
              <dd>{shown!.location || t('未记录')}</dd>
            </div>
            {active.latitude != null && active.longitude != null && (
              <div>
                <dt>{t('坐标')}</dt>
                <dd>
                  {Math.abs(active.latitude)}° {active.latitude < 0 ? 'S' : 'N'} ·{' '}
                  {Math.abs(active.longitude)}° {active.longitude < 0 ? 'W' : 'E'}
                </dd>
              </div>
            )}
            <div>
              <dt>{t('望远镜')}</dt>
              <dd>{shown!.telescope || t('未记录')}</dd>
            </div>
            <div>
              <dt>{t('相机')}</dt>
              <dd>{shown!.camera || t('未记录')}</dd>
            </div>
            {shown!.equipment && (
              <div>
                <dt>{t('设备备注')}</dt>
                <dd>{shown!.equipment}</dd>
              </div>
            )}
            <div>
              <dt>{t('天空')}</dt>
              <dd>{t(active.sky)}</dd>
            </div>
            <div>
              <dt>{t('视宁度')}</dt>
              <dd>{active.seeing != null ? `${active.seeing}″` : t('未记录')}</dd>
            </div>
            <div>
              <dt>{t('云量')}</dt>
              <dd>{active.cloudCover != null ? `${active.cloudCover}%` : t('未记录')}</dd>
            </div>
            <div>
              <dt>{t('湿度')}</dt>
              <dd>{active.humidity != null ? `${active.humidity}%` : t('未记录')}</dd>
            </div>
          </dl>
          <p className="full-text">{shown!.text}</p>
          {!active.id.startsWith('sample-') && (
            <div className="delete-row">
              {deleteConfirm ? (
                <>
                  <span>{t('确定删除这次观测？')}</span>
                  <button
                    className="danger"
                    disabled={deleting}
                    onClick={async () => {
                      if (pending.current) return;
                      pending.current = true;
                      setDeleting(true);
                      try {
                        await onDelete(active.id);
                      } finally {
                        pending.current = false;
                        setDeleting(false);
                      }
                    }}
                  >
                    {deleting ? t('正在删除…') : t('确认删除')}
                  </button>
                  <button className="outline" onClick={() => setDeleteConfirm(false)}>
                    {t('保留')}
                  </button>
                </>
              ) : (
                <button className="delete" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 size={14} /> {t('删除记录')}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </dialog>
  );
}
