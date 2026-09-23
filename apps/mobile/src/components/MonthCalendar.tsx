import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { addMonths, monthCells, monthKeyFromIso } from "@padelapp/shared";
import { fetchMonthSlots } from "../lib/api";
import { todayIsoDate } from "../lib/dates";
import { colors } from "../theme";

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const monthDayColors = {
  emptyBg: colors.cream,
  emptyBorder: colors.line,
  openBg: "#F8EBD9",
  openBorder: colors.amber,
  readyBg: colors.green,
  readyBorder: colors.green,
} as const;

function monthTitle(monthKey: string, locale: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return new Date(year, month - 1, 1).toLocaleDateString(locale.startsWith("el") ? "el-GR" : "en-GB", {
    month: "long",
    year: "numeric",
  });
}

function LegendSwatch(props: { kind: "empty" | "open" | "ready" | "mixed" }) {
  if (props.kind === "mixed") {
    return (
      <View style={[styles.swatch, styles.swatchMixedBorder]}>
        <View style={styles.swatchMixedLeft} />
        <View style={styles.swatchMixedRight} />
      </View>
    );
  }
  const tone =
    props.kind === "empty"
      ? { backgroundColor: monthDayColors.emptyBg, borderColor: monthDayColors.emptyBorder }
      : props.kind === "open"
        ? { backgroundColor: monthDayColors.openBg, borderColor: monthDayColors.openBorder }
        : { backgroundColor: monthDayColors.readyBg, borderColor: monthDayColors.readyBorder };
  return <View style={[styles.swatch, tone]} />;
}

export function MonthCalendar(props: {
  token: string;
  date: string;
  onSelect: (date: string) => void;
  revision?: number;
}) {
  const { t, i18n } = useTranslation();
  const [month, setMonth] = useState(monthKeyFromIso(props.date));
  const [days, setDays] = useState<Record<string, { bookings: number; ready: number }>>({});
  const today = todayIsoDate();

  useEffect(() => {
    setMonth(monthKeyFromIso(props.date));
  }, [props.date]);

  const load = useCallback(async () => {
    const data = await fetchMonthSlots(props.token, month);
    const next: Record<string, { bookings: number; ready: number }> = {};
    for (const day of data.days) {
      next[day.date] = { bookings: day.bookings, ready: day.ready };
    }
    setDays(next);
  }, [month, props.token]);

  useEffect(() => {
    load().catch(() => {
      setDays({});
    });
  }, [load, props.revision]);

  return (
    <View style={styles.card}>
      <View style={styles.nav}>
        <Pressable onPress={() => setMonth((current) => addMonths(current, -1))} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{monthTitle(month, i18n.language)}</Text>
        <Pressable onPress={() => setMonth((current) => addMonths(current, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekday}>
            {t(`month.weekdays.${day}`)}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {monthCells(month).map((cell) => {
          const day = days[cell.date];
          const ready = day?.ready ?? 0;
          const open = Math.max(0, (day?.bookings ?? 0) - ready);
          const mixed = open > 0 && ready > 0;
          const selected = cell.date === props.date;
          return (
            <Pressable
              key={cell.date}
              onPress={() => props.onSelect(cell.date)}
              style={[
                styles.day,
                !cell.inMonth ? styles.out : null,
                mixed ? styles.mixed : ready > 0 ? styles.booked : open > 0 ? styles.open : styles.empty,
                selected ? styles.selected : null,
              ]}
            >
              {mixed ? (
                <View style={styles.split} pointerEvents="none">
                  <View style={styles.splitOpen} />
                  <View style={styles.splitReady} />
                </View>
              ) : null}
              <Text
                style={[
                  styles.dayNum,
                  ready > 0 && !mixed ? styles.bookedText : null,
                  mixed ? styles.mixedNum : null,
                ]}
              >
                {Number(cell.date.slice(8, 10))}
              </Text>
              {mixed ? (
                <View style={styles.splitCounts}>
                  <Text style={styles.openCount}>{open}</Text>
                  <Text style={styles.count}>{ready}</Text>
                </View>
              ) : open + ready > 0 ? (
                <Text style={ready > 0 ? styles.count : styles.openCount}>{open + ready}</Text>
              ) : cell.date === today ? (
                <View style={styles.todayDot} />
              ) : (
                <View style={styles.spacer} />
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.countHint}>{t("month.countHint")}</Text>
      <View style={styles.legend}>
        {(["empty", "open", "ready", "mixed"] as const).map((kind) => (
          <View key={kind} style={styles.legendItem}>
            <LegendSwatch kind={kind} />
            <Text style={styles.legendText}>{t(`month.${kind === "empty" ? "emptyDay" : kind === "open" ? "openDay" : kind === "ready" ? "readyDay" : "mixedDay"}`)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 28, color: colors.green },
  title: { fontSize: 16, fontWeight: "600", color: colors.ink, textTransform: "capitalize" },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", fontSize: 11, color: colors.muted, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  day: {
    width: "14.285%",
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
    overflow: "hidden",
  },
  empty: { backgroundColor: monthDayColors.emptyBg, borderColor: monthDayColors.emptyBorder },
  open: { backgroundColor: monthDayColors.openBg, borderColor: monthDayColors.openBorder },
  booked: { backgroundColor: monthDayColors.readyBg, borderColor: monthDayColors.readyBorder },
  mixed: { backgroundColor: colors.white, borderColor: colors.line },
  split: { ...StyleSheet.absoluteFillObject, flexDirection: "row" },
  splitOpen: { flex: 1, backgroundColor: monthDayColors.openBg },
  splitReady: { flex: 1, backgroundColor: monthDayColors.readyBg },
  splitCounts: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingHorizontal: 2 },
  mixedNum: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 4, paddingHorizontal: 3, overflow: "hidden" },
  openCount: { color: colors.ink, fontSize: 10, fontWeight: "600" },
  selected: { borderWidth: 2, borderColor: colors.night },
  out: { opacity: 0.35 },
  dayNum: { fontWeight: "700", color: colors.ink, fontSize: 14 },
  bookedText: { color: colors.white },
  count: { color: colors.white, fontSize: 10, fontWeight: "600" },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.lime, marginTop: 2 },
  spacer: { height: 5, marginTop: 2 },
  countHint: { fontSize: 11, color: colors.muted, textAlign: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 8, marginTop: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6, width: "47%" },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1, overflow: "hidden" },
  swatchMixedBorder: { borderColor: colors.line, flexDirection: "row" },
  swatchMixedLeft: { flex: 1, backgroundColor: monthDayColors.openBg },
  swatchMixedRight: { flex: 1, backgroundColor: monthDayColors.readyBg },
  legendText: { color: colors.muted, fontSize: 11, flexShrink: 1 },
});
