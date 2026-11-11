import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import test from "node:test";
import { ROUTES, type Quest } from "../app/lib/domain";
import { createCheckout, stripeWebhook } from "../workers/billing";
import { hmac } from "../workers/crypto";
import { openRouterCreditMicros, requeueRejectedSubmission, runFundingPass } from "../workers/funding";
import { UPLOAD_UNREFERENCED } from "../workers/fulfillment";
import type { Account, AppEnv } from "../workers/types";

const time = Date.parse("2026-11-12T16:00:00Z");
const day = "2026-11-12";
const quest: Quest = {
  id:`${day}_edit`,templateId:"edit",day,title:"Turn the room blue",invitation:"",
  preparation:"Wave",transformation:"A blue room",preserve:"The wave",
  kind:"edit",duration:15,priceCents:299,...ROUTES.edit,
};
const account = {id:"user",username:"testuser"} as Account;
const uploadId = "00000000-0000-4000-8000-000000000001";
const fakeSecret = "test-webhook-secret";

function fixture() {
  const db = new DatabaseSync(":memory:");
  for (const file of ["0001_initial.sql","0004_output_policy.sql","0005_generation_funding.sql"]) {
    db.exec(readFileSync(new URL(`../migrations/${file}`,import.meta.url),"utf8"));
  }
  db.prepare("INSERT INTO accounts(id,username,password_hash,created_at) VALUES(?,?,'fake',?)").run(account.id,account.username,time);
  db.exec("INSERT INTO quest_templates VALUES ('edit','Test edit','','','','','edit',15)");
  db.prepare("INSERT INTO daily_quests VALUES (?,?,?,0,?)").run(quest.id,day,quest.templateId,JSON.stringify(quest));
  db.prepare("INSERT INTO uploads VALUES (?,?,'video','private/video.mp4','video/mp4',1024,15,1280,720,?,?)").run(uploadId,account.id,time,time+172800000);
  const dispatched = new Set<string>();
  const env = {
    DB:{prepare(sql:string) {
      let args: SQLInputValue[] = [];
      const statement = db.prepare(sql);
      return {bind(...values:SQLInputValue[]) {args=values;return this;},
        async first() {return statement.get(...args) ?? null;},
        async run() {return {meta:{changes:statement.run(...args).changes}};},
        async all() {return {results:statement.all(...args)};},
      };
    }},
    GENERATION:{async create({id}:{id:string}) {
      if (dispatched.has(id)) throw new Error("already exists");
      dispatched.add(id);
    }},
    FUNDING:{getByName() {return {async wake() {}};}},
    APP_URL:"https://www.yetzer.lol",SALES_ENABLED:"true",SHORT_PRICE_CENTS:"299",LONG_PRICE_CENTS:"599",
    STRIPE_WEBHOOK_SECRET:fakeSecret,STRIPE_SECRET_KEY:"fake-stripe",OPENROUTER_API_KEY:"fake-inference",
    OPENROUTER_MANAGEMENT_KEY:"fake-management",YETZER_JWT_SECRET:"fake-signing",
  } as unknown as AppEnv;
  return {db,env,dispatched};
}

async function payment(env:AppEnv,purchaseId:string,eventId:string,paid=true, type="checkout.session.completed") {
  const stamp = String(Math.floor(Date.now()/1000));
  const raw = JSON.stringify({id:eventId,type,created:Number(stamp),data:{object:{
    id:`cs_${purchaseId}`,client_reference_id:purchaseId,amount_total:299,currency:"usd",
    payment_intent:`pi_${purchaseId}`,payment_status:paid?"paid":"unpaid",metadata:{purchase_id:purchaseId},
  }}});
  const hex = Buffer.from(await hmac(`${stamp}.${raw}`,fakeSecret)).toString("hex");
  const request = new Request("https://www.yetzer.lol/api/webhooks/stripe",{method:"POST",body:raw,headers:{"stripe-signature":`t=${stamp},v1=${hex}`}});
  assert.equal((await stripeWebhook(request,env)).status,200);
}

