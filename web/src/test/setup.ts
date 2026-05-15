import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't ship ResizeObserver — components that read it (none yet,
// but recharts/shadcn need it) get a noop stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const g = globalThis as unknown as { ResizeObserver?: unknown };
g.ResizeObserver = g.ResizeObserver ?? ResizeObserverStub;

// jsdom doesn't implement createObjectURL / revokeObjectURL — many file
// download flows depend on them. No-ops are fine; tests that care about
// the URL value can spy on these.
if (typeof URL.createObjectURL === 'undefined') {
  (URL as unknown as { createObjectURL: (src: unknown) => string }).createObjectURL =
    () => 'blob:stub';
}
if (typeof URL.revokeObjectURL === 'undefined') {
  (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL =
    () => {};
}

afterEach(() => cleanup());
