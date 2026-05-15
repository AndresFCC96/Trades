import { useEffect, useState } from 'react';
import { subscribeKafkaTrades } from '@/lib/ws/kafkaTrades';

/**
 * Keeps the last `bufferSize` trades streamed from the consumer's
 * /ws/kafka/trades channel. New trades are prepended so the UI can
 * render a top-down "tape" of arrivals.
 */
export function useKafkaTrades(bufferSize = 50) {
  const [trades, setTrades] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const stop = subscribeKafkaTrades((t) => {
      setTrades((prev) => [t, ...prev].slice(0, bufferSize));
    });
    return stop;
  }, [bufferSize]);

  return trades;
}
