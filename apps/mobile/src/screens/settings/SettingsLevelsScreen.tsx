import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Chip, ChipWrap, Field } from "../../components/forms";
import { colors } from "../../theme";
import { SettingsSaveBar, SettingsScroll, useSettingsForm } from "./form";

export function SettingsLevelsScreen() {
  const { t } = useTranslation();
  const { draft, setDraft, busy, error, saved, save, missing } = useSettingsForm();

  if (missing || !draft) {
    return <Text>{t("settings.missing")}</Text>;
  }

  return (
    <SettingsScroll>
      <Text style={{ color: colors.muted, lineHeight: 20 }}>{t("settings.levels.body")}</Text>
      <Field
        label={t("settings.levels.min")}
        keyboardType="decimal-pad"
        value={String(draft.levels.min)}
        onChangeText={(value) =>
          setDraft({ ...draft, levels: { ...draft.levels, min: Number(value) || 0 } })
        }
      />
      <Field
        label={t("settings.levels.max")}
        keyboardType="decimal-pad"
        value={String(draft.levels.max)}
        onChangeText={(value) =>
          setDraft({ ...draft, levels: { ...draft.levels, max: Number(value) || 0 } })
        }
      />
      <Field
        label={t("settings.levels.step")}
        keyboardType="decimal-pad"
        value={String(draft.levels.step)}
        onChangeText={(value) =>
          setDraft({ ...draft, levels: { ...draft.levels, step: Number(value) || 0.1 } })
        }
      />
      <Field
        label={t("settings.levels.eloK")}
        keyboardType="number-pad"
        value={String(draft.levels.eloK)}
        onChangeText={(value) =>
          setDraft({ ...draft, levels: { ...draft.levels, eloK: Number(value) || 16 } })
        }
      />
      <Text style={{ color: colors.muted, lineHeight: 18 }}>{t("settings.levels.eloKHint")}</Text>
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.levels.confirmRole")}</Text>
      <ChipWrap>
        {(["coach", "admin"] as const).map((role) => (
          <Chip
            key={role}
            label={t(`settings.levels.confirm.${role}`)}
            selected={draft.levels.confirmRole === role}
            onPress={() => setDraft({ ...draft, levels: { ...draft.levels, confirmRole: role } })}
          />
        ))}
      </ChipWrap>
      <Text style={{ color: colors.ink, fontWeight: "600" }}>{t("settings.levels.bands")}</Text>
      {draft.levels.bands.map((band, index) => (
        <View
          key={band.id}
          style={{
            backgroundColor: colors.white,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.line,
            padding: 12,
            gap: 8,
          }}
        >
          <Field
            label={t("settings.levels.bandName")}
            value={band.name}
            onChangeText={(name) => {
              const bands = draft.levels.bands.map((item, i) =>
                i === index ? { ...item, name } : item,
              );
              setDraft({ ...draft, levels: { ...draft.levels, bands } });
            }}
          />
          <Field
            label={t("settings.levels.bandMin")}
            keyboardType="decimal-pad"
            value={String(band.min)}
            onChangeText={(value) => {
              const bands = draft.levels.bands.map((item, i) =>
                i === index ? { ...item, min: Number(value) || 0 } : item,
              );
              setDraft({ ...draft, levels: { ...draft.levels, bands } });
            }}
          />
          <Field
            label={t("settings.levels.bandMax")}
            keyboardType="decimal-pad"
            value={String(band.max)}
            onChangeText={(value) => {
              const bands = draft.levels.bands.map((item, i) =>
                i === index ? { ...item, max: Number(value) || 0 } : item,
              );
              setDraft({ ...draft, levels: { ...draft.levels, bands } });
            }}
          />
          {draft.levels.bands.length > 1 ? (
            <Pressable
              onPress={() =>
                setDraft({
                  ...draft,
                  levels: {
                    ...draft.levels,
                    bands: draft.levels.bands.filter((_, i) => i !== index),
                  },
                })
              }
            >
              <Text style={{ color: colors.danger }}>{t("settings.levels.removeBand")}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable
        onPress={() => {
          const id = `band-${Date.now()}`;
          setDraft({
            ...draft,
            levels: {
              ...draft.levels,
              bands: [
                ...draft.levels.bands,
                { id, name: t("settings.levels.newBand"), min: draft.levels.min, max: draft.levels.max },
              ],
            },
          });
        }}
      >
        <Text style={{ color: colors.green, fontWeight: "600" }}>{t("settings.levels.addBand")}</Text>
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
