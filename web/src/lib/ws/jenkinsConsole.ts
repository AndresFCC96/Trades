/**
 * WebSocket subscription to /ws/jenkins/jobs/{name}/builds/{n}/log.
 * Each frame is either:
 *   - { text: "...", next_start: N, more: bool }  ← console chunk
 *   - { done: true }                              ← build finished
 *   - { error: "..." }                            ← backend gave up
 *
 * Same reconnect strategy as the other WS clients (capped exponential).
 */

export type ConsoleFrame =
  | { text: string; next_start: number; more: boolean }
  | { done: true }
  | { error: string };

export function subscribeJenkinsConsole(
  name: string,
  buildNumber: number,
  onMessage: (frame: ConsoleFrame) => void,
  onError?: (e: Event) => void,
) {
  let ws: WebSocket | null = null;
  let closed = false;
  let attempt = 0;
  let reconnectTimer: number | null = null;

  function connect() {
    if (closed) return;
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const safe = encodeURIComponent(name);
    ws = new WebSocket(
      `${proto}://${window.location.host}/ws/jenkins/jobs/${safe}/builds/${buildNumber}/log`,
    );
    ws.onmessage = (ev) => {
      try {
        onMessage(JSON.parse(ev.data) as ConsoleFrame);
        attempt = 0;
      } catch {
        // ignore malformed
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
