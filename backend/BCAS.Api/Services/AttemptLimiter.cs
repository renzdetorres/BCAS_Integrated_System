using System.Collections.Concurrent;

namespace BCAS.Api.Services;

/// <summary>
/// Counts recent attempts per key (an IP address, an email, or both) inside a
/// sliding time window, so sign-in, registration and password-reset requests
/// can be slowed down. It lives in memory in one instance: a restart clears it,
/// which is acceptable for throttling (the aim is to make guessing impractical,
/// not to keep a permanent record).
/// </summary>
public sealed class AttemptLimiter
{
    private const int CleanupEvery = 500;

    /// <summary>The longest window any caller uses; an entry older than this can never count again.</summary>
    private static readonly TimeSpan LongestWindow = TimeSpan.FromHours(1);

    private readonly ConcurrentDictionary<string, Queue<DateTime>> _hits = new(StringComparer.Ordinal);
    private readonly Func<DateTime> _now;
    private int _writes;

    public AttemptLimiter()
        : this(() => DateTime.UtcNow)
    {
    }

    /// <summary>For tests: a clock the test controls.</summary>
    public AttemptLimiter(Func<DateTime> now)
    {
        _now = now;
    }

    /// <summary>How many attempts were recorded for this key inside the window.</summary>
    public int Count(string key, TimeSpan window)
    {
        if (!_hits.TryGetValue(key, out var queue))
        {
            return 0;
        }

        lock (queue)
        {
            Trim(queue, window);
            return queue.Count;
        }
    }

    /// <summary>Records one attempt for this key.</summary>
    public void Record(string key, TimeSpan window)
    {
        var queue = _hits.GetOrAdd(key, _ => new Queue<DateTime>());
        lock (queue)
        {
            Trim(queue, window);
            queue.Enqueue(_now());
        }

        if (Interlocked.Increment(ref _writes) % CleanupEvery == 0)
        {
            Sweep();
        }
    }

    /// <summary>
    /// Records an attempt only if the key is still under its limit. Returns false
    /// (and records nothing) once the limit is reached inside the window.
    /// </summary>
    public bool TryRecord(string key, int limit, TimeSpan window)
    {
        if (Count(key, window) >= limit)
        {
            return false;
        }

        Record(key, window);
        return true;
    }

    /// <summary>Forgets every attempt for this key (a successful sign-in clears its failures).</summary>
    public void Clear(string key) => _hits.TryRemove(key, out _);

    /// <summary>Seconds until the oldest attempt in the window drops out, for a Retry-After header.</summary>
    public int SecondsUntilFree(string key, TimeSpan window)
    {
        if (!_hits.TryGetValue(key, out var queue))
        {
            return 0;
        }

        lock (queue)
        {
            Trim(queue, window);
            if (queue.Count == 0)
            {
                return 0;
            }

            var free = queue.Peek() + window - _now();
            return Math.Max(1, (int)Math.Ceiling(free.TotalSeconds));
        }
    }

    private void Trim(Queue<DateTime> queue, TimeSpan window)
    {
        var cutoff = _now() - window;
        while (queue.Count > 0 && queue.Peek() <= cutoff)
        {
            queue.Dequeue();
        }
    }

    /// <summary>Drops keys whose attempts have all expired, so the dictionary can't grow without bound.</summary>
    private void Sweep()
    {
        foreach (var (key, queue) in _hits)
        {
            lock (queue)
            {
                Trim(queue, LongestWindow);
                if (queue.Count == 0)
                {
                    _hits.TryRemove(key, out _);
                }
            }
        }
    }
}
