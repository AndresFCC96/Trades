import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Capture the listener registered by subscribeKafkaStats so we can push
// fake frames from the test.
const listeners: Array<(s: unknown) => void> = [];
vi.mock('@/lib/ws/kafkaStats', () => ({
  subscribeKafkaStats: (cb: (s: unknown) => void) => {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
}));

import { useKafkaStats } from './useKafkaStats';

const sampleStatus = {
  state: 'running',
  started_at: '2026-05-14T21:00:00Z',
  messages_consumed_total: 100,
  errors_total: 0,
  batches_processed: 1,
  buffer_size: 50,
  throughput_msgs_per_sec: 12.5,
  lag: null,
  last_batch_at: null,
  last_batch_size: 0,
  last_batch_meta: {},
  last_error: null,
  bootstrap_servers: 'localhost:9092',
  topic: 'trades.raw',
};

describe('useKafkaStats', () => {
  beforeEach(() => {
    listeners.length = 0;
    vi.useFakeTimers();
  });

  it('starts with null status and empty history', () => {
    const { result } = renderHook(() => useKafkaStats());
    expect(result.current.status).toBeNull();
    expect(result.current.history).toEqual([]);
  });

  it('updates status when the WS pushes a frame', () => {
    const { result } = renderHook(() => useKafkaStats());
    act(() => {
      listeners[0]?.(sampleStatus);
    });
    expect(result.current.status).toEqual(sampleStatus);
    expect(result.current.history).toEqual([12.5]);
  });

  it('throttles history pushes to one per ~800ms', () => {
    const { result } = renderHook(() => useKafkaStats());
    act(() => listeners[0]?.(sampleStatus));
    act(() => listeners[0]?.({ ...sampleStatus, throughput_msgs_per_sec: 20 }));
    // Within the throttle window the second push is discarded
    expect(result.current.history).toEqual([12.5]);
    // After the throttle window opens again
    act(() => vi.advanceTimersByTime(900));
    act(() => listeners[0]?.({ ...sampleStatus, throughput_msgs_per_sec: 30 }));
    expect(result.current.history).toEqual([12.5, 30]);
  });
});
