import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSignedIn } from "../auth/AuthProvider";
import { MonthCalendar, monthDayColors } from "../components/MonthCalendar";
import { Chip, ChipWrap } from "../components/forms";
import { bookingDisplayKind } from "@padelapp/shared";
import {
  fetchDaySlots,
  type DayCourt,
  type DaySlot,
  type DaySlotsResponse,
} from "../lib/api";
import { addIsoDays, formatDayHeading, slotTimeLabel, todayIsoDate } from "../lib/dates";
import type { CalendarStackParamList } from "../navigation/types";
import { colors } from "../theme";

function slotHasBooking(slot: DaySlot): boolean {
  return Boolean(slot.booking) || slot.maintenance;
}

export function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const tablet = width >= 768;
  const { token, settings } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<CalendarStackParamList>>();
  const templates = settings?.slotTemplates.map((slot) => slot.durationMinutes) ?? [90];
  const defaultDuration = settings?.defaultSlotDurationMinutes ?? templates[0] ?? 90;
  const [date, setDate] = useState(todayIsoDate);
  const [duration, setDuration] = useState(defaultDuration);
  const [day, setDay] = useState<DaySlotsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [monthRevision, setMonthRevision] = useState(0);
  const [showFreeSlots, setShowFreeSlots] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDay(await fetchDaySlots(token, date));
      setMonthRevision((current) => current + 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    }
  }, [date, t, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dayHasBookings = useMemo(() => {
    if (!day) {
      return false;
    }
    return day.courts.some((court) => court.slots.some((slot) => slot.booking));
  }, [day]);

  useEffect(() => {
    setShowFreeSlots(!dayHasBookings);
  }, [date, dayHasBookings]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={styles.lead}>{t("calendar.lead")}</Text>
      <MonthCalendar token={token} date={date} onSelect={setDate} revision={monthRevision} />

      <View style={styles.dayBar}>
        <Pressable onPress={() => setDate(addIsoDays(date, -1))} style={styles.dayBtn}>
          <Text style={styles.dayBtnText}>‹</Text>
        </Pressable>
        <View style={styles.dayCenter}>
          <Text style={styles.dayHeading}>{formatDayHeading(date, i18n.language)}</Text>
          {date !== todayIsoDate() ? (
            <Pressable onPress={() => setDate(todayIsoDate())}>
              <Text style={styles.todayLink}>{t("calendar.today")}</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => setDate(addIsoDays(date, 1))} style={styles.dayBtn}>
          <Text style={styles.dayBtnText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.durationRow}>
        <Text style={styles.label}>{t("calendar.duration")}</Text>
        <ChipWrap>
          {templates.map((minutes) => (
            <Chip
              key={minutes}
              label={`${minutes}′`}
              selected={duration === minutes}
              onPress={() => setDuration(minutes)}
            />
          ))}
        </ChipWrap>
      </View>

      {dayHasBookings ? (
        <Pressable onPress={() => setShowFreeSlots((current) => !current)} style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {showFreeSlots ? t("calendar.hideFreeSlots") : t("calendar.showAllSlots")}
          </Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!day ? (
        <Text style={styles.muted}>{t("common.loading")}</Text>
      ) : day.courts.length === 0 ? (
        <Text style={styles.muted}>{t("calendar.noCourts")}</Text>
      ) : (
        <View style={tablet ? styles.tabletRow : undefined}>
          {day.courts.map((court) => (
            <View key={court.id} style={tablet ? styles.tabletCourt : undefined}>
              <CourtRow
                court={court}
                showFreeSlots={showFreeSlots}
                onPressSlot={(slot) =>
                  navigation.navigate("SlotDetail", {
                    date,
                    courtId: court.id,
                    courtName: court.name,
                    startsAt: slot.startsAt,
                    durationMinutes: duration,
                  })
                }
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function CourtRow({
  court,
  showFreeSlots,
  onPressSlot,
}: {
  court: DayCourt;
  showFreeSlots: boolean;
  onPressSlot: (slot: DaySlot) => void;
}) {
  const { t } = useTranslation();
  const booked = court.slots.filter(slotHasBooking);
  const free = court.slots.filter((slot) => !slotHasBooking(slot));

  if (!showFreeSlots && booked.length === 0) {
    return null;
  }

  return (
    <View style={styles.court}>
      <Text style={styles.courtName}>
        {court.name} · {t(`courts.${court.kind}`)}
      </Text>
      {!showFreeSlots ? (
        <>
          <Text style={styles.sectionLabel}>{t("calendar.bookingsSection")}</Text>
          <View style={styles.slots}>
            {booked.map((slot) => (
              <SlotChip key={slot.startsAt} slot={slot} onPress={() => onPressSlot(slot)} />
            ))}
          </View>
        </>
      ) : (
        <>
          {booked.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>{t("calendar.bookingsSection")}</Text>
              <View style={styles.slots}>
                {booked.map((slot) => (
                  <SlotChip key={slot.startsAt} slot={slot} onPress={() => onPressSlot(slot)} />
                ))}
              </View>
            </>
          ) : null}
          {free.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>{t("calendar.freeSection")}</Text>
              <View style={styles.slots}>
                {free.map((slot) => (
                  <SlotChip key={slot.startsAt} slot={slot} onPress={() => onPressSlot(slot)} />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function SlotChip({ slot, onPress }: { slot: DaySlot; onPress: () => void }) {
  const { t } = useTranslation();
  const status = slotStatus(slot);
  const tone = statusStyle(status);
  const lightText = status === "full" || status === "mine";
  const label = slotStatusLabel(slot, t);
  return (
    <Pressable onPress={onPress} style={[styles.slot, tone]}>
      <Text style={[styles.slotTime, lightText ? styles.slotTextLight : null]}>{slotTimeLabel(slot.startsAt)}</Text>
      <Text style={[styles.slotMeta, lightText ? styles.slotTextLight : null]}>{label}</Text>
    </Pressable>
  );
}

export function slotStatus(
  slot: DaySlot,
): "maintenance" | "available" | "held" | "open" | "full" | "mine" {
  if (slot.maintenance) {
    return "maintenance";
  }
  if (!slot.booking) {
    return "available";
  }
  if (slot.booking.spots.length === 0) {
    return "held";
  }
  const kind = bookingDisplayKind(slot.booking.spots.length);
  if (kind === "full" && slot.booking.mine) {
    return "mine";
  }
  return kind;
}

export function slotStatusLabel(
  slot: DaySlot,
  translate: (key: string) => string,
): string {
  const status = slotStatus(slot);
  if (status === "open" && slot.booking?.mine) {
    return translate("calendar.status.mineOpen");
  }
  if (status === "held" && slot.booking?.mine) {
    return translate("calendar.status.mineHeld");
  }
  return translate(`calendar.status.${status}`);
}

function statusStyle(status: ReturnType<typeof slotStatus>) {
  if (status === "available") {
    return { backgroundColor: "#E7F4EC", borderColor: colors.green };
  }
  if (status === "held" || status === "open") {
    return { backgroundColor: monthDayColors.openBg, borderColor: monthDayColors.openBorder };
  }
  if (status === "full" || status === "mine") {
    return { backgroundColor: monthDayColors.readyBg, borderColor: monthDayColors.readyBorder };
  }
  if (status === "maintenance") {
    return { backgroundColor: colors.line, borderColor: colors.line };
  }
  return { backgroundColor: colors.white, borderColor: colors.line };
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  lead: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  dayBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dayBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  dayBtnText: { fontSize: 26, color: colors.green, fontWeight: "600" },
  dayCenter: { flex: 1, alignItems: "center", gap: 2 },
  dayHeading: { fontSize: 15, fontWeight: "600", color: colors.ink, textAlign: "center", textTransform: "capitalize" },
  todayLink: { color: colors.green, fontWeight: "600", fontSize: 13 },
  durationRow: { gap: 8 },
  label: { fontWeight: "600", color: colors.ink, fontSize: 14 },
  toggleRow: { alignSelf: "flex-start" },
  toggleText: { color: colors.green, fontWeight: "600", fontSize: 14, textDecorationLine: "underline" },
  muted: { color: colors.muted },
  error: { color: colors.danger },
  tabletRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  tabletCourt: { flex: 1, minWidth: 220 },
  court: { gap: 8, marginTop: 4 },
  courtName: { fontSize: 16, fontWeight: "600", color: colors.ink },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.4 },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slot: {
    width: "30%",
    minWidth: 96,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  slotTime: { fontWeight: "700", color: colors.ink, fontSize: 14 },
  slotMeta: { marginTop: 2, fontSize: 11, color: colors.ink },
  slotTextLight: { color: colors.white },
});
