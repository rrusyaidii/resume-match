import { createHash, randomUUID } from "crypto";
import { BATCH_SESSION_TTL_SEC } from "@/lib/constants";
import { getRedisClient, isRedisConfigured } from "@/lib/usage-store";

const KEY_PREFIX = "rm:v1:batch:";

export interface BatchSession {
  deviceId: string;
  jdHash: string;
  total: number;
  processed: number;
  createdAt: number;
}

const devSessions = new Map<string, BatchSession>();

export function hashJobDescription(jobDescription: string): string {
  const secret = process.env.COOKIE_SECRET || "dev-batch-session";
  return createHash("sha256")
    .update(secret)
    .update("|")
    .update(jobDescription.trim())
    .digest("hex");
}

function sessionKey(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

export async function createBatchSession(
  deviceId: string,
  total: number,
  jdHash: string
): Promise<string> {
  const sessionId = randomUUID();
  const session: BatchSession = {
    deviceId,
    jdHash,
    total,
    processed: 0,
    createdAt: Date.now(),
  };

  if (!isRedisConfigured()) {
    devSessions.set(sessionId, session);
    return sessionId;
  }

  const client = getRedisClient()!;
  await client.set(sessionKey(sessionId), session, { ex: BATCH_SESSION_TTL_SEC });
  return sessionId;
}

async function loadSession(sessionId: string): Promise<BatchSession | null> {
  if (!isRedisConfigured()) {
    return devSessions.get(sessionId) ?? null;
  }

  const client = getRedisClient()!;
  return client.get<BatchSession>(sessionKey(sessionId));
}

async function saveSession(sessionId: string, session: BatchSession): Promise<void> {
  if (!isRedisConfigured()) {
    devSessions.set(sessionId, session);
    return;
  }

  const client = getRedisClient()!;
  await client.set(sessionKey(sessionId), session, { ex: BATCH_SESSION_TTL_SEC });
}

export interface BatchSessionAdvanceResult {
  ok: true;
  session: BatchSession;
  isComplete: boolean;
}

export interface BatchSessionError {
  ok: false;
  error: string;
}

export async function validateAndAdvanceBatchSession(
  sessionId: string,
  deviceId: string,
  jdHash: string
): Promise<BatchSessionAdvanceResult | BatchSessionError> {
  const session = await loadSession(sessionId);

  if (!session) {
    return { ok: false, error: "Batch session expired or invalid. Start a new comparison." };
  }

  if (session.deviceId !== deviceId) {
    return { ok: false, error: "Batch session does not match this device." };
  }

  if (session.jdHash !== jdHash) {
    return { ok: false, error: "Job description changed during batch. Start a new comparison." };
  }

  if (session.processed >= session.total) {
    return { ok: false, error: "Batch session already completed." };
  }

  const next: BatchSession = {
    ...session,
    processed: session.processed + 1,
  };

  await saveSession(sessionId, next);

  return {
    ok: true,
    session: next,
    isComplete: next.processed >= next.total,
  };
}

export async function peekBatchSession(
  sessionId: string,
  deviceId: string,
  jdHash: string
): Promise<BatchSession | null> {
  const session = await loadSession(sessionId);
  if (!session) return null;
  if (session.deviceId !== deviceId || session.jdHash !== jdHash) return null;
  return session;
}
