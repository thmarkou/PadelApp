import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { isApiError, useSignedIn } from "../auth/AuthProvider";
import { canManageTournaments, fetchTournaments, type TournamentListItem } from "../lib/api";
import type { MoreStackParamList } from "../navigation/types";
import { colors } from "../theme";

export function TournamentsScreen() {
  const { t } = useTranslation();
  const { token, user } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const staff = canManageTournaments(user.role);
  const [items, setItems] = useState<TournamentListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await fetchTournaments(token));
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
      <Text style={styles.title}>{t("tournaments.title")}</Text>
      <Text style={styles.subtitle}>{t("tournaments.lead")}</Text>
      {error ? <Text style={styles.empty}>{error}</Text> : null}
      {items.length === 0 && !error ? <Text style={styles.empty}>{t("tournaments.empty")}</Text> : null}
      {items.map((item) => (
        <Pressable
          key={item.id}
          style={styles.card}
          onPress={() => navigation.navigate("TournamentDetail", { tournamentId: item.id })}
        >
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.startsOn} · {t(`tournaments.status.${item.status}`)} · {t(`settings.format.${item.format}`)}
          </Text>
          <Text style={styles.meta}>
            {t("tournaments.categoryCount", { count: item.categories.length })}
          </Text>
        </Pressable>
      ))}
      {staff ? (
        <Pressable style={styles.add} onPress={() => navigation.navigate("TournamentForm")}>
          <Text style={styles.addText}>{t("tournaments.create")}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 40, gap: 10 },
  title: { fontSize: 26, fontWeight: "600", color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted },
  empty: { marginTop: 12, color: colors.muted, fontSize: 16 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { fontSize: 17, fontWeight: "600", color: colors.ink },
  meta: { marginTop: 4, color: colors.muted, fontSize: 14 },
  add: {
    marginTop: 8,
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: colors.white, fontWeight: "600", fontSize: 16 },
});
