import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';

import {
  uploadSource,
  listSources,
  getSourcePreview,
  setSourceMapping,
  deleteSource,
  runSourcePipeline,
} from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Btn } from '@/components/ui/Btn';
import { inputBoxStyle } from '@/components/ui/Field';
import type { SourceMetadata } from '@/lib/api/types';

const TRADE_COLUMNS = [
  'trade_id', 'timestamp', 'instrument', 'asset_class', 'side',
  'quantity', 'price', 'notional', 'currency',
  'counterparty_id', 'trader_id', 'venue', 'status',
] as const;
const REQUIRED = new Set([
  'trade_id', 'timestamp', 'instrument', 'asset_class', 'side',
  'quantity', 'price', 'notional', 'currency', 'trader_id', 'status',
]);
const IGNORE = '__ignore__';

export function FileTab() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const addToast = useStore((s) => s.addToast);
  const setActiveRun = useStore((s) => s.setActiveRun);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: sources = [] } = useQuery({
    queryKey: ['sources'],
    queryFn: listSources,
    refetchInterval: 5_000,
  });

  // Auto-select most recent upload when nothing chosen
  useEffect(() => {
    if (!selectedId && sources.length > 0) setSelectedId(sources[sources.length - 1].source_id);
  }, [selectedId, sources]);

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadSource(file),
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ['sources'] });
      setSelectedId(m.source_id);
      addToast(`Uploaded ${m.original_name} · ${(m.size_bytes / 1024).toFixed(1)} KB`, 'ok');
    },
    onError: (e) => addToast(`Upload failed · ${(e as Error).message}`, 'crit'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSource(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] });
      setSelectedId(null);
      addToast('Source deleted', 'ok');
    },
  });

  const onPickFiles = (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) uploadMut.mutate(f);
  };

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
      {/* LEFT: Dropzone + uploads list */}
      <div className="flex flex-col gap-3">
        <Panel title="Drop Zone">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onPickFiles(e.dataTransfer.files);
            }}
            onClick={() => fileRef.current?.click()}
            className="text-center cursor-pointer font-mono"
            style={{
              border: `2px dashed ${dragOver ? '#4ade80' : 'var(--border)'}`,
              borderRadius: 2,
              padding: 40,
              background: dragOver ? 'rgba(74,222,128,0.05)' : 'transparent',
            }}
          >
            <div className="text-4xl text-muted">⇣</div>
            <div className="text-base text-fg mt-2">DRAG CSV / XLSX / PARQUET</div>
            <div className="text-xs text-muted mt-1">or click to browse · max 200MB</div>
            <Btn kind="solid" size="md" style={{ marginTop: 16 }}>
              BROWSE FILES
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.parquet"
              multiple
              onChange={(e) => onPickFiles(e.target.files)}
              style={{ display: 'none' }}
            />
          </div>
        </Panel>

        <Panel
          title={`Uploaded sources · ${sources.length}`}
          right={
            uploadMut.isPending ? (
              <Badge tone="info">▮▮ UPLOADING…</Badge>
            ) : undefined
          }
        >
          {sources.length === 0 ? (
            <div className="py-6 text-center font-mono text-sm text-muted">
              — NO FILES YET — drop something on the zone above
            </div>
          ) : (
            sources
              .slice()
              .reverse()
              .map((s) => (
                <div
                  key={s.source_id}
                  onClick={() => setSelectedId(s.source_id)}
                  className="grid items-center px-2.5 py-2 cursor-pointer font-mono text-sm"
                  style={{
                    gridTemplateColumns: '1fr 80px 80px 30px',
                    borderBottom: '1px solid var(--border-soft)',
                    background:
                      selectedId === s.source_id ? 'rgba(74,222,128,0.06)' : 'transparent',
                    borderLeft:
                      selectedId === s.source_id
                        ? '2px solid #4ade80'
                        : '2px solid transparent',
                  }}
                >
                  <span className="text-fg">{s.original_name}</span>
                  <span className="text-muted">
                    {(s.size_bytes / 1024).toFixed(1)}KB
                  </span>
                  <span className="text-muted">{s.row_count != null ? `${fmt.num(s.row_count)} rows` : '— rows'}</span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete ${s.original_name}?`)) deleteMut.mutate(s.source_id);
                    }}
                    className="text-muted text-right cursor-pointer hover:text-crit"
                    title="Delete"
                  >
                    ✕
                  </span>
                </div>
              ))
          )}
        </Panel>
      </div>

      {/* RIGHT: Schema mapping for selected source */}
      <div>
        {selectedId ? (
          <MappingPanel
            sourceId={selectedId}
            onRunSuccess={(runId, score) => {
              qc.invalidateQueries({ queryKey: ['pipeline-history'] });
              addToast(`Run OK · ${runId.slice(0, 12)} · score ${score.toFixed(1)}`, 'ok');
              navigate({ to: '/' });
            }}
            setActiveRun={setActiveRun}
          />
        ) : (
          <Panel title="Schema Validation">
            <div className="py-10 text-center font-mono text-sm text-muted">
              — SELECT A SOURCE TO MAP COLUMNS —
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Mapping panel
// =====================================================================
type MappingPanelProps = {
  sourceId: string;
  onRunSuccess: (runId: string, score: number) => void;
  setActiveRun: (r: import('@/lib/api/types').Run) => void;
};

function MappingPanel({ sourceId, onRunSuccess, setActiveRun }: MappingPanelProps) {
  const qc = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  const { data: source } = useQuery<SourceMetadata>({
    queryKey: ['source', sourceId],
    queryFn: () => import('@/lib/api/endpoints').then((m) => m.getSource(sourceId)),
  });

  const { data: preview, isLoading: previewLoading } = useQuery({
    queryKey: ['source-preview', sourceId],
    queryFn: () => getSourcePreview(sourceId),
  });

  const [mapping, setMapping] = useState<Record<string, string>>({});

  // Initialise mapping when preview arrives:
  //  - if source already has a saved mapping, use it
  //  - else auto-match by exact-or-lowercase name
  useEffect(() => {
    if (!preview) return;
    const next: Record<string, string> = {};
    const saved = source?.mapping ?? {};
    for (const col of preview.columns) {
      if (saved[col]) {
        next[col] = saved[col];
        continue;
      }
      const lc = col.toLowerCase();
      const match = TRADE_COLUMNS.find((tc) => tc === lc);
      next[col] = match ?? IGNORE;
    }
    setMapping(next);
  }, [preview, source]);

  const saveMut = useMutation({
    mutationFn: (m: Record<string, string>) => {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(m)) if (v !== IGNORE) clean[k] = v;
      return setSourceMapping(sourceId, clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['source', sourceId] });
      qc.invalidateQueries({ queryKey: ['sources'] });
      addToast('Mapping saved', 'ok');
    },
    onError: (e) => addToast(`Mapping failed · ${(e as Error).message}`, 'crit'),
  });

  const runMut = useMutation({
    mutationFn: () => runSourcePipeline(sourceId),
    onSuccess: (res) => {
      setActiveRun({
        run_id: res.run_id,
        started_at: res.started_at,
        finished_at: res.finished_at,
        duration_ms: res.duration_ms,
        mode: res.mode,
        trades_in: res.validation_summary.total_in,
        trades_out: res.validation_summary.total_out,
        quality_score: res.quality_score,
      });
      onRunSuccess(res.run_id, res.quality_score);
    },
    onError: (e) => addToast(`Run failed · ${(e as Error).message}`, 'crit'),
  });

  // Compute mapping coverage
  const coverage = useMemo(() => {
    const mapped = new Set(Object.values(mapping).filter((v) => v !== IGNORE));
    const required = Array.from(REQUIRED);
    const missing = required.filter((r) => !mapped.has(r));
    return { mapped: mapped.size, missing };
  }, [mapping]);

  if (previewLoading) {
    return (
      <Panel title="Schema Validation">
        <div className="py-10 text-center font-mono text-sm text-muted">— LOADING —</div>
      </Panel>
    );
  }
  if (!preview) {
    return (
      <Panel title="Schema Validation">
        <div className="py-10 text-center font-mono text-sm text-crit">— ERROR LOADING PREVIEW —</div>
      </Panel>
    );
  }

  const canRun = coverage.missing.length === 0;

  return (
    <Panel
      title={`Schema · ${source?.original_name ?? sourceId.slice(0, 8)}`}
      right={
        canRun ? (
          <Badge tone="ok">● {coverage.mapped} MAPPED</Badge>
        ) : (
          <Badge tone="warn">⚠ {coverage.missing.length} MISSING</Badge>
        )
      }
    >
      <div className="font-mono text-xs text-muted mb-2">
        Map each source column to a TradeSchema field (or IGNORE).
        Required fields:{' '}
        <span className="text-fg">{Array.from(REQUIRED).join(', ')}</span>
      </div>
      <div style={{ maxHeight: 360, overflow: 'auto' }}>
        {preview.columns.map((col) => {
          const dst = mapping[col] ?? IGNORE;
          const isMapped = dst !== IGNORE;
          return (
            <div
              key={col}
              className="grid items-center font-mono text-sm"
              style={{
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                padding: '4px 8px',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <span className="text-fg">{col}</span>
              <select
                value={dst}
                onChange={(e) => setMapping({ ...mapping, [col]: e.target.value })}
                style={{ ...inputBoxStyle, marginTop: 0, appearance: 'menulist' }}
              >
                <option value={IGNORE}>— IGNORE —</option>
                {TRADE_COLUMNS.map((tc) => (
                  <option key={tc} value={tc}>
                    {tc}
                    {REQUIRED.has(tc) ? ' *' : ''}
                  </option>
                ))}
              </select>
              <span />
              <span className="font-mono text-xs">
                {isMapped ? (
                  <Badge tone="ok">→ {dst}</Badge>
                ) : (
                  <Badge tone="neutral">IGNORED</Badge>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {!canRun && (
        <div
          className="mt-3 px-3 py-2 font-mono text-xs"
          style={{
            background: 'rgba(251,191,36,0.06)',
            border: '1px solid rgba(251,191,36,0.3)',
            borderLeft: '3px solid #fbbf24',
            color: '#fbbf24',
          }}
        >
          MISSING REQUIRED · {coverage.missing.join(', ')}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <Btn kind="solid" onClick={() => saveMut.mutate(mapping)} disabled={saveMut.isPending}>
          {saveMut.isPending ? 'SAVING…' : 'SAVE MAPPING'}
        </Btn>
        <Btn
          kind="primary"
          onClick={() => {
            // Save then run
            saveMut.mutate(mapping, { onSuccess: () => runMut.mutate() });
          }}
          disabled={!canRun || runMut.isPending || saveMut.isPending}
        >
          {runMut.isPending ? '▮▮ RUNNING…' : '▶ RUN PIPELINE'}
        </Btn>
      </div>
    </Panel>
  );
}
