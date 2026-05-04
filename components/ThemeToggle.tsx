'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const LS_THEME = 'logiq_theme';
type Theme = 'dark' | 'light';

export function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.style.colorScheme = t;
  window.dispatchEvent(new CustomEvent('logiq-theme', { detail: t }));
}

export function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem(LS_THEME);
  if (saved === 'light' || saved === 'dark') return saved;
  return 'light';
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>('light');
  useEffect(() => {
    const t = getInitialTheme();
    setThemeState(t);
    applyTheme(t);
    const onEvt = (e: any) => setThemeState(e.detail);
    window.addEventListener('logiq-theme', onEvt);
    return () => window.removeEventListener('logiq-theme', onEvt);
  }, []);
  const set = (t: Theme) => {
    localStorage.setItem(LS_THEME, t);
    applyTheme(t);
    setThemeState(t);
  };
  return [theme, set];
}

export default function ThemeToggle({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      onClick={() => setTheme(next)}
      className="theme-toggle"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      <span className="knob">
        {theme === 'dark' ? <Moon size={12} /> : <Sun size={12} />}
      </span>
    </button>
  );
}
