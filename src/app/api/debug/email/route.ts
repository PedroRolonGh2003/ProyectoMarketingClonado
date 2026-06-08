import { NextResponse } from "next/server";
import { diagnoseSmtp } from "@/lib/email";

export const runtime = "nodejs";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const result = await diagnoseSmtp();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
