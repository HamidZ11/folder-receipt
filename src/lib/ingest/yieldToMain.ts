// Cooperative scheduling: give the main thread back every ~8ms so input, paint
// and React updates keep up.
//
// Not scheduler.yield(): its continuations outrank ordinary tasks, so a long
// scan starved React's render scheduling and timers (measured: a setTimeout(0)
// waited 6.5s). A MessageChannel message queues fairly behind other tasks and,
// unlike nested setTimeout, isn't clamped to 4ms.

let channel: MessageChannel | null = null;
const queue: (() => void)[] = [];

function yieldNow(): Promise<void> {
  if (typeof MessageChannel === 'undefined') return new Promise((r) => setTimeout(r, 0));
  if (!channel) {
    channel = new MessageChannel();
    channel.port1.onmessage = () => queue.shift()?.();
  }
  return new Promise((r) => {
    queue.push(r);
    channel!.port2.postMessage(null);
  });
}

const now = () => performance.now();

export function abortError(): DOMException {
  return new DOMException('Scan cancelled', 'AbortError');
}

/** Returns a function to call often; it yields when the time slice is used up and throws if aborted. */
export function makeYielder(signal?: AbortSignal, sliceMs = 8) {
  let last = now();
  return async () => {
    if (signal?.aborted) throw abortError();
    if (now() - last < sliceMs) return;
    await yieldNow();
    last = now();
    if (signal?.aborted) throw abortError();
  };
}
