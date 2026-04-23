import { Pool, type PoolClient } from "pg";

export type ApiKeyRecord = {
  id: string;
  owner_id: string;
  service_name: string;
  key_name: string;
  key_reference: string | null;
  notes: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export type NotificationSettingsRecord = {
  owner_id: string;
  email: string | null;
  webhook_url: string | null;
  reminder_days: number[];
  notifications_enabled: boolean;
  updated_at: string;
};

export type PurchaseRecord = {
  id: string;
  email: string;
  status: string;
  stripe_event_id: string | null;
  stripe_checkout_session_id: string | null;
  paid_at: string;
  created_at: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __apiKeyTrackerPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __apiKeyTrackerSchemaPromise: Promise<void> | undefined;
}

function getPool() {
  if (global.__apiKeyTrackerPool) {
    return global.__apiKeyTrackerPool;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const useSsl = !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");

  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined
  });

  global.__apiKeyTrackerPool = pool;
  return pool;
}

async function ensureSchema() {
  if (!global.__apiKeyTrackerSchemaPromise) {
    global.__apiKeyTrackerSchemaPromise = (async () => {
      const pool = getPool();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          service_name TEXT NOT NULL,
          key_name TEXT NOT NULL,
          key_reference TEXT,
          notes TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_api_keys_owner_expiry
        ON api_keys (owner_id, expires_at);
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_settings (
          owner_id TEXT PRIMARY KEY,
          email TEXT,
          webhook_url TEXT,
          reminder_days INTEGER[] NOT NULL DEFAULT ARRAY[30,14,7,3,1],
          notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS notification_events (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          api_key_id TEXT NOT NULL,
          day_threshold INTEGER NOT NULL,
          channel TEXT NOT NULL,
          sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (owner_id, api_key_id, day_threshold, channel)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS purchases (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          status TEXT NOT NULL,
          stripe_event_id TEXT UNIQUE,
          stripe_checkout_session_id TEXT UNIQUE,
          paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_purchases_email
        ON purchases (LOWER(email));
      `);
    })();
  }

  await global.__apiKeyTrackerSchemaPromise;
}

export async function withDbClient<T>(fn: (client: PoolClient) => Promise<T>) {
  await ensureSchema();
  const client = await getPool().connect();

  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function listKeysByOwner(ownerId: string) {
  return withDbClient(async (client) => {
    const result = await client.query<ApiKeyRecord>(
      `
        SELECT id, owner_id, service_name, key_name, key_reference, notes, expires_at, created_at, updated_at
        FROM api_keys
        WHERE owner_id = $1
        ORDER BY expires_at ASC;
      `,
      [ownerId]
    );

    return result.rows;
  });
}

export async function insertKeyForOwner(
  ownerId: string,
  input: {
    serviceName: string;
    keyName: string;
    keyReference?: string | null;
    notes?: string | null;
    expiresAt: string;
  }
) {
  return withDbClient(async (client) => {
    const result = await client.query<ApiKeyRecord>(
      `
        INSERT INTO api_keys (id, owner_id, service_name, key_name, key_reference, notes, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
        RETURNING id, owner_id, service_name, key_name, key_reference, notes, expires_at, created_at, updated_at;
      `,
      [
        crypto.randomUUID(),
        ownerId,
        input.serviceName.trim(),
        input.keyName.trim(),
        input.keyReference?.trim() || null,
        input.notes?.trim() || null,
        input.expiresAt
      ]
    );

    return result.rows[0];
  });
}

export async function deleteKeyForOwner(ownerId: string, keyId: string) {
  return withDbClient(async (client) => {
    const result = await client.query<{ id: string }>(
      `
        DELETE FROM api_keys
        WHERE owner_id = $1 AND id = $2
        RETURNING id;
      `,
      [ownerId, keyId]
    );

    return (result.rowCount ?? 0) > 0;
  });
}

export async function getNotificationSettings(ownerId: string) {
  return withDbClient(async (client) => {
    const result = await client.query<NotificationSettingsRecord>(
      `
        SELECT owner_id, email, webhook_url, reminder_days, notifications_enabled, updated_at
        FROM notification_settings
        WHERE owner_id = $1;
      `,
      [ownerId]
    );

    if ((result.rowCount ?? 0) === 0) {
      return {
        owner_id: ownerId,
        email: null,
        webhook_url: null,
        reminder_days: [30, 14, 7, 3, 1],
        notifications_enabled: true,
        updated_at: new Date().toISOString()
      } satisfies NotificationSettingsRecord;
    }

    return result.rows[0];
  });
}

export async function upsertNotificationSettings(
  ownerId: string,
  input: {
    email?: string | null;
    webhookUrl?: string | null;
    reminderDays: number[];
    notificationsEnabled: boolean;
  }
) {
  return withDbClient(async (client) => {
    const result = await client.query<NotificationSettingsRecord>(
      `
        INSERT INTO notification_settings (owner_id, email, webhook_url, reminder_days, notifications_enabled, updated_at)
        VALUES ($1, $2, $3, $4::int[], $5, NOW())
        ON CONFLICT (owner_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          webhook_url = EXCLUDED.webhook_url,
          reminder_days = EXCLUDED.reminder_days,
          notifications_enabled = EXCLUDED.notifications_enabled,
          updated_at = NOW()
        RETURNING owner_id, email, webhook_url, reminder_days, notifications_enabled, updated_at;
      `,
      [
        ownerId,
        input.email?.trim() || null,
        input.webhookUrl?.trim() || null,
        input.reminderDays,
        input.notificationsEnabled
      ]
    );

    return result.rows[0];
  });
}

export async function hasNotificationEvent(
  ownerId: string,
  apiKeyId: string,
  dayThreshold: number,
  channel: "email" | "webhook"
) {
  return withDbClient(async (client) => {
    const result = await client.query<{ id: string }>(
      `
        SELECT id
        FROM notification_events
        WHERE owner_id = $1 AND api_key_id = $2 AND day_threshold = $3 AND channel = $4
        LIMIT 1;
      `,
      [ownerId, apiKeyId, dayThreshold, channel]
    );

    return (result.rowCount ?? 0) > 0;
  });
}

export async function recordNotificationEvent(
  ownerId: string,
  apiKeyId: string,
  dayThreshold: number,
  channel: "email" | "webhook"
) {
  return withDbClient(async (client) => {
    await client.query(
      `
        INSERT INTO notification_events (id, owner_id, api_key_id, day_threshold, channel)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (owner_id, api_key_id, day_threshold, channel)
        DO NOTHING;
      `,
      [crypto.randomUUID(), ownerId, apiKeyId, dayThreshold, channel]
    );
  });
}

export async function upsertPurchase(input: {
  email: string;
  status: string;
  stripeEventId?: string | null;
  stripeCheckoutSessionId?: string | null;
  paidAt?: string;
}) {
  return withDbClient(async (client) => {
    const purchaseId = crypto.randomUUID();
    const result = await client.query<PurchaseRecord>(
      `
        INSERT INTO purchases (id, email, status, stripe_event_id, stripe_checkout_session_id, paid_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
        ON CONFLICT (stripe_checkout_session_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          status = EXCLUDED.status,
          stripe_event_id = EXCLUDED.stripe_event_id,
          paid_at = EXCLUDED.paid_at
        RETURNING id, email, status, stripe_event_id, stripe_checkout_session_id, paid_at, created_at;
      `,
      [
        purchaseId,
        input.email.toLowerCase().trim(),
        input.status,
        input.stripeEventId || null,
        input.stripeCheckoutSessionId || null,
        input.paidAt || new Date().toISOString()
      ]
    );

    return result.rows[0];
  });
}

export async function findPurchaseByEmail(email: string) {
  return withDbClient(async (client) => {
    const result = await client.query<PurchaseRecord>(
      `
        SELECT id, email, status, stripe_event_id, stripe_checkout_session_id, paid_at, created_at
        FROM purchases
        WHERE LOWER(email) = LOWER($1)
        ORDER BY paid_at DESC
        LIMIT 1;
      `,
      [email.trim()]
    );

    return result.rows[0] ?? null;
  });
}

export async function countActiveOwners() {
  return withDbClient(async (client) => {
    const result = await client.query<{ total: string }>(
      `
        SELECT COUNT(DISTINCT owner_id) AS total
        FROM api_keys;
      `
    );

    return Number(result.rows[0]?.total ?? 0);
  });
}
