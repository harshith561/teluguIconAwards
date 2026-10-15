// Tiny in-memory TTL cache for hot, read-only GET endpoints. In cluster mode each
// worker caches independently, which is all we need for display data.
const cache = new Map(); // key -> { value, exp }

function cached(key, ttlSeconds, load) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now < hit.exp) return Promise.resolve(hit.value);
  return Promise.resolve(load()).then((value) => {
    cache.set(key, { value, exp: now + ttlSeconds * 1000 });
    return value;
  });
}

function invalidate(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

// Periodically drop expired entries so the map cannot grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now >= entry.exp) cache.delete(key);
  }
}, 60 * 1000).unref();

module.exports = { cached, invalidate };