import { destroySession } from "@/lib/auth/session";
import { fail, handle, json } from "@/lib/api/helpers";
import { isSameOrigin } from "@/lib/security/origin";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (!isSameOrigin(request)) return fail("Permintaan ditolak.", 403);
    await destroySession();
    return json({ ok: true });
  });
}