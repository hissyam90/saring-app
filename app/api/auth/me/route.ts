import { getCurrentUser } from "@/lib/auth/guards";
import { json, handle } from "@/lib/api/helpers";

export async function GET(): Promise<Response> {
  return handle(async () => {
    const user = await getCurrentUser();
    if (!user) return json({ user: null });
    return json({
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
      },
    });
  });
}