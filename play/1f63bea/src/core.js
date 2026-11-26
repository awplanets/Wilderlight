// Authored World Journey utilities. Units: metres, seconds, radians.
export function seededRandom(seed, namespace = 'world') {
  // Independent named streams keep a new prop from changing terrain or AI.
  const key = JSON.stringify([String(seed), String(namespace)]);
  let state = 2166136261;
  for (const char of key) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

