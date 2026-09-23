import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { useSignedIn } from "../auth/AuthProvider";
import { canManageTournaments } from "../lib/api";
import { CategoryScreen } from "../screens/CategoryScreen";
import { MoreScreen } from "../screens/MoreScreen";
import { TournamentDetailScreen } from "../screens/TournamentDetailScreen";
import { TournamentFormScreen } from "../screens/TournamentFormScreen";
import { TournamentsScreen } from "../screens/TournamentsScreen";
import { colors } from "../theme";
import type { MoreStackParamList } from "./types";

const Stack = createNativeStackNavigator<MoreStackParamList>();

export function MoreNavigator() {
  const { t } = useTranslation();
  const { user } = useSignedIn();
  const staff = canManageTournaments(user.role);
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.night },
        headerShadowVisible: false,
        headerTintColor: colors.white,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="MoreHub" component={MoreScreen} options={{ title: t("tabs.more") }} />
      <Stack.Screen
        name="TournamentsList"
        component={TournamentsScreen}
        options={{ title: t("tournaments.title") }}
      />
      {staff ? (
        <Stack.Screen
          name="TournamentForm"
          component={TournamentFormScreen}
          options={{ title: t("tournaments.create") }}
        />
      ) : null}
      <Stack.Screen
        name="TournamentDetail"
        component={TournamentDetailScreen}
        options={{ title: t("tournaments.detail") }}
      />
      <Stack.Screen
        name="CategoryDetail"
        component={CategoryScreen}
        options={{ title: t("tournaments.category") }}
      />
    </Stack.Navigator>
  );
}
