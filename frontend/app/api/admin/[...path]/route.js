import { NextResponse } from "next/server";

const backendUrl =
  process.env.BACKEND_URL || "http://127.0.0.1:8000";

async function relay(request, context, method) {
  const token = request.cookies.get("nexora_admin_token")?.value;

  if (!token) {
    return NextResponse.json(
      { detail: "Authentication required" },
      { status: 401 }
    );
  }

  const me = await fetch(`${backendUrl}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  }).catch(() => null);

  if (!me?.ok) {
    return NextResponse.json(
      { detail: "Authentication required" },
      { status: 401 }
    );
  }

  const { path } = await context.params;

  const init = {
    method,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Service-Key": process.env.BACKEND_SERVICE_API_KEY || "",
    },
  };

  if (!["GET", "DELETE"].includes(method)) {
    init.body = await request.text();
  }

  try {
    const targetUrl =
      `${backendUrl}/api/v1/admin/${path.join("/")}`;

    console.log("PROXY TARGET:", targetUrl);

    const response = await fetch(targetUrl, init);

    const body = await response.json().catch(() => ({
      detail: "Backend returned an invalid response",
    }));

    return NextResponse.json(body, {
      status: response.status,
    });
  } catch {
    return NextResponse.json(
      { detail: "Cannot reach the admin API" },
      { status: 502 }
    );
  }
}

export const GET = (request, context) =>
  relay(request, context, "GET");

export const POST = (request, context) =>
  relay(request, context, "POST");

export const PUT = (request, context) =>
  relay(request, context, "PUT");

export const DELETE = (request, context) =>
  relay(request, context, "DELETE");
