import { NextResponse } from "next/server";
import { lookupPhishTank } from "@/lib/reputation/phishtank";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: unknown; consent?: unknown };
    if (body.consent !== true) return NextResponse.json({ error: "Persetujuan diperlukan sebelum URL dikirim ke PhishTank." }, { status: 400 });
    if (typeof body.url !== "string" || body.url.length > 2048) return NextResponse.json({ error: "URL tidak valid." }, { status: 400 });
    let parsed: URL;
    try { parsed = new URL(body.url); } catch { return NextResponse.json({ error: "URL tidak dapat diurai." }, { status: 400 }); }
    if (!/^https?:$/.test(parsed.protocol)) return NextResponse.json({ error: "Hanya URL http/https yang didukung." }, { status: 400 });
    const result = await lookupPhishTank(parsed.toString(), process.env.PHISHTANK_APP_KEY);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Permintaan pemeriksaan tidak dapat diproses." }, { status: 400 });
  }
}
