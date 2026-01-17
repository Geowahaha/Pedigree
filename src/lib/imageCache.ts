const CACHE_KEY = 'eibpo_image_cache_v1';
// Reliable base64 placeholder (gray with dog emoji) - never fails to load
const FALLBACK_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNlNWU3ZWIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSI4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPvCfkZU8L3RleHQ+PC9zdmc+';

type CacheMap = Record<string, string>;

const isBrowser = typeof window !== 'undefined';

const readCache = (): CacheMap => {
  if (!isBrowser) return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
};

const writeCache = (cache: CacheMap) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    // Ignore storage errors.
  }
};

export const isBlockedExternalImage = (url?: string | null): boolean => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host.endsWith('fbcdn.net');
  } catch (error) {
    return false;
  }
};

export const getProxyImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    new URL(url);
    return `/api/image-cache?url=${encodeURIComponent(url)}`;
  } catch (error) {
    return null;
  }
};

export const getCachedImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const cache = readCache();
  return cache[url] || null;
};

const storeCachedImageUrl = (original: string, cachedUrl: string) => {
  if (!original || !cachedUrl) return;
  const cache = readCache();
  cache[original] = cachedUrl;
  writeCache(cache);
};

const pendingRequests = new Map<string, Promise<string | null>>();

export const cacheExternalImage = async (url?: string | null, petId?: string): Promise<string | null> => {
  if (!url || !isBlockedExternalImage(url)) return null;

  const cached = getCachedImageUrl(url);
  if (cached) return cached;

  if (pendingRequests.has(url)) return pendingRequests.get(url) || null;

  const request = (async () => {
    try {
      const response = await fetch('/api/image-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, petId }),
      });

      if (!response.ok) return null;
      const data = await response.json();
      if (data?.url) {
        storeCachedImageUrl(url, data.url);
        return data.url as string;
      }
      return null;
    } catch (error) {
      return null;
    } finally {
      pendingRequests.delete(url);
    }
  })();

  pendingRequests.set(url, request);
  return request;
};

export { FALLBACK_IMAGE };
