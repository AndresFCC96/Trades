import { useState } from 'react';
import { FileTab } from './FileTab';
import { HttpTab } from './HttpTab';
import { KafkaTab } from './KafkaTab';
import { SavedTab } from './SavedTab';

type Tab = 'file' | 'http' | 'kafka' | 'saved';

export function Sources() {
  const [tab, setTab] = useState<Tab>('kafka');

  const tabs: Array<[Tab, string]> = [
    ['file', '⇣ FILE UPLOAD'],
    ['http', '⇄ HTTP ENDPOINT'],
    ['kafka', '⥄ KAFKA STREAMING'],
    ['saved', '☰ SAVED CLUSTERS'],
  ];

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex border-b border-border">
        {tabs.map(([id, label]) => (
          <div
            key={id}
            onClick={() => setTab(id)}
            className="px-4 py-2.5 font-mono text-sm tracking-wider cursor-pointer"
            style={{
              color: tab === id ? '#4ade80' : 'var(--muted)',
              borderBottom: tab === id ? '2px solid #4ade80' : '2px solid transparent',
            }}
          >
            {label}
          </div>
        ))}
      </div>
      {tab === 'file' && <FileTab />}
      {tab === 'http' && <HttpTab />}
      {tab === 'kafka' && <KafkaTab />}
      {tab === 'saved' && <SavedTab />}
    </div>
  );
}
