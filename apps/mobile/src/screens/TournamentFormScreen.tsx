import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import {
  expandPlayDates,
  groupSlotsByDate,
  snapLevel,
  tournamentGenderRules,
  type TournamentGenderRule,
} from "@padelapp/shared";
import { isApiError, useSignedIn } from "../auth/AuthProvider";
import { Chip, ChipWrap, Field } from "../components/forms";
import { canManageTournaments, createTournament } from "../lib/api";
import { addIsoDays, todayIsoDate } from "../lib/dates";
import type { MoreStackParamList } from "../navigation/types";
import { SettingsSaveBar, SettingsScroll } from "./settings/form";
import { colors } from "../theme";

type DraftCategory = {
  key: string;
  name: string;
  gender: TournamentGenderRule;
  minAge: string;
  maxAge: string;
  minLevel: string;
  maxLevel: string;
};

function emptyCategory(gender: TournamentGenderRule, index: number): DraftCategory {
  return { key: `cat-${index}-${gender}`, name: "", gender, minAge: "", maxAge: "", minLevel: "", maxLevel: "" };
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

function parseLevel(
  value: string,
  scale: { min: number; max: number; step: number },
): number | null | "invalid" {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < scale.min || parsed > scale.max) {
    return "invalid";
  }
  return snapLevel(parsed, scale.min, scale.max, scale.step);
}

