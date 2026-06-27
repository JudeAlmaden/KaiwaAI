"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Kai from "../Kai";
import Petals from "../Petals";
import { PopButton } from "../PopButton";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { name, email, password } : { email, password }
        ),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <Petals />

      {/* giant ghost kanji */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 bottom-0 select-none font-jp text-[20rem] font-bold leading-none text-indigo-ai/[0.04] sm:text-[28rem]"
      >
        {isRegister ? "始" : "帰"}
      </span>

      {/* minimal top bar */}
      <header className="relative z-10 px-6 py-5 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-lg font-extrabold tracking-tight"
        >
          <Kai size={30} />
          KaiwaAI
        </Link>
      </header>

      {/* centered card */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-12">
        <div className="w-full max-w-sm">
          {/* Kai greeting with a speech bubble */}
          <div className="mb-5 flex items-center gap-3">
            <Kai size={52} />
            <div className="rounded-2xl rounded-bl-sm border-2 border-border bg-card px-3.5 py-2">
              <span className="font-jp text-base text-indigo-ai">
                {isRegister ? "はじめまして！" : "おかえり！"}
              </span>
            </div>
          </div>

          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
            {isRegister ? "Let's be friends" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {isRegister
              ? "Two seconds to set up. Then Kai's all yours."
              : "Kai's been waiting. Let's keep talking."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
            {isRegister && (
              <Field
                label="Name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="What should Kai call you?"
                autoComplete="name"
              />
            )}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={isRegister ? "At least 8 characters" : "••••••••"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
            />

            {error && (
              <p className="rounded-xl bg-sakura/10 px-3 py-2 text-sm font-semibold text-sakura">
                {error}
              </p>
            )}

            <PopButton type="submit" disabled={loading} className="mt-1 w-full">
              {loading
                ? "Just a sec…"
                : isRegister
                  ? "Meet Kai →"
                  : "Log in"}
            </PopButton>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            {isRegister ? (
              <>
                Already friends?{" "}
                <Link href="/login" className="font-bold text-indigo-ai">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/register" className="font-bold text-indigo-ai">
                  Make friends with Kai
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="h-12 rounded-2xl border-2 border-border bg-card px-4 text-sm outline-none transition-colors focus:border-indigo-ai"
      />
    </label>
  );
}
