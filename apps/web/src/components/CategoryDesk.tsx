"use client";

import {
  eligibleForCategory,
  playerAge,
  playingLevel,
  type CategoryEligibility,
  type Player,
  type PlayerGender,
  type TournamentCategory,
} from "@padelapp/shared";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../lib/api";
import type { CategoryDetail, PlayersPayload, TournamentEntry, TournamentMatchView } from "../lib/types";

function genderLabel(gender: Player["gender"], t: (key: string) => string): string {
  return gender ? t(`players.${gender}`) : t("players.genderUnknown");
}

function rejectText(
  reason: Exclude<CategoryEligibility["reason"], "ok">,
  player: Player,
  category: TournamentCategory,
  t: (key: string, options?: Record<string, string | number>) => string,
): string {
  const age = playerAge(player.birthYear);
  const level = playingLevel(player.selfLevel, player.confirmedLevel);
  return t(`tournaments.eligibility.${reason}`, {
    name: player.displayName,
    gender: genderLabel(player.gender, t),
    category: category.name,
    need: t(`tournaments.needGender.${category.gender}`),
    age: age === null ? "—" : age,
    ages: `${category.minAge ?? "–"}–${category.maxAge ?? "–"}`,
    level: level === null ? "—" : level,
    levels: `${category.minLevel ?? "–"}–${category.maxLevel ?? "–"}`,
  });
}

function categoryAccepts(category: TournamentCategory, t: (key: string) => string): string {
  const parts = [t(`tournaments.genders.${category.gender}`)];
  if (category.minAge !== null || category.maxAge !== null) {
    parts.push(`${category.minAge ?? "–"}–${category.maxAge ?? "–"}`);
  }
  if (category.minLevel !== null || category.maxLevel !== null) {
    parts.push(`${category.minLevel ?? "–"}–${category.maxLevel ?? "–"}`);
  }
  return parts.join(" · ");
}

function sittingOut(detail: CategoryDetail): TournamentEntry[] {
  const last = detail.rounds.at(-1);
  if (!last) {
    return [];
  }
  const playing = new Set(
    last.matches
      .flatMap((match) => [match.playerIds.a1, match.playerIds.a2, match.playerIds.b1, match.playerIds.b2])
      .filter((id): id is string => Boolean(id)),
  );
  return detail.entries.filter((entry) => !playing.has(entry.playerId));
}

function pairSlots(match: TournamentMatchView): Array<{ names: string[]; ids: Array<string | null> }> {
  return [
    { names: match.pairA, ids: [match.playerIds.a1, match.playerIds.a2] },
    { names: match.pairB, ids: [match.playerIds.b1, match.playerIds.b2] },
  ];
}

