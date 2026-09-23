import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSignedIn } from "../auth/AuthProvider";
import { PlayerFormScreen } from "../screens/PlayerFormScreen";
import { PlayersScreen } from "../screens/PlayersScreen";
import { colors } from "../theme";
import type { PlayersStackParamList } from "../navigation/types";

const Stack = createNativeStackNavigator<PlayersStackParamList>();

export function PlayersNavigator() {
  const { t } = useTranslation();
  const { user } = useSignedIn();
  const playerOnly = user.role === "player";

  return (
    <Stack.Navigator
      initialRouteName={playerOnly ? "PlayerForm" : "PlayersList"}
      screenOptions={{
        headerStyle: { backgroundColor: colors.night },
        headerShadowVisible: false,
        headerTintColor: colors.white,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      {playerOnly ? null : (
        <Stack.Screen
          name="PlayersList"
          component={PlayersScreen}
          options={{ title: t("tabs.players") }}
        />
      )}
      <Stack.Screen
        name="PlayerForm"
        component={PlayerFormScreen}
        initialParams={playerOnly ? { me: true } : undefined}
        options={{ title: t("players.profile") }}
      />
    </Stack.Navigator>
  );
}
