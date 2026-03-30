# Transcript: Redis vs Memcached for Django Caching Layer

## Question

I'm trying to decide between Redis and Memcached for our caching layer. We have a Python/Django app with about 10k daily active users and we need session storage plus page fragment caching. What do you think?

## Reasoning Process

No commands were run or files consulted -- this is a design/architecture question answerable from knowledge of Django, Redis, and Memcached.

Key factors to evaluate:
1. **Session storage requirements** -- sessions need durability; losing them on restart logs out all users
2. **Django ecosystem support** -- which backend has better native support
3. **Scale considerations** -- whether 10k DAU pushes either system's limits
4. **Operational complexity** -- how many systems to run and maintain
5. **Data model needs** -- simple key-value vs richer structures

## Response

For this specific use case -- a Django app with 10k DAU needing both session storage and page fragment caching -- **Redis is the clear choice**. Here is why:

### 1. Session storage requires persistence

Memcached is purely in-memory with no persistence. If Memcached restarts, all sessions are lost and every user gets logged out. Redis supports RDB snapshots and AOF persistence, so sessions survive restarts.

### 2. Django has first-class Redis support

Since Django 4.0, `django.core.cache.backends.redis.RedisCache` is built in. For sessions, `django.contrib.sessions.backends.cache` works seamlessly with Redis. Memcached support exists too, but Redis is now the more commonly recommended path.

### 3. Data structure richness

Redis supports strings, hashes, lists, sets, sorted sets, and more. This is useful beyond simple caching -- rate limiting, queued tasks (with Celery/Redis as broker), pub/sub for websockets, etc. Memcached only supports simple key-value strings.

### 4. At 10k DAU, scale is not a differentiator

Memcached's main advantage is raw throughput in multi-threaded, simple-get/set workloads at massive scale. At 10k DAU, both Redis and Memcached will handle the load trivially. You will never hit Redis's performance ceiling at this scale.

### 5. Eviction control

Redis lets you set per-key TTLs and choose eviction policies (LRU, LFU, etc.). You can separate session data (which should not be evicted) from cache data (which can be). With Memcached, everything is subject to the same LRU eviction -- sessions could be evicted under memory pressure.

### 6. Operational simplicity

Running one Redis instance covers sessions, caching, and potentially Celery broker, rate limiting, and feature flags. With Memcached you would still need Redis (or another system) for anything beyond simple caching.

### Recommended Django configuration

Use two Redis databases (or prefixed keyspaces): one for sessions (with persistence, no eviction) and one for cache (with `maxmemory-policy allkeys-lru`).

```python
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/0',
    },
    'sessions': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    },
}

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
```

### When would Memcached make sense instead?

Only if you already have Memcached infrastructure, do not need session storage in the cache layer (e.g., you use database-backed sessions), and want the simplest possible cache-only setup. That does not match this scenario.

## Commands Run

- `mkdir -p .../outputs/` -- created the output directory (no other commands needed; this was a pure knowledge question)

## Summary

**Recommendation: Redis.** The combination of persistence (critical for sessions), Django's built-in Redis backend, richer data structures, and operational simplicity makes it the right choice for this use case. Memcached's throughput advantage is irrelevant at 10k DAU scale.
