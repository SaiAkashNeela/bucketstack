// Preload for the e2e suite: routes the real frontend services' Tauri calls
// to the IPC bridge (src/ipc_tests.rs), which runs the real Rust commands.
import { mock } from 'bun:test';

export const BRIDGE = `http://127.0.0.1:${process.env.BUCKETSTACK_BRIDGE_PORT || '17321'}`;

// Mirrors Tauri: resolve with the command's value, reject with the raw
// serialized error (a plain string for `Result<_, String>` commands).
export async function bridgeInvoke<T = any>(cmd: string, args: Record<string, any> = {}): Promise<T> {
  const res = await fetch(`${BRIDGE}/invoke`, {
    method: 'POST',
    body: JSON.stringify({ cmd, args }),
  });
  const json: any = await res.json();
  // Deliver events emitted during the command before resolving (most
  // favorable ordering for listeners, so missed events are real bugs).
  await pollEvents();
  if (json.ok) return json.value as T;
  throw json.error;
}

type Handler = (event: { event: string; payload: any }) => void;
const handlers = new Map<string, Set<Handler>>();
export const receivedEvents: { event: string; payload: any }[] = [];

async function pollEvents() {
  try {
    const res = await fetch(`${BRIDGE}/events`);
    const events: { event: string; payload: any }[] = await res.json();
    for (const e of events) {
      receivedEvents.push(e);
      handlers.get(e.event)?.forEach(h => h(e));
    }
  } catch {
    // bridge not up yet
  }
}
const poller = setInterval(pollEvents, 25);
(poller as any).unref?.();

/** Flush any events the backend emitted but the poller hasn't delivered yet. */
export async function flushEvents() {
  await new Promise(r => setTimeout(r, 100));
  await pollEvents();
}

mock.module('@tauri-apps/api/core', () => ({ invoke: bridgeInvoke }));
mock.module('@tauri-apps/api/event', () => ({
  listen: async (name: string, handler: Handler) => {
    if (!handlers.has(name)) handlers.set(name, new Set());
    handlers.get(name)!.add(handler);
    return () => handlers.get(name)!.delete(handler);
  },
}));

// Minimal Web Storage for the services that persist account metadata.
class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
(globalThis as any).localStorage = new MemoryStorage();
(globalThis as any).sessionStorage = new MemoryStorage();
