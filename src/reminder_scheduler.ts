import { z } from "zod";
import { InfraiClient } from "./infrai.js";

export const reminderRequest = z.object({ eventId: z.string().min(1), dueAt: z.coerce.date(), recipient: z.string().email(), amountCents: z.number().int().nonnegative() });
export type ReminderRequest = z.infer<typeof reminderRequest>;

export function reminderDecision(input: ReminderRequest, now = new Date()): "schedule" | "skip" {
  return input.dueAt.getTime() > now.getTime() ? "schedule" : "skip";
}

export async function scheduleReminder(raw: unknown, client = new InfraiClient()) {
  const input = reminderRequest.parse(raw);
  if (reminderDecision(input) === "skip") return { status: "skipped", eventId: input.eventId } as const;
  const payload = { eventId: input.eventId, recipient: input.recipient, amountCents: input.amountCents, dueAt: input.dueAt.toISOString() };
  const job = await client.createCron("0 9 * * *", "https://example.com/reminders/fire", `reminder-${input.eventId}`);
  await client.publish("reminders", payload, `reminder-${input.eventId}`);
  return { status: "scheduled", eventId: input.eventId, jobId: job.job_id } as const;
}

if (process.argv[1]?.endsWith("reminder_scheduler.ts")) {
  const client = new InfraiClient();
  const eventId = `codecheck-${Date.now()}`;
  client.publish("reminders", { eventId, kind: "verification" }, eventId).then(console.log).catch(error => { console.error(error.message); process.exitCode = 1; });
}
