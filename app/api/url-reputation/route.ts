import { NextResponse } from "next/server";
import { lookupGoogleSafeBrowsing } from "@/lib/reputation/googleSafeBrowsing";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/origin";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Permintaan ditolak." },
      { status: 403, headers: NO_STORE },
    );
  }

  // Periksa tetap mudah diakses, tetapi dibatasi per klien agar tidak
  // disalahgunakan sebagai proxy gratis.
  const limit = await checkRateLimit(
    RATE_LIMITS.urlCheck,
    clientKey(request, "url-check"),
  );
  if (!limit.allowed) return tooManyRequests(limit);

  let body: { url?: unknown; consent?: unknown };

  try {
    body = (await request.json()) as { url?: unknown; consent?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Permintaan tidak dapat dibaca." },
      { status: 400, headers: NO_STORE },
    );
  }

  // Consent wajib eksplisit sebelum URL dikirim ke pihak ketiga.
  if (body.consent !== true) {
    return NextResponse.json(
      {
        error:
          "Persetujuan diperlukan sebelum URL dikirim ke Google Safe Browsing.",
      },
      { status: 400, headers: NO_STORE },
    );
  }

  if (typeof body.url !== "string" || body.url.length === 0) {
    return NextResponse.json(
      { error: "URL tidak boleh kosong." },
      { status: 400, headers: NO_STORE },
    );
  }

  if (body.url.length > 2048) {
    return NextResponse.json(
      { error: "URL terlalu panjang (maksimal 2048 karakter)." },
      { status: 400, headers: NO_STORE },
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(body.url);
  } catch {
    return NextResponse.json(
      { error: "URL tidak dapat diurai." },
      { status: 400, headers: NO_STORE },
    );
  }

  if (!/^https?:$/.test(parsed.protocol)) {
    return NextResponse.json(
      { error: "Hanya URL http dan https yang didukung." },
      { status: 400, headers: NO_STORE },
    );
  }

  // Key hanya dibaca di server. Tidak pernah dikirim ke klien.
  const result = await lookupGoogleSafeBrowsing(
    parsed.toString(),
    process.env.GOOGLE_SAFE_BROWSING_API_KEY,
  );

  return NextResponse.json(result, { headers: NO_STORE });
}
