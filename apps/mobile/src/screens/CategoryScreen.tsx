import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { isApiError, useSignedIn } from "../auth/AuthProvider";
import {
  canManageTournaments,
  canScoreTournaments,
  fetchCategory,
  fetchMyPlayer,
  generateCategoryRound,
  registerCategoryEntry,
  removeCategoryEntry,
  saveMatchScore,
  searchPlayers,
  type CategoryDetail,
  type ClubPlayer,
} from "../lib/api";
import type { MoreStackParamList } from "../navigation/types";
import { colors } from "../theme";

export function CategoryScreen() {
  const { t } = useTranslation();
  const { token, user } = useSignedIn();
  const route = useRoute<RouteProp<MoreStackParamList, "CategoryDetail">>();
  const manage = canManageTournaments(user.role);
  const score = canScoreTournaments(user.role);
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ClubPlayer[]>([]);
  const [scores, setScores] = useState<Record<string, { a: string; b: string }>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [loaded, me] = await Promise.all([
        fetchCategory(token, route.params.categoryId),
        fetchMyPlayer(token).catch(() => null),
      ]);
      setDetail(loaded);
      setMyPlayerId(me?.id ?? null);
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
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    }
  }, [route.params.categoryId, t, token]);

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

  async function register(playerId?: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await registerCategoryEntry(token, route.params.categoryId, playerId);
      setQuery("");
      setHits([]);
      setNote(t("tournaments.registered"));
      await load();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  async function unregister(entryId: string) {
    setBusy(true);
    setError(null);
    try {
      await removeCategoryEntry(token, entryId);
      setNote(t("tournaments.unregistered"));
      await load();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const result = await generateCategoryRound(token, route.params.categoryId);
      setNote(
        result.leftover.length > 0
          ? t("tournaments.roundLeftover", {
              round: result.round,
              names: result.leftover.map((item) => item.name).join(", "),
            })
          : t("tournaments.roundOk", { round: result.round }),
      );
      await load();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  async function saveScore(matchId: string) {
    const draft = scores[matchId];
    const scoreA = Number(draft?.a);
    const scoreB = Number(draft?.b);
    if (!Number.isInteger(scoreA) || !Number.isInteger(scoreB)) {
      setError(t("errors.invalid_data"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveMatchScore(token, matchId, scoreA, scoreB);
      setNote(t("tournaments.scoreSaved"));
      await load();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  const mine = detail?.entries.find((entry) => entry.playerId === myPlayerId);
  const closed = detail?.tournament?.status === "closed";

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      {detail ? (
        <>
          <Text style={styles.title}>{detail.category.name}</Text>
          <Text style={styles.meta}>
            {t(`tournaments.genders.${detail.category.gender}`)}
            {detail.tournament ? ` · ${detail.tournament.name}` : ""}
          </Text>
        </>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}

      <Text style={styles.section}>{t("tournaments.entries")}</Text>
      {detail?.entries.length === 0 ? <Text style={styles.meta}>{t("tournaments.noEntries")}</Text> : null}
      {detail?.entries.map((entry) => (
        <View key={entry.id} style={styles.card}>
          <Text style={styles.name}>{entry.displayName}</Text>
          <Text style={styles.meta}>
            {entry.gender ? t(`players.genders.${entry.gender}`) : t("players.genderUnset")}
            {entry.level !== null ? ` · ${entry.level.toFixed(1)}` : ""}
          </Text>
          {!closed && (manage || entry.playerId === myPlayerId) ? (
            <Pressable onPress={() => void unregister(entry.id)} disabled={busy}>
              <Text style={styles.remove}>{t("tournaments.unregister")}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {!closed && !mine && myPlayerId ? (
        <Pressable style={styles.primary} onPress={() => void register()} disabled={busy}>
          <Text style={styles.primaryText}>{t("tournaments.registerMe")}</Text>
        </Pressable>
      ) : null}

      {!closed && manage ? (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => {
              void searchPlayers(token, query).then(setHits).catch((caught: unknown) => {
                setError(isApiError(caught) ? caught.message : t("errors.internal"));
              });
            }}
            placeholder={t("tournaments.addPlayer")}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.search}
          />
          {hits.map((hit) => (
            <Pressable key={hit.id} style={styles.hit} onPress={() => void register(hit.id)} disabled={busy}>
              <Text style={styles.name}>{hit.displayName}</Text>
            </Pressable>
          ))}
        </>
      ) : null}

      <Text style={styles.section}>{t("tournaments.standings")}</Text>
      {detail?.standings.map((row, index) => (
        <Text key={row.playerId} style={styles.standing}>
          {index + 1}. {row.name} · {row.points} · {t("tournaments.wins", { count: row.wins })}
        </Text>
      ))}

      {score && !closed ? (
        <Pressable style={styles.primary} onPress={() => void generate()} disabled={busy}>
          <Text style={styles.primaryText}>{t("tournaments.generateRound")}</Text>
        </Pressable>
      ) : null}

      {detail?.rounds.map((round) => (
        <View key={round.id} style={styles.round}>
          <Text style={styles.section}>{t("tournaments.round", { number: round.number })}</Text>
          {round.matches.map((match) => (
            <View key={match.id} style={styles.card}>
              <Text style={styles.name}>
                {match.pairA.join(" / ") || "—"} vs {match.pairB.join(" / ") || "—"}
              </Text>
              {score && !closed ? (
                <View style={styles.scoreRow}>
                  <TextInput
                    value={scores[match.id]?.a ?? ""}
                    onChangeText={(value) =>
                      setScores((current) => ({
                        ...current,
                        [match.id]: { a: value, b: current[match.id]?.b ?? "" },
                      }))
                    }
                    keyboardType="number-pad"
                    style={styles.score}
                  />
                  <Text style={styles.meta}>–</Text>
                  <TextInput
                    value={scores[match.id]?.b ?? ""}
                    onChangeText={(value) =>
                      setScores((current) => ({
                        ...current,
                        [match.id]: { a: current[match.id]?.a ?? "", b: value },
                      }))
                    }
                    keyboardType="number-pad"
                    style={styles.score}
                  />
                  <Pressable onPress={() => void saveScore(match.id)} disabled={busy}>
                    <Text style={styles.saveScore}>{t("tournaments.saveScore")}</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.meta}>
                  {match.scoreA ?? "—"} – {match.scoreB ?? "—"}
                </Text>
              )}
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingBottom: 48, gap: 10 },
  title: { fontSize: 26, fontWeight: "600", color: colors.ink },
  section: { marginTop: 8, fontSize: 16, fontWeight: "600", color: colors.ink },
  meta: { color: colors.muted, fontSize: 14 },
  error: { color: colors.danger, fontSize: 15 },
  note: { color: colors.green, fontSize: 15, fontWeight: "600" },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  name: { fontSize: 16, fontWeight: "600", color: colors.ink },
  remove: { color: colors.danger, fontWeight: "600", fontSize: 15 },
  primary: {
    backgroundColor: colors.green,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.white, fontWeight: "600", fontSize: 16 },
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
  hit: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  standing: { color: colors.ink, fontSize: 15 },
  round: { gap: 8 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  score: {
    width: 56,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: "center",
    color: colors.ink,
    backgroundColor: colors.cream,
  },
  saveScore: { color: colors.green, fontWeight: "600", fontSize: 15 },
});
