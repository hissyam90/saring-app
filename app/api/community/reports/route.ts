import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/security/rate-limit";
import { reportSchema, firstError } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { user } = await requireUser();

    const limit = await checkRateLimit(
      RATE_LIMITS.reportCreate,
      clientKey(request, `report:${user.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const store = getStore();

    if (parsed.data.targetType === "thread") {
      const thread = await store.findThread(parsed.data.targetId);
      if (!thread) return fail("Konten tidak ditemukan.", 404);
    } else {
      const reply = await store.findReply(parsed.data.targetId);
      if (!reply) return fail("Konten tidak ditemukan.", 404);
    }

    // Cegah laporan ganda dari pengguna yang sama untuk konten yang sama.
    const duplicates = await store.countReportsForTarget(
      parsed.data.targetType,
      parsed.data.targetId,
      user.id,
    );
    if (duplicates > 0) {
      return fail("Anda sudah melaporkan konten ini.", 409);
    }

    const captcha = await verifyTurnstile(parsed.data.captchaToken, "report");
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const report = await store.createReport({
      reporterId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      details: parsed.data.details || null,
    });

    return json({ id: report.id, status: report.status }, 201);
  });
}