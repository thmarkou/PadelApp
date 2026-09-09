import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  bandForLevel,
  canConfirmPlayerLevel,
  canErasePlayer,
  canManagePlayers,
  playerAge,
  playerGenders,
  playingLevel,
  snapLevel,
  type PlayerGender,
} from "@padelapp/shared";
import { isApiError, useAuth, useSignedIn } from "../auth/AuthProvider";
import { Chip, ChipWrap, Field } from "../components/forms";
import {
  confirmPlayerLevel,
  createPlayer,
  erasePlayer,
  fetchMyPlayer,
  fetchPlayer,
  patchPlayer,
} from "../lib/api";
import type { PlayersStackParamList } from "../navigation/types";
import { SettingsSaveBar, SettingsScroll } from "./settings/form";
import { colors } from "../theme";

export function PlayerFormScreen() {
  const { t } = useTranslation();
  const { token, user, settings } = useSignedIn();
  const { signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<PlayersStackParamList>>();
  const route = useRoute<RouteProp<PlayersStackParamList, "PlayerForm">>();
  const levels = settings?.levels;
  const staff = canManagePlayers(user.role);
  const canConfirm = levels ? canConfirmPlayerLevel(user.role, levels.confirmRole) : false;

  const [playerId, setPlayerId] = useState(route.params?.playerId);
  const [playerUserId, setPlayerUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState<PlayerGender | null>(null);
  const [birthYear, setBirthYear] = useState("");
  const [selfLevel, setSelfLevel] = useState<number | null>(null);
  const [confirmedLevel, setConfirmedLevel] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const loaded = route.params?.me
          ? await fetchMyPlayer(token)
          : route.params?.playerId
            ? await fetchPlayer(token, route.params.playerId)
            : null;
        if (!loaded) {
          return;
        }
        setPlayerId(loaded.id);
        setPlayerUserId(loaded.userId);
        setName(loaded.displayName);
        setPhone(loaded.phone ?? "");
        setEmail(loaded.email ?? "");
        setGender(loaded.gender);
        setBirthYear(loaded.birthYear === null ? "" : String(loaded.birthYear));
        setSelfLevel(loaded.selfLevel);
        setConfirmedLevel(loaded.confirmedLevel);
      } catch (caught) {
        setError(isApiError(caught) ? caught.message : t("errors.internal"));
      }
    })();
  }, [route.params?.me, route.params?.playerId, t, token]);

  function bump(current: number | null, delta: number): number | null {
    if (!levels) {
      return current;
    }
    return snapLevel((current ?? levels.min) + delta, levels.min, levels.max, levels.step);
  }

  function bumpSelf(delta: number) {
    setSelfLevel((current) => bump(current, delta));
  }

  function bumpConfirmed(delta: number) {
    setConfirmedLevel((current) => bump(current ?? selfLevel, delta));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const parsedYear = birthYear.trim() === "" ? null : Number(birthYear.trim());
      const body = {
        displayName: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        gender,
        birthYear: parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
        selfLevel,
      };
      if (!playerId) {
        const created = await createPlayer(token, body);
        setPlayerId(created.id);
        setPlayerUserId(created.userId);
        setConfirmedLevel(created.confirmedLevel);
      } else {
        const updated = await patchPlayer(token, playerId, body);
        setConfirmedLevel(updated.confirmedLevel);
      }
      setSaved(t("players.saved"));
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    const level = confirmedLevel ?? selfLevel;
    if (!playerId || level === null) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await confirmPlayerLevel(token, playerId, level);
      setConfirmedLevel(updated.confirmedLevel);
      setSaved(t("players.confirmOk"));
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  const playing = playingLevel(selfLevel, confirmedLevel);
  const band = levels ? bandForLevel(levels.bands, playing) : null;
  const selfProfile = Boolean(playerUserId && playerUserId === user.id);
  const canErase = Boolean(
    playerId &&
      canErasePlayer(
        { role: user.role, userId: user.id },
        { userId: playerUserId, userRole: selfProfile ? user.role : playerUserId ? "player" : null },
      ),
  );

  async function erase() {
    if (!playerId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await erasePlayer(token, playerId);
      if (selfProfile) {
        await signOut();
        return;
      }
      navigation.goBack();
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  function confirmErase() {
    Alert.alert(t("players.eraseTitle"), t("players.eraseBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("players.eraseConfirm"),
        style: "destructive",
        onPress: () => {
          void erase();
        },
      },
    ]);
  }

  return (
    <SettingsScroll>
      <Field label={t("players.name")} value={name} onChangeText={setName} />
      <Field
        label={t("players.phone")}
        value={phone}
        onChangeText={setPhone}
        keyboardType="number-pad"
        autoCapitalize="none"
      />
      <Field
        label={t("players.email")}
        value={email}
        onChangeText={setEmail}
        keyboardType="url"
        autoCapitalize="none"
      />

      <Text style={styles.section}>{t("players.gender")}</Text>
      <ChipWrap>
        {playerGenders.map((value) => (
          <Chip
            key={value}
            label={t(`players.genders.${value}`)}
            selected={gender === value}
            onPress={() => setGender(gender === value ? null : value)}
          />
        ))}
      </ChipWrap>
      <Field
        label={t("players.birthYear")}
        value={birthYear}
        onChangeText={setBirthYear}
        keyboardType="number-pad"
        placeholder="1995"
        autoCapitalize="none"
      />
      {playerAge(birthYear.trim() === "" ? null : Number(birthYear)) !== null ? (
        <Text style={styles.hint}>
          {t("players.ageNow", { age: playerAge(Number(birthYear)) })}
        </Text>
      ) : null}

      <Text style={styles.section}>{t("players.selfLevel")}</Text>
      <Text style={styles.hint}>{t("players.selfHint")}</Text>
      <View style={styles.stepper}>
        <Pressable style={styles.step} onPress={() => bumpSelf(-(levels?.step ?? 0.1))}>
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.levelValue}>{selfLevel === null ? "—" : selfLevel.toFixed(1)}</Text>
        <Pressable style={styles.step} onPress={() => bumpSelf(levels?.step ?? 0.1)}>
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>{t("players.confirmed")}</Text>
      {canConfirm ? (
        <View style={styles.stepper}>
          <Pressable style={styles.step} onPress={() => bumpConfirmed(-(levels?.step ?? 0.1))}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.levelValue}>
            {confirmedLevel === null ? "—" : confirmedLevel.toFixed(1)}
          </Text>
          <Pressable style={styles.step} onPress={() => bumpConfirmed(levels?.step ?? 0.1)}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.meta}>
          {confirmedLevel === null ? t("players.unconfirmed") : confirmedLevel.toFixed(1)}
        </Text>
      )}
      <Text style={styles.meta}>
        {t("players.band")}: {band?.name ?? t("players.noBand")}
      </Text>
      {levels ? (
        <Text style={styles.hint}>
          {t("players.scale", { min: levels.min, max: levels.max, step: levels.step })}
        </Text>
      ) : null}

      <SettingsSaveBar
        busy={busy}
        error={error}
        saved={saved}
        onSave={() => {
          void save();
        }}
      />

      {canConfirm && playerId && (confirmedLevel ?? selfLevel) !== null ? (
        <Pressable style={styles.confirm} onPress={() => void confirm()} disabled={busy}>
          <Text style={styles.confirmText}>{t("players.confirmAction")}</Text>
        </Pressable>
      ) : null}

      {!staff ? <Text style={styles.hint}>{t("players.playerNote")}</Text> : null}

      {canErase ? (
        <>
          <Text style={styles.hint}>{t("players.eraseHint")}</Text>
          <Pressable style={styles.erase} onPress={confirmErase} disabled={busy}>
            <Text style={styles.eraseText}>{t("players.eraseAction")}</Text>
          </Pressable>
        </>
      ) : null}
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, fontSize: 16, fontWeight: "600", color: colors.ink },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16 },
  step: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: { fontSize: 24, color: colors.ink, fontWeight: "600" },
  levelValue: {
    minWidth: 56,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "600",
    color: colors.ink,
  },
  meta: { fontSize: 15, color: colors.ink },
  confirm: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { color: colors.green, fontWeight: "600", fontSize: 16 },
  erase: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.danger,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  eraseText: { color: colors.danger, fontWeight: "600", fontSize: 16 },
});
