import { validUsername, validPassword, validPasscode, type User } from "../app/lib/domain";
import { digest, hashPassword, randomToken, signJwt, verifyJwt, verifyPassword } from "./crypto";
import { HttpError, json, readJson, textField, type Account, type AppEnv } from "./types";
const SESSION_SECONDS = 28 * 86400;
const cookieName = "__Host-yetzer";
export function publicUser(account: Account): User { return { id: account.id, username: account.username, hasPasscode: !!account.passcode_hash, passwordChangedAt: account.password_changed_at }; }
export async function currentAccount(request: Request, env: AppEnv) {
  const token = request.headers.get("cookie")?.split(";").map(v => v.trim()).find(v => v.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  if (!token || !env.YETZER_JWT_SECRET) return null;
  const claims = await verifyJwt(token, env.YETZER_JWT_SECRET);
  if (!claims || typeof claims.sub !== "string") return null;
  const account = await env.DB.prepare("SELECT * FROM accounts WHERE id=?").bind(claims.sub).first<Account>();
  return account && account.session_version === claims.version ? account : null;
}
export async function requireAccount(request: Request, env: AppEnv) { const account = await currentAccount(request, env); if (!account) throw new HttpError(401, "Sign in to continue."); return account; }
export async function sessionCookie(account: Account, env: AppEnv) {
  const token = await signJwt({ sub: account.id, version: account.session_version, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS, iss: "yetzer", aud: "yetzer-web" }, env.YETZER_JWT_SECRET);
  return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`;
}
export async function rateLimit(env: AppEnv, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const result = await env.DB.prepare("INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END, expires_at=CASE WHEN expires_at<=? THEN ? ELSE expires_at END RETURNING count")
    .bind(await digest(key), now + windowMs, now, now, now + windowMs).first<{ count: number }>();
  if (!result || result.count > max) throw new HttpError(429, "Too many attempts. Please wait before trying again.", "rate_limit");
}
async function changePassword(env: AppEnv, account: Account, password: string) {
  if (!validPassword(password)) throw new HttpError(400, "Use 7-18 characters with at least one letter and one number.");
  if (await verifyPassword(password, account.password_hash, env.YETZER_PASSWORD_PEPPER)) throw new HttpError(400, "Choose a different password.");
  const now = Date.now();
  const updated = await env.DB.prepare("UPDATE accounts SET password_hash=?,password_changed_at=?,session_version=session_version+1 WHERE id=? AND session_version=? AND (password_changed_at IS NULL OR password_changed_at<=?) RETURNING *")
    .bind(await hashPassword(password, env.YETZER_PASSWORD_PEPPER), now, account.id, account.session_version, now - 86400000).first<Account>();
  if (!updated) throw new HttpError(429, "You can change your password once every 24 hours. Try again after your current waiting period.", "password_cooldown");
  return updated;
}
export async function authApi(request: Request, env: AppEnv, path: string): Promise<Response | null> {
  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (path === "/api/auth/session" && request.method === "GET") { const user = await currentAccount(request, env); return json({ user: user ? publicUser(user) : null }); }
  if (path === "/api/auth/username" && request.method === "GET") {
    await rateLimit(env, `name:${ip}`, 60, 60000);
    const name = new URL(request.url).searchParams.get("username") ?? "";
    const found = validUsername(name) ? await env.DB.prepare("SELECT 1 FROM accounts WHERE username=?").bind(name).first() : true;
    return json({ valid: validUsername(name), available: !found });
  }
  if (!path.startsWith("/api/auth/") || request.method !== "POST") return null;
  const body = await readJson(request);
  if (path === "/api/auth/signup") {
    await rateLimit(env, `signup:${ip}`, 5, 3600000);
    const username = textField(body, "username", 24).trim(), password = textField(body, "password", 18);
    const passcode = typeof body.passcode === "string" ? body.passcode : "";
    if (!validUsername(username)) throw new HttpError(400, "Use 3-24 letters, numbers or underscores, starting with a letter.");
    if (!validPassword(password)) throw new HttpError(400, "Use 7-18 characters with a letter and a number.");
    if (passcode && !validPasscode(passcode)) throw new HttpError(400, "Recovery passcodes contain exactly 8 lowercase letters or numbers.");
    const account: Account = { id: crypto.randomUUID(), username, password_hash: await hashPassword(password, env.YETZER_PASSWORD_PEPPER), passcode_hash: passcode ? await hashPassword(passcode, env.YETZER_PASSWORD_PEPPER) : null, session_version: 0, password_changed_at: null };
    try { await env.DB.prepare("INSERT INTO accounts(id,username,password_hash,passcode_hash,created_at) VALUES(?,?,?,?,?)").bind(account.id, username, account.password_hash, account.passcode_hash, Date.now()).run(); }
    catch (error) { if (String(error).includes("UNIQUE")) throw new HttpError(409, "That username is already taken."); throw error; }
    return json({ user: publicUser(account) }, 201, { "Set-Cookie": await sessionCookie(account, env) });
  }
  if (path === "/api/auth/login") {
    const username = textField(body, "username", 24), password = textField(body, "password", 100);
    await rateLimit(env, `login:${ip}`, 15, 900000);
    await rateLimit(env, `login-user:${username.toLowerCase()}`, 10, 900000);
    const user = await env.DB.prepare("SELECT * FROM accounts WHERE username=?").bind(username).first<Account>();
    const valid = user ? await verifyPassword(password, user.password_hash, env.YETZER_PASSWORD_PEPPER) : (await hashPassword(password, env.YETZER_PASSWORD_PEPPER), false);
    if (!user || !valid) throw new HttpError(401, "The username or password is incorrect.");
    return json({ user: publicUser(user) }, 200, { "Set-Cookie": await sessionCookie(user, env) });
  }
  if (path === "/api/auth/logout") {
    const user = await currentAccount(request, env);
    if (user) await env.DB.prepare("UPDATE accounts SET session_version=session_version+1 WHERE id=?").bind(user.id).run();
    return json({ ok: true }, 200, { "Set-Cookie": `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
  }
  if (path === "/api/auth/password") {
    const user = await requireAccount(request, env);
    await rateLimit(env, `password:${user.id}`, 10, 3600000);
    const updated = await changePassword(env, user, textField(body, "password", 18));
    return json({ user: publicUser(updated) }, 200, { "Set-Cookie": await sessionCookie(updated, env) });
  }
  if (path === "/api/auth/passcode") {
    const user = await requireAccount(request, env);
    await rateLimit(env, `passcode:${user.id}`, 5, 3600000);
    if (!await verifyPassword(textField(body, "currentPassword", 100), user.password_hash, env.YETZER_PASSWORD_PEPPER)) throw new HttpError(403, "Your current password is incorrect.");
    const passcode = textField(body, "passcode", 8);
    if (passcode && !validPasscode(passcode)) throw new HttpError(400, "Use exactly 8 lowercase letters or numbers.");
    await env.DB.prepare("UPDATE accounts SET passcode_hash=? WHERE id=?").bind(passcode ? await hashPassword(passcode, env.YETZER_PASSWORD_PEPPER) : null, user.id).run();
    return json({ ok: true, hasPasscode: !!passcode });
  }
  if (path.startsWith("/api/auth/recovery/")) {
    if (await currentAccount(request, env)) throw new HttpError(409, "Use Security while signed in.");
    await rateLimit(env, `recovery:${ip}`, 12, 900000);
    if (path.endsWith("/start")) {
      const user = await env.DB.prepare("SELECT * FROM accounts WHERE username=?").bind(textField(body, "username", 24)).first<Account>();
      if (!user?.passcode_hash) throw new HttpError(400, "Recovery is not available for those details.");
      await rateLimit(env, `recovery-user:${user.id}`, 5, 3600000);
      const token = randomToken();
      await env.DB.prepare("INSERT INTO recovery_tickets(id,account_id,state,expires_at,session_version) VALUES(?,?,'challenge',?,?)").bind(await digest(token), user.id, Date.now() + 600000, user.session_version).run();
      return json({ ticket: token, methods: ["passcode"] });
    }
    const id = await digest(textField(body, "ticket", 100));
    const ticket = await env.DB.prepare("SELECT * FROM recovery_tickets WHERE id=? AND expires_at>? AND attempts<5").bind(id, Date.now()).first<{ account_id: string; state: string; session_version: number }>();
    if (!ticket) throw new HttpError(400, "This recovery attempt expired. Start again.");
    const user = await env.DB.prepare("SELECT * FROM accounts WHERE id=? AND session_version=?").bind(ticket.account_id, ticket.session_version).first<Account>();
    if (!user?.passcode_hash) throw new HttpError(400, "Start a new recovery attempt.");
    if (path.endsWith("/verify") && ticket.state === "challenge") {
      const claim = await env.DB.prepare("UPDATE recovery_tickets SET attempts=attempts+1 WHERE id=? AND state='challenge' AND attempts<5 RETURNING id").bind(id).first();
      if (!claim || !await verifyPassword(textField(body, "passcode", 8), user.passcode_hash, env.YETZER_PASSWORD_PEPPER)) throw new HttpError(400, "That passcode did not match.");
      const reset = randomToken();
      const changed = await env.DB.prepare("UPDATE recovery_tickets SET id=?,state='verified',expires_at=? WHERE id=? AND state='challenge' RETURNING id").bind(await digest(reset), Date.now() + 300000, id).first();
      if (!changed) throw new HttpError(400, "Start a new recovery attempt.");
      return json({ ticket: reset, verified: true });
    }
    if (path.endsWith("/reset") && ticket.state === "verified") {
      const updated = await changePassword(env, user, textField(body, "password", 18));
      await env.DB.prepare("DELETE FROM recovery_tickets WHERE account_id=?").bind(user.id).run();
      return json({ ok: true, message: "Password changed. Sign in with your new password." });
    }
    throw new HttpError(400, "Complete the recovery steps in order.");
  }
  return null;
}
