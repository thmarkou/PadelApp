import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { CourtFormScreen } from "../screens/CourtFormScreen";
import { CourtsScreen } from "../screens/CourtsScreen";
import { colors } from "../theme";
import type { CourtsStackParamList } from "./types";

const Stack = createNativeStackNavigator<CourtsStackParamList>();

export function CourtsNavigator() {
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
        name="CourtsList"
        component={CourtsScreen}
        options={{ title: t("tabs.courts") }}
      />
      <Stack.Screen
        name="CourtForm"
        component={CourtFormScreen}
        options={{ title: t("courts.edit") }}
      />
    </Stack.Navigator>
  );
}
