import { useLanguage } from './lib/language';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  BookOpen,
  Telescope,
  Orbit,
  Search,
  X,
  Check,
  Download,
  Moon,
  Plus,
  Sparkles,
  Pause,
  Play,
  ArrowDown,
} from 'lucide-react';
import type { Entry, ObservationDraft, User } from './types';
import { kinds } from './data/objectKinds';
import { samples } from './data/sampleEntries';
import { today } from './lib/date';
import { useEntries } from './hooks/useEntries';
import { EntryCard } from './components/EntryCard';
import { EntryDialog } from './components/EntryDialog';
import { ObservationForm } from './components/ObservationForm';
import { SkyBackground } from './components/SkyBackground';
import { useReducedMotion } from './hooks/useReducedMotion';
import { LanguageToggle } from './components/LanguageToggle';
import { localizeSample } from './data/sampleEntries';
import { browserStorageEnabled } from './lib/browserStorage';
import { AuthGate } from './components/AuthGate';

// Page composition and archive controls. Form drafts and modal behavior live in components.
export default function App() {
  if (browserStorageEnabled)
    return <Diary user={{ id: 'browser', username: '' }} signOut={() => {}} onExpired={() => {}} />;
  return (
    <AuthGate>
      {(user, signOut, expired) => (
        <Diary key={user.id} user={user} signOut={signOut} onExpired={expired} />
      )}
    </AuthGate>
  );
}

