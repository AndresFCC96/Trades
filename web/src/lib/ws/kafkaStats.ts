/**
 * WebSocket subscription to /ws/kafka/stats.
 * Reconecta automáticamente con backoff exponencial corto (1s, 2s, 4s, max 8s).
 * Devuelve cleanup() para cerrar el socket.
 */
import type { KafkaStatus } from '../api/types';

type Listener = (status: KafkaStatus) => void;

export function subscribeKafkaStats(onMessage: Listener, onError?: (e: Event) => void) {
  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: number | null = null;

  function connect() {
    if (closed) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${window.location.host}/ws/kafka/stats`);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as KafkaStatus;
        onMessage(data);
        attempt = 0;
      } catch {
        // ignore malformed frames
      }
    };
    ws.onerror = (e) => {
      if (onError) onError(e);
    };
    ws.onclose = () => {
      if (closed) return;
      attempt += 1;
      const delay = Math.min(8000, 1000 * 2 ** Math.min(3, attempt - 1));
      reconnectTimer = window.setTimeout(connect, delay);
    };
  }

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}
