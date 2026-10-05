"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  signInWithGoogleAction,
  signInWithMagicLinkAction,
  type AuthFormState,
} from "@/lib/actions/auth";

function ErrorBanner({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 font-sans text-xs leading-relaxed text-destructive-foreground"
    >
      {message}
    </p>
  );
}

function NoticeBanner({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="rounded-sm border border-gold/40 bg-gold/10 px-3.5 py-2.5 font-sans text-xs leading-relaxed text-gold"
    >
      {message}
    </p>
  );
}

export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [state, formActionFn, pending] = useActionState<AuthFormState, FormData>(
    signInWithMagicLinkAction,
    null,
  );
  const [email, setEmail] = useState("");

  return (
    <div className="mt-8 space-y-3">
      {initialError && <ErrorBanner message={initialError} />}

      {/* Google OAuth */}
      <form action={signInWithGoogleAction}>
        <input type="hidden" name="next" value={next} />
        <button type="submit" className="btn-ghost-dark w-full" disabled={false}>
          <svg aria-hidden viewBox="0 0 24 24" className="size-4">
            <path
              fill="#EA4335"
              d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.75 12 .75 7.62.75 3.84 3.27 1.98 6.86l3.66 2.84C6.5 7.02 9 5.04 12 5.04Z"
            />
            <path
              fill="#4285F4"
              d="M23.25 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.68 2.85c2.15-1.99 3.5-4.92 3.5-8.67Z"
            />
            <path
              fill="#FBBC05"
              d="M5.65 14.3a7.2 7.2 0 0 1 0-4.6L1.98 6.86a11.26 11.26 0 0 0 0 10.28l3.67-2.84Z"
            />
            <path
              fill="#34A853"
              d="M12 23.25c3.04 0 5.6-1 7.46-2.72l-3.68-2.85c-1.02.69-2.33 1.1-3.78 1.1-3 0-5.5-1.98-6.36-4.66l-3.66 2.84c1.86 3.6 5.64 6.29 10.02 6.29Z"
            />
          </svg>
          Masuk dengan Google
        </button>
      </form>

      <div className="flex items-center gap-3 py-1" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        <span className="label-caps !text-[9px] text-faint">atau</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* Email magic link */}
      {state?.notice ? (
        <NoticeBanner message={state.notice} />
      ) : (
        <form action={formActionFn} className="space-y-3">
          <div>
            <label htmlFor="email" className="label-caps mb-2 block">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-sm border border-line bg-surface px-3.5 font-sans text-sm text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none"
            />
          </div>

          {state?.error && <ErrorBanner message={state.error} />}

          <button type="submit" className="btn-gold w-full" disabled={pending}>
            {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Kirim Tautan Masuk
          </button>
        </form>
      )}
    </div>
  );
}
