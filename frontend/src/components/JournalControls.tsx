import { useLanguage } from '../lib/language';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { today } from '../lib/date';

function useDismiss(open: boolean, close: () => void, root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open, close, root]);
}

function usePopoverSide(open: boolean, root: RefObject<HTMLDivElement | null>) {
  const [above, setAbove] = useState(false);
  useLayoutEffect(() => {
    if (!open) return;
    const control = root.current;
    const popup = control?.querySelector<HTMLElement>('.control-popover');
    if (!control || !popup) return;
    const rect = control.getBoundingClientRect();
    const height = popup.getBoundingClientRect().height;
    const roomAbove = rect.top - 110;
    const roomBelow = window.innerHeight - rect.bottom - 24;
    setAbove(height > roomBelow && roomAbove > roomBelow);
  }, [open, root]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      root.current
        ?.querySelector<HTMLElement>('.control-popover')
        ?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, above, root]);
  return above;
}

export function JournalSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  useDismiss(open, () => setOpen(false), root);
  const above = usePopoverSide(open, root);
  useEffect(() => {
    if (open) items.current[Math.max(0, options.indexOf(value))]?.focus();
  }, [open, options, value]);
  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    trigger.current?.focus();
  };
  return (
    <div
      className="journal-control"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        type="button"
        id={id}
        ref={trigger}
        className="control-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {t(value)}
        <ChevronDown size={15} className={open ? 'turned' : ''} />
      </button>
      {open && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-label={label}
          className={`control-popover select-options${above ? ' popover-above' : ''}`}
        >
          {options.map((option, index) => (
            <button
              type="button"
              key={option}
              role="option"
              aria-selected={option === value}
              ref={(element) => {
                items.current[index] = element;
              }}
              tabIndex={option === value ? 0 : -1}
              onClick={() => choose(option)}
              onKeyDown={(event) => {
                let target = index;
                if (event.key === 'ArrowDown') target = (index + 1) % options.length;
                else if (event.key === 'ArrowUp')
                  target = (index - 1 + options.length) % options.length;
                else if (event.key === 'Home') target = 0;
                else if (event.key === 'End') target = options.length - 1;
                else return;
                event.preventDefault();
                items.current[target]?.focus();
              }}
            >
              <span>{t(option)}</span>
              {option === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T12:00:00`);
  return (
    year > 0 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
function dateString(date: Date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function JournalDate({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => new Date(`${today()}T12:00:00`));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const days = useRef<(HTMLButtonElement | null)[]>([]);
  useDismiss(open, () => setOpen(false), root);
  const above = usePopoverSide(open, root);
  const year = view.getFullYear(),
    month = view.getMonth();
  const end = new Date(view);
  end.setMonth(month + 1, 0);
  const count = end.getDate();
  const start = new Date(view);
  start.setDate(1);
  const offset = (start.getDay() + 6) % 7;
  useEffect(() => {
    if (open) days.current[view.getDate() - 1]?.focus();
  }, [open, view]);
  const choose = (date: string) => {
    onChange(date);
    setOpen(false);
    trigger.current?.focus();
  };
  const move = (months: number) => {
    const next = new Date(view);
    next.setDate(1);
    next.setMonth(month + months);
    if (next.getFullYear() >= 1 && next.getFullYear() <= 9999) setView(next);
  };
  return (
    <div
      className="journal-control date-control"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <div className="date-input">
        <input
          id="observation-date"
          required
          aria-label={t('观测日期')}
          value={value}
          placeholder="YYYY-MM-DD"
          inputMode="numeric"
          maxLength={10}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          ref={trigger}
          aria-label={t('选择观测日期')}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (!open) setView(new Date(`${validDate(value) ? value : today()}T12:00:00`));
            setOpen(!open);
          }}
        >
          <CalendarDays size={17} />
        </button>
      </div>
      {open && (
        <div
          className={`control-popover calendar${above ? ' popover-above' : ''}`}
          role="dialog"
          aria-label={t('观测日历')}
        >
          <div className="calendar-heading">
            <button type="button" aria-label={t('上个月')} onClick={() => move(-1)}>
              <ChevronLeft size={16} />
            </button>
            <span aria-live="polite">
              {view.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
                year: 'numeric',
                month: 'long',
              })}
            </span>
            <button type="button" aria-label={t('下个月')} onClick={() => move(1)}>
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="calendar-week" aria-hidden="true">
            {(language === 'zh'
              ? ['一', '二', '三', '四', '五', '六', '日']
              : ['M', 'T', 'W', 'T', 'F', 'S', 'S']
            ).map((day, index) => (
              <span key={index}>{day}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: offset }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: count }, (_, index) => {
              const date = new Date(view);
              date.setDate(index + 1);
              const iso = dateString(date);
              return (
                <button
                  type="button"
                  key={iso}
                  ref={(element) => {
                    days.current[index] = element;
                  }}
                  aria-label={iso}
                  aria-pressed={iso === value}
                  aria-current={iso === today() ? 'date' : undefined}
                  onClick={() => choose(iso)}
                  onKeyDown={(event) => {
                    const steps: Record<string, number> = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                    };
                    if (!(event.key in steps)) return;
                    event.preventDefault();
                    const next = new Date(date);
                    next.setDate(next.getDate() + steps[event.key]);
                    if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
                    if (next.getMonth() !== month || next.getFullYear() !== year) setView(next);
                    else days.current[next.getDate() - 1]?.focus();
                  }}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <button type="button" className="calendar-today" onClick={() => choose(today())}>
            {t('回到今晚 ·')} {today()}
          </button>
          <small>{t('也可直接输入 YYYY-MM-DD')}</small>
        </div>
      )}
    </div>
  );
}
