import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KPI } from './KPI';

describe('<KPI />', () => {
  it('renders label, value and sub', () => {
    render(<KPI label="Quality Score" value="87.0" sub="UMBRAL ≥ 80" />);
    expect(screen.getByText('Quality Score')).toBeInTheDocument();
    expect(screen.getByText('87.0')).toBeInTheDocument();
    expect(screen.getByText('UMBRAL ≥ 80')).toBeInTheDocument();
  });

  it('paints the value green when tone is ok', () => {
    render(<KPI label="x" value="42" tone="ok" />);
    expect(screen.getByText('42')).toHaveStyle({ color: '#4ade80' });
  });

  it('paints the value red when tone is crit', () => {
    render(<KPI label="x" value="42" tone="crit" />);
    expect(screen.getByText('42')).toHaveStyle({ color: '#f87171' });
  });
});
