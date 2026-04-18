"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[color:var(--background)]">
      <div className="w-full max-w-sm space-y-6 border border-[color:var(--border)] rounded-lg p-6 shadow-sm">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">VW app</h1>
          <p className="text-sm text-[color:var(--muted)]">Entrar na unidade</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={pending}
              className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] disabled:opacity-50"
              placeholder="admin@fillmore.com.br"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={pending}
              className="w-full rounded-md border border-[color:var(--border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] disabled:opacity-50"
            />
          </div>

          {state?.error ? (
            <p
              className="text-sm text-[color:var(--destructive)]"
              role="alert"
              aria-live="polite"
            >
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-[color:var(--primary)] text-[color:var(--primary-foreground)] py-2 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
