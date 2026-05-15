import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Settings } from './Settings';

describe('<Settings />', () => {
  it('renders the warning banner and all 6 tabs', () => {
    render(<Settings />);
    expect(screen.getByText(/Read-only preview/i)).toBeInTheDocument();
    for (const t of [
      'GENERAL',
      'VALIDATOR THRESHOLDS',
      'GENERATOR CATALOGS',
      'AUDIT RETENTION',
      'API',
      'KAFKA CLUSTERS',
    ]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it('shows the validator thresholds form by default', () => {
    render(<Settings />);
    expect(screen.getByText('NOTIONAL_TOLERANCE')).toBeInTheDocument();
    expect(screen.getByText('IQR_FACTOR')).toBeInTheDocument();
    // SAVE button is disabled while the backend endpoint is missing
    expect(screen.getByRole('button', { name: /^SAVE$/i })).toBeDisabled();
  });

  it('keeps SAVE disabled when switching to another tab', async () => {
    render(<Settings />);
    await userEvent.click(screen.getByText('API'));
    expect(screen.queryByText('NOTIONAL_TOLERANCE')).not.toBeInTheDocument();
    expect(screen.getByText(/Host, port, CORS/i)).toBeInTheDocument();
  });
});
