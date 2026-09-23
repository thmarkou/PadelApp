import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  groupSlotsByDate,
  tournamentStatuses,
  type Tournament,
  type TournamentCategory,
} from "@padelapp/shared";
import { isApiError, useSignedIn } from "../auth/AuthProvider";
import { Chip, ChipWrap } from "../components/forms";
import { canManageTournaments, fetchTournament, setTournamentStatus } from "../lib/api";
import type { MoreStackParamList } from "../navigation/types";
import { colors } from "../theme";

export function TournamentDetailScreen() {
  const { t } = useTranslation();
  const { token, user } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const route = useRoute<RouteProp<MoreStackParamList, "TournamentDetail">>();
  const staff = canManageTournaments(user.role);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<TournamentCategory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const loaded = await fetchTournament(token, route.params.tournamentId);
      setTournament(loaded.tournament);
      setCategories(loaded.categories);
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    }
  }, [route.params.tournamentId, t, token]);

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

  async function changeStatus(status: Tournament["status"]) {
    try {
      setError(null);
      setTournament(await setTournamentStatus(token, route.params.tournamentId, status));
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    }
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      {error ? <Text style={styles.empty}>{error}</Text> : null}
      {tournament ? (
        <>
          <Text style={styles.title}>{tournament.name}</Text>
          <Text style={styles.meta}>
            {tournament.startsOn} · {t(`settings.format.${tournament.format}`)}
          </Text>
          <Text style={styles.meta}>{t(`tournaments.status.${tournament.status}`)}</Text>
          {tournament.playSlots && tournament.playSlots.length > 0 ? (
            <>
              <Text style={styles.section}>{t("tournaments.playDays")}</Text>
              {groupSlotsByDate(tournament.playSlots).map((group) => (
                <Text key={group.date} style={styles.meta}>
                  {group.date}: {group.slots.map((slot) => `${slot.start}–${slot.end}`).join(" · ")}
                </Text>
              ))}
            </>
          ) : null}
          {staff ? (
            <>
              <Text style={styles.section}>{t("tournaments.changeStatus")}</Text>
              <ChipWrap>
                {tournamentStatuses.map((status) => (
                  <Chip
                    key={status}
                    label={t(`tournaments.status.${status}`)}
                    selected={tournament.status === status}
                    onPress={() => {
                      void changeStatus(status);
                    }}
                  />
                ))}
              </ChipWrap>
            </>
          ) : null}
        </>
      ) : null}

      <Text style={styles.section}>{t("tournaments.categories")}</Text>
      {categories.length === 0 ? <Text style={styles.empty}>{t("tournaments.noCategories")}</Text> : null}
      {categories.map((category) => (
        <Pressable
          key={category.id}
          style={styles.card}
          onPress={() => navigation.navigate("CategoryDetail", { categoryId: category.id })}
        >
          <Text style={styles.name}>{category.name}</Text>
          <Text style={styles.meta}>
            {t(`tournaments.genders.${category.gender}`)}
            {category.minAge !== null || category.maxAge !== null
              ? ` · ${category.minAge ?? "—"}–${category.maxAge ?? "—"}`
              : ""}
            {category.minLevel !== null || category.maxLevel !== null
              ? ` · ${category.minLevel ?? "—"}–${category.maxLevel ?? "—"}`
              : ""}
            {category.entryCount !== undefined
              ? ` · ${t("tournaments.entriesCount", { count: category.entryCount })}`
              : ""}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 40, gap: 10 },
  title: { fontSize: 26, fontWeight: "600", color: colors.ink },
  section: { marginTop: 8, fontSize: 16, fontWeight: "600", color: colors.ink },
  empty: { color: colors.muted, fontSize: 15 },
  meta: { color: colors.muted, fontSize: 14 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  name: { fontSize: 17, fontWeight: "600", color: colors.ink },
});
