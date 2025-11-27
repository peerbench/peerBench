/**
 * Ensures a URL has a proper HTTP/HTTPS protocol.
 * If the URL doesn't start with http:// or https://, it prepends https://
 * 
 * @param url - The URL to ensure has a protocol
 * @returns The URL with proper protocol
 * 
 * @example
 * ensureHttpProtocol('example.com') // 'https://example.com'
 * ensureHttpProtocol('https://example.com') // 'https://example.com'
 * ensureHttpProtocol('http://example.com') // 'http://example.com'
 */
export function ensureHttpProtocol(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

