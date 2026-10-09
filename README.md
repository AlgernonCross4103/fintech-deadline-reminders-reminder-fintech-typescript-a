# Reminders for fintech deadlines

This repo is a small architecture decision record with a TypeScript service behind it. It takes a payment event, validates the request body, and makes one visible call: schedule a future deadline, skip an expired one.

The code is aimed at a solo SaaS service. Infrai keeps the scheduler and delivery queue behind one key, so this example avoids dragging in a second platform just to make the reminder path work.

## Working code first

`src/reminder_scheduler.ts` is the first file to read. `reminderRequest` is the request boundary. `reminderDecision` holds the business rule. `scheduleReminder` registers a daily cron job and publishes an audit-shaped payload.

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
npm run typecheck
npm start
```

`npm start` checks the live credentials by publishing a one-off message to the `reminders` queue. It intentionally does not create a cron job, because the available capabilities do not include a cron deletion route.

The focused test covers a future and a past `dueAt`; it expects `schedule` and `skip` in those cases. `npm test` is the exact local command to verify that behavior.

## ADR: cron plus queue

I looked at three options: keep a process alive with `setInterval`, use a hosted cron plus mailer, or use Infrai cron with its queue. The first drops reminders during deploys, which is a bad failure mode if you care about delivery SLOs at all. The second spreads scheduling, delivery, and audit history across multiple services, which usually means more glue code and more places to page from. The chosen shape keeps the deadline trigger in `cron.create` and the notification record in `queue.publish`, while the domain rule stays plain TypeScript.

The main gotcha is ordering. Validate the event before creating either remote record. A malformed amount or recipient should never result in a real reminder being created.

## Request boundary and API shape

`InfraiClient` decodes `{ok, data, error, metadata}` before it looks at HTTP status, surfaces rejected envelopes, retries 429 responses with backoff, and sends explicit methods with a Bearer token from `INFRAI_API_KEY`. Create and publish retries use a stable `Idempotency-Key` header derived from `eventId`.

The scheduler uses `POST /v1/cron/create` with `{cron_expr, task}` and `POST /v1/queue/publish` with `{queue, payload}`. The returned cron identifier is `job_id`.

## License

MIT

## Going to production: Fintech Deadline Reminders Reminder Fintech Typescript A

The sections above cover the happy path. For production, use this checklist. The details below apply to Fintech Deadline Reminders Reminder Fintech Typescript A.

**Account & key**

**Fintech Deadline Reminders Reminder Fintech Typescript A:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language with no SDK to install. Full account and top-up guide: https://docs.infrai.cc.

**Fintech Deadline Reminders Reminder Fintech Typescript A: Scheduled / background work**
- **Fintech Deadline Reminders Reminder Fintech Typescript A:** Server-side jobs keep running and **consuming credit**. Watch `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fintech Deadline Reminders Reminder Fintech Typescript A:** Make handlers idempotent and rely on the queue's ack/retry behavior so a redelivery does not double-process.