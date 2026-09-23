import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { canManagePlayers } from "@padelapp/shared";
import { isApiError, useSignedIn } from "../auth/AuthProvider";
import { Chip, ChipWrap, Field, SaveButton, StatusText } from "../components/forms";
import {
  cancelBooking,
  canEditCourts,
  canOverridePairing,
  canProposePairing,
  createBooking,
  cyclePairingRequest,
  fetchDaySlots,
  fetchMyPlayer,
  fetchOpenMatches,
  joinBooking,
  joinWaitlist,
  leaveBooking,
  openMatchToSlot,
  proposePairing,
  searchPlayers,
  type ClubPlayer,
  type DaySlot,
} from "../lib/api";
import { slotTimeLabel } from "../lib/dates";
import type { CalendarStackParamList } from "../navigation/types";
import { colors } from "../theme";
import { slotStatusLabel } from "./CalendarScreen";
import { SettingsScroll } from "./settings/form";

type SpotDraft = { name: string; playerId?: string };

export function SlotDetailScreen() {
  const { t } = useTranslation();
  const { token, user, settings } = useSignedIn();
  const route = useRoute<RouteProp<CalendarStackParamList, "SlotDetail">>();
  const { date, courtId, courtName, startsAt, durationMinutes, bookingId } = route.params;
  const [slot, setSlot] = useState<DaySlot | null>(null);
  const [waitlistEnabled, setWaitlistEnabled] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<ClubPlayer[]>([]);
  const [selected, setSelected] = useState<SpotDraft[]>([{ name: user.displayName }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const day = await fetchDaySlots(token, date, durationMinutes);
    const court = day.courts.find((item) => item.id === courtId);
    const fromGrid =
      court?.slots.find((item) => item.startsAt === startsAt || item.startsAt.startsWith(startsAt)) ?? null;
    if (fromGrid) {
      setSlot(fromGrid);
      setWaitlistEnabled(day.waitlistEnabled);
      return;
    }
    const listed = await fetchOpenMatches(token);
    const match =
      listed.matches.find((item) => item.bookingId === bookingId) ??
      listed.matches.find((item) => item.courtId === courtId && item.startsAt.startsWith(startsAt.slice(0, 16)));
    setSlot(match ? openMatchToSlot(match) : null);
    setWaitlistEnabled(day.waitlistEnabled);
  }, [bookingId, courtId, date, durationMinutes, startsAt, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function lookup(value: string) {
    setQuery(value);
    if (value.trim().length === 0) {
      setMatches([]);
      return;
    }
    setMatches(await searchPlayers(token, value));
  }


  const held = Boolean(slot?.booking && slot.booking.spots.length === 0);
  const staff = canEditCourts(user.role) || canManagePlayers(user.role);
  const canJoin = Boolean(
    slot?.booking && slot.booking.openSpots > 0 && (!held || staff),
  );
  const canBook = Boolean(slot && !slot.maintenance && !slot.booking);
  const canCancel = Boolean(slot?.booking && (slot.booking.mine || canEditCourts(user.role)));
  const names = useMemo(() => slot?.booking?.spots.map((spot) => spot.name) ?? [], [slot]);

  async function run(action: () => Promise<void>, okKey: string) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      await action();
      setSaved(t(okKey));
      await load();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  function addSpot(spot: SpotDraft) {
    if (selected.length >= 4) {
      return;
    }
    if (selected.some((item) => item.name.toLowerCase() === spot.name.toLowerCase())) {
      return;
    }
    setSelected([...selected, spot]);
    setQuery("");
    setMatches([]);
  }

  return (
    <SettingsScroll>
      <Text style={styles.kicker}>{courtName}</Text>
      <Text style={styles.title}>
        {slotTimeLabel(startsAt)} · {durationMinutes}′
      </Text>
      <Text style={styles.meta}>{slot ? slotStatusLabel(slot, t) : t("calendar.status.available")}</Text>
      {names.length > 0 ? (
        <Text style={styles.names}>{names.join(" · ")}</Text>
      ) : null}
      {slot?.booking ? (
        <Text style={styles.meta}>
          {t("calendar.filled", { taken: slot.booking.spots.length, total: 4 })}
        </Text>
      ) : null}

      {slot?.booking?.pairing?.matches[0] ? (
        <Text style={styles.pairBox}>
          {t("pairing.pairLine", {
            a: slot.booking.pairing.matches[0].pairA.names.join(" + "),
            aSum: slot.booking.pairing.matches[0].pairA.sum?.toFixed(1) ?? "—",
            b: slot.booking.pairing.matches[0].pairB.names.join(" + "),
            bSum: slot.booking.pairing.matches[0].pairB.sum?.toFixed(1) ?? "—",
          })}
        </Text>
      ) : null}
      {slot?.booking?.pairing ? (
        <Text style={styles.meta}>
          {t(`pairing.algorithm.${slot.booking.pairing.algorithm}`)}
          {slot.booking.pairing.overridden ? ` · ${t("pairing.overridden")}` : ""}
        </Text>
      ) : null}

      {slot?.maintenance ? <Text style={styles.error}>{t("calendar.maintenance")}</Text> : null}

      {(canBook || canJoin) && !slot?.maintenance ? (
        <>
          <Text style={styles.label}>{t("calendar.players")}</Text>
          <Text style={styles.hint}>{t("calendar.playersHint")}</Text>
          <ChipWrap>
            {selected.map((spot) => (
              <Chip
                key={spot.name}
                label={spot.name}
                selected
                onPress={() =>
                  setSelected(selected.filter((item) => item.name !== spot.name))
                }
              />
            ))}
          </ChipWrap>
          <Field
            label={t("calendar.search")}
            value={query}
            onChangeText={(value) => {
              void lookup(value);
            }}
            autoCapitalize="sentences"
          />
          {matches.map((player) => (
            <Pressable key={player.id} onPress={() => addSpot({ name: player.displayName, playerId: player.id })}>
              <Text style={styles.match}>{player.displayName}</Text>
            </Pressable>
          ))}
          {query.trim().length > 0 ? (
            <Pressable onPress={() => addSpot({ name: query.trim() })}>
              <Text style={styles.addNew}>{t("calendar.addNew", { name: query.trim() })}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <StatusText error={error} saved={saved} />

      {slot?.booking && slot.booking.spots.length >= 4 && canProposePairing(user.role) ? (
        <SaveButton
          label={t("pairing.propose")}
          busy={busy}
          onPress={() => {
            const id = slot.booking?.id;
            if (!id) {
              return;
            }
            void run(() => proposePairing(token, id).then(() => undefined), "pairing.proposed");
          }}
        />
      ) : null}
      {slot?.booking?.pairing &&
      canOverridePairing(user.role, settings?.pairing.allowAdminOverride ?? false) ? (
        <Pressable
          style={styles.leave}
          onPress={() => {
            const id = slot.booking?.id;
            if (!id) {
              return;
            }
            void run(() => cyclePairingRequest(token, id).then(() => undefined), "pairing.cycled");
          }}
        >
          <Text style={styles.leaveText}>{t("pairing.cycle")}</Text>
        </Pressable>
      ) : null}

      {canBook ? (
        <SaveButton
          label={t("calendar.book")}
          busy={busy}
          onPress={() => {
            if (selected.length === 0 && !canEditCourts(user.role)) {
              return;
            }
            void run(async () => {
              await createBooking(token, {
                courtId,
                startsAt,
                durationMinutes,
                spots: selected,
              });
            }, "calendar.booked");
          }}
        />
      ) : null}

      {canJoin ? (
        <SaveButton
          label={t("calendar.join")}
          busy={busy}
          onPress={() => {
            void run(async () => {
              if (!slot?.booking) {
                return;
              }
              const me = await fetchMyPlayer(token);
              const namesToAdd = selected.length > 0 ? selected : [{ name: me.displayName, playerId: me.id }];
              for (const spot of namesToAdd) {
                const linked =
                  spot.playerId ??
                  (spot.name === user.displayName || spot.name === me.displayName ? me.id : undefined);
                await joinBooking(token, slot.booking.id, { name: spot.name, playerId: linked });
              }
            }, "calendar.joined");
          }}
        />
      ) : null}

      {slot?.booking && slot.booking.openSpots === 0 && waitlistEnabled ? (
        <SaveButton
          label={t("calendar.waitlist")}
          busy={busy}
          onPress={() => {
            const next = selected[0] ?? { name: user.displayName };
            void run(async () => {
              await joinWaitlist(token, {
                courtId,
                startsAt,
                durationMinutes,
                name: next.name,
                playerId: next.playerId,
              });
            }, "calendar.waitlisted");
          }}
        />
      ) : null}

      {slot?.booking?.meOnBooking ? (
        <Pressable
          style={styles.leave}
          onPress={() => {
            const bookingId = slot.booking?.id;
            if (!bookingId) {
              return;
            }
            void run(() => leaveBooking(token, bookingId), "openMatch.left");
          }}
        >
          <Text style={styles.leaveText}>{t("openMatch.leave")}</Text>
        </Pressable>
      ) : null}

      {canCancel && slot?.booking ? (
        <Pressable
          style={styles.cancel}
          onPress={() => {
            const bookingId = slot.booking?.id;
            if (!bookingId) {
              return;
            }
            void run(() => cancelBooking(token, bookingId), "calendar.cancelled");
          }}
        >
          <Text style={styles.cancelText}>{t("calendar.cancel")}</Text>
        </Pressable>
      ) : null}

      {waitlistEnabled && (slot?.waitlistCount ?? 0) > 0 ? (
        <Text style={styles.meta}>{t("calendar.waitlistCount", { count: slot?.waitlistCount ?? 0 })}</Text>
      ) : null}
      {slot?.waitlist.map((entry) => (
        <Text key={entry.id} style={styles.meta}>
          {entry.guestName}
        </Text>
      ))}
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.green, fontWeight: "600", textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "600", color: colors.ink },
  meta: { color: colors.muted, fontSize: 14 },
  names: { fontSize: 16, color: colors.ink, fontWeight: "600" },
  pairBox: {
    fontSize: 16,
    color: colors.ink,
    fontWeight: "600",
    lineHeight: 24,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 12,
  },
  label: { fontWeight: "600", color: colors.ink },
  hint: { color: colors.muted, lineHeight: 20 },
  match: { paddingVertical: 8, color: colors.ink, fontSize: 16 },
  addNew: { color: colors.green, fontWeight: "600" },
  error: { color: colors.danger },
  leave: {
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveText: { color: colors.green, fontWeight: "600" },
  cancel: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: colors.danger, fontWeight: "600" },
});
