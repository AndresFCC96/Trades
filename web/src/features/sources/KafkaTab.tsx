import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  kafkaConnect,
  kafkaStart,
  kafkaPause,
  kafkaResume,
  kafkaStop,
  getKafkaStatus,
} from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';
import { useKafkaStats } from '@/features/kafka/useKafkaStats';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Field, inputBoxStyle, inputRangeStyle } from '@/components/ui/Field';
import { MetricChip } from '@/components/ui/MetricChip';
import { ThroughputChart } from '@/components/charts/ThroughputChart';
import type { KafkaConnectRequest, KafkaState } from '@/lib/api/types';

type Security = NonNullable<KafkaConnectRequest['security_protocol']>;
type OnError = 'skip' | 'dlq' | 'halt';

export function KafkaTab() {
  const qc = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  // Connection form state
  const [bootstrap, setBootstrap] = useState('localhost:9092');
  const [topic, setTopic] = useState('trades.raw');
  const [group, setGroup] = useState('trade-pipeline');
  const [security, setSecurity] = useState<Security>('PLAINTEXT');
  const [batchSize, setBatchSize] = useState(1000);
  const [maxLat, setMaxLat] = useState(5);
  const [onErr, setOnErr] = useState<OnError>('skip');

  // Live status: REST snapshot every 3s + WS push every 1s (whichever is fresher)
  const { data: restStatus } = useQuery({
    queryKey: ['kafka-status'],
    queryFn: getKafkaStatus,
    refetchInterval: 3_000,
  });
  const { status: wsStatus, history } = useKafkaStats();
  const status = wsStatus ?? restStatus ?? null;
  const state: KafkaState = (status?.state as KafkaState) ?? 'stopped';

  const connectMut = useMutation({
    mutationFn: () =>
      kafkaConnect({
        bootstrap_servers: bootstrap,
        topic,
        group_id: group,
        security_protocol: security,
        buffer_max_size: batchSize,
        buffer_max_latency_ms: maxLat * 1000,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kafka-status'] });
      addToast('Kafka consumer configured · ready to start', 'ok');
    },
    onError: (e) => addToast(`Connect failed · ${(e as Error).message}`, 'crit'),
  });

  const startMut = useMutation({
    mutationFn: kafkaStart,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kafka-status'] });
      addToast('Streaming started', 'ok');
    },
    onError: (e) => addToast(`Start failed · ${(e as Error).message}`, 'crit'),
  });
  const pauseMut = useMutation({
    mutationFn: kafkaPause,
    onSuccess: () => addToast('Streaming paused', 'warn'),
  });
  const resumeMut = useMutation({
    mutationFn: kafkaResume,
    onSuccess: () => addToast('Streaming resumed', 'ok'),
  });
  const stopMut = useMutation({
    mutationFn: kafkaStop,
    onSuccess: () => addToast('Streaming stopped', 'warn'),
  });

  const connected = status !== null;
  const isLive = state === 'running';
  const isPaused = state === 'paused';

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3" style={{ gridTemplateColumns: '1.1fr 1.6fr 1fr' }}>
        {/* Cluster connection */}
        <Panel title="Cluster Connection">
          <Field label="BOOTSTRAP SERVERS">
            <input
              value={bootstrap}
              onChange={(e) => setBootstrap(e.target.value)}
              style={inputBoxStyle}
            />
          </Field>
          <Field label="TOPIC">
            <input value={topic} onChange={(e) => setTopic(e.target.value)} style={inputBoxStyle} />
          </Field>
          <Field label="CONSUMER GROUP">
            <input value={group} onChange={(e) => setGroup(e.target.value)} style={inputBoxStyle} />
          </Field>
          <Field label="SECURITY PROTOCOL">
            <select
              value={security}
              onChange={(e) => setSecurity(e.target.value as Security)}
              style={{ ...inputBoxStyle, appearance: 'menulist' }}
            >
              <option>PLAINTEXT</option>
              <option>SSL</option>
              <option>SASL_PLAINTEXT</option>
              <option>SASL_SSL</option>
            </select>
          </Field>
          {(security === 'SASL_PLAINTEXT' || security === 'SASL_SSL') && (
            <div className="mt-1 font-mono text-[10px] text-muted">
              SASL creds taken from env KAFKA_SASL_USERNAME / KAFKA_SASL_PASSWORD on the server.
            </div>
          )}
          <div className="mt-3 flex gap-2 items-center">
            <Btn kind="solid" onClick={() => connectMut.mutate()} disabled={connectMut.isPending}>
              {connectMut.isPending ? '◐ CONFIGURING…' : 'CONNECT'}
            </Btn>
            {connected && status && (
              <Badge tone={isLive ? 'ok' : 'neutral'}>
                {isLive ? '● ' : '○ '}
                {status.bootstrap_servers} · {status.topic}
              </Badge>
            )}
          </div>
        </Panel>

        {/* Stream Control HERO */}
        <Panel
          title="Stream Control"
          right={<StateBadge state={state} />}
        >
          <div
            className="grid gap-4 items-center mb-3.5"
            style={{ gridTemplateColumns: 'auto 1fr' }}
          >
            <BigButton
              state={state}
              disabled={!connected || startMut.isPending || pauseMut.isPending || resumeMut.isPending}
              onClick={() => {
                if (state === 'stopped' || state === 'error') startMut.mutate();
                else if (state === 'running') pauseMut.mutate();
                else if (state === 'paused') resumeMut.mutate();
              }}
            />
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              <MetricChip
                label="MSG/SEC"
                value={status ? status.throughput_msgs_per_sec.toFixed(1) : '—'}
                color="#4ade80"
              />
              <MetricChip
                label="BUFFER SIZE"
                value={status ? fmt.num(status.buffer_size) : '—'}
                color={status && status.buffer_size > batchSize * 0.8 ? '#fbbf24' : '#4ade80'}
              />
              <MetricChip
                label="TOTAL CONSUMED"
                value={status ? fmt.num(status.messages_consumed_total) : '—'}
                color="#60a5fa"
              />
              <MetricChip
                label="ERRORS"
                value={status ? fmt.num(status.errors_total) : '—'}
                color={status && status.errors_total > 0 ? '#f87171' : '#4ade80'}
              />
            </div>
          </div>
          <div className="border-t border-border-soft pt-2.5">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-xs text-muted">THROUGHPUT · LAST 60s</span>
              <span className="font-mono text-xs" style={{ color: '#4ade80' }}>
                {history.length > 0 ? history[history.length - 1].toFixed(1) : '—'} msg/s
              </span>
            </div>
            <ThroughputChart data={history.length > 1 ? history : [0, 0]} max={Math.max(50, ...history) * 1.2} />
          </div>
          <div className="mt-3 flex gap-1.5">
            <Btn
              onClick={() => pauseMut.mutate()}
              disabled={!isLive || pauseMut.isPending}
            >
              PAUSE
            </Btn>
            <Btn
              onClick={() => resumeMut.mutate()}
              disabled={!isPaused || resumeMut.isPending}
            >
              RESUME
            </Btn>
            <Btn
              kind="danger"
              onClick={() => stopMut.mutate()}
              disabled={!connected || state === 'stopped' || stopMut.isPending}
            >
              STOP
            </Btn>
          </div>
        </Panel>

        {/* Buffer & batching */}
        <Panel title="Buffer & Batching">
          <Field
            label="BATCH SIZE"
            value={`${fmt.num(batchSize)} trades`}
            hint="Trades buffered before flush"
          >
            <input
              type="range"
              min={100}
              max={10_000}
              step={100}
              value={batchSize}
              onChange={(e) => setBatchSize(+e.target.value)}
              style={inputRangeStyle}
            />
          </Field>
          <Field label="MAX LATENCY" value={`${maxLat}s`} hint="Force flush after">
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={maxLat}
              onChange={(e) => setMaxLat(+e.target.value)}
              style={inputRangeStyle}
            />
          </Field>
          <Field label="ON ERROR">
            <div className="grid gap-1">
              {(
                [
                  ['skip', 'SKIP MESSAGE'],
                  ['dlq', 'DEAD LETTER QUEUE (backlog)'],
                  ['halt', 'HALT STREAM'],
                ] as Array<[OnError, string]>
              ).map(([id, l]) => (
                <label
                  key={id}
                  className="flex items-center gap-2 p-1.5 cursor-pointer"
                  style={{
                    border: '1px solid var(--border)',
                    background: onErr === id ? 'rgba(74,222,128,0.06)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    checked={onErr === id}
                    onChange={() => setOnErr(id)}
                    style={{ accentColor: '#4ade80' }}
                  />
                  <span
                    className="font-mono text-sm"
                    style={{ color: onErr === id ? '#4ade80' : 'var(--fg)' }}
                  >
                    {l}
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <div className="mt-2 font-mono text-[10px] text-muted">
            Apply with the CONNECT button. Live updates need a re-connect.
          </div>
        </Panel>
      </div>

      <Panel
        title={`Last Batch · ${status?.topic ?? '—'}`}
        right={
          status?.last_batch_at ? (
            <span className="font-mono text-xs" style={{ color: '#4ade80' }}>
              ● {fmt.num(status.batches_processed)} BATCHES PROCESSED
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">— NO BATCHES YET —</span>
          )
        }
      >
        {status?.last_batch_at ? (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <Field label="LAST FLUSH" value={fmt.dt(status.last_batch_at).slice(11, 19)} />
            <Field label="BATCH SIZE" value={fmt.num(status.last_batch_size)} />
            <Field
              label="LAST RUN ID"
              value={
                typeof status.last_batch_meta?.run_id === 'string'
                  ? fmt.short(status.last_batch_meta.run_id as string, 16)
                  : '—'
              }
            />
            <Field
              label="LAST QUALITY"
              value={
                typeof status.last_batch_meta?.quality_score === 'number'
                  ? (status.last_batch_meta.quality_score as number).toFixed(1)
                  : '—'
              }
            />
          </div>
        ) : (
          <div className="py-6 text-center font-mono text-sm text-muted">
            — Each flushed batch triggers a pipeline run and lands here —
          </div>
        )}
        {status?.last_error && (
          <div
            className="mt-3 px-3 py-2 font-mono text-xs"
            style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.3)',
              borderLeft: '3px solid #f87171',
              color: '#f87171',
            }}
          >
            LAST ERROR · {status.last_error}
          </div>
        )}
      </Panel>
    </div>
  );
}

// =====================================================================
// Big circular start/pause/resume button
// =====================================================================
function BigButton({
  state,
  disabled,
  onClick,
}: {
  state: KafkaState;
  disabled: boolean;
  onClick: () => void;
}) {
  const live = state === 'running';
  const paused = state === 'paused';
  const error = state === 'error';
  const transitional = state === 'starting' || state === 'stopping';
  const color = live ? '#4ade80' : paused ? '#fbbf24' : error ? '#f87171' : 'var(--muted)';
  const icon = live ? '▮▮' : transitional ? '◐' : '▶';
  const label = live ? 'STREAMING' : paused ? 'PAUSED' : transitional ? state.toUpperCase() : error ? 'ERROR' : 'IDLE';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: live ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
        border: `2px solid ${color}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
        animation: live ? 'pulseBig 2s infinite' : 'none',
      }}
    >
      <div
        style={{
          fontFamily: 'IBM Plex Mono',
          fontSize: 26,
          color,
          animation: transitional ? 'spin 1s linear infinite' : 'none',
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: 'IBM Plex Mono',
          fontSize: 9,
          color,
          letterSpacing: 1,
          marginTop: -4,
        }}
      >
        {label}
      </div>
    </button>
  );
}

function StateBadge({ state }: { state: KafkaState }) {
  const map: Record<KafkaState, { tone: 'ok' | 'warn' | 'crit' | 'neutral' | 'info'; label: string }> = {
    stopped: { tone: 'neutral', label: '○ STOPPED' },
    starting: { tone: 'info', label: '◐ STARTING' },
    running: { tone: 'ok', label: '● LIVE' },
    paused: { tone: 'warn', label: '▮ PAUSED' },
    stopping: { tone: 'info', label: '◐ STOPPING' },
    error: { tone: 'crit', label: '✕ ERROR' },
  };
  const m = map[state];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
