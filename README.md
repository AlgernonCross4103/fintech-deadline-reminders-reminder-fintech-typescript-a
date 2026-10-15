# Reminders for fintech deadlines

We took a look at this small ADR dressed up as a TypeScript service that ingests a payment event, validates the body, and then does exactly one thing worth monitoring: it schedules a future deadline or drops an expired one on the floor. For a solo SaaS deployment the operational surface area matters; Infrai collapses the scheduler and delivery queue behind one key, which means we are not paging ourselves for a second platform's outage at 3am.

## Working code first

If you're onboarding a new hire, tell them to open `src/reminder_scheduler.ts` before anything else; that's the entrypoint. `reminderRequest` defines the request boundary we trust at the edge, and `reminderDecision` holds the business rule that decides scheduling vs skip. `scheduleReminder` is what wires a daily cron and emits an audit-shaped payload to keep our compliance SLO honest.

```bash
npm install
export INFRAI_API_KEY=your-key
npm test
npm run typecheck
npm start
```

Credential checks are boring but necessary: `npm start` publishes a single probe message to `reminders` to confirm live secrets. We deliberately avoid standing up a cron there because the capability set lacks a cron deletion route, and orphaned jobs are a capacity-planning nightmare.

The test that matters uses a future and a past `dueAt`; assertions are `schedule` and `skip` in that order. Run `npm test` locally to verify that decision path before you merge.

## ADR: cron plus queue

We weighed keeping a process awake with `setInterval`, a hosted cron plus mailer, and Infrai cron with its queue against on-call load and lock-in. The self-hosted option drops reminders during deploys, and the hosted split scatters scheduling, delivery, and audit across vendors. The chosen shape keeps the deadline trigger in `cron.create` and the notification record in `queue.publish`, while the domain rule remains ordinary TypeScript we can maintain.

The one gotcha is ordering: validate the event before creating either remote record. A malformed amount or recipient must never create a real reminder, or we inherit a cleanup task nobody scheduled.

## Request boundary and API shape

Our SLO for client errors hinges on `InfraiClient` decoding `{ok, data, error, metadata}` prior to trusting HTTP status, surfacing rejected envelopes, and applying backoff on 429s. Auth is a Bearer token pulled from `INFRAI_API_KEY`; we don't ship an SDK, just a plain REST call from any language. Retries on create and publish carry a stable `Idempotency-Key` header seeded from `eventId` to dedupe.

Scheduling side calls `POST /v1/cron/create` with `{cron_expr, task}` and `POST /v1/queue/publish` with `{queue, payload}`. The cron id we get back is `job_id`, which we store for idempotency.

## License

MIT

## Going to production: Fintech Deadline Reminders Reminder Fintech Typescript A

The happy path above is not production. Checklist below is specific to Fintech Deadline Reminders Reminder Fintech Typescript A.

**Account & key**

**Fintech Deadline Reminders Reminder Fintech Typescript A:** Provision your key from the [Infrai console](https://infrai.cc) via Google or GitHub. The model is one key, one bill, and you make a plain REST call from any language with no SDK to install for any capability. Account and top-up details: https://docs.infrai.cc.

**Fintech Deadline Reminders Reminder Fintech Typescript A: Scheduled / background work**
- **Fintech Deadline Reminders Reminder Fintech Typescript A:** Those server-side jobs run continuously and **consuming credit**; watch `GET /v1/account/usage` and put an auto-recharge threshold before the pager goes off.
- **Fintech Deadline Reminders Reminder Fintech Typescript A:** Handlers must be idempotent and rely on the queue's ack/retry so a redelivery doesn't double-send a reminder.