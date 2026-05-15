import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RiskCard } from './RiskCard';

describe('<RiskCard />', () => {
  it('renders label, count and pct', () => {
    render(<RiskCard tone="crit" label="HIGH RISK" count={234} pct={2.4} />);
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
    expect(screen.getByText('234')).toBeInTheDocument();
    expect(screen.getByText('2.4%')).toBeInTheDocument();
  });

  it('formats count with thousands separator', () => {
    render(<RiskCard tone="warn" label="MEDIUM" count={1284} pct={13} />);
    expect(screen.getByText('1,284')).toBeInTheDocument();
  });

  it('paints the label in the tone color', () => {
    render(<RiskCard tone="ok" label="LOW RISK" count={9000} pct={86.6} />);
    expect(screen.getByText('LOW RISK')).toHaveStyle({ color: '#4ade80' });
  });
});
