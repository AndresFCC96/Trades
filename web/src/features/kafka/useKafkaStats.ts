import { useEffect, useRef, useState } from 'react';
import { subscribeKafkaStats } from '@/lib/ws/kafkaStats';
import type { KafkaStatus } from '@/lib/api/types';

/**
 * Suscribe al WS /ws/kafka/stats y mantiene:
 *  - status: último snapshot
 *  - history: serie deslizante de throughput (msg/s) — N puntos.
 */
export function useKafkaStats(historyLen = 60) {
  const [status, setStatus] = useState<KafkaStatus | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const lastTickRef = useRef(0);

  useEffect(() => {
    const stop = subscribeKafkaStats((s) => {
      setStatus(s);
      // Append to throughput history, throttled to one push per ~800ms
      const now = Date.now();
      if (now - lastTickRef.current >= 800) {
        lastTickRef.current = now;
        setHistory((h) => {
          const next = [...h, s.throughput_msgs_per_sec];
          return next.length > historyLen ? next.slice(-historyLen) : next;
        });
      }
    });
    return stop;
  }, [historyLen]);

  return { status, history };
}
