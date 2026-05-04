'use client';
import { memo, useEffect, useState } from 'react';
import { Brain, Check, Loader2, MessageCircle, Trash2, Award, AlertTriangle } from 'lucide-react';
import { KindChip, PinChip, ActionBtn } from './BlockHeader';

function gradeFor(metrics: Record<string, any>) {
  const auc = Number(metrics?.auc);
  const acc = Number(metrics?.accuracy);
  const f1 = Number(metrics?.f1);
  // Use AUC if present (better for imbalanced); fallback to accuracy
  if (!isNaN(auc) && auc > 0) {
    if (auc >= 0.85) return { grade: 'A', label: 'Excellent', tone: 'A' };
    if (auc >= 0.75) return { grade: 'B', label: 'Good', tone: 'B' };
    if (auc >= 0.65) return { grade: 'C', label: 'Moderate', tone: 'C' };
    return { grade: 'D', label: 'Weak', tone: 'D' };
  }
  if (!isNaN(acc) && acc > 0) {
    if (acc >= 0.9) return { grade: 'A', label: 'Excellent', tone: 'A' };
    if (acc >= 0.8) return { grade: 'B', label: 'Good', tone: 'B' };
    if (acc >= 0.7) return { grade: 'C', label: 'Moderate', tone: 'C' };
    return { grade: 'D', label: 'Weak', tone: 'D' };
  }
  return { grade: '?', label: 'N/A', tone: 'C' };
}

