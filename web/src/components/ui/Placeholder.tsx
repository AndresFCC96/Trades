import { Panel } from './Panel';

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-4">
      <Panel title={title}>
        <div className="py-10 text-center font-mono text-sm text-muted tracking-wider">
          ─── SCREEN UNDER CONSTRUCTION ───
          <div className="mt-2">This view will be wired to the live backend.</div>
        </div>
      </Panel>
    </div>
  );
}
