import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toggle } from './Toggle';

describe('<Toggle />', () => {
  it('renders label', () => {
    render(<Toggle checked={false} onChange={() => {}} label="ENABLED" />);
    expect(screen.getByText('ENABLED')).toBeInTheDocument();
  });

  it('fires onChange on click', async () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} label="X" />);
    await userEvent.click(screen.getByText('X'));
    expect(onChange).toHaveBeenCalled();
  });
});
