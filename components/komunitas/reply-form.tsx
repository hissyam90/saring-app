"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { buttonClass, Notice } from "@/components/ui/primitives";
import { TurnstileWidget } from "@/components/security/turnstile-widget";

const SITE_KEY = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY || null;

export function ReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const onToken = useCallback((v: string | null) => setToken(v), []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/community/threads/${threadId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, captchaToken: token ?? undefined }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Balasan tidak dapat dikirim.");
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-2" noValidate>
      <label htmlFor="reply" className="text-sm font-semibold text-ink">
        Tulis balasan
      </label>
      <textarea
        id="reply"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        minLength={10}
        maxLength={3000}
        rows={4}
        className="w-full border-2 border-ink bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-placeholder"
        placeholder="Bantu dengan pengalaman atau langkah yang bisa dilakukan."
      />
      <TurnstileWidget siteKey={SITE_KEY} action="reply" onToken={onToken} />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <button type="submit" disabled={pending} className={buttonClass("primary")}>
        {pending ? "Mengirim..." : "Kirim balasan"}
      </button>
    </form>
  );
}