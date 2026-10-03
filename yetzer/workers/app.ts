import { createRequestHandler } from "react-router";
import { handleApi, maintenance } from "./api";
import { HttpError, json, type AppEnv } from "./types";
export { GenerationWorkflow } from "./generation";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, bindings) {
    const env = bindings as unknown as AppEnv;
    try {
      const response = new URL(request.url).pathname.startsWith("/api/") ? await handleApi(request,env) : await requestHandler(request);
      const headers = new Headers(response.headers);
      headers.set("X-Content-Type-Options","nosniff");
      headers.set("Referrer-Policy","same-origin");
      headers.set("X-Frame-Options","DENY");
      headers.set("Content-Security-Policy","default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self' https://checkout.stripe.com");
      headers.set("Permissions-Policy","camera=(self), microphone=(self), geolocation=()");
      headers.set("Strict-Transport-Security","max-age=31536000; includeSubDomains");
      if (!headers.has("Cache-Control")) headers.set("Cache-Control","private, no-store");
      return new Response(response.body,{status:response.status,headers});
    } catch (error) {
      if(error instanceof HttpError) return json({error:error.message,code:error.code},error.status);
      console.error(JSON.stringify({event:"request_failed",path:new URL(request.url).pathname,errorType:error instanceof Error ? error.name : "unknown"}));
      return json({error:"Something interrupted this request. Please try again.",code:"internal_error"},500);
    }
  },
  async scheduled(_event,bindings,ctx) { ctx.waitUntil(maintenance(bindings as unknown as AppEnv)); },
} satisfies ExportedHandler<Env>;
