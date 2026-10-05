export interface AppEnv {
  DB: D1Database;
  MEDIA: R2Bucket;
  GENERATION: Workflow<{ generationId: string }>;
  YETZER_JWT_SECRET: string;
  YETZER_PASSWORD_PEPPER: string;
  OPENROUTER_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  APP_URL: string;
  SALES_ENABLED: string;
  SHORT_PRICE_CENTS: string;
  LONG_PRICE_CENTS: string;
}
export type Account = { id: string; username: string; password_hash: string; passcode_hash: string | null; session_version: number; password_changed_at: number | null };
export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "request_error") { super(message); }
}
export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Send JSON for this request.");
  const raw = await boundedText(request,16384);
  try { const value = JSON.parse(raw); if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(); return value; }
  catch { throw new HttpError(400, "Send a valid JSON object."); }
}
export async function boundedText(request:Request,limit:number) {
  if(!request.body)return '';
  const reader=request.body.getReader(),decoder=new TextDecoder();let size=0,result='';
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new HttpError(413,'This request is too large.');}result+=decoder.decode(value,{stream:true});}
  return result+decoder.decode();
}
export function textField(data: Record<string, unknown>, key: string, max = 2000) {
  const value = data[key];
  if (typeof value !== "string" || value.length > max) throw new HttpError(400, `Check the ${key} field.`);
  return value;
}
export function assertMutationOrigin(request: Request, _env: AppEnv) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  if ((origin && origin !== new URL(request.url).origin) || site === "cross-site") throw new HttpError(403, "This request must come from Yetzer.");
  if (request.headers.has("cookie") && !origin && site !== "same-origin" && !request.headers.has("x-yetzer-client")) throw new HttpError(403, "API clients must send X-Yetzer-Client: api.");
}
