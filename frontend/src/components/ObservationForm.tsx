import { useLanguage } from '../lib/language';
import { useState, useRef, type FormEvent } from 'react';
import { Telescope, Plus, MapPin, Camera, CloudMoon } from 'lucide-react';
import type { Kind, ObservationDraft } from '../types';
import { kinds } from '../data/objectKinds';
import { browserStorageEnabled } from '../lib/browserStorage';
import { today } from '../lib/date';
import { JournalDate, JournalSelect, validDate } from './JournalControls';

type Props = {
  onSave: (draft: ObservationDraft) => Promise<boolean>;
  disabled: boolean;
};

/** The draft stays local to the form; a failed save never clears the user's notes. */
export function ObservationForm({ onSave, disabled }: Props) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [kind, setKind] = useState<Kind>('nebula');
  const [object, setObject] = useState('');
  const [date, setDate] = useState(today);
  const [place, setPlace] = useState('');
  const [telescope, setTelescope] = useState('');
  const [camera, setCamera] = useState('');
  const [coordinates, setCoordinates] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [seeing, setSeeing] = useState('');
  const [cloudCover, setCloudCover] = useState('');
  const [humidity, setHumidity] = useState('');
  const [error, setError] = useState('');
  const [sky, setSky] = useState('通透');
  const [text, setText] = useState('');
  // Preserve date, equipment, location and sky for consecutive targets in one session.
  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current || disabled) return;
    setError('');
    const fail = (message: string) => {
      setError(message);
    };
    if (!object.trim() || !text.trim()) {
      fail('请填写目标名称和观测笔记。');
      return;
    }
    if (!validDate(date)) {
      fail('请输入有效的观测日期，格式为 YYYY-MM-DD。');
      return;
    }
    const number = (value: string) => (value.trim() === '' ? null : Number(value));
    const inRange = (value: string, min: number, max: number) => {
      const parsed = number(value);
      return (
        parsed === null ||
        (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value.trim()) &&
          Number.isFinite(parsed) &&
          parsed >= min &&
          parsed <= max)
      );
    };
    if (
      coordinates &&
      (!latitude.trim() ||
        !longitude.trim() ||
        !inRange(latitude, -90, 90) ||
        !inRange(longitude, -180, 180))
    ) {
      fail('请完整填写坐标：纬度 −90° 至 90°，经度 −180° 至 180°。');
      return;
    }
    if (!inRange(seeing, 0.01, 100) || !inRange(cloudCover, 0, 100) || !inRange(humidity, 0, 100)) {
      fail('视宁度须大于 0 且不超过 100″；云量和相对湿度须在 0–100% 之间。');
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      if (
        await onSave({
          object: object.trim(),
          kind,
          date,
          location: place.trim(),
          equipment: '',
          telescope: telescope.trim(),
          camera: camera.trim(),
          latitude: coordinates ? number(latitude) : null,
          longitude: coordinates ? number(longitude) : null,
          seeing: number(seeing),
          cloudCover: number(cloudCover),
          humidity: number(humidity),
          sky,
          text: text.trim(),
        })
      ) {
        setObject('');
        setText('');
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  return (
    <form className="journal panel" id="write" onSubmit={save} noValidate aria-busy={saving}>
      <fieldset disabled={disabled || saving}>
        <div className="section-head">
          <div>
            <span className="eyebrow">01 / NEW OBSERVATION</span>
            <h2>{t('今晚，你遇见了什么？')}</h2>
          </div>
          <Telescope className="section-icon" size={29} strokeWidth={1.2} />
        </div>
        <div className="kind-picker" role="group" aria-label={t('目标类型')}>
          {kinds.map((k) => (
            <button
              type="button"
              key={k.id}
              className={kind === k.id ? 'chosen' : ''}
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
            >
              <k.icon size={21} strokeWidth={1.4} />
              <span>
                {t(k.label)}
                <small>{k.en}</small>
              </span>
              {kind === k.id && <span className="choice-dot" />}
            </button>
          ))}
        </div>
        <div className="field-grid">
          <label className="wide">
            {t('观测目标')} <span>OBJECT / CATALOG ID</span>
            <input
              id="object"
              required
              maxLength={100}
              value={object}
              onChange={(e) => setObject(e.target.value)}
              placeholder={t('例如：M31 · 仙女座星系')}
            />
          </label>
          <div className="form-field">
            <label htmlFor="observation-date">
              {t('观测日期')} <span>DATE</span>
            </label>
            <JournalDate value={date} onChange={setDate} />
          </div>
          <label>
            {t('观测地点')} <span>LOCATION</span>
            <input
              maxLength={120}
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder={t('你仰望星空的地方')}
            />
          </label>
          <div className="wide coordinate-section">
            <button
              type="button"
              className="coordinate-toggle"
              role="switch"
              aria-checked={coordinates}
              aria-controls="coordinate-fields"
              onClick={() => setCoordinates(!coordinates)}
            >
              <MapPin size={15} />
              <span>
                {t('记录经纬度')} <small>{t('可选 · 精确标记观测点')}</small>
              </span>
              <i className={coordinates ? 'on' : ''} />
            </button>
            {coordinates && (
              <div id="coordinate-fields" className="field-grid coordinate-fields">
                <label>
                  {t('纬度')} <span>LATITUDE · °</span>
                  <input
                    inputMode="decimal"
                    maxLength={16}
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder={t('例如 40.12')}
                  />
                  <small className="field-hint">{t('北纬为正，南纬为负 · −90 至 90')}</small>
                </label>
                <label>
                  {t('经度')} <span>LONGITUDE · °</span>
                  <input
                    inputMode="decimal"
                    maxLength={16}
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder={t('例如 116.40')}
                  />
                  <small className="field-hint">{t('东经为正，西经为负 · −180 至 180')}</small>
                </label>
              </div>
            )}
          </div>
          <div className="wide field-divider">
            <Camera size={15} />
            <span>
              {t('成像设备')} <small>YOUR SETUP</small>
            </span>
          </div>
          <label>
            {t('望远镜 / 镜头')} <span>TELESCOPE / OPTICS</span>
            <input
              maxLength={160}
              value={telescope}
              onChange={(e) => setTelescope(e.target.value)}
              placeholder={t('例如：80 mm APO · 480 mm f/6')}
            />
          </label>
          <label>
            {t('相机')} <span>CAMERA</span>
            <input
              maxLength={160}
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
              placeholder={t('例如：ASI2600MC Pro · −10°C')}
            />
          </label>
          <div className="wide field-divider">
            <CloudMoon size={15} />
            <span>
              {t('这一晚的天空')} <small>SKY CONDITIONS</small>
            </span>
          </div>
          <div className="form-field wide">
            <label htmlFor="sky-condition">
              {t('天空概况')} <span>TRANSPARENCY</span>
            </label>
            <JournalSelect
              id="sky-condition"
              label={t('天空概况')}
              value={sky}
              onChange={setSky}
              options={['通透', '轻霾', '薄云', '多云', '未记录']}
            />
          </div>
          <div className="wide sky-metrics">
            <label>
              {t('视宁度')} <span>SEEING · ″</span>
              <input
                inputMode="decimal"
                maxLength={16}
                value={seeing}
                onChange={(e) => setSeeing(e.target.value)}
                placeholder={t('例如 2.0')}
              />
              <small className="field-hint">{t('角秒 · 可留空')}</small>
            </label>
            <label>
              {t('云量')} <span>CLOUD COVER · %</span>
              <input
                inputMode="decimal"
                maxLength={16}
                value={cloudCover}
                onChange={(e) => setCloudCover(e.target.value)}
                placeholder={t('例如 10')}
              />
              <small className="field-hint">{t('0–100% · 可留空')}</small>
            </label>
            <label>
              {t('相对湿度')} <span>HUMIDITY · %</span>
              <input
                inputMode="decimal"
                maxLength={16}
                value={humidity}
                onChange={(e) => setHumidity(e.target.value)}
                placeholder={t('例如 65')}
              />
              <small className="field-hint">{t('0–100% · 可留空')}</small>
            </label>
          </div>
          <label className="wide">
            {t('观测笔记')} <span>FIELD NOTES</span>
            <textarea
              required
              maxLength={10000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('它在目镜里是什么样子？记录亮度、形状、细节，或此刻的感受……')}
            />
            <small className="character-count">{text.length} / 10000</small>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {t(error)}
          </p>
        )}
        <div className="save-line">
          <span>
            <span className="status-dot" />{' '}
            {t(browserStorageEnabled ? '私人手记 · 保存在此浏览器' : '私人手记 · 保存在你的账户')}
          </span>
          <button className="primary" type="submit">
            {saving ? t('正在保存…') : t('收录这束光')} <Plus size={17} />
          </button>
        </div>
      </fieldset>
    </form>
  );
}
