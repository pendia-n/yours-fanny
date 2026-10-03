import { env as bindings } from "cloudflare:workers";
import { redirect } from "react-router";
import { currentAccount, publicUser } from "../../workers/auth";
import { ensureDaily, getQuest, serviceReadiness } from "../../workers/quests";
import { manifestation, myPlays } from "../../workers/api";
import type { AppEnv } from "../../workers/types";
import { schedule, type Theme } from "./domain";
export const appEnv = () => bindings as unknown as AppEnv;
export async function rootData(request: Request) {
  const env = appEnv(), account = await currentAccount(request,env);
  const rawTheme = request.headers.get("cookie")?.match(/(?:^|;\s*)yetzer-theme=(light|dark|dim)(?:;|$)/)?.[1] ?? "light";
  return { user:account ? publicUser(account) : null,theme:rawTheme as Theme,schedule:schedule(),...serviceReadiness(env) };
}
export async function pageData(request: Request) {
  const env=appEnv(),path=new URL(request.url).pathname.replace(/\/$/,"") || "/",account=await currentAccount(request,env);
  if (["/signin","/signup","/recovery"].includes(path) && account) throw redirect("/quests");
  if (["/profile","/security","/plays"].includes(path) && !account) throw redirect("/signin");
  const base={path,user:account ? publicUser(account) : null,schedule:schedule(),...serviceReadiness(env)};
  if(path === "/quests") return {...base,quests:await ensureDaily(env)};
  if(path.startsWith("/quests/")) return {...base,quest:await getQuest(env,decodeURIComponent(path.slice(8))),plays:account ? (await myPlays(env,account.id)).filter(p=>p.quest.id === decodeURIComponent(path.slice(8))) : []};
  if(path === "/manifestation") return {...base,groups:await manifestation(env)};
  if(path === "/plays" || path === "/profile") return {...base,plays:account ? await myPlays(env,account.id) : []};
  if(path === "/pricing") return {...base,shortPrice:Number(env.SHORT_PRICE_CENTS),longPrice:Number(env.LONG_PRICE_CENTS)};
  if(["/signin","/signup","/recovery","/security","/about","/announcements","/schedule","/privacy","/terms"].includes(path)) return base;
  throw new Response("Page not found",{status:404});
}
