import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { isApiError, useSignedIn } from "../auth/AuthProvider";
import { fetchOpenMatches, type OpenMatch } from "../lib/api";
import { slotDateLabel, slotTimeLabel } from "../lib/dates";
import type { CalendarStackParamList } from "../navigation/types";
import { colors } from "../theme";

export function OpenMatchesScreen() {
  const { t } = useTranslation();
  const { token, settings } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<CalendarStackParamList>>();
  const [matches, setMatches] = useState<OpenMatch[]>([]);
  const [myLevel, setMyLevel] = useState<number | null>(null);
  const [delta, setDelta] = useState(settings?.openMatch.levelDelta ?? 0.4);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchOpenMatches(token);
      setMatches(result.matches);
      setMyLevel(result.myLevel);
      setDelta(result.levelDelta);
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    }
  }, [t, token]);

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
      <Text style={styles.title}>{t("openMatch.title")}</Text>
      <Text style={styles.lead}>{t("openMatch.lead", { delta })}</Text>
      {myLevel === null ? <Text style={styles.hint}>{t("openMatch.needLevel")}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {matches.length === 0 && !error ? <Text style={styles.hint}>{t("openMatch.empty")}</Text> : null}
      {matches.map((match) => (
        <Pressable
          key={match.bookingId}
          style={styles.card}
          onPress={() =>
            navigation.navigate("SlotDetail", {
              date: slotDateLabel(match.startsAt),
              courtId: match.courtId,
              courtName: match.courtName,
              startsAt: match.startsAt.length === 16 ? `${match.startsAt}:00` : match.startsAt,
              durationMinutes: match.durationMinutes,
              bookingId: match.bookingId,
            })
          }
        >
          <Text style={styles.court}>{match.courtName}</Text>
          <Text style={styles.when}>
            {slotDateLabel(match.startsAt)} · {slotTimeLabel(match.startsAt)} · {match.durationMinutes}′
          </Text>
          <Text style={styles.names}>{match.spots.map((spot) => spot.name).join(" · ")}</Text>
          <Text style={styles.meta}>
            {t("openMatch.missing", { count: match.openSpots })}
            {" · "}
            {match.matchLevel === null
              ? t("openMatch.noLevel")
              : t("openMatch.level", { level: match.matchLevel.toFixed(1) })}
          </Text>
          {match.meOnBooking ? <Text style={styles.mine}>{t("openMatch.youAreIn")}</Text> : null}
          {!match.inRange && !match.meOnBooking ? (
            <Text style={styles.out}>{t("openMatch.outOfRange")}</Text>
          ) : null}
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 40, gap: 10 },
  title: { fontSize: 26, fontWeight: "600", color: colors.ink },
  lead: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  hint: { color: colors.muted, fontSize: 15, lineHeight: 21 },
  error: { color: colors.danger, fontSize: 15 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  court: { fontSize: 17, fontWeight: "600", color: colors.ink },
  when: { marginTop: 4, color: colors.muted, fontSize: 14 },
  names: { marginTop: 8, color: colors.ink, fontSize: 15, fontWeight: "600" },
  meta: { marginTop: 6, color: colors.muted, fontSize: 14 },
  mine: { marginTop: 6, color: colors.green, fontWeight: "600", fontSize: 13 },
  out: { marginTop: 6, color: colors.amber, fontWeight: "600", fontSize: 13 },
});