test("signed payment queues the stored materials once; top-up resumes the original plays without overspending", async t => {
  const {db,env,dispatched}=fixture();
  t.after(()=>db.close());
  let now=time, balance=0, reads=0;
  t.mock.method(Date,"now",()=>now);
  t.mock.method(globalThis,"fetch",async (url:string, init:RequestInit) => {
    if (url==="https://openrouter.ai/api/v1/credits") {
      assert.equal((init.headers as Record<string,string>).Authorization,"Bearer fake-management");
      reads++;
      return Response.json({data:{total_credits:balance,total_usage:0}});
    }
    assert.equal(url,"https://api.stripe.com/v1/checkout/sessions");
    const form = init.body as URLSearchParams;
    const id = form.get("client_reference_id");
    assert.match(form.get("custom_text[submit][message]")!,/Huge traffic may delay/);
    return Response.json({id:`cs_${id}`,url:"https://checkout.stripe.com/test"});
  });
  const first="10000000-0000-4000-8000-000000000001", second="10000000-0000-4000-8000-000000000002";
  for (const id of [first,second]) await createCheckout(env,account,quest,id,{uploadIds:[uploadId],rawText:"Keep the wave."});
  assert.equal(db.prepare(`SELECT id FROM uploads WHERE ${UPLOAD_UNREFERENCED}`).get(),undefined);
  assert.equal(reads,0,"no balance-based checkout block");
  await payment(env,first,"evt_unpaid",false);
  assert.equal(db.prepare("SELECT id FROM generations").get(),undefined);
  now += 12*3600000;
  await payment(env,first,"evt_first",true,"checkout.session.async_payment_succeeded");
  await payment(env,first,"evt_first",true,"checkout.session.async_payment_succeeded");
  await payment(env,first,"evt_first_repeat");
  await payment(env,second,"evt_second");
  const rows=()=>db.prepare("SELECT id,purchase_id,status,duration,raw_text FROM generations ORDER BY purchase_id").all();
  assert.deepEqual(rows().map(r=>[r.purchase_id,r.status,r.duration,r.raw_text]),[
    [first,"queued",15,"Keep the wave."],[second,"queued",15,"Keep the wave."],
  ]);
  assert.equal(await runFundingPass(env),true);
  assert.equal(dispatched.size,0);
  assert.deepEqual(rows().map(r=>r.status),["waiting_funds","waiting_funds"]);
  balance=.45;
  assert.equal(await runFundingPass(env),true);
  assert.equal(dispatched.size,1);
  assert.deepEqual(rows().map(r=>r.status).sort(),["funded","waiting_funds"]);
  balance=.90;
  await runFundingPass(env);
  assert.equal(dispatched.size,2);
  assert.deepEqual(rows().map(r=>r.status),["funded","funded"]);
  assert.equal(db.prepare(`SELECT id FROM uploads WHERE ${UPLOAD_UNREFERENCED}`).get(),undefined);
});

test("only a confirmed pre-acceptance rejection is eligible after the 10 second backoff", async t => {
  const {db,env,dispatched}=fixture();
  t.after(()=>db.close());
  let now=time;
  t.mock.method(Date,"now",()=>now);
  t.mock.method(globalThis,"fetch",async (url:string,init:RequestInit) => {
    if (url.endsWith("/credits")) return Response.json({data:{total_credits:1.20,total_usage:.75}});
    return Response.json({id:`cs_${(init.body as URLSearchParams).get("client_reference_id")}`,url:"https://checkout.stripe.com/test"});
  });
  const id=crypto.randomUUID();
  await createCheckout(env,account,quest,id,{uploadIds:[uploadId],rawText:""});
  await payment(env,id,"evt_paid");
  assert.equal(await openRouterCreditMicros(env.OPENROUTER_MANAGEMENT_KEY),450000);
  await runFundingPass(env);
  const generation=db.prepare("SELECT id FROM generations").get()!.id as string;
  db.prepare("UPDATE generations SET status='submitting',provider_submitted_at=? WHERE id=?").run(now,generation);
  await requeueRejectedSubmission(env,generation,0);
  now += 9999;
  await runFundingPass(env);
  assert.deepEqual([...dispatched],[`${generation}-funds-0`]);
  now += 1;
  await runFundingPass(env);
  assert.deepEqual([...dispatched],[`${generation}-funds-0`,`${generation}-funds-1`]);
  db.prepare("UPDATE generations SET status='provider_pending',provider_id='accepted',provider_submitted_at=? WHERE id=?").run(now,generation);
  await requeueRejectedSubmission(env,generation,1);
  assert.equal(db.prepare("SELECT status FROM generations").get()!.status,"provider_pending");
});
