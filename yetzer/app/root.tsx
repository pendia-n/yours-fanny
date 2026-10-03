import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, Link, NavLink, useLoaderData, useRouteLoaderData } from "react-router";
import { useEffect, useState } from "react";
import type { Route } from "./+types/root";
import { rootData } from "./lib/server.server";
import type { Theme } from "./lib/domain";
import "./app.css";
export const loader = ({request}:Route.LoaderArgs)=>rootData(request);
export const links:Route.LinksFunction=()=>[
  {rel:"icon",href:"/favicon.ico",sizes:"any"}, {rel:"icon",href:"/yetzer.svg",type:"image/svg+xml"},
  {rel:"apple-touch-icon",href:"/icons/apple-touch-icon.png"}, {rel:"manifest",href:"/manifest.webmanifest"},
  {rel:"preconnect",href:"https://fonts.googleapis.com"}, {rel:"preconnect",href:"https://fonts.gstatic.com",crossOrigin:"anonymous"},
  {rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"},
];
export function Icon({name,size=20}:{name:string;size?:number}) {
  const paths:Record<string,string>={spark:"m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z",play:"m9 5 11 7-11 7Z",grid:"M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",person:"M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",arrow:"M4 12h16m-6-6 6 6-6 6",clock:"M12 7v5l3 2M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z",ticket:"M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4ZM15 6v12",info:"M12 10v7m0-11v1M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0Z",shield:"m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6ZM8 12l3 3 5-6",download:"M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",sun:"M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2",moon:"M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z",dim:"M12 3a9 9 0 1 0 0 18ZM12 3a9 9 0 0 1 0 18",close:"m6 6 12 12M6 18 18 6"};
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.spark}/></svg>;
}
function ThemePicker({initial}:{initial:Theme}) {
  const [theme,setTheme]=useState<Theme>(initial);
  useEffect(()=>{const saved=document.documentElement.dataset.theme;if(saved==='light'||saved==='dim'||saved==='dark')setTheme(saved);},[]);
  function change(next:Theme) { setTheme(next);document.documentElement.dataset.theme=next;try{localStorage.setItem("yetzer-theme",next);}catch{}document.cookie=`yetzer-theme=${next}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`; }
  return <div className="theme-picker" role="group" aria-label="Color theme">{(["light","dim","dark"] as Theme[]).map(t=><button key={t} title={`${t} mode`} aria-label={`${t} mode`} aria-pressed={theme===t} onClick={()=>change(t)}><Icon name={t==="light"?"sun":t==="dark"?"moon":"dim"} size={17}/></button>)}</div>;
}
export function Layout({children}:{children:React.ReactNode}) {
  const data=useRouteLoaderData<typeof loader>("root");
  return <html lang="en" data-theme={data?.theme ?? "light"} suppressHydrationWarning><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="theme-color" content="#3057d5"/><Meta/><Links/><script dangerouslySetInnerHTML={{__html:`try{var t=localStorage.getItem('yetzer-theme');if(['light','dim','dark'].includes(t))document.documentElement.dataset.theme=t}catch{}`}}/></head><body><a href="#main" className="skip-link">Skip to content</a>{children}<ScrollRestoration/><Scripts/></body></html>;
}
export default function App() {
  const data=useLoaderData<typeof loader>();
  useEffect(()=>{ if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{}); },[]);
  async function logout() { const r=await fetch("/api/auth/logout",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}); if(r.ok) location.href="/"; }
  return <><header className="site-header"><div className="nav-inner"><Link className="brand" to={data.user?"/quests":"/"}><img src="/yetzer.svg" alt="" width="28" height="28"/><span>yetzer<span className="brand-dot">.</span></span></Link><nav aria-label="Main navigation"><NavLink to="/quests" title="Today's quests"><Icon name="spark"/><span>Today's quests</span></NavLink><NavLink to="/manifestation" title="Manifestation"><Icon name="grid"/><span>Manifestation</span></NavLink><NavLink to="/pricing" title="Pricing"><Icon name="ticket"/><span>Pricing</span></NavLink><NavLink to="/about" title="About"><Icon name="info"/><span>About</span></NavLink></nav><div className="nav-actions"><ThemePicker initial={data.theme}/>{data.user?<><Link className="account-link" to="/profile" title="Your profile"><Icon name="person"/><span>{data.user.username}</span></Link><button className="text-button logout" onClick={logout}>Sign out</button></>:<Link className="button small secondary" to="/signin">Sign in</Link>}</div></div></header><main id="main"><Outlet/></main><footer className="site-footer"><Link className="brand" to="/"><img src="/yetzer.svg" alt="" width="24" height="24"/><span>yetzer.</span></Link><p>A little more play in your everyday.</p><nav aria-label="Footer"><Link to="/schedule">Opening hours</Link><Link to="/announcements">Announcements</Link><Link to="/security">Security</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></nav></footer></>;
}
export function ErrorBoundary({error}:Route.ErrorBoundaryProps) {
  const notFound=isRouteErrorResponse(error)&&error.status===404;
  return <main className="page narrow"><img src="/yetzer.svg" width="64" height="64" alt="Yetzer"/><h1>{notFound?"That page wandered off.":"A small interruption."}</h1><p>{notFound?"Find your next little adventure on the quest board.":"We could not load this page. Your account and purchases have not been changed."}</p><a className="button" href="/quests">Back to the quests</a></main>;
}
