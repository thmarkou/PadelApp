import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { PlayerFormScreen } from "../screens/PlayerFormScreen";
import { PlayersScreen } from "../screens/PlayersScreen";
import { colors } from "../theme";
import type { PlayersStackParamList } from "./types";

const Stack = createNativeStackNavigator<PlayersStackParamList>();

export function PlayersNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.cream },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen
        name="PlayersList"
        component={PlayersScreen}
        options={{ title: t("tabs.players") }}
      />
      <Stack.Screen
        name="PlayerForm"
        component={PlayerFormScreen}
        options={{ title: t("players.profile") }}
      />
    </Stack.Navigator>
  );
}
