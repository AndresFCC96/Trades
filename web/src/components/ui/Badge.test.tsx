import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('<Badge />', () => {
  it('renders children text', () => {
    render(<Badge>RV-01</Badge>);
    expect(screen.getByText('RV-01')).toBeInTheDocument();
  });

  it('applies the "ok" tone colors', () => {
    render(<Badge tone="ok">LIVE</Badge>);
    const el = screen.getByText('LIVE');
    expect(el).toHaveStyle({ color: '#4ade80' });
  });

  it('applies the "crit" tone colors', () => {
    render(<Badge tone="crit">REJECTED</Badge>);
    const el = screen.getByText('REJECTED');
    expect(el).toHaveStyle({ color: '#f87171' });
  });
});
