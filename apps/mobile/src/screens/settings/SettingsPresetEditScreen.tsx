import { Alert, Pressable, Text } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Scoring, TournamentPreset } from "@padelapp/shared";
import { Chip, ChipWrap, Field } from "../../components/forms";
import type { SettingsStackParamList } from "../../navigation/types";
import { colors } from "../../theme";
import { emptyPreset, scoringForKind, tournamentFormats } from "./catalog";
import { SettingsSaveBar, SettingsScroll, useSettingsForm } from "./form";

export function SettingsPresetEditScreen() {
  const { t } = useTranslation();
  const { draft, busy, error, saved, save, missing } = useSettingsForm();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const route = useRoute<RouteProp<SettingsStackParamList, "SettingsPresetEdit">>();
  const presetId = route.params?.presetId;
  const existing = draft?.tournamentPresets.find((item) => item.id === presetId);
  const [preset, setPreset] = useState<TournamentPreset>(existing ?? emptyPreset());

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  const clubSettings = draft;

  async function persist(nextPresets: TournamentPreset[]) {
    const ok = await save({ ...clubSettings, tournamentPresets: nextPresets });
    if (ok) {
      navigation.goBack();
    }
  }

  return (
    <SettingsScroll>
      <Field
        label={t("settings.presets.name")}
        value={preset.name}
        onChangeText={(name) => setPreset({ ...preset, name })}
      />
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.presets.format")}</Text>
      <ChipWrap>
        {tournamentFormats.map((format) => (
          <Chip
            key={format}
            label={t(`settings.format.${format}`)}
            selected={preset.format === format}
            onPress={() => setPreset({ ...preset, format })}
          />
        ))}
      </ChipWrap>
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.presets.scoring")}</Text>
      <ChipWrap>
        {(["official", "fixed_points", "timed", "kotc_race"] as const).map((kind) => (
          <Chip
            key={kind}
            label={t(`settings.scoringKind.${kind}`)}
            selected={preset.scoring.kind === kind}
            onPress={() => setPreset({ ...preset, scoring: scoringForKind(kind) })}
          />
        ))}
      </ChipWrap>
      <ScoringFields scoring={preset.scoring} onChange={(scoring) => setPreset({ ...preset, scoring })} />
      <SettingsSaveBar
        busy={busy}
        error={error}
        saved={saved}
        onSave={() => {
          const name = preset.name.trim();
          if (name.length === 0) {
            return;
          }
          const next = { ...preset, name };
          const tournamentPresets = existing
            ? clubSettings.tournamentPresets.map((item) => (item.id === next.id ? next : item))
            : [...clubSettings.tournamentPresets, next];
          void persist(tournamentPresets);
        }}
      />
      {existing && clubSettings.tournamentPresets.length > 1 ? (
        <Pressable
          onPress={() => {
            Alert.alert(t("settings.presets.deleteTitle"), t("settings.presets.deleteBody"), [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("settings.presets.delete"),
                style: "destructive",
                onPress: () => {
                  void persist(clubSettings.tournamentPresets.filter((item) => item.id !== existing.id));
                },
              },
            ]);
          }}
        >
          <Text style={{ color: colors.danger, fontWeight: "600" }}>{t("settings.presets.delete")}</Text>
        </Pressable>
      ) : null}
    </SettingsScroll>
  );
}

function ScoringFields({
  scoring,
  onChange,
}: {
  scoring: Scoring;
  onChange: (scoring: Scoring) => void;
}) {
  const { t } = useTranslation();

  if (scoring.kind === "official") {
    return (
      <>
        <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.scoring.deuce")}</Text>
        <ChipWrap>
          {(["advantage", "golden_point", "star_point"] as const).map((deuce) => (
            <Chip
              key={deuce}
              label={t(`settings.deuce.${deuce}`)}
              selected={scoring.deuce === deuce}
              onPress={() => onChange({ ...scoring, deuce })}
            />
          ))}
        </ChipWrap>
        <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.scoring.set")}</Text>
        <ChipWrap>
          {(["standard_6_tb7", "mini_4"] as const).map((set) => (
            <Chip
              key={set}
              label={t(`settings.set.${set}`)}
              selected={scoring.set === set}
              onPress={() => onChange({ ...scoring, set })}
            />
          ))}
        </ChipWrap>
        <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.scoring.match")}</Text>
        <ChipWrap>
          {(["one_set", "best_of_3", "best_of_3_super_tb10", "best_of_3_tb7"] as const).map((match) => (
            <Chip
              key={match}
              label={t(`settings.match.${match}`)}
              selected={scoring.match === match}
              onPress={() => onChange({ ...scoring, match })}
            />
          ))}
        </ChipWrap>
      </>
    );
  }

  if (scoring.kind === "fixed_points") {
    return (
      <ChipWrap>
        {([16, 21, 24, 32] as const).map((points) => (
          <Chip
            key={points}
            label={String(points)}
            selected={scoring.points === points}
            onPress={() => onChange({ kind: "fixed_points", points })}
          />
        ))}
      </ChipWrap>
    );
  }

  if (scoring.kind === "timed") {
    return (
      <Field
        label={t("settings.scoring.minutes")}
        keyboardType="number-pad"
        value={String(scoring.minutes)}
        onChangeText={(value) => onChange({ kind: "timed", minutes: Number(value) || 8 })}
      />
    );
  }

  return (
    <ChipWrap>
      {([4, 5, 7] as const).map((raceTo) => (
        <Chip
          key={raceTo}
          label={String(raceTo)}
          selected={scoring.raceTo === raceTo}
          onPress={() => onChange({ kind: "kotc_race", raceTo })}
        />
      ))}
    </ChipWrap>
  );
}