export function CategoryDesk({ categoryId, closed }: { categoryId: string; closed: boolean }) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Player[]>([]);
  const [searched, setSearched] = useState(false);
  const [scores, setScores] = useState<Record<string, { a: string; b: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const loaded = await apiFetch<CategoryDetail>(`/categories/${categoryId}`);
    setDetail(loaded);
    setScores((current) => {
      const next = { ...current };
      for (const round of loaded.rounds) {
        for (const match of round.matches) {
          if (!next[match.id]) {
            next[match.id] = {
              a: match.scoreA === null ? "" : String(match.scoreA),
              b: match.scoreB === null ? "" : String(match.scoreB),
            };
          }
        }
      }
      return next;
    });
  }, [categoryId]);

  useEffect(() => {
    load().catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : t("errors.load"));
    });
  }, [load, t]);

  async function run(action: () => Promise<string>): Promise<void> {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      setNote(await action());
      await load();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  const search = useCallback(async () => {
    const term = query.trim();
    const taken = new Set((detail?.entries ?? []).map((entry) => entry.playerId));
    const path = term.length > 0 ? `/players?q=${encodeURIComponent(term)}` : "/players";
    const data = await apiFetch<PlayersPayload>(path);
    setHits(data.players.filter((player) => !taken.has(player.id)));
    setSearched(true);
  }, [detail?.entries, query]);

  if (!detail) {
    return error ? (
      <p className="text-sm text-red-700">{error}</p>
    ) : (
      <p className="text-sm text-ink/55">{t("common.loading")}</p>
    );
  }

  const hasScore = detail.rounds.some((round) =>
    round.matches.some((match) => match.scoreA !== null && match.scoreB !== null),
  );
  const entriesLocked = closed || hasScore;
  const leftover = sittingOut(detail);
  const incoming = leftover.length === 1 ? leftover[0] : null;
  const lastRound = detail.rounds.at(-1);
  const lastComplete = Boolean(
    lastRound &&
      lastRound.matches.length > 0 &&
      lastRound.matches.every((match) => match.scoreA !== null && match.scoreB !== null),
  );
  const lastHasClosed = Boolean(lastRound?.matches.some((match) => match.closed));
  const canOpenRound = !closed && !lastHasClosed && (!lastRound || lastComplete);
  const mixed = detail.category.gender === "mixed_doubles";

  async function generateRound(replacePlayerId?: string): Promise<string> {
    const result = await apiFetch<{ leftover: Array<{ name: string }>; round: number }>(
      `/categories/${categoryId}/rounds`,
      {
        method: "POST",
        body: JSON.stringify(replacePlayerId ? { replacePlayerId } : {}),
      },
    );
    return result.leftover.length > 0
      ? t("tournaments.roundLeftover", {
          round: result.round,
          names: result.leftover.map((item) => item.name).join(", "),
        })
      : t("tournaments.roundOk", { round: result.round });
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">{detail.category.name}</h2>
      <p className="mt-1 text-sm text-ink/55">
        {t("tournaments.accepts", { rule: categoryAccepts(detail.category, t) })}
      </p>
      <p className="mt-1 text-sm text-ink/55">{t("tournaments.whoFits")}</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {note ? <p className="mt-3 text-sm text-court">{note}</p> : null}

      <h3 className="mt-5 text-sm font-semibold">{t("tournaments.entries")}</h3>
      {detail.entries.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">{t("tournaments.noEntries")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10">
          {detail.entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span>
                {entry.displayName}
                {` · ${genderLabel(entry.gender, t)}`}
                {entry.level !== null ? ` · ${entry.level.toFixed(1)}` : ""}
              </span>
              {!entriesLocked ? (
                <button
                  type="button"
                  className="text-red-700 underline"
                  disabled={busy}
                  onClick={() => {
                    void run(async () => {
                      await apiFetch(`/entries/${entry.id}`, { method: "DELETE" });
                      return t("tournaments.unregistered");
                    });
                  }}
                >
                  {t("tournaments.unregister")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {hasScore && !closed ? (
        <p className="mt-3 text-sm text-ink/55">{t("tournaments.entriesLocked")}</p>
      ) : !closed ? (
        <p className="mt-3 text-sm text-ink/55">{t("tournaments.swapHint")}</p>
      ) : null}

      {!entriesLocked ? (
        <div className="mt-3">
          <label className="block text-sm">
            {t("tournaments.addPlayer")}
            <div className="mt-1 flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-lg border border-ink/15 px-3 py-2"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value.trim().length === 0) {
                    setHits([]);
                    setSearched(false);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void search().catch((caught: unknown) => {
                      setError(caught instanceof Error ? caught.message : t("errors.internal"));
                    });
                  }
                }}
                placeholder={t("players.search")}
              />
              <button
                type="button"
                className="rounded-lg bg-court px-3 py-2 text-sm text-white"
                onClick={() => {
                  void search().catch((caught: unknown) => {
                    setError(caught instanceof Error ? caught.message : t("errors.internal"));
                  });
                }}
              >
                {t("players.search")}
              </button>
              {searched ? (
                <button
                  type="button"
                  className="rounded-lg border border-ink/15 px-3 py-2 text-sm"
                  onClick={() => {
                    setHits([]);
                    setSearched(false);
                  }}
                >
                  {t("common.close")}
                </button>
              ) : null}
            </div>
          </label>
          {searched && hits.length === 0 ? (
            <p className="mt-2 text-sm text-ink/55">{t("tournaments.noHits")}</p>
          ) : hits.length > 0 ? (
            <ul className="mt-2 divide-y divide-ink/10 rounded-lg border border-ink/10">
              {hits.map((hit) => {
                const check = eligibleForCategory(hit, detail.category);
                const level = playingLevel(hit.selfLevel, hit.confirmedLevel);
                const genders: PlayerGender[] =
                  detail.category.gender === "men"
                    ? ["male"]
                    : detail.category.gender === "women"
                      ? ["female"]
                      : ["male", "female"];
                return (
                  <li key={hit.id} className="px-3 py-2 text-sm">
                    <div>
                      {hit.displayName}
                      {` · ${genderLabel(hit.gender, t)}`}
                      {level !== null ? ` · ${level.toFixed(1)}` : ""}
                    </div>
                    {check.ok ? (
                      <button
                        type="button"
                        className="mt-1 text-court underline disabled:opacity-60"
                        disabled={busy}
                        onClick={() => {
                          void run(async () => {
                            await apiFetch(`/categories/${categoryId}/entries`, {
                              method: "POST",
                              body: JSON.stringify({ playerId: hit.id }),
                            });
                            setQuery("");
                            setHits([]);
                            setSearched(false);
                            return t("tournaments.registered");
                          });
                        }}
                      >
                        {t("tournaments.register")}
                      </button>
                    ) : check.reason === "gender_missing" ? (
                      <div className="mt-1">
                        <p className="text-xs text-ink/55">{rejectText(check.reason, hit, detail.category, t)}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                        {genders.map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="text-court underline disabled:opacity-60"
                            disabled={busy}
                            onClick={() => {
                              void run(async () => {
                                await apiFetch(`/players/${hit.id}`, {
                                  method: "PATCH",
                                  body: JSON.stringify({ gender: value }),
                                });
                                await apiFetch(`/categories/${categoryId}/entries`, {
                                  method: "POST",
                                  body: JSON.stringify({ playerId: hit.id }),
                                });
                                setQuery("");
                                setHits([]);
                                setSearched(false);
                                return t("tournaments.registered");
                              });
                            }}
                          >
                            {t("tournaments.setAs", { gender: t(`players.${value}`) })}
                          </button>
                        ))}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-ink/55">
                        {check.reason === "ok"
                          ? ""
                          : rejectText(check.reason, hit, detail.category, t)}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {detail.standings.length > 0 ? (
        <>
          <h3 className="mt-5 text-sm font-semibold">{t("tournaments.standings")}</h3>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {detail.standings.map((row) => (
              <li key={row.playerId}>
                {row.name} · {row.points} · {t("tournaments.wins", { count: row.wins })}
              </li>
            ))}
          </ol>
        </>
      ) : null}

      {canOpenRound && incoming && lastRound ? (
        <div className="mt-5">
          <p className="text-sm font-medium">{t("tournaments.rotatePick", { name: incoming.displayName })}</p>
          <div className="mt-3 space-y-3">
            {lastRound.matches.map((match) => (
              <div key={match.id} className="space-y-2">
                {pairSlots(match).map((pair) => (
                  <div key={pair.names.join("-")} className="rounded-lg border border-ink/10 px-3 py-2">
                    <p className="text-xs text-ink/55">{pair.names.join(" / ")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pair.ids.map((id, index) => {
                        const name = pair.names[index];
                        if (!id || !name) {
                          return null;
                        }
                        const sitting = detail.entries.find((entry) => entry.playerId === id);
                        if (mixed && incoming.gender && sitting?.gender && incoming.gender !== sitting.gender) {
                          return null;
                        }
                        return (
                          <button
                            key={id}
                            type="button"
                            className="rounded-lg bg-court px-3 py-1.5 text-sm text-white disabled:opacity-60"
                            disabled={busy}
                            onClick={() => {
                              void run(() => generateRound(id));
                            }}
                          >
                            {t("tournaments.rotateSit", { name })}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : canOpenRound ? (
        <button
          type="button"
          className="mt-5 rounded-lg bg-court px-4 py-2 text-sm text-white disabled:opacity-60"
          disabled={busy}
          onClick={() => {
            void run(() => generateRound());
          }}
        >
          {t("tournaments.generateRound")}
        </button>
      ) : lastHasClosed && !closed ? (
        <p className="mt-5 text-sm text-ink/55">{t("tournaments.matchClosed")}</p>
      ) : !closed && lastRound ? (
        <p className="mt-5 text-sm text-ink/55">{t("tournaments.waitScore")}</p>
      ) : null}

      {!closed && lastRound && lastRound.matches.length > 1 ? (
        <p className="mt-2 text-sm text-ink/55">{t("tournaments.closeWhich")}</p>
      ) : !closed && detail.rounds.length > 0 ? (
        <p className="mt-2 text-sm text-ink/55">{t("tournaments.noRoundCap")}</p>
      ) : null}

      {!closed && detail.entries.length >= 5 && !incoming ? (
        <p className="mt-2 text-sm text-ink/55">{t("tournaments.rotateHint")}</p>
      ) : null}

      {detail.rounds.map((round) => (
        <div key={round.id} className="mt-5">
          <h3 className="text-sm font-semibold">{t("tournaments.round", { number: round.number })}</h3>
          <ul className="mt-2 space-y-3">
            {round.matches.map((match) => {
              const isLast = lastRound?.id === round.id;
              const locked = closed || match.closed;
              return (
              <li key={match.id} className="rounded-lg border border-ink/10 px-3 py-3 text-sm">
                <p className="font-medium">
                  {match.pairA.join(" / ") || "—"} vs {match.pairB.join(" / ") || "—"}
                </p>
                {locked ? (
                  <p className="mt-1 text-ink/70">
                    {match.scoreA ?? "—"} – {match.scoreB ?? "—"}
                    {match.closed ? ` · ${t("tournaments.matchClosed")}` : ""}
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      className="w-16 rounded-lg border border-ink/15 px-2 py-1"
                      inputMode="numeric"
                      value={scores[match.id]?.a ?? ""}
                      onChange={(event) =>
                        setScores((current) => ({
                          ...current,
                          [match.id]: { a: event.target.value, b: current[match.id]?.b ?? "" },
                        }))
                      }
                    />
                    <span>–</span>
                    <input
                      className="w-16 rounded-lg border border-ink/15 px-2 py-1"
                      inputMode="numeric"
                      value={scores[match.id]?.b ?? ""}
                      onChange={(event) =>
                        setScores((current) => ({
                          ...current,
                          [match.id]: { a: current[match.id]?.a ?? "", b: event.target.value },
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="rounded-lg bg-court px-3 py-1 text-white disabled:opacity-60"
                      disabled={busy}
                      onClick={() => {
                        const draft = scores[match.id];
                        const scoreA = Number(draft?.a);
                        const scoreB = Number(draft?.b);
                        if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
                          setError(t("tournaments.invalidScore"));
                          return;
                        }
                        void run(async () => {
                          await apiFetch(`/matches/${match.id}/score`, {
                            method: "POST",
                            body: JSON.stringify({ scoreA, scoreB }),
                          });
                          return t("tournaments.scoreSaved");
                        });
                      }}
                    >
                      {t("tournaments.saveScore")}
                    </button>
                    {isLast ? (
                      <button
                        type="button"
                        className="rounded-lg border border-ink/15 px-3 py-1 disabled:opacity-60"
                        disabled={busy}
                        onClick={() => {
                          void run(async () => {
                            await apiFetch(`/matches/${match.id}/close`, { method: "POST" });
                            return t("tournaments.matchClosed");
                          });
                        }}
                      >
                        {t("tournaments.closeMatch")}
                      </button>
                    ) : null}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