function ModelTrainingBlock({ payload, onAsk, onDelete, kind, pinned }: { payload: any; onAsk?: (q: string) => void; onDelete?: () => void; kind?: string; pinned?: boolean }) {
  const [progress, setProgress] = useState(payload.steps || []);
  useEffect(() => { setProgress(payload.steps || []); }, [payload]);

  const metrics = payload.metrics || {};
  const grade = gradeFor(metrics);
  const features: string[] = (payload.spec?.features) || (payload.features) || [];
  const weights: number[] = (payload.spec?.weights) || (payload.weights) || [];
  const means: number[] = (payload.spec?.means) || (payload.means) || [];
  const stds: number[] = (payload.spec?.stds) || (payload.stds) || [];
  const importance = features.length && weights.length
    ? features.map((f, i) => ({ feature: f, weight: weights[i], abs: Math.abs(weights[i] || 0) }))
        .sort((a, b) => b.abs - a.abs)
    : [];
  const lossHistory: number[] = (payload.spec?.loss_history) || payload.loss_history || [];
  const finalLoss = lossHistory.length ? lossHistory[lossHistory.length - 1] : null;
  const initialLoss = lossHistory.length ? lossHistory[0] : null;
  const lossDelta = (finalLoss != null && initialLoss != null) ? (initialLoss - finalLoss) : null;

  return (
    <div className="canvas-block card">
      <div className="block-header">
        <div className="block-header-meta min-w-0">
          <KindChip kind={kind || 'model_training'} size="xs" />
          {pinned && <PinChip />}
          <div className="block-header-title truncate">
            <Brain size={13} className="text-[var(--color-accent)] shrink-0" /> {payload.name || 'Model Training'}
          </div>
        </div>
        <div className="block-header-actions">
          <span className={`grade-badge grade-${grade.tone}`}>
            <Award size={11} /> {grade.grade} · {grade.label}
          </span>
          <ActionBtn icon={Trash2} onClick={onDelete} title="Delete" danger />
        </div>
      </div>
      <div className="block-header-tags mb-3 -mt-1">
        <span className="tag">{payload.kind}</span>
        {payload.training_size && <span className="tag">{payload.training_size} samples</span>}
        {features.length > 0 && <span className="tag">{features.length} features</span>}
        {lossHistory.length > 0 && <span className="tag">{lossHistory.length} loss snapshots</span>}
      </div>

      {/* Headline metrics */}
      {Object.keys(metrics).length > 0 && (
        <div className="detail-grid mb-3">
          {Object.entries(metrics).map(([k, v]: any) => (
            <div key={k} className="detail-cell">
              <div className="lbl">{k.replace(/_/g, ' ')}</div>
              <div className="val">{typeof v === 'number' ? (v < 1 ? (v * 100).toFixed(1) + '%' : v.toFixed(3)) : String(v)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Process steps */}
      <div className="space-y-1.5 mb-3">
        {progress.map((s: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-md" style={{
            background: s.status === 'running' ? 'rgba(124,92,255,0.10)' : s.status === 'done' ? 'rgba(52,211,153,0.07)' : 'transparent',
            border: '1px solid ' + (s.status === 'running' ? 'rgba(124,92,255,0.35)' : s.status === 'done' ? 'rgba(52,211,153,0.25)' : 'transparent'),
          }}>
            {s.status === 'done' ? <Check size={12} className="text-[var(--color-good)]" /> :
              s.status === 'running' ? <Loader2 size={12} className="animate-spin text-[var(--color-accent)]" /> :
              <div className="w-3 h-3 rounded-full border border-[var(--color-border-2)]" />}
            <span className={s.status === 'done' ? 'text-[var(--color-text-dim)]' : ''}>{s.label}</span>
            {s.detail && <span className="text-[var(--color-text-faint)] ml-auto">{s.detail}</span>}
          </div>
        ))}
      </div>

      {/* Hyperparameters */}
      {(lossHistory.length > 0 || initialLoss != null) && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] mb-1.5">Training dynamics</div>
          <div className="detail-grid">
            {initialLoss != null && (
              <div className="detail-cell"><div className="lbl">Initial loss</div><div className="val">{initialLoss.toFixed(3)}</div></div>
            )}
            {finalLoss != null && (
              <div className="detail-cell"><div className="lbl">Final loss</div><div className="val">{finalLoss.toFixed(3)}</div></div>
            )}
            {lossDelta != null && (
              <div className="detail-cell">
                <div className="lbl">Δ loss</div>
                <div className="val tone-good">−{lossDelta.toFixed(3)}</div>
              </div>
            )}
            {payload.spec?.bias != null && (
              <div className="detail-cell"><div className="lbl">Bias</div><div className="val">{(+payload.spec.bias).toFixed(3)}</div></div>
            )}
          </div>
        </div>
      )}

      {/* Feature importance */}
      {importance.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-faint)] mb-1.5">Feature impact</div>
          <div className="space-y-1">
            {importance.slice(0, 8).map(f => {
              const max = importance[0].abs || 1;
              const pct = Math.max(2, (f.abs / max) * 100);
              const positive = f.weight >= 0;
              return (
                <div key={f.feature} className="flex items-center gap-2">
                  <div className="text-[11px] text-[var(--color-text-dim)] truncate w-[140px] shrink-0 font-mono">{f.feature}</div>
                  <div className="flex-1 h-2 rounded-full bg-[var(--color-bg-2)] overflow-hidden relative">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: positive ? 'linear-gradient(90deg, rgba(52,211,153,0.6), #34d399)' : 'linear-gradient(90deg, rgba(248,113,113,0.6), #f87171)',
                      }}
                    />
                  </div>
                  <div className={`text-[10.5px] font-semibold w-[70px] text-right ${positive ? 'tone-good' : 'tone-bad'}`}>
                    {positive ? '+' : ''}{f.weight.toFixed(3)}
                  </div>
                </div>
              );
            })}
            {importance.length > 8 && <div className="text-[10px] text-[var(--color-text-faint)]">…and {importance.length - 8} more features</div>}
          </div>
        </div>
      )}

      {/* Feature standardization stats (collapsed) */}
      {means.length > 0 && stds.length > 0 && (
        <details className="mb-2 text-xs">
          <summary className="cursor-pointer text-[var(--color-accent-2)] text-[11px]">Feature standardization (mean / std)</summary>
          <div className="mt-2 detail-grid">
            {features.slice(0, means.length).map((f, i) => (
              <div key={f} className="detail-cell">
                <div className="lbl">{f}</div>
                <div className="val text-[11px] font-mono">μ={means[i]?.toFixed(2)} σ={stds[i]?.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Raw spec */}
      {payload.spec?.weights && Array.isArray(payload.spec.weights) && (
        <details className="text-xs">
          <summary className="cursor-pointer text-[var(--color-accent-2)] text-[11px]">Model spec (raw JSON)</summary>
          <pre className="mt-2 p-2 bg-[var(--color-bg-2)] rounded text-[10px] overflow-auto max-h-[200px]">{JSON.stringify(payload.spec, null, 2)}</pre>
        </details>
      )}

      {grade.tone === 'D' && (
        <div className="mt-3 px-3 py-2 rounded-md flex items-start gap-2" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <AlertTriangle size={12} className="tone-bad mt-0.5" />
          <div className="text-[11px] text-[var(--color-text-dim)]">
            This model has weak discriminative power. Consider richer features (carrier load, distance, weather, day-of-week), addressing class imbalance, or collecting more data.
          </div>
        </div>
      )}

      {onAsk && <button onClick={() => onAsk(`About model "${payload.name}": `)} className="float-ask"><MessageCircle size={12} /> Ask</button>}
    </div>
  );
}

export default memo(ModelTrainingBlock, (prev, next) =>
  prev.payload === next.payload &&
  prev.pinned === next.pinned &&
  prev.kind === next.kind,
);
