/**
 * The address the browser actually used. In development request.url always says "localhost",
 * even for 127.0.0.1, and Spotify only accepts the latter as a redirect address.
 */
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  return host ? `${url.protocol}//${host}` : url.origin;
}
