/**
 * WebSocket subscription to /ws/kafka/trades.
 * Same reconnect strategy as kafkaStats: exponential backoff capped at 8s.
 * Each frame is a single trade payload (with `_arrived_at` from server).
 */

type Listener = (trade: Record<string, unknown>) => void;

export function subscribeKafkaTrades(
  onMessage: Listener,
  onError?: (e: Event) => void,
) {
  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: number | null = null;

  function connect() {
    if (closed) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${window.location.host}/ws/kafka/trades`);
    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data) as Record<string, unknown>);
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
