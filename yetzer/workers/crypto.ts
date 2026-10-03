const encoder = new TextEncoder();
export function base64url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export function unbase64url(value: string) { return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)); }
export function randomToken() { return base64url(crypto.getRandomValues(new Uint8Array(32))); }
export async function digest(value: string) { return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }
export async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}
export function equal(a: Uint8Array, b: Uint8Array) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }
export async function hashPassword(value: string, pepper: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const material = await hmac(value, pepper);
  const key = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return `pbkdf2-sha256-peppered$100000$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}
export async function verifyPassword(value: string, stored: string, pepper: string) {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256-peppered" || parts[1] !== "100000") return false;
  try { const computed = await hashPassword(value, pepper, unbase64url(parts[2])); return equal(encoder.encode(stored), encoder.encode(computed)); } catch { return false; }
}
export async function signJwt(payload: Record<string, unknown>, secret: string) {
  const body = `${base64url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })))}.${base64url(encoder.encode(JSON.stringify(payload)))}`;
  return `${body}.${base64url(await hmac(body, secret))}`;
}
export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [head, body, signature, extra] = token.split(".");
    if (!signature || extra || JSON.parse(new TextDecoder().decode(unbase64url(head))).alg !== "HS256") return null;
    if (!equal(await hmac(`${head}.${body}`, secret), unbase64url(signature))) return null;
    const value = JSON.parse(new TextDecoder().decode(unbase64url(body)));
    if (typeof value.exp !== "number" || value.exp * 1000 <= Date.now() || value.iss !== "yetzer" || value.aud !== "yetzer-web") return null;
    return value;
  } catch { return null; }
}
