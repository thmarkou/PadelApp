"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { canAccessDesk } from "@padelapp/shared";
import { persistLanguage } from "../i18n";
import { apiFetch, clearToken, getToken } from "../lib/api";
import type { MeResponse } from "../lib/types";

const LINKS = [
  { href: "/today", key: "nav.dashboard" },
  { href: "/calendar", key: "nav.schedule" },
  { href: "/bookings", key: "nav.bookings" },
  { href: "/players", key: "nav.players" },
  { href: "/courts", key: "nav.courts" },
  { href: "/tournaments", key: "nav.tournaments" },
  { href: "/settings", key: "nav.settings", settingsOnly: true },
] as const;

function canEditSettings(role: MeResponse["user"]["role"]): boolean {
  return role === "owner" || role === "reception";
}

export function DeskShell({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
      return;
    }
    apiFetch<MeResponse>("/me")
      .then((data) => {
        if (!canAccessDesk(data.user.role)) {
          clearToken();
          router.replace("/");
          return;
        }
        setMe(data);
      })
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : t("errors.load"));
      });
  }, [router, t]);

  if (error) {
    return <p className="p-8 text-sm text-red-700">{error}</p>;
  }
  if (!me) {
    return <p className="p-8 text-sm text-ink/60">{t("common.loading")}</p>;
  }

  const links = LINKS.filter((link) => !("settingsOnly" in link && link.settingsOnly) || canEditSettings(me.user.role));

  return (
    <div className="min-h-screen">
      <header className="bg-night text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-lime uppercase">{t("app.name")}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{me.club.name}</p>
            <p className="text-xs text-white/55">
              {me.user.displayName} · {t(`roles.${me.user.role}`)}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <button
              type="button"
              className={`rounded-full px-2.5 py-1 ${
                i18n.language.startsWith("el") ? "bg-white/15 font-semibold text-lime" : "text-white/55"
              }`}
              onClick={() => persistLanguage("el")}
            >
              {t("language.el")}
            </button>
            <button
              type="button"
              className={`rounded-full px-2.5 py-1 ${
                i18n.language.startsWith("en") ? "bg-white/15 font-semibold text-lime" : "text-white/55"
              }`}
              onClick={() => persistLanguage("en")}
            >
              {t("language.en")}
            </button>
            <button
              type="button"
              className="ml-2 rounded-full px-3 py-1 text-white/70 hover:bg-white/10 hover:text-white"
              onClick={() => {
                clearToken();
                router.push("/");
              }}
            >
              {t("nav.logout")}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1.5 px-6 pb-4">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active ? "bg-lime text-night font-semibold" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t(link.key)}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
