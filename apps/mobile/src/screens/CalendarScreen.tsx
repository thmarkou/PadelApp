import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSignedIn } from "../auth/AuthProvider";
import { Chip, ChipWrap } from "../components/forms";
import {
  fetchDaySlots,
  type DayCourt,
  type DaySlot,
  type DaySlotsResponse,
} from "../lib/api";
import { addIsoDays, slotTimeLabel, todayIsoDate } from "../lib/dates";
import type { CalendarStackParamList } from "../navigation/types";
import { colors } from "../theme";

export function CalendarScreen() {
  const { t } = useTranslation();
  const { token, settings } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<CalendarStackParamList>>();
  const templates = settings?.slotTemplates.map((slot) => slot.durationMinutes) ?? [90];
  const defaultDuration = settings?.defaultSlotDurationMinutes ?? templates[0] ?? 90;
  const [date, setDate] = useState(todayIsoDate);
  const [duration, setDuration] = useState(defaultDuration);
  const [day, setDay] = useState<DaySlotsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDay(await fetchDaySlots(token, date, duration));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    }
  }, [date, duration, t, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
      <Pressable onPress={() => navigation.navigate("OpenMatches")}>
        <Text style={styles.today}>{t("openMatch.openList")}</Text>
      </Pressable>
      <View style={styles.dayRow}>
        <Pressable onPress={() => setDate(addIsoDays(date, -1))} style={styles.dayBtn}>
          <Text style={styles.dayBtnText}>‹</Text>
        </Pressable>
        <Text style={styles.date}>{date}</Text>
        <Pressable onPress={() => setDate(addIsoDays(date, 1))} style={styles.dayBtn}>
          <Text style={styles.dayBtnText}>›</Text>
        </Pressable>
      </View>
      <Pressable onPress={() => setDate(todayIsoDate())}>
        <Text style={styles.today}>{t("calendar.today")}</Text>
      </Pressable>
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
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!day ? (
        <Text style={styles.muted}>{t("common.loading")}</Text>
      ) : day.courts.length === 0 ? (
        <Text style={styles.muted}>{t("calendar.noCourts")}</Text>
      ) : (
        day.courts.map((court) => (
          <CourtRow
            key={court.id}
            court={court}
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
        ))
      )}
    </ScrollView>
  );
}

function CourtRow({
  court,
  onPressSlot,
}: {
  court: DayCourt;
  onPressSlot: (slot: DaySlot) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.court}>
      <Text style={styles.courtName}>{court.name}</Text>
      <View style={styles.slots}>
        {court.slots.map((slot) => {
          const status = slotStatus(slot);
          return (
            <Pressable
              key={slot.startsAt}
              onPress={() => onPressSlot(slot)}
              style={[styles.slot, statusStyle(status)]}
            >
              <Text style={styles.slotTime}>{slotTimeLabel(slot.startsAt)}</Text>
              <Text style={styles.slotMeta}>{t(`calendar.status.${status}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function slotStatus(slot: DaySlot): "maintenance" | "available" | "open" | "full" | "mine" {
  if (slot.maintenance) {
    return "maintenance";
  }
  if (slot.booking?.mine) {
    return "mine";
  }
  if (!slot.booking) {
    return "available";
  }
  if (slot.booking.openSpots > 0) {
    return "open";
  }
  return "full";
}

function statusStyle(status: ReturnType<typeof slotStatus>) {
  if (status === "available") {
    return { backgroundColor: "#E7F4EC", borderColor: colors.green };
  }
  if (status === "open") {
    return { backgroundColor: "#F8EBD9", borderColor: colors.amber };
  }
  if (status === "mine") {
    return { backgroundColor: colors.green, borderColor: colors.green };
  }
  if (status === "maintenance") {
    return { backgroundColor: colors.line, borderColor: colors.line };
  }
  return { backgroundColor: colors.white, borderColor: colors.line };
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 16, paddingBottom: 40, gap: 10 },
  lead: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  dayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayBtn: { padding: 8, minWidth: 44, alignItems: "center" },
  dayBtnText: { fontSize: 28, color: colors.green },
  date: { fontSize: 20, fontWeight: "600", color: colors.ink },
  today: { color: colors.green, fontWeight: "600", textAlign: "center" },
  label: { fontWeight: "600", color: colors.ink },
  muted: { color: colors.muted },
  error: { color: colors.danger },
  court: { gap: 8 },
  courtName: { fontSize: 16, fontWeight: "600", color: colors.ink },
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
});
