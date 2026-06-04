import { createHmac, timingSafeEqual } from "crypto";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const SESSION_COOKIE_NAME = "col_marketing_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

type SessionPayload = {
  sub: number;
  exp: number;
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET debe definirse en producción (mínimo 32 caracteres).",
    );
  }
  return "dev-only-col-marketing-session-secret-min-32-chars";
}

function sign(value: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): SessionPayload | null {
  try {
    const raw = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(raw) as SessionPayload;
    if (
      typeof parsed.sub !== "number" ||
      !Number.isInteger(parsed.sub) ||
      parsed.sub <= 0 ||
      typeof parsed.exp !== "number" ||
      !Number.isInteger(parsed.exp)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: number): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const encoded = encodePayload({ sub: userId, exp });
  const signature = sign(encoded);
  return `v1.${encoded}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined | null,
): { userId: number } | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;

  const [, encoded, signature] = parts;
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) return null;

  return { userId: payload.sub };
}

export function getSessionCookieOptions(
  maxAge = SESSION_MAX_AGE_SECONDS,
): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}
