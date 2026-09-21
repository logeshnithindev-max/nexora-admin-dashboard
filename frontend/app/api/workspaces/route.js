import { NextResponse } from "next/server";

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";

function headers(request) {
  return {
    "Content-Type": "application/json",
    "X-Service-Key": process.env.BACKEND_SERVICE_API_KEY || "",
    "Idempotency-Key": request.headers.get("Idempotency-Key") || crypto.randomUUID(),
  };
}

async function authenticated(request) {
  const token = request.cookies.get("nexora_admin_token")?.value;
  if (!token) return false;
  try {
    return (await fetch(`${backendUrl}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })).ok;
  } catch { return false; }
}

async function relay(response) {
  const body = await response.json().catch(() => ({ detail: "Backend returned an invalid response" }));
  return NextResponse.json(body, { status: response.status });
}

export async function GET(request) {
  if (!await authenticated(request)) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  try {
    return relay(await fetch(`${backendUrl}/api/v1/onboarding/workspaces`, {
      headers: headers(request), cache: "no-store",
    }));
  } catch {
    return NextResponse.json({ detail: "Cannot reach the onboarding API" }, { status: 502 });
  }
}

export async function POST(request) {
  if (!await authenticated(request)) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  try {
    const body = await request.json();
    return relay(await fetch(`${backendUrl}/api/v1/onboarding/workspaces`, {
      method: "POST", headers: headers(request), body: JSON.stringify(body), cache: "no-store",
    }));
  } catch {
    return NextResponse.json({ detail: "Cannot reach the onboarding API" }, { status: 502 });
  }
}
