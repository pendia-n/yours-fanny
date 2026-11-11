import { DurableObject } from "cloudflare:workers";
import { FUNDING_RECHECK_MS, runFundingPass } from "./funding";
import type { AppEnv } from "./types";

export class GenerationFunding extends DurableObject<AppEnv> {
  async wake() {
    if (await this.ctx.storage.getAlarm() === null) await this.ctx.storage.setAlarm(Date.now());
  }

  async alarm() {
    // Schedule the next pass before doing I/O so a transient failure cannot strand the queue.
    await this.ctx.storage.setAlarm(Date.now() + FUNDING_RECHECK_MS);
    if (!await runFundingPass(this.env)) {
      await this.ctx.storage.deleteAlarm();
      // A checkout can arrive while this alarm is running.
      if (await this.env.DB.prepare("SELECT 1 FROM generations WHERE status IN ('queued','waiting_funds','funded') AND provider_submitted_at IS NULL LIMIT 1").first()) await this.wake();
    }
  }
}
