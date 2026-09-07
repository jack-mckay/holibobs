import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { verifyPassword } from "@/lib/password";

export type Session = {
  userId: number;
  email: string;
  name: string;
  role: "USER" | "ADMIN" | "SUPER_ADMIN";
  teamId: number;
};

type SessionToken = {
  session: Session;
  expiresAt: number;
};

const sessionLifetimeSeconds = 60 * 60 * 8;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret())
    .update(value)
    .digest("base64url");
}

export async function findAccount(email: string, password: string) {
  const [rows] = await db.query<Array<RowDataPacket & { id: number; name: string; email: string; passwordHash: string; role: Session["role"]; teamId: number }>>("SELECT id, name, email, passwordHash, role, teamId FROM User WHERE email = ?", [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await verifyPassword(user.passwordHash, password))) return null;
  return { userId: user.id, email: user.email, name: user.name, role: user.role, teamId: user.teamId };
}

export async function getSession() {
  const value = (await cookies()).get("hols_session")?.value;
  if (!value) return null;
  try {
    const [encodedPayload, signature] = value.split(".");
    if (!encodedPayload || !signature) return null;
    const expectedSignature = sign(encodedPayload);
    const providedSignature = Buffer.from(signature, "base64url");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "base64url");
    if (
      providedSignature.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(providedSignature, expectedSignatureBuffer)
    )
      return null;
    const token = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionToken;
    if (token.expiresAt <= Date.now() || !isValidSession(token.session))
      return null;
    return token.session;
  } catch {
    return null;
  }
}

export function encodeSession(session: Session) {
  const payload = Buffer.from(
    JSON.stringify({
      session,
      expiresAt: Date.now() + sessionLifetimeSeconds * 1000,
    } satisfies SessionToken),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function isValidSession(session: Session) {
  return (
    Number.isInteger(session.userId) &&
    typeof session.email === "string" &&
    typeof session.name === "string" &&
    ["USER", "ADMIN", "SUPER_ADMIN"].includes(session.role) &&
    Number.isInteger(session.teamId)
  );
}

export function canManageRequests(session: Session) {
  return session.role === "ADMIN" || session.role === "SUPER_ADMIN";
}

export function canManageTeam(session: Session, teamId: number) {
  return session.role === "SUPER_ADMIN" || (session.role === "ADMIN" && session.teamId === teamId);
}
