import { describe, it, expect, vi } from 'vitest';
import { downloadJson, toCsvString } from './exportRows';

describe('exportRows', () => {
  it('downloadJson triggers a blob download with the rows JSON-stringified', () => {
    const clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });
    const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake');
    const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadJson([{ a: 1 }], 'test');

    expect(clickSpy).toHaveBeenCalled();
    expect(createUrl).toHaveBeenCalled();
    expect(revokeUrl).toHaveBeenCalled();
  });

  it('toCsvString escapes commas and quotes', () => {
    const csv = toCsvString([{ msg: 'hello, world', q: 'he said "hi"' }]);
    expect(csv).toContain('"hello, world"');
    expect(csv).toContain('"he said ""hi"""');
  });

  it('toCsvString includes a header row with the union of keys', () => {
    const csv = toCsvString([
      { a: 1, b: 2 },
      { b: 3, c: 4 },
    ]);
    const [header] = csv.split('\n');
    expect(header.split(',')).toEqual(['a', 'b', 'c']);
  });

  it('toCsvString returns empty string for no rows', () => {
    expect(toCsvString([])).toBe('');
  });
});
