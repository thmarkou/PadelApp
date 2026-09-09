import { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { tournamentGenderRules, type TournamentGenderRule } from "@padelapp/shared";
import { isApiError, useSignedIn } from "../auth/AuthProvider";
import { Chip, ChipWrap, Field } from "../components/forms";
import { createTournament } from "../lib/api";
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
};

function emptyCategory(gender: TournamentGenderRule, index: number): DraftCategory {
  return { key: `cat-${index}-${gender}`, name: "", gender, minAge: "", maxAge: "" };
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

export function TournamentFormScreen() {
  const { t } = useTranslation();
  const { token, settings } = useSignedIn();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const presets = settings?.tournamentPresets ?? [];
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(addIsoDays(todayIsoDate(), 1));
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
      const created = await createTournament(token, {
        name: name.trim(),
        startsOn,
        presetId,
        categories: categories.map((item) => ({
          name: item.name.trim() || t(`tournaments.genders.${item.gender}`),
          gender: item.gender,
          minAge: optionalInt(item.minAge),
          maxAge: optionalInt(item.maxAge),
        })),
      });
      navigation.replace("TournamentDetail", { tournamentId: created.tournament.id });
    } catch (caught) {
      setError(isApiError(caught) ? caught.message : t("errors.internal"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsScroll>
      <Field label={t("tournaments.name")} value={name} onChangeText={setName} />
      <Field
        label={t("tournaments.startsOn")}
        value={startsOn}
        onChangeText={setStartsOn}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
      />
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
