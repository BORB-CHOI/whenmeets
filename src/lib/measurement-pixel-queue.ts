export function createPixelQueue(deliver: (args: unknown[]) => void, hasConsent: () => boolean) {
  let available = false;
  const pending: unknown[][] = [];
  const send = (args: unknown[]) => {
    const denial = args[0] === 'consent' && args[1] === false;
    if (denial) pending.length = 0;
    else if (!hasConsent()) return;
    if (available) deliver(args);
    else pending.push(args);
  };
  return {
    send,
    ready() {
      available = true;
      if (!hasConsent()) { pending.length = 0; deliver(['consent', false]); return; }
      for (const args of pending.splice(0)) send(args);
    },
  };
}
