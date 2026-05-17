import { useEffect, useState } from 'react';
import { subscribeJenkinsConsole, type ConsoleFrame } from '@/lib/ws/jenkinsConsole';

/**
 * Keeps the rolling console buffer + `done` flag for a given build.
 * Re-subscribes whenever name/buildNumber change.
 */
export function useJenkinsConsole(name: string | null, buildNumber: number | null) {
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name || buildNumber == null) return;
    setText('');
    setDone(false);
    setError(null);
    const stop = subscribeJenkinsConsole(name, buildNumber, (frame: ConsoleFrame) => {
      if ('error' in frame) {
        setError(frame.error);
        return;
      }
      if ('done' in frame) {
        setDone(true);
        return;
      }
      // Console chunk: append (server advances next_start so dupes are
      // not expected, but appending is the natural log behaviour anyway)
      setText((prev) => prev + frame.text);
    });
    return stop;
  }, [name, buildNumber]);

  return { text, done, error };
}
