import { getStore } from "@/lib/db";
import { THREAD_CATEGORIES } from "@/lib/db/types";
import type { ThreadCategory } from "@/lib/db/types";
import { requireUser } from "@/lib/auth/guards";
import { clampPage, fail, handle, json, readJson } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";
import { RATE_LIMITS, checkRateLimit, clientKey, tooManyRequests } from "@/lib/security/rate-limit";
import { threadSchema, firstError } from "@/lib/security/validation";
import { verifyTurnstile, TURNSTILE_ERROR } from "@/lib/security/turnstile";

const PAGE_SIZE = 10;
/** Kategori yang diterima filter; diturunkan dari sumber tunggal di `types.ts`. */
const CATEGORIES = new Set<string>(THREAD_CATEGORIES.map((c) => c.id));

export async function GET(request: Request): Promise<Response> {
  return handle(async () => {
    const url = new URL(request.url);
    const search = url.searchParams.get("q")?.slice(0, 80) ?? undefined;
    const rawCategory = url.searchParams.get("kategori");
    const category =
      rawCategory && CATEGORIES.has(rawCategory)
        ? (rawCategory as ThreadCategory)
        : undefined;
    const page = clampPage(url.searchParams.get("halaman"));

    const result = await getStore().listThreads({
      search,
      category,
      page,
      pageSize: PAGE_SIZE,
    });

    return json({ ...result, page, pageSize: PAGE_SIZE });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);

    const { user } = await requireUser();

    const limit = await checkRateLimit(
      RATE_LIMITS.threadCreate,
      clientKey(request, `thread:${user.id}`),
    );
    if (!limit.allowed) return tooManyRequests(limit);

    const body = await readJson(request);
    const parsed = threadSchema.safeParse(body);
    if (!parsed.success) return fail(firstError(parsed.error), 400);

    const captcha = await verifyTurnstile(parsed.data.captchaToken, "thread");
    if (!captcha.ok) return fail(TURNSTILE_ERROR, 400);

    const thread = await getStore().createThread({
      authorId: user.id,
      title: parsed.data.title,
      category: parsed.data.category as ThreadCategory,
      body: parsed.data.body,
      articleSlug: parsed.data.articleSlug || null,
    });

    return json({ ...thread, authorName: user.displayName }, 201);
  });
}