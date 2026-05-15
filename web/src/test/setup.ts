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
// @ts-expect-error -- assign global stub
globalThis.ResizeObserver = globalThis.ResizeObserver ?? ResizeObserverStub;

afterEach(() => cleanup());
