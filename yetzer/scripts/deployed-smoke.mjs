import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const origin='https://yetzer.pendia-community.workers.dev';
const ids=[];
function client(){let cookie='';return async(path,body,method=body===undefined?'GET':'POST')=>{const r=await fetch(origin+path,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});const sc=r.headers.get('set-cookie');if(sc)cookie=sc.split(';')[0];const data=await r.json();return{r,data,cookie};};}
try{
 const health=await(await fetch(origin+'/api/health')).json();assert.equal(health.questCount,220);assert.equal(health.salesReady,false);assert.equal(health.generationReady,false,'Stop: no provider key may be configured during this non-generative check.');console.log('Health: 220 quests; sales safely closed.');
 const quests=await(await fetch(origin+'/api/quests')).json();assert.equal(quests.quests.length,5);assert.equal(new Set(quests.quests.map(q=>q.templateId)).size,5);console.log('Five real daily D1 quest snapshots returned.');
 const gallery=await(await fetch(origin+'/api/manifestation')).json();assert.ok(Array.isArray(gallery.groups));
 for(const path of ['/','/quests','/manifestation','/pricing','/about','/signin','/signup','/recovery','/schedule','/privacy','/terms','/announcements']){const r=await fetch(origin+path);assert.equal(r.status,200,path);assert.ok((await r.text()).includes('/yetzer.svg'),path);}
 const unauth=await fetch(origin+'/api/plays');assert.equal(unauth.status,401);
 for(let n=0;n<2;n++){
  const c=client(),username='Verify'+randomBytes(5).toString('hex'),password='Check'+randomBytes(5).toString('hex'),changed='Next'+randomBytes(5).toString('hex'),passcode=randomBytes(4).toString('hex');
  const signup=await c('/api/auth/signup',{username,password,passcode});assert.equal(signup.r.status,201);ids.push(signup.data.user.id);assert.match(signup.r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
  assert.equal((await c('/api/auth/session')).data.user.username,username);
  const dup=await(await fetch(origin+'/api/auth/username?username='+username.toLowerCase())).json();assert.equal(dup.available,false);
  if(n===0){
   const image=await fetch(origin+'/api/uploads',{method:'POST',headers:{Origin:origin,Cookie:signup.cookie,'Content-Type':'image/png'},body:readFileSync('public/icons/icon-192.png')});const up=await image.json();
   try{assert.equal(image.status,201);assert.equal(up.kind,'image');}finally{if(up.id)assert.equal((await c('/api/uploads/'+up.id,undefined,'DELETE')).r.status,200);}
   const change=await c('/api/auth/password',{password:changed});assert.equal(change.r.status,200);assert.equal((await c('/api/auth/password',{password:password})).r.status,429);
  }
  await c('/api/auth/logout',{});assert.equal((await c('/api/auth/session')).data.user,null);
  const start=await c('/api/auth/recovery/start',{username});assert.equal(start.r.status,200);assert.deepEqual(start.data.methods,['passcode']);
  assert.equal((await c('/api/auth/recovery/verify',{ticket:start.data.ticket,passcode:'zzzzzzzz'})).r.status,400);
  const verified=await c('/api/auth/recovery/verify',{ticket:start.data.ticket,passcode});assert.equal(verified.r.status,200);
  const reset=await c('/api/auth/recovery/reset',{ticket:verified.data.ticket,password:n===0?password:changed});assert.equal(reset.r.status,n===0?429:200);
  assert.equal((await c('/api/auth/login',{username,password:changed})).r.status,200);
  const cross=await fetch(origin+'/api/auth/password',{method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:'{}'});assert.equal(cross.status,403);
  await c('/api/auth/logout',{});
 }
 console.log('Remote pages, authentication, password cooldown, recovery, CSRF, and private R2 upload/delete passed. No payment or AI request made.');
}finally{
 const sql=ids.map(id=>`DELETE FROM recovery_tickets WHERE account_id='${id}'; DELETE FROM uploads WHERE account_id='${id}'; DELETE FROM accounts WHERE id='${id}';`).join('\n');
 writeFileSync('/tmp/yetzer-probe-cleanup.sql',sql,{mode:0o600});
 if(ids.length)execFileSync('pnpm',['exec','wrangler','d1','execute','yetzer-db','--remote','--file','/tmp/yetzer-probe-cleanup.sql'],{stdio:'pipe',timeout:90000});
 console.log(`Removed ${ids.length} temporary verification accounts. No credentials saved or printed.`);
}
