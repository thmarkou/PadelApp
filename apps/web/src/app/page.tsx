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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-4 flex justify-end gap-3 text-sm">
        <button
          type="button"
          className={i18n.language.startsWith("el") ? "font-semibold text-court" : "text-ink/60"}
          onClick={() => persistLanguage("el")}
        >
          {t("language.el")}
        </button>
        <button
          type="button"
          className={i18n.language.startsWith("en") ? "font-semibold text-court" : "text-ink/60"}
          onClick={() => persistLanguage("en")}
        >
          {t("language.en")}
        </button>
      </div>
      <p className="text-sm tracking-wide text-court uppercase">{t("login.kicker")}</p>
      <h1 className="mt-2 text-3xl font-semibold">{t("login.title")}</h1>
      <p className="mt-2 text-sm text-ink/70">{t("login.subtitle")}</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <label className="block text-sm">
          {t("login.club")}
          <select
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
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
        <label className="block text-sm">
          {t("login.email")}
          <input
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm">
          {t("login.password")}
          <input
            className="mt-1 w-full rounded-lg border border-ink/15 px-3 py-2"
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
          className="w-full rounded-lg bg-court px-4 py-2.5 text-white disabled:opacity-60"
        >
          {busy ? t("login.busy") : t("login.submit")}
        </button>
      </form>
    </main>
  );
}
