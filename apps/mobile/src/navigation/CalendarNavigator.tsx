import { Pressable, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";
import { CalendarScreen } from "../screens/CalendarScreen";
import { OpenMatchesScreen } from "../screens/OpenMatchesScreen";
import { SlotDetailScreen } from "../screens/SlotDetailScreen";
import { colors } from "../theme";
import type { CalendarStackParamList } from "./types";

const Stack = createNativeStackNavigator<CalendarStackParamList>();

export function CalendarNavigator() {
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
        name="CalendarDay"
        component={CalendarScreen}
        options={({ navigation }) => ({
          title: t("tabs.calendar"),
          headerRight: () => (
            <Pressable onPress={() => navigation.navigate("OpenMatches")} style={{ paddingHorizontal: 8 }}>
              <Text style={{ color: colors.lime, fontWeight: "600" }}>{t("openMatch.short")}</Text>
            </Pressable>
          ),
        })}
      />
      <Stack.Screen
        name="OpenMatches"
        component={OpenMatchesScreen}
        options={{ title: t("openMatch.title") }}
      />
      <Stack.Screen
        name="SlotDetail"
        component={SlotDetailScreen}
        options={{ title: t("calendar.slotTitle") }}
      />
    </Stack.Navigator>
  );
}
