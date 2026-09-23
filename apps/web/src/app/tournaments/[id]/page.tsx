"use client";

import { groupSlotsByDate, type TournamentStatus } from "@padelapp/shared";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CategoryDesk } from "../../../components/CategoryDesk";
import { DeskShell } from "../../../components/DeskShell";
import { apiFetch } from "../../../lib/api";
import type { TournamentDetailPayload } from "../../../lib/types";

const STATUSES: TournamentStatus[] = ["draft", "open", "running", "closed"];

export default function TournamentDeskPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<TournamentDetailPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setData(await apiFetch<TournamentDetailPayload>(`/tournaments/${params.id}`));
  }, [params.id]);

  useEffect(() => {
    load().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : t("errors.load"));
    });
  }, [load, t]);

  async function setStatus(status: TournamentStatus): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/tournaments/${params.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeskShell>
      <Link href="/tournaments" className="text-sm text-court underline">
        {t("common.back")}
      </Link>
      {!data ? (
        <p className="mt-6 text-sm text-ink/55">{t("common.loading")}</p>
      ) : (
        <>
          <h1 className="mt-3 text-3xl font-semibold">{data.tournament.name}</h1>
          <p className="mt-2 text-sm text-ink/65">{t("tournaments.deskLead")}</p>
          <p className="mt-2 text-sm text-ink/55">
            {data.tournament.startsOn} · {data.tournament.format} ·{" "}
            {t(`tournaments.statuses.${data.tournament.status}`)}
          </p>
          {data.tournament.playSlots && data.tournament.playSlots.length > 0 ? (
            <div className="mt-3 space-y-1 text-sm text-ink/65">
              <p className="font-medium">{t("tournaments.playDays")}</p>
              {groupSlotsByDate(data.tournament.playSlots).map((group) => (
                <p key={group.date}>
                  {group.date}: {group.slots.map((slot) => `${slot.start}–${slot.end}`).join(" · ")}
                </p>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy || data.tournament.status === status}
                className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm disabled:bg-court disabled:text-white"
                onClick={() => {
                  void setStatus(status);
                }}
              >
                {t(`tournaments.statuses.${status}`)}
              </button>
            ))}
          </div>
          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
          <div className="mt-8 space-y-6">
            {data.categories.map((category) => (
              <CategoryDesk
                key={category.id}
                categoryId={category.id}
                closed={data.tournament.status === "closed"}
              />
            ))}
          </div>
        </>
      )}
    </DeskShell>
  );
}
