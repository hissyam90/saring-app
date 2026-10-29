import { getStore } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/security/rate-limit";
import { replySchema, firstError } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";
import { notifyThreadReply } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const store = getStore();
    const thread = await store.findThread(id);
    if (!thread) return fail("Diskusi tidak ditemukan.", 404);
    const replies = await store.listReplies(id);
    return json({ thread, replies });
  });
}

export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { id } = await params;
    const { user } = await requireUser();

    const limit = await checkRateLimit(
      RATE_LIMITS.replyCreate,
      clientKey(request, `reply:${user.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = replySchema.safeParse({ ...body, threadId: id });
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const store = getStore();
    const thread = await store.findThread(parsed.data.threadId);
    if (!thread) return fail("Diskusi tidak ditemukan.", 404);

    const captcha = await verifyTurnstile(parsed.data.captchaToken, "reply");
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const reply = await store.createReply({
      threadId: parsed.data.threadId,
      authorId: user.id,
      body: parsed.data.body,
    });

    // Notifikasi setelah balasan benar-benar tersimpan.
    await notifyThreadReply({
      threadAuthorId: thread.authorId,
      replierId: user.id,
      replierName: user.displayName,
      threadId: thread.id,
      threadTitle: thread.title,
      replyId: reply.id,
    });

    return json({ ...reply, authorName: user.displayName }, 201);
  });
}