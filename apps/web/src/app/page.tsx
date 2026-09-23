"use client";

import { canAccessDesk } from "@padelapp/shared";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { persistLanguage } from "../i18n";
import { apiFetch, clearToken, setToken } from "../lib/api";
import type { MeResponse, PublicClub } from "../lib/types";

const isDev = process.env.NODE_ENV === "development";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [clubs, setClubs] = useState<PublicClub[]>([]);
  const [clubSlug, setClubSlug] = useState("");
  const [email, setEmail] = useState(isDev ? "owner@club-a.local" : "");
  const [password, setPassword] = useState(isDev ? "padel-dev" : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<{ clubs: PublicClub[] }>("/public/clubs")
      .then((data) => {
        setClubs(data.clubs);
        const first = data.clubs[0];
        if (first) {
          setClubSlug(first.slug);
          if (isDev) {
            setEmail(`owner@${first.slug}.local`);
          }
        }
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [t]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<{ token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ clubSlug, email, password }),
      });
      setToken(result.token);
      const me = await apiFetch<MeResponse>("/me");
      if (!canAccessDesk(me.user.role)) {
        clearToken();
        setError(t("login.playerBlocked"));
        return;
      }
      router.push("/today");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-night px-12 py-16 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-24 -right-16 size-80 rounded-full bg-lime/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 size-72 rounded-full bg-court/40 blur-3xl" />
        <p className="relative text-sm font-semibold tracking-[0.2em] text-lime uppercase">{t("app.name")}</p>
        <div className="relative max-w-md">
          <p className="text-sm tracking-[0.16em] text-lime/90 uppercase">{t("login.kicker")}</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance">{t("login.hero")}</h1>
          <p className="mt-4 text-lg text-white/65">{t("login.heroLead")}</p>
        </div>
        <p className="relative text-sm text-white/40">{t("login.subtitle")}</p>
      </section>

      <section className="flex flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex justify-end gap-1 text-sm">
            <button
              type="button"
              className={`rounded-full px-2.5 py-1 ${
                i18n.language.startsWith("el") ? "bg-night text-lime font-semibold" : "text-ink/50"
              }`}
              onClick={() => persistLanguage("el")}
            >
              {t("language.el")}
            </button>
            <button
              type="button"
              className={`rounded-full px-2.5 py-1 ${
                i18n.language.startsWith("en") ? "bg-night text-lime font-semibold" : "text-ink/50"
              }`}
              onClick={() => persistLanguage("en")}
            >
              {t("language.en")}
            </button>
          </div>
          <p className="text-sm font-semibold tracking-[0.16em] text-court uppercase lg:hidden">{t("login.kicker")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{t("login.title")}</h2>
          <p className="mt-2 text-sm text-ink/60">{t("login.subtitle")}</p>
          <form
            onSubmit={onSubmit}
            className="mt-8 space-y-4 rounded-3xl border border-ink/6 bg-white p-7 shadow-[0_1px_2px_rgb(6_36_27/0.06),0_16px_40px_rgb(6_36_27/0.08)]"
          >
            <label className="block text-sm font-medium">
              {t("login.club")}
              <select
                className="mt-1.5 w-full rounded-xl border border-ink/10 bg-paper/50 px-3.5 py-2.5 outline-none focus:border-court focus:ring-2 focus:ring-court/20"
                value={clubSlug}
                onChange={(event) => {
                  setClubSlug(event.target.value);
                  if (isDev) {
                    setEmail(`owner@${event.target.value}.local`);
                  }
                }}
              >
                {clubs.map((club) => (
                  <option key={club.slug} value={club.slug}>
                    {club.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">
              {t("login.email")}
              <input
                className="mt-1.5 w-full rounded-xl border border-ink/10 bg-paper/50 px-3.5 py-2.5 outline-none focus:border-court focus:ring-2 focus:ring-court/20"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-medium">
              {t("login.password")}
              <input
                className="mt-1.5 w-full rounded-xl border border-ink/10 bg-paper/50 px-3.5 py-2.5 outline-none focus:border-court focus:ring-2 focus:ring-court/20"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-night px-4 py-3 font-semibold text-lime transition-opacity disabled:opacity-60 hover:bg-night/90"
            >
              {busy ? t("login.busy") : t("login.submit")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
