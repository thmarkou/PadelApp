"use client";

import { playingLevel } from "@padelapp/shared";
import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { apiFetch } from "../lib/api";
import type { PlayersPayload } from "../lib/types";

export type PlayerSpot = { name: string; playerId?: string };

export type PlayerPickerHandle = {
  takeSpots: () => PlayerSpot[];
  focus: () => void;
};

type PlayerHit = PlayersPayload["players"][number];

function sameSpot(left: PlayerSpot, right: PlayerSpot): boolean {
  if (left.playerId && right.playerId) {
    return left.playerId === right.playerId;
  }
  return left.name.toLowerCase() === right.name.toLowerCase();
}

export const PlayerPicker = forwardRef<
  PlayerPickerHandle,
  {
    selected: PlayerSpot[];
    onChange: (spots: PlayerSpot[]) => void;
    max?: number;
    autoFocus?: boolean;
    compact?: boolean;
  }
>(function PlayerPicker({ selected, onChange, max = 4, autoFocus = false, compact = false }, ref) {
  const { t } = useTranslation();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const selectedRef = useRef(selected);
  const queryRef = useRef("");
  const hitsRef = useRef<PlayerHit[]>([]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlayerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const full = selected.length >= max;
  const trimmed = query.trim();
  selectedRef.current = selected;
  queryRef.current = query;
  hitsRef.current = hits;

  const visible = hits.filter(
    (player) =>
      !selected.some((spot) => sameSpot(spot, { name: player.displayName, playerId: player.id })),
  );
  const exactHit = visible.find((player) => player.displayName.toLowerCase() === trimmed.toLowerCase());
  const canAddNew =
    trimmed.length > 0 &&
    !exactHit &&
    !selected.some((spot) => spot.name.toLowerCase() === trimmed.toLowerCase()) &&
    !full;

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      setOpen(true);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (!open || full) {
      return;
    }
    const handle = window.setTimeout(() => {
      const path = trimmed.length > 0 ? `/players?q=${encodeURIComponent(trimmed)}` : "/players";
      apiFetch<PlayersPayload>(path)
        .then((data) => {
          setHits(data.players);
          setError(null);
        })
        .catch((caught: unknown) => {
          setHits([]);
          setError(caught instanceof Error ? caught.message : t("errors.load"));
        });
    }, trimmed.length > 0 ? 150 : 0);
    return () => window.clearTimeout(handle);
  }, [full, open, t, trimmed]);

  useLayoutEffect(() => {
    if (!open || full) {
      setMenuBox(null);
      return;
    }
    function place() {
      const box = inputRef.current?.getBoundingClientRect();
      if (!box) {
        return;
      }
      setMenuBox({ top: box.bottom + 4, left: box.left, width: Math.max(box.width, 240) });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [full, open, query, selected.length]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function commit(spot: PlayerSpot): PlayerSpot[] {
    const current = selectedRef.current;
    if (current.length >= max || current.some((item) => sameSpot(item, spot))) {
      return current;
    }
    const next = [...current, spot];
    onChange(next);
    setQuery("");
    queryRef.current = "";
    setOpen(false);
    return next;
  }

  function flush(): PlayerSpot[] {
    const text = queryRef.current.trim();
    const current = selectedRef.current;
    if (text.length === 0) {
      return current;
    }
    const leftover = hitsRef.current.filter(
      (player) => !current.some((spot) => sameSpot(spot, { name: player.displayName, playerId: player.id })),
    );
    const match = leftover.find((player) => player.displayName.toLowerCase() === text.toLowerCase()) ?? leftover[0];
    if (match) {
      return commit({ name: match.displayName, playerId: match.id });
    }
    if (!current.some((spot) => spot.name.toLowerCase() === text.toLowerCase()) && current.length < max) {
      return commit({ name: text });
    }
    return current;
  }

  useImperativeHandle(ref, () => ({
    takeSpots: flush,
    focus: () => {
      inputRef.current?.focus();
      setOpen(true);
    },
  }));

  const showMenu = open && !full && Boolean(menuBox) && (visible.length > 0 || canAddNew);

  return (
    <div ref={rootRef} className={`relative ${compact ? "min-w-52 flex-1" : "min-w-64 flex-1"}`}>
      <label className={compact ? "sr-only" : "text-sm"} htmlFor={listId}>
        {t("schedule.players")}
      </label>
      <input
        ref={inputRef}
        id={listId}
        className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 outline-none focus:border-court focus:ring-2 focus:ring-court/20"
        value={query}
        autoComplete="off"
        disabled={full}
        placeholder={full ? t("schedule.fullFoursome") : t("schedule.search")}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key !== "Enter") {
            return;
          }
          event.preventDefault();
          flush();
        }}
      />
      {selected.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((spot) => (
            <button
              key={`${spot.playerId ?? "guest"}:${spot.name}`}
              type="button"
              className="rounded-full bg-night px-3 py-1 text-sm text-lime"
              onClick={() => onChange(selected.filter((item) => !sameSpot(item, spot)))}
            >
              {spot.name} ×
            </button>
          ))}
        </div>
      ) : null}
      {compact ? null : <p className="mt-1 text-xs text-ink/55">{t("schedule.playersHint")}</p>}
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      {showMenu && menuBox && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={menuRef}
              className="fixed z-80 max-h-64 overflow-auto rounded-xl border border-ink/10 bg-white shadow-lg"
              style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
            >
              {visible.map((player) => {
                const level = playingLevel(player.selfLevel, player.confirmedLevel);
                return (
                  <li key={player.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-paper"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => commit({ name: player.displayName, playerId: player.id })}
                    >
                      <span className="font-medium">{player.displayName}</span>
                      <span className="text-ink/45">{level ?? "—"}</span>
                    </button>
                  </li>
                );
              })}
              {canAddNew ? (
                <li>
                  <button
                    type="button"
                    className="w-full px-3.5 py-2.5 text-left text-sm font-medium text-court hover:bg-paper"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit({ name: trimmed })}
                  >
                    {t("schedule.addNew", { name: trimmed })}
                  </button>
                </li>
              ) : null}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
});
