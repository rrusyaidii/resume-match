import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { OAuth2Client } from "google-auth-library";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

export const GOOGLE_STATE_COOKIE = "rm_google_state";

export interface GoogleTokenRecord {
  refreshToken: string;
  email: string;
  connectedAt: string;
}

function getSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("COOKIE_SECRET is not configured or too short");
  }
  return secret;
}

function getEncryptionKey(): Buffer {
  return createHash("sha256").update(`${getSecret()}:google-token`).digest();
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return `${siteUrl.replace(/\/$/, "")}/api/google/callback`;
}

export function createGoogleOAuthClient(): OAuth2Client {
  if (!isGoogleOAuthConfigured()) {
    throw new Error("Google OAuth is not configured");
  }

  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGoogleRedirectUri()
  );
}

export function encryptGoogleToken(record: GoogleTokenRecord): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(record), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptGoogleToken(payload: string): GoogleTokenRecord | null {
  try {
    const buffer = Buffer.from(payload, "base64url");
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(decrypted) as GoogleTokenRecord;
    if (!parsed.refreshToken || !parsed.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function signOAuthState(nonce: string): string {
  const sig = createHmac("sha256", getSecret()).update(nonce).digest("base64url");
  return `${nonce}.${sig}`;
}

export function verifyOAuthState(state: string): boolean {
  const dot = state.indexOf(".");
  if (dot === -1) return false;

  const nonce = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const expected = createHmac("sha256", getSecret()).update(nonce).digest("base64url");

  try {
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

export async function exchangeCodeForTokens(code: string) {
  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Try disconnecting and reconnecting.");
  }
  return tokens;
}

export async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const client = createGoogleOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token) {
    throw new Error("Could not refresh Google access token");
  }
  return credentials.access_token;
}

export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Could not fetch Google user info");
  }

  const data = (await res.json()) as { email?: string };
  if (!data.email) {
    throw new Error("Google account has no email");
  }

  return data.email;
}
