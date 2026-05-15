import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  dense?: boolean;
  className?: string;
  bodyClassName?: string;
};

export function Panel({ title, right, children, dense, className, bodyClassName }: Props) {
  return (
    <div
      className={cn(
        'bg-panel border border-border rounded-[2px]',
        className
      )}
    >
      {title !== undefined && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border font-mono text-2xs tracking-wider text-muted uppercase">
          <span>{title}</span>
          {right}
        </div>
      )}
      <div className={cn(dense ? 'p-2' : 'p-3', bodyClassName)}>{children}</div>
    </div>
  );
}
