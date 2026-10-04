import test from 'node:test';
import assert from 'node:assert/strict';
import {QUEST_CATALOG} from '../app/lib/quest-catalog';
import {dailySelection,dayOffset,nyInstant,nyParts,pagePath,schedule,submissionDeadline,canSubmitPurchase,validPassword,validPasscode,validUsername,type Quest} from '../app/lib/domain';
import {hashPassword,verifyPassword,signJwt,verifyJwt} from '../workers/crypto';
import {inspectMedia,validateInputs,type Upload} from '../workers/media';
import {videoRequest} from '../workers/video-request';
import {serviceReadiness} from '../workers/quests';

test('React Router data requests resolve to the same page as document requests',()=>{
 for(const path of ['/quests','/pricing','/about','/manifestation','/schedule','/security']){
  assert.equal(pagePath(`https://yetzer.example${path}`),path);
  assert.equal(pagePath(`https://yetzer.example${path}.data`),path);
 }
 assert.equal(pagePath('https://yetzer.example/quests/abc.data'),'/quests/abc');
});

test('220 unique immutable-source recipes, 55 per route, practical preparation',()=>{
 assert.equal(QUEST_CATALOG.length,220);assert.equal(new Set(QUEST_CATALOG.map(q=>q.id)).size,220);assert.equal(new Set(QUEST_CATALOG.map(q=>q.title)).size,220);
 for(const kind of ['edit','perform','imagine','adventure'])assert.equal(QUEST_CATALOG.filter(q=>q.kind===kind).length,55);
 for(const q of QUEST_CATALOG){assert.ok(q.preparation.length<240);assert.ok(!/White House|rocket window|cliff|firearm|highway/i.test(q.preparation));assert.ok(q.transformation.length<300);}
});
test('five unique choices; original pool unchanged; eligible to reappear tomorrow',()=>{
 const before=JSON.stringify(QUEST_CATALOG);let overlaps=0;
 for(let n=0;n<150;n++){const day=dayOffset('2026-10-01',n);const a=dailySelection(QUEST_CATALOG,day),b=dailySelection(QUEST_CATALOG,dayOffset(day,1));assert.equal(new Set(a.map(q=>q.id)).size,5);assert.deepEqual(a,dailySelection(QUEST_CATALOG,day));if(a.some(q=>b.some(p=>p.id===q.id)))overlaps++;}
 assert.ok(overlaps>0);assert.equal(JSON.stringify(QUEST_CATALOG),before);
});
for(const [day,minute,purchase,submit] of [
 ['2026-10-01',0,true,true],['2026-10-01',1259,true,true],['2026-10-01',1260,false,true],['2026-10-01',1410,false,false],
 ['2026-10-02',929,true,true],['2026-10-02',930,false,true],['2026-10-02',960,false,false],
 ['2026-10-03',0,false,false],['2026-10-03',1259,false,false],['2026-10-03',1260,false,true],['2026-10-03',1409,false,true],['2026-10-03',1410,false,false],['2026-10-04',0,true,true],
] as const)test(`NY window ${day} minute ${minute}`,()=>{const s=schedule(nyInstant(day,minute));assert.equal(s.purchase,purchase);assert.equal(s.submit,submit);assert.equal(s.day,day);});
test('DST changes calendar-day length without moving opening windows',()=>{
 assert.equal(nyInstant('2026-03-09',0)-nyInstant('2026-03-08',0),23*3600000);
 assert.equal(nyInstant('2026-11-02',0)-nyInstant('2026-11-01',0),25*3600000);
 assert.equal(nyParts(nyInstant('2026-11-01',1260)).minute,1260);
});
test('Friday purchase can submit Saturday night, not Sunday',()=>{
 assert.equal(submissionDeadline('2026-10-02'),nyInstant('2026-10-03',1410));
 assert.equal(canSubmitPurchase('2026-10-02',nyInstant('2026-10-03',1300)),true);
 assert.equal(canSubmitPurchase('2026-10-02',nyInstant('2026-10-03',900)),false);
 assert.equal(canSubmitPurchase('2026-10-02',nyInstant('2026-10-04',0)),false);
});
test('auth syntax and salted password verification',async()=>{
 assert.ok(validUsername('John_123'));assert.ok(!validUsername('../John'));assert.ok(validPassword('hello123'));assert.ok(!validPassword('password'));assert.ok(validPasscode('abc123xy'));assert.ok(!validPasscode('ABC123xy'));
 const first=await hashPassword('Hello123','test-pepper'),second=await hashPassword('Hello123','test-pepper');assert.notEqual(first,second);assert.ok(await verifyPassword('Hello123',first,'test-pepper'));assert.ok(!await verifyPassword('wrong123',first,'test-pepper'));
});
test('JWT validates expiry, signature and audience',async()=>{
 const token=await signJwt({sub:'test',version:0,exp:Date.now()/1000+60,iss:'yetzer',aud:'yetzer-web'},'test-secret');assert.equal((await verifyJwt(token,'test-secret'))?.sub,'test');assert.equal(await verifyJwt(token,'wrong'),null);
 const expired=await signJwt({exp:1,iss:'yetzer',aud:'yetzer-web'},'test-secret');assert.equal(await verifyJwt(expired,'test-secret'),null);
});
const upload=(kind:'video'|'image'|'audio',duration:number|null=12):Upload=>({id:kind,account_id:'test',kind,contentType:kind==='video'?'video/mp4':kind==='image'?'image/png':'audio/wav',duration:kind==='image'?null:duration,width:kind==='video'?1280:null,height:kind==='video'?720:null,r2_key:'test',size:100,expires_at:Date.now()+3600000});
const quest=(kind:string)=>({...QUEST_CATALOG.find(q=>q.kind===kind)!,templateId:'test',day:'2026-10-03',priceCents:999}) as Quest;
test('route requirements and duration bounds reject unsuitable inputs',()=>{
 assert.equal(validateInputs(quest('edit'),[upload('video')]).duration,12);
 assert.throws(()=>validateInputs(quest('edit'),[upload('video',16)]));assert.throws(()=>validateInputs(quest('edit'),[upload('video'),upload('image')]));
 assert.throws(()=>validateInputs(quest('perform'),[upload('image')]));assert.equal(validateInputs(quest('perform'),[upload('image'),upload('audio')]).duration,12);
 assert.throws(()=>validateInputs(quest('imagine'),[upload('image')]));assert.throws(()=>validateInputs(quest('imagine'),[upload('video',30)]));
 assert.equal(validateInputs(quest('adventure'),[upload('video',30)]).duration,30);
});
test('all video routes submit supported request shapes without a paid generation',()=>{
 for(const kind of ['edit','perform','imagine','adventure']){
  const q=quest(kind);
  const references=q.kind==='perform'
   ? [{type:'image_url' as const,image_url:{url:'https://example.com/image'}},{type:'audio_url' as const,audio_url:{url:'https://example.com/audio'}}]
   : [{type:'video_url' as const,video_url:{url:'https://example.com/video'}}];
  const request=videoRequest({model:q.model,prompt:'test scene',duration:q.duration,resolution:q.resolution,aspectRatio:'16:9',references});
  assert.equal(request.model,q.model);assert.equal(request.prompt,'test scene');assert.deepEqual(request.input_references,references);
  if(q.kind==='edit')assert.ok(!('duration' in request) && !('resolution' in request) && !('aspect_ratio' in request));
  else {assert.equal(request.duration,q.duration);assert.equal(request.resolution,q.resolution);assert.equal(request.aspect_ratio,'16:9');}
 }
});
test('sales open only after both provider keys and Stripe webhook signing secret exist',()=>{
 const vars={SALES_ENABLED:'true',OPENROUTER_API_KEY:'key',STRIPE_SECRET_KEY:'key',STRIPE_WEBHOOK_SECRET:'secret'} as Parameters<typeof serviceReadiness>[0];
 assert.deepEqual(serviceReadiness(vars),{generationReady:true,paymentReady:true,salesReady:true});
 assert.equal(serviceReadiness({...vars,STRIPE_WEBHOOK_SECRET:''}).salesReady,false);
});
test('server reads WAV duration from bytes and rejects unknown data',()=>{
 const b=Buffer.alloc(44+16000);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(16000,40);
 assert.equal(inspectMedia(b).duration,1);assert.throws(()=>inspectMedia(new Uint8Array(64)));
});
