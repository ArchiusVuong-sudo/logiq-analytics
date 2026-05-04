'use client';
import { useEffect, useRef, useState } from 'react';

export function Reveal({ children, delay, className = '' }: { children: React.ReactNode; delay?: 1 | 2 | 3 | 4 | 5 | 6; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setSeen(true);
        io.disconnect();
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return (
    <div ref={ref} className={`reveal ${seen ? 'in-view' : ''} ${delay ? `reveal-delay-${delay}` : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CountUp({ to, duration = 1400, format = (n: number) => n.toLocaleString() }: { to: number; duration?: number; format?: (n: number) => string }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / duration);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - k, 3);
          setN(Math.round(eased * to));
          if (k < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{format(n)}</span>;
}

export function Particles({ count = 14 }: { count?: number }) {
  // Stable per-render seeds (deterministic so SSR/CSR match)
  const items = Array.from({ length: count }, (_, i) => {
    const left = (i * 7919) % 100;
    const dur = 14 + ((i * 13) % 10);
    const delay = (i * 1.7) % 12;
    const size = 2 + ((i * 5) % 4);
    return { left, dur, delay, size };
  });
  return (
    <div className="particles">
      {items.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            bottom: '-20px',
            width: p.size, height: p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function Spotlight({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={`spotlight ${className}`}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || !ref.current) return;
        ref.current.style.setProperty('--mouse-x', `${e.clientX - r.left}px`);
        ref.current.style.setProperty('--mouse-y', `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

export function Sparkline({ values }: { values: number[] }) {
  const w = 100, h = 36;
  const min = Math.min(...values), max = Math.max(...values);
  const dx = w / (values.length - 1);
  const norm = (v: number) => h - ((v - min) / Math.max(1, max - min)) * h;
  const pts = values.map((v, i) => `${i * dx},${norm(v)}`).join(' ');
  const last = values[values.length - 1];
  const lastX = (values.length - 1) * dx;
  const lastY = norm(last);
  return (
    <svg className="sparkline" viewBox={`0 -2 ${w} ${h + 4}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="100%" y2="0">
          <stop offset="0%" stopColor="#7c5cff" />
          <stop offset="100%" stopColor="#46d9ff" />
        </linearGradient>
        <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(124,92,255,0.35)" />
          <stop offset="100%" stopColor="rgba(70,217,255,0)" />
        </linearGradient>
      </defs>
      <polygon className="area" points={`0,${h} ${pts} ${w},${h}`} />
      <polyline className="line" points={pts} />
      <circle className="dot" cx={lastX} cy={lastY} r={2.5} />
    </svg>
  );
}
