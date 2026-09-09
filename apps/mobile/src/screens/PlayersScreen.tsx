import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { bandForLevel, canManagePlayers, playerAge, playingLevel } from "@padelapp/shared";
import { useSignedIn } from "../auth/AuthProvider";
import { fetchMyPlayer, fetchPlayers } from "../lib/api";
import type { PlayersStackParamList } from "../navigation/types";
import { colors } from "../theme";
import type { Player } from "@padelapp/shared";

export function PlayersScreen() {
  const { t } = useTranslation();
  const { token, user, settings } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<PlayersStackParamList>>();
  const staff = canManagePlayers(user.role);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      if (staff) {
        setPlayers(await fetchPlayers(token, query));
        return;
      }
      setPlayers([await fetchMyPlayer(token)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errors.internal"));
    }
  }, [query, staff, t, token]);

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

  const bands = settings?.levels.bands ?? [];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
      }
    >
      <Text style={styles.title}>{t("players.title")}</Text>
      <Text style={styles.subtitle}>{t("players.subtitle")}</Text>
      {error ? <Text style={styles.empty}>{error}</Text> : null}
      {staff ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            void load();
          }}
          placeholder={t("players.search")}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
      ) : null}

      {players.length === 0 ? (
        <Text style={styles.empty}>{t("players.empty")}</Text>
      ) : (
        players.map((player) => {
          const level = playingLevel(player.selfLevel, player.confirmedLevel);
          const band = bandForLevel(bands, level);
          return (
            <Pressable
              key={player.id}
              style={styles.card}
              onPress={() => navigation.navigate("PlayerForm", { playerId: player.id })}
            >
              <Text style={styles.name}>{player.displayName}</Text>
              <Text style={styles.meta}>
                {[
                  player.gender ? t(`players.genders.${player.gender}`) : t("players.genderUnset"),
                  playerAge(player.birthYear) !== null
                    ? t("players.ageNow", { age: playerAge(player.birthYear) })
                    : t("players.ageUnset"),
                  level === null
                    ? t("players.noLevel")
                    : t("players.levelLine", {
                        level: level.toFixed(1),
                        band: band?.name ?? "—",
                      }),
                ].join(" · ")}
              </Text>
              {player.confirmedLevel === null && player.selfLevel !== null ? (
                <Text style={styles.pending}>{t("players.awaitingConfirm")}</Text>
              ) : null}
            </Pressable>
          );
        })
      )}

      {staff ? (
        <Pressable style={styles.add} onPress={() => navigation.navigate("PlayerForm", {})}>
          <Text style={styles.addText}>{t("players.add")}</Text>
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
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
  },
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
  pending: { marginTop: 6, color: colors.green, fontSize: 13, fontWeight: "600" },
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
