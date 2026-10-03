import { existsSync, readFileSync, appendFileSync, chmodSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
// Never log the secret payload or provider responses containing secret material.
execFileSync('git',['check-ignore','--quiet','.env']);
const contents=existsSync('.env')?readFileSync('.env','utf8'):'';
const values={};
for(const key of ['YETZER_JWT_SECRET','YETZER_PASSWORD_PEPPER']) {
  const existing=contents.match(new RegExp(`^${key}=([a-f0-9]{64})$`,'m'))?.[1];
  if(contents.includes(`${key}=`)&&!existing)throw new Error(`Existing ${key} needs manual format review; not rotating it.`);
  values[key]=existing||execFileSync('openssl',['rand','-hex','32'],{encoding:'utf8'}).trim();
  if(!existing)appendFileSync('.env',`\n${key}=${values[key]}\n`,{mode:0o600});
}
chmodSync('.env',0o600);
console.log('Auth secrets persisted in ignored .env; values withheld.');
if(process.argv.includes('--upload')) {
  const r=spawnSync('pnpm',['exec','wrangler','secret','bulk'],{input:JSON.stringify(values),encoding:'utf8',stdio:['pipe','pipe','pipe']});
  if(r.status!==0)throw new Error('Secret upload failed; values remain saved. No values or raw output logged.');
  console.log('Configured YETZER_JWT_SECRET and YETZER_PASSWORD_PEPPER on Yetzer.');
}
