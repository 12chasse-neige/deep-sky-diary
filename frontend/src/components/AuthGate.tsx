import { useLanguage } from '../lib/language';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Orbit, ArrowRight } from 'lucide-react';
import { LanguageToggle } from './LanguageToggle';
import { SkyBackground } from './SkyBackground';
import { ApiError, errorMessage, request } from '../lib/api';
import type { User } from '../types';

/** Account transitions unmount the entire diary, including drafts, dialogs and pending reads. */
export function AuthGate({
  children,
}: {
  children: (user: User, signOut: () => void, expired: () => void, leaving: boolean) => ReactNode;
}) {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<'loading' | 'guest' | 'error' | 'signed-in'>('loading');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    request<User>('/auth/me', { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) {
          setUser(value);
          setState('signed-in');
        }
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        if (reason instanceof ApiError && reason.status === 401) setState('guest');
        else {
          setState('error');
          setError(errorMessage(reason));
        }
      });
    return () => controller.abort();
  }, [reload]);
  function expired() {
    setUser(null);
    setPassword('');
    setState('guest');
    setError('登录已失效，请重新登录。');
  }
  async function signOut() {
    if (pending.current) return;
    pending.current = true;
    // Hide/unmount private UI immediately, even when the server cannot be reached.
    setLeaving(true);
    setUser(null);
    try {
      await request<void>('/auth/logout', { method: 'POST' });
      setState('guest');
      setPassword('');
      setError('');
      setLeaving(false);
    } catch (reason) {
      setError(`${errorMessage(reason)} 尚未完成退出，请重试。`);
    } finally {
      pending.current = false;
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
      setError('用户名须为 3–32 位字母、数字或下划线。');
      return;
    }
    if (password.length < 12 || password.length > 128) {
      setError('密码须为 12–128 个字符。');
      return;
    }
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await request<User>(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setPassword('');
      setUser(result);
      setState('signed-in');
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (state === 'signed-in' && user && !leaving)
    return children(user, () => void signOut(), expired, leaving);
  return (
    <>
      <SkyBackground moving={false} />
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand-row">
            <a className="brand" href="#today">
              <Orbit size={30} />
              <span>
                {t('深空手记')}
                <small>DEEP SKY DIARY</small>
              </span>
            </a>
            <LanguageToggle />
          </div>
          <span className="eyebrow">YOUR OWN CORNER OF THE UNIVERSE</span>
          <h1>
            {leaving
              ? t('正在退出')
              : state === 'loading'
                ? t('正在连接星空档案')
                : mode === 'register'
                  ? t('开启你的星空手记')
                  : t('欢迎回到你的宇宙')}
          </h1>
          {leaving ? (
            <>
              <p>{t('私人记录已从屏幕清除。')}</p>
              {error && (
                <p role="alert" className="auth-error">
                  {t(error)}
                </p>
              )}
              <button className="outline" onClick={() => void signOut()}>
                {t('重试退出')}
              </button>
            </>
          ) : state === 'loading' ? (
            <p role="status">{t('正在确认登录状态…')}</p>
          ) : state === 'error' ? (
            <>
              <p role="alert" className="auth-error">
                {t(error)}
              </p>
              <button className="primary" onClick={() => setReload((value) => value + 1)}>
                {t('重新连接')}
              </button>
            </>
          ) : (
            <>
              <p>{t('登录后，观测记录将安全保存在你的私人账户中。')}</p>
              <div className="auth-tabs">
                <button
                  aria-pressed={mode === 'login'}
                  disabled={busy}
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                >
                  {t('登录')}
                </button>
                <button
                  aria-pressed={mode === 'register'}
                  disabled={busy}
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                >
                  {t('注册')}
                </button>
              </div>
              <form onSubmit={submit} noValidate>
                <label>
                  {t('用户名')}
                  <input
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={32}
                    pattern="[A-Za-z0-9_]{3,32}"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={busy}
                  />
                </label>
                <small>{t('3–32 位字母、数字或下划线，不区分大小写')}</small>
                <label>
                  {t('密码')}
                  <input
                    type="password"
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    required
                    minLength={12}
                    maxLength={128}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={busy}
                  />
                </label>
                <small>{t('12–128 个字符，空格也属于密码')}</small>
                {error && (
                  <p className="auth-error" role="alert">
                    {t(error)}
                  </p>
                )}
                <button className="primary" disabled={busy} type="submit">
                  {busy ? t('正在处理…') : mode === 'register' ? t('创建账户') : t('进入手记')}
                  <ArrowRight size={16} />
                </button>
              </form>
              <p className="auth-footnote">{t('每个账户拥有独立档案 · 当前版本不提供密码找回')}</p>
            </>
          )}
        </section>
      </main>
    </>
  );
}
