import { dayOffset, formatNY, nyInstant, schedule } from "./domain";

export function playBlockers(input: {
  paid: boolean; busy: string; required: readonly string[]; uploaded: readonly string[];
  rights: boolean; consent: boolean; serviceReady: boolean;
  window: { day: string; purchase: boolean; submit: boolean }; questDay: string;
}) {
  const reasons: string[] = [];
  if (input.busy) reasons.push(input.busy === "upload" ? "Your file is still uploading. Wait for Prepared to appear." : "Please wait while your request completes.");
  if (!input.serviceReady) reasons.push(input.paid ? "Generation is temporarily unavailable. No submission has started." : "Checkout is temporarily unavailable. No payment has been taken.");
  if (!(input.paid ? input.window.submit : input.window.purchase)) {
    if (input.paid) reasons.push("Submissions are closed now (New York time). Check opening hours and your ticket deadline.");
    else {
      let nextDay = dayOffset(input.window.day, 1);
      while (!schedule(nyInstant(nextDay, 0)).purchase) nextDay = dayOffset(nextDay, 1);
      reasons.push(`Purchases are closed now (New York time). Next opening: ${formatNY(nyInstant(nextDay, 0))}. Saturday purchases are closed all day.`);
    }
  }
  if (!input.paid && input.questDay !== input.window.day) reasons.push("This quest's purchase day has ended. Choose a quest from today's selection.");
  const missing = input.required.filter(kind => !input.uploaded.includes(kind));
  if (missing.length) reasons.push(`Prepare your required ${missing.join(" and ")} file${missing.length > 1 ? "s" : ""}. Optional files are not needed.`);
  if (!input.rights) reasons.push("Confirm you have permission to use the materials.");
  if (!input.consent) reasons.push("Confirm the public sharing and purchase terms.");
  return reasons;
}