function Diary({
  user,
  signOut,
  onExpired,
}: {
  user: User;
  signOut: () => void;
  onExpired: () => void;
}) {
  const { language, t } = useLanguage();
  const [page, setPage] = useState(location.hash === '#memories' ? 'memories' : 'today');

  const reducedMotion = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const moving = !paused && !reducedMotion;

  // One switch controls CSS motion and the optional background video together.
  useEffect(() => {
    document.documentElement.dataset.motion = moving ? 'on' : 'off';
    return () => {
      delete document.documentElement.dataset.motion;
    };
  }, [moving]);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState<Entry | null>(null);
  const [toast, setToast] = useState('');
  const [showSamples, setShowSamples] = useState(true);
  const { entries, status, create, remove, retry } = useEntries(setToast, onExpired);
  useEffect(() => {
    const fn = () => setPage(location.hash === '#memories' ? 'memories' : 'today');
    window.addEventListener('hashchange', fn);
    return () => window.removeEventListener('hashchange', fn);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Return success to the form so it clears the draft only after persistence.
  const saveObservation = async (draft: ObservationDraft) => {
    const saved = await create(draft);
    if (saved) setToast('这一次与星空的相遇，已存入手记。');
    return saved;
  };
  const deleteObservation = async (id: string) => {
    if (await remove(id)) {
      setActive(null);
      setToast('观测记录已删除。');
    }
  };
  const exportEntries = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${language === 'zh' ? '深空手记' : 'deep-sky-diary'}-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('观测记录已导出。');
  };
  const visible =
    status !== 'ready'
      ? []
      : entries.length
        ? entries
        : showSamples
          ? samples.map((entry) => localizeSample(entry, language))
          : [];
  const filtered = visible.filter(
    (e) =>
      (filter === 'all' || e.kind === filter) &&
      `${e.object} ${e.text} ${e.location} ${e.equipment} ${e.telescope ?? ''} ${e.camera ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const openEntry = (entry: Entry) => {
    setActive(entry);
  };
  useEffect(() => {
    if (page === 'today' && location.hash === '#write')
      document.getElementById('write')?.scrollIntoView();
  }, [page]);
  const startWriting = () => {
    location.hash = 'write';
    document.getElementById('write')?.scrollIntoView();
    document.getElementById('object')?.focus({ preventScroll: true });
  };
  return (
    <>
      <SkyBackground moving={moving} />
      <header>
        <div className="header-inner">
          <a className="brand" href="#today">
            <Orbit size={32} strokeWidth={1} />
            <span>
              {t('深空手记')}
              <small>DEEP SKY DIARY</small>
            </span>
          </a>
          <nav aria-label={t('主导航')} data-page={page}>
            <a href="#today" className={page === 'today' ? 'selected' : ''}>
              <Telescope size={16} />
              {t('观测台')}
            </a>
            <a href="#memories" className={page === 'memories' ? 'selected' : ''}>
              <BookOpen size={16} />
              {t('星空档案')}
            </a>
          </nav>
          <div className="header-actions">
            <LanguageToggle />
            <button
              className="motion-toggle"
              aria-label={moving ? t('暂停动态效果') : t('开启动态效果')}
              aria-pressed={!moving}
              disabled={reducedMotion}
              title={reducedMotion ? t('已遵循系统减少动态效果设置') : undefined}
              onClick={() => setPaused(!paused)}
            >
              {moving ? <Pause size={13} /> : <Play size={13} />}
              <span>{moving ? t('暂停动态') : t('静止模式')}</span>
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="account-bar">
          <span>
            {browserStorageEnabled
              ? t('这台设备的星空档案')
              : language === 'zh'
                ? `${user.username} 的星空档案`
                : `${user.username}’s sky archive`}
          </span>
          {browserStorageEnabled ? (
            <span className="storage-note">{t('保存在此浏览器 · 可导出备份')}</span>
          ) : (
            <button className="outline" onClick={signOut}>
              {t('退出登录')}
            </button>
          )}
        </div>
        {status !== 'ready' && (
          <div className="connection-state" role={status === 'error' ? 'alert' : 'status'}>
            {status === 'loading' ? (
              t('正在加载观测记录…')
            ) : (
              <>
                <span>{t('无法加载档案。请重试，或稍后再来。')}</span>
                <button className="outline" onClick={retry}>
                  {t('重新加载')}
                </button>
              </>
            )}
          </div>
        )}
        {/* Keep the form mounted so archive navigation does not discard an unsaved draft. */}
        <div className="observation-page" hidden={page !== 'today'}>
          <section className="hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <i /> LOOK UP. SLOW DOWN.
              </span>
              <h1>
                {t('不要温和地走进')}
                <br />
                <span>{t('那个良夜')}</span>
              </h1>
              <p>
                {t('从一片星云，到一座遥远星系。')}
                <br />
                {t('记录目镜里的微光，也记录仰望时的你。')}
              </p>
              <button className="primary" onClick={startWriting}>
                {t('开始一次观测')} <ArrowUpRight size={17} />
              </button>
              <a className="hero-link" href="#memories">
                {t('探索我的档案')} <ArrowRight size={14} />
              </a>
            </div>
            <div className="hero-bottom">
              <span>01 — SCORPIUS / SAGITTARIUS</span>
              <button className="scroll-cue" onClick={startWriting}>
                {t('向下探索')} <ArrowDown size={14} />
              </button>
            </div>
          </section>
          <div className="day-line">
            <span>
              <Moon size={15} />{' '}
              {new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              <b>{t('观测日志')}</b>
            </span>
            <span>
              {t('让每一次仰望，都有迹可循。')} <Sparkles size={15} />
            </span>
          </div>
          <div className="workspace">
            <ObservationForm onSave={saveObservation} disabled={status !== 'ready'} />
            <aside>
              <section className="note-card panel">
                <span className="eyebrow">THE ART OF OBSERVING</span>
                <svg className="orbital-art" viewBox="0 0 180 180" fill="none" aria-hidden="true">
                  <g className="orbit-paths">
                    <ellipse cx="90" cy="90" rx="70" ry="43" transform="rotate(-28 90 90)" />
                    <ellipse cx="90" cy="90" rx="70" ry="43" transform="rotate(32 90 90)" />
                    <ellipse cx="90" cy="90" rx="70" ry="25" transform="rotate(78 90 90)" />
                  </g>
                  <path
                    className="orbit-star"
                    d="M90 78 Q93 87 102 90 Q93 93 90 102 Q87 93 78 90 Q87 87 90 78Z"
                  />
                  <g transform="rotate(-28 90 90)">
                    <circle className="orbit-satellite" r="3.3" />
                  </g>
                </svg>
                <h3>
                  {t('慢一点，')}
                  <br />
                  {t('宇宙会显露更多。')}
                </h3>
                <p>
                  {t('给眼睛一些适应黑暗的时间。')}
                  <br />
                  {t('在同一个目标上多停留片刻，')}
                  <br />
                  {t('把第一眼之外的细节也留下。')}
                </p>
                <span className="note-foot">
                  {t('一份写给夜空的耐心')} <span>↗</span>
                </span>
              </section>
              <section className="stats panel">
                <span className="eyebrow">YOUR UNIVERSE, SO FAR</span>
                <div>
                  <strong>
                    {status === 'ready' ? String(entries.length).padStart(2, '0') : '—'}
                  </strong>
                  <span>
                    {t('次观测记录')} <Telescope size={16} />
                  </span>
                </div>
                <div>
                  <strong>
                    {status === 'ready'
                      ? String(new Set(entries.map((e) => e.date)).size).padStart(2, '0')
                      : '—'}
                  </strong>
                  <span>
                    {t('个仰望的夜晚')} <Moon size={16} />
                  </span>
                </div>
                <a href="#memories">
                  {t('翻开星空档案')} <ArrowUpRight size={15} />
                </a>
              </section>
            </aside>
          </div>
          <section className="recent">
            <div className="section-head">
              <div>
                <span className="eyebrow">02 / COLLECTED LIGHT</span>
                <h2>{t('那些与星空相遇的瞬间')}</h2>
              </div>
              <a href="#memories">
                {t('全部观测')} <ArrowUpRight size={16} />
              </a>
            </div>
            {status === 'ready' && !entries.length && showSamples && (
              <p className="sample-label">
                {t('示例手记 · 以下是虚构的记录示范，你的观测将从这里开始。')}
              </p>
            )}
            <div className="entry-grid">
              {visible.slice(0, 3).map((e) => (
                <EntryCard key={e.id} entry={e} onOpen={() => openEntry(e)} />
              ))}
            </div>
          </section>
        </div>
        {page === 'memories' && (
          <section className="archive">
            <div className="archive-heading">
              <span className="eyebrow">AN ARCHIVE OF SMALL DISCOVERIES</span>
              <h1>
                {t('每一束微光，')}
                <span>{t('都有回响。')}</span>
              </h1>
              <p>{t('在这里，重访那些属于你的宇宙片刻。')}</p>
            </div>
            <div className="archive-toolbar">
              <span>
                <BookOpen size={20} />
                <b>{status === 'ready' ? entries.length : '—'}</b> {t('次观测记录')}
              </span>
              <button
                className="outline"
                disabled={status !== 'ready' || !entries.length}
                onClick={exportEntries}
              >
                <Download size={15} /> {t('导出记录')}
              </button>
              <a className="primary" href="#write">
                {t('新观测')} <Plus size={16} />
              </a>
            </div>
            <div className="filter-row">
              <div className="filters">
                {[{ id: 'all', label: '全部目标' }, ...kinds].map((k) => (
                  <button
                    key={k.id}
                    aria-pressed={filter === k.id}
                    className={filter === k.id ? 'active' : ''}
                    onClick={() => setFilter(k.id)}
                  >
                    {t(k.label)}
                  </button>
                ))}
              </div>
              <label className="search">
                <Search size={16} />
                <input
                  aria-label={t('搜索观测记录')}
                  placeholder={t('搜索目标、地点、笔记…')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
            {status === 'ready' && !entries.length && showSamples && (
              <div className="sample-banner">
                {t('示例手记 · 虚构的观测示范，不计入个人档案。')}
                <button onClick={() => setShowSamples(false)}>
                  {t('隐藏示例')} <X size={14} />
                </button>
              </div>
            )}
            <div className="entry-grid" key={`${filter}-${query}`}>
              {filtered.map((e) => (
                <EntryCard key={e.id} entry={e} onOpen={() => openEntry(e)} />
              ))}
            </div>
            {status === 'ready' && !filtered.length && (
              <div className="empty">
                <Orbit size={45} />
                <h2>
                  {query || filter !== 'all' ? t('还没有找到这束光') : t('你的宇宙，等待第一笔。')}
                </h2>
                <p>
                  {query || filter !== 'all'
                    ? t('试试其他关键词或目标类型。')
                    : t('从一次仰望、一点微光开始。')}
                </p>
                <a className="outline" href="#write">
                  {t('记录观测')} <ArrowRight size={15} />
                </a>
              </div>
            )}
          </section>
        )}
        <footer>
          <a className="brand" href="#today">
            <Orbit size={23} />
            <span>{t('深空手记')}</span>
          </a>
          <span>{t('宇宙很大，慢慢记录。')}</span>
          <small>
            {t(
              browserStorageEnabled
                ? '记录仅保存在此浏览器 · 清除浏览器数据前请导出备份'
                : '记录保存在你的私人账户 · 可在星空档案中导出备份',
            )}
          </small>
          <span className="footer-star">✦</span>
        </footer>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {t(toast)}
        </div>
      )}
      <EntryDialog active={active} onClose={() => setActive(null)} onDelete={deleteObservation} />
    </>
  );
}
