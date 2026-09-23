import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { SettingsBookingScreen } from "../screens/settings/SettingsBookingScreen";
import { SettingsBrandScreen } from "../screens/settings/SettingsBrandScreen";
import { SettingsFeaturesScreen } from "../screens/settings/SettingsFeaturesScreen";
import { SettingsHubScreen } from "../screens/settings/SettingsHubScreen";
import { SettingsLevelsScreen } from "../screens/settings/SettingsLevelsScreen";
import { SettingsOpenMatchScreen } from "../screens/settings/SettingsOpenMatchScreen";
import { SettingsPairingScreen } from "../screens/settings/SettingsPairingScreen";
import { SettingsPresetEditScreen } from "../screens/settings/SettingsPresetEditScreen";
import { SettingsPresetsScreen } from "../screens/settings/SettingsPresetsScreen";
import { SettingsSlotsScreen } from "../screens/settings/SettingsSlotsScreen";
import { colors } from "../theme";
import type { SettingsStackParamList } from "./types";

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.night },
        headerShadowVisible: false,
        headerTintColor: colors.white,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen
        name="SettingsHub"
        component={SettingsHubScreen}
        options={{ title: t("tabs.settings") }}
      />
      <Stack.Screen
        name="SettingsBrand"
        component={SettingsBrandScreen}
        options={{ title: t("settings.brand.title") }}
      />
      <Stack.Screen
        name="SettingsSlots"
        component={SettingsSlotsScreen}
        options={{ title: t("settings.slots.title") }}
      />
      <Stack.Screen
        name="SettingsBooking"
        component={SettingsBookingScreen}
        options={{ title: t("settings.booking.title") }}
      />
      <Stack.Screen
        name="SettingsLevels"
        component={SettingsLevelsScreen}
        options={{ title: t("settings.levels.title") }}
      />
      <Stack.Screen
        name="SettingsOpenMatch"
        component={SettingsOpenMatchScreen}
        options={{ title: t("settings.openMatch.title") }}
      />
      <Stack.Screen
        name="SettingsPairing"
        component={SettingsPairingScreen}
        options={{ title: t("settings.pairing.title") }}
      />
      <Stack.Screen
        name="SettingsPresets"
        component={SettingsPresetsScreen}
        options={{ title: t("settings.presets.title") }}
      />
      <Stack.Screen
        name="SettingsPresetEdit"
        component={SettingsPresetEditScreen}
        options={{ title: t("settings.presets.edit") }}
      />
      <Stack.Screen
        name="SettingsFeatures"
        component={SettingsFeaturesScreen}
        options={{ title: t("settings.features.title") }}
      />
    </Stack.Navigator>
  );
}
