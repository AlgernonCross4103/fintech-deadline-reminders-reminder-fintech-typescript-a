import assert from "node:assert/strict";
import { reminderDecision, reminderRequest, scheduleReminder } from "./reminder_scheduler.js";

const now = new Date("2026-01-01T00:00:00Z");
const future = reminderRequest.parse({ eventId: "settlement-7", dueAt: "2026-01-02T09:00:00Z", recipient: "risk@example.com", amountCents: 5000 });
const past = { ...future, dueAt: new Date("2025-12-31T09:00:00Z") };
assert.equal(reminderDecision(future, now), "schedule");
assert.equal(reminderDecision(past, now), "skip");

const calls: unknown[][] = [];
const client = {
  createCron: async (...args: unknown[]) => { calls.push(["createCron", ...args]); return { job_id: "job-1" }; },
  publish: async (...args: unknown[]) => { calls.push(["publish", ...args]); return { message_id: "message-1" }; }
};
await scheduleReminder({ ...future, dueAt: new Date(Date.now() + 86_400_000) }, client as never);
assert.equal(calls[1]?.[0], "publish");
assert.equal(calls[1]?.[1], "reminders");
assert.equal((calls[1]?.[2] as { eventId?: string })?.eventId, "settlement-7");
console.log("reminder decision test passed");
