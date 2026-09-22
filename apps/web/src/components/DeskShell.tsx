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
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <p className="text-xs tracking-wide text-court uppercase">{t("app.name")}</p>
            <p className="text-lg font-semibold">{me.club.name}</p>
            <p className="text-xs text-ink/55">
              {me.user.displayName} · {t(`roles.${me.user.role}`)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
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
            <button
              type="button"
              className="text-ink/70 underline"
              onClick={() => {
                clearToken();
                router.push("/");
              }}
            >
              {t("nav.logout")}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-1 px-6 pb-3">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  active ? "bg-court text-white" : "text-ink/70 hover:bg-ink/5"
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
