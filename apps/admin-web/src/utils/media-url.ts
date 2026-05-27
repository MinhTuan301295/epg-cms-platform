export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.startsWith('/')) {
    return url;
  }

  try {
    const parsed = new URL(url);

    // Keep uploads same-origin so LAN users can load via frontend host + Vite proxy.
    if (parsed.pathname.startsWith('/uploads/')) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    // Normalize localhost/127.0.0.1 links stored in DB for LAN sharing.
    if (typeof window !== 'undefined' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      parsed.hostname = window.location.hostname;
      parsed.protocol = window.location.protocol;
      return parsed.toString();
    }

    return url;
  } catch {
    return url;
  }
}