export function TournamentFormScreen() {
  const { t } = useTranslation();
  const { token, settings, user } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  useEffect(() => {
    if (!canManageTournaments(user.role)) {
      navigation.goBack();
    }
  }, [navigation, user.role]);
  const presets = settings?.tournamentPresets ?? [];
  const scale = settings?.levels ?? { min: 1, max: 7, step: 0.1, bands: [] };
  const [name, setName] = useState("");
  const [playDates, setPlayDates] = useState<string[]>([addIsoDays(todayIsoDate(), 1)]);
  const [draftDate, setDraftDate] = useState("");
  const [presetId, setPresetId] = useState(presets[0]?.id ?? "");
  const [categories, setCategories] = useState<DraftCategory[]>([emptyCategory("mixed_doubles", 0)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function updateCategory(key: string, patch: Partial<DraftCategory>) {
    setCategories((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const parsed = categories.map((item) => {
        const minLevel = parseLevel(item.minLevel, scale);
        const maxLevel = parseLevel(item.maxLevel, scale);
        if (minLevel === "invalid" || maxLevel === "invalid") {
          throw new Error(t("tournaments.invalidLevel", { min: scale.min, max: scale.max }));
        }
        if (minLevel !== null && maxLevel !== null && minLevel > maxLevel) {
          throw new Error(t("tournaments.levelRange"));
        }
        return {
          name: item.name.trim() || t(`tournaments.genders.${item.gender}`),
          gender: item.gender,
          minAge: optionalInt(item.minAge),
          maxAge: optionalInt(item.maxAge),
          minLevel,
          maxLevel,
        };
      });
      const created = await createTournament(token, {
        name: name.trim(),
        playDates,
        presetId,
        categories: parsed,
      });
      navigation.replace("TournamentDetail", { tournamentId: created.tournament.id });
    } catch (caught) {
      setError(
        isApiError(caught) || caught instanceof Error ? (caught as Error).message : t("errors.internal"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsScroll>
      <Field label={t("tournaments.name")} value={name} onChangeText={setName} />
      <Text style={styles.section}>{t("tournaments.playDays")}</Text>
      <Text style={styles.hint}>{t("tournaments.playDaysHint")}</Text>
      <Field
        label={t("tournaments.addPlayDay")}
        value={draftDate}
        onChangeText={setDraftDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
      <Pressable
        style={styles.add}
        onPress={() => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(draftDate) || playDates.includes(draftDate)) {
            return;
          }
          setPlayDates((current) => [...current, draftDate].sort());
          setDraftDate("");
        }}
      >
        <Text style={styles.addText}>{t("tournaments.addPlayDay")}</Text>
      </Pressable>
      {playDates.length === 0 ? <Text style={styles.remove}>{t("tournaments.needPlayDay")}</Text> : null}
      {groupSlotsByDate(expandPlayDates(playDates)).map((group) => (
        <Pressable key={group.date} style={styles.catCard}>
          <Text style={styles.section}>{group.date}</Text>
          <Text style={styles.hint}>{group.slots.map((slot) => `${slot.start}–${slot.end}`).join(" · ")}</Text>
          <Pressable onPress={() => setPlayDates((current) => current.filter((date) => date !== group.date))}>
            <Text style={styles.remove}>{t("tournaments.removePlayDay")}</Text>
          </Pressable>
        </Pressable>
      ))}
      <Text style={styles.section}>{t("tournaments.preset")}</Text>
      <ChipWrap>
        {presets.map((preset) => (
          <Chip
            key={preset.id}
            label={preset.name}
            selected={presetId === preset.id}
            onPress={() => setPresetId(preset.id)}
          />
        ))}
      </ChipWrap>

      <Text style={styles.section}>{t("tournaments.categories")}</Text>
      {categories.map((item, index) => (
        <Pressable key={item.key} style={styles.catCard}>
          <Field
            label={t("tournaments.categoryName")}
            value={item.name}
            onChangeText={(value) => updateCategory(item.key, { name: value })}
            placeholder={t(`tournaments.genders.${item.gender}`)}
          />
          <ChipWrap>
            {tournamentGenderRules.map((gender) => (
              <Chip
                key={gender}
                label={t(`tournaments.genders.${gender}`)}
                selected={item.gender === gender}
                onPress={() => updateCategory(item.key, { gender })}
              />
            ))}
          </ChipWrap>
          <Field
            label={t("tournaments.minAge")}
            value={item.minAge}
            onChangeText={(value) => updateCategory(item.key, { minAge: value })}
            keyboardType="number-pad"
            placeholder={t("tournaments.optional")}
          />
          <Field
            label={t("tournaments.maxAge")}
            value={item.maxAge}
            onChangeText={(value) => updateCategory(item.key, { maxAge: value })}
            keyboardType="number-pad"
            placeholder={t("tournaments.optional")}
          />
          <Text style={styles.hint}>{t("tournaments.levelHint")}</Text>
          {scale.bands.length > 0 ? (
            <ChipWrap>
              {scale.bands.map((band) => (
                <Chip
                  key={band.id}
                  label={t("tournaments.levelBand", { name: band.name, min: band.min, max: band.max })}
                  selected={item.minLevel === String(band.min) && item.maxLevel === String(band.max)}
                  onPress={() =>
                    updateCategory(item.key, { minLevel: String(band.min), maxLevel: String(band.max) })
                  }
                />
              ))}
              <Chip
                label={t("tournaments.levelAny")}
                selected={item.minLevel === "" && item.maxLevel === ""}
                onPress={() => updateCategory(item.key, { minLevel: "", maxLevel: "" })}
              />
            </ChipWrap>
          ) : null}
          <Field
            label={t("tournaments.minLevel")}
            value={item.minLevel}
            onChangeText={(value) => updateCategory(item.key, { minLevel: value })}
            keyboardType="decimal-pad"
            placeholder={t("tournaments.optional")}
          />
          <Field
            label={t("tournaments.maxLevel")}
            value={item.maxLevel}
            onChangeText={(value) => updateCategory(item.key, { maxLevel: value })}
            keyboardType="decimal-pad"
            placeholder={t("tournaments.optional")}
          />
          {categories.length > 1 ? (
            <Pressable
              onPress={() => setCategories((current) => current.filter((row) => row.key !== item.key))}
            >
              <Text style={styles.remove}>{t("tournaments.removeCategory")}</Text>
            </Pressable>
          ) : null}
          <Text style={styles.hint}>{t("tournaments.categoryHint", { index: index + 1 })}</Text>
        </Pressable>
      ))}
      <Pressable
        style={styles.add}
        onPress={() => setCategories((current) => [...current, emptyCategory("men", current.length)])}
      >
        <Text style={styles.addText}>{t("tournaments.addCategory")}</Text>
      </Pressable>

      <SettingsSaveBar
        busy={busy}
        error={error}
        saved={saved}
        onSave={() => {
          void save();
        }}
      />
    </SettingsScroll>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 8, fontSize: 16, fontWeight: "600", color: colors.ink },
  hint: { color: colors.muted, fontSize: 13 },
  catCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  remove: { color: colors.danger, fontWeight: "600", fontSize: 15 },
  add: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.green,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: colors.green, fontWeight: "600", fontSize: 16 },
});
