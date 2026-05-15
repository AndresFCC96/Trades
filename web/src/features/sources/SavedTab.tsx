import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listKafkaClusters,
  createKafkaCluster,
  deleteKafkaCluster,
  useKafkaCluster,
} from '@/lib/api/endpoints';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/fmt';

import { Panel } from '@/components/ui/Panel';
import { Btn } from '@/components/ui/Btn';
import { Badge } from '@/components/ui/Badge';
import { Field, inputBoxStyle } from '@/components/ui/Field';
import { Table, type Col } from '@/components/tables/Table';
import type { KafkaCluster } from '@/lib/api/types';

type Security = KafkaCluster['security_protocol'];

export function SavedTab() {
  const qc = useQueryClient();
  const addToast = useStore((s) => s.addToast);

  const [name, setName] = useState('');
  const [bootstrap, setBootstrap] = useState('');
  const [topic, setTopic] = useState('');
  const [groupId, setGroupId] = useState('');
  const [security, setSecurity] = useState<Security>('PLAINTEXT');

  const { data, isLoading } = useQuery({
    queryKey: ['kafka-clusters'],
    queryFn: listKafkaClusters,
    refetchInterval: 10_000,
  });

  const createMut = useMutation({
    mutationFn: () =>
      createKafkaCluster({
        name,
        bootstrap_servers: bootstrap,
        topic,
        group_id: groupId,
        security_protocol: security,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kafka-clusters'] });
      setName('');
      setBootstrap('');
      setTopic('');
      setGroupId('');
      addToast('Cluster saved', 'ok');
    },
    onError: (e) => addToast(`Save failed · ${(e as Error).message}`, 'crit'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteKafkaCluster(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kafka-clusters'] }),
  });

  const useMut = useMutation({
    mutationFn: (id: string) => useKafkaCluster(id),
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ['kafka-clusters'] });
      qc.invalidateQueries({ queryKey: ['kafka-status'] });
      addToast(`Cluster applied · topic ${status.topic}`, 'ok');
    },
  });

  const clusters = data?.clusters ?? [];

  const cols: Col<KafkaCluster>[] = [
    { label: 'NAME', render: (r) => <span className="text-fg">{r.name}</span> },
    {
      label: 'BOOTSTRAP',
      render: (r) => <span className="text-muted">{r.bootstrap_servers}</span>,
    },
    {
      label: 'TOPIC',
      render: (r) => <span className="text-fg">{r.topic}</span>,
    },
    {
      label: 'PROTO',
      render: (r) => <Badge>{r.security_protocol}</Badge>,
    },
    {
      label: 'LAST USED',
      render: (r) => (
        <span className="text-muted">
          {r.last_used_at ? fmt.dt(r.last_used_at) : '—'}
        </span>
      ),
    },
    {
      label: '',
      align: 'right',
      render: (r) => (
        <div className="inline-flex gap-1.5">
          <Btn onClick={() => useMut.mutate(r.id)} disabled={useMut.isPending}>
            USE →
          </Btn>
          <Btn
            kind="danger"
            onClick={() => {
              if (confirm(`Delete cluster ${r.name}?`)) deleteMut.mutate(r.id);
            }}
            disabled={deleteMut.isPending}
          >
            ✕
          </Btn>
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1.4fr' }}>
      <Panel title="New Cluster">
        <Field label="NAME">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="prod-us-east"
            style={inputBoxStyle}
          />
        </Field>
        <Field label="BOOTSTRAP SERVERS">
          <input
            value={bootstrap}
            onChange={(e) => setBootstrap(e.target.value)}
            placeholder="kafka.prod:9092"
            style={inputBoxStyle}
          />
        </Field>
        <Field label="TOPIC">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="trades.raw"
            style={inputBoxStyle}
          />
        </Field>
        <Field label="CONSUMER GROUP">
          <input
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="pipeline-prod"
            style={inputBoxStyle}
          />
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
        <div className="mt-3 flex gap-2">
          <Btn
            kind="primary"
            onClick={() => createMut.mutate()}
            disabled={
              createMut.isPending ||
              !name.trim() ||
              !bootstrap.trim() ||
              !topic.trim() ||
              !groupId.trim()
            }
          >
            {createMut.isPending ? 'SAVING…' : 'SAVE CLUSTER'}
          </Btn>
        </div>
      </Panel>

      <Panel
        title={`Saved Clusters · ${clusters.length}${isLoading ? ' (loading…)' : ''}`}
      >
        <Table dense cols={cols} rows={clusters} emptyLabel="— NO SAVED CLUSTERS —" />
      </Panel>
    </div>
  );
}
