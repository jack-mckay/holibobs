import { NextResponse } from "next/server";
import { encodeSession, findAccount } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const account = await findAccount(String(body.email ?? ""), String(body.password ?? ""));
  if (!account) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

  const user = { userId: account.userId, email: account.email, name: account.name, role: account.role, teamId: account.teamId };
  const response = NextResponse.json({ user });
  response.cookies.set("hols_session", encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
