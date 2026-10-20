/** Only allow same-site relative paths after sign-in (blocks open redirects like //evil.com). */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next.slice(0, 300);
}
