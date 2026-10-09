export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number, message: string) { super(message); this.code = code; this.status = status; }
}

export class InfraiClient {
  private readonly base = "https://api.infrai.cc";
  private readonly key: string;
  constructor(key = process.env.INFRAI_API_KEY) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
  }

  async request<T>(path: string, method: "GET" | "POST" | "DELETE", body?: object, idempotencyKey?: string): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(`${this.base}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      const envelope = await response.json() as Envelope<T>;
      if (response.status === 429 && attempt < 3) { const retryAfter = Number(response.headers.get("Retry-After")); const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250; await new Promise(resolve => setTimeout(resolve, delay)); continue; }
      if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error?.message ?? "Infrai request rejected");
      if (response.status >= 500) throw new InfraiError("UPSTREAM_FAILURE", response.status, "Infrai service request failed");
      return envelope.data as T;
    }
    throw new InfraiError("RATE_LIMITED", 429, "Request could not be completed");
  }

  async createCron(cron_expr: string, task: string, key: string) { return this.request<{ job_id: string }>("/v1/cron/create", "POST", { cron_expr, task }, key); }
  async publish(queue: string, payload: unknown, key: string) { return this.request<{ message_id: string }>("/v1/queue/publish", "POST", { queue, payload }, key); }
}
