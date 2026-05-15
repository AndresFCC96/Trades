import { describe, it, expect } from 'vitest';
import { fmt } from './fmt';

describe('fmt.usd', () => {
  it('formats billions with B suffix', () => {
    expect(fmt.usd(1_310_000_000)).toBe('$1.31B');
  });
  it('formats millions with M suffix', () => {
    expect(fmt.usd(521_000_000)).toBe('$521.0M');
  });
  it('formats thousands with K suffix', () => {
    expect(fmt.usd(12_345)).toBe('$12.3K');
  });
  it('formats < 1000 without suffix', () => {
    expect(fmt.usd(842)).toBe('$842');
  });
});

describe('fmt.num', () => {
  it('uses US locale separators', () => {
    expect(fmt.num(1234567)).toBe('1,234,567');
  });
});

describe('fmt.pct', () => {
  it('defaults to 1 decimal', () => {
    expect(fmt.pct(96.71)).toBe('96.7%');
  });
  it('honours decimals arg', () => {
    expect(fmt.pct(96.71234, 3)).toBe('96.712%');
  });
});

describe('fmt.dur', () => {
  it('renders ms for < 1s', () => {
    expect(fmt.dur(842)).toBe('842ms');
  });
  it('renders seconds for >= 1s', () => {
    expect(fmt.dur(1234)).toBe('1.23s');
  });
});

describe('fmt.short', () => {
  it('truncates with ellipsis', () => {
    expect(fmt.short('run_abc1234567890', 10)).toBe('run_abc123…');
  });
  it('leaves short strings untouched', () => {
    expect(fmt.short('hi', 10)).toBe('hi');
  });
});
