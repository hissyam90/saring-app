import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/security/rate-limit";
import { submissionSchema, firstError } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";

export async function GET(): Promise<Response> {
  return handle(async () => {
    const { user } = await requireUser();
    const items = await getStore().listSubmissionsByAuthor(user.id);
    return json({ items });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { user } = await requireUser();

    const limit = await checkRateLimit(
      RATE_LIMITS.submissionCreate,
      clientKey(request, `submission:${user.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const captcha = await verifyTurnstile(parsed.data.captchaToken, "submission");
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const submission = await getStore().createSubmission({
      authorId: user.id,
      title: parsed.data.title,
      summary: parsed.data.summary,
      category: parsed.data.category,
      body: parsed.data.body,
      references: parsed.data.references || null,
    });

    return json({ ...submission, authorName: user.displayName }, 201);
  });
}