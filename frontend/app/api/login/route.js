import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request) {
  try {
    const response = await fetch(`${backendUrl}/api/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(await request.json()) });
    const body = await response.json();
    const outgoing = NextResponse.json(response.ok ? body.user : body, { status: response.status });
    if (response.ok) outgoing.cookies.set("nexora_admin_token", body.access_token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 28800 });
    return outgoing;
  } catch {
    return NextResponse.json({ detail: "Cannot reach the authentication API" }, { status: 502 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ message: "Signed out" });
  response.cookies.delete("nexora_admin_token");
  return response;
}
