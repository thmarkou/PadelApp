import { type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { colors } from "../theme";
import { CalendarNavigator } from "./CalendarNavigator";
import { CourtsNavigator } from "./CourtsNavigator";
import { MoreNavigator } from "./MoreNavigator";
import { PlayersNavigator } from "./PlayersNavigator";
import { SettingsNavigator } from "./SettingsNavigator";
import type { MainTabParamList, RootStackParamList } from "./types";
import { canEditClubSettings } from "../lib/api";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TAB_ICONS: Record<keyof MainTabParamList, { on: IoniconName; off: IoniconName }> = {
  Home: { on: "home", off: "home-outline" },
  Courts: { on: "tennisball", off: "tennisball-outline" },
  Calendar: { on: "calendar", off: "calendar-outline" },
  Players: { on: "people", off: "people-outline" },
  Settings: { on: "settings", off: "settings-outline" },
  More: { on: "ellipsis-horizontal-circle", off: "ellipsis-horizontal-circle-outline" },
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.cream,
    card: colors.cream,
    text: colors.ink,
    border: colors.line,
    primary: colors.green,
  },
};

function MainTabs() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const role = state.status === "signedIn" ? state.user.role : "player";
  const showSettings = canEditClubSettings(role);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.cream },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.cream, borderTopColor: colors.line },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.on : icons.off} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t("tabs.home") }} />
      <Tab.Screen
        name="Courts"
        component={CourtsNavigator}
        options={{ headerShown: false, title: t("tabs.courts") }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarNavigator}
        options={{ headerShown: false, title: t("tabs.calendar") }}
      />
      <Tab.Screen
        name="Players"
        component={PlayersNavigator}
        options={{
          headerShown: false,
          title: role === "player" ? t("tabs.profile") : t("tabs.players"),
        }}
      />
      {showSettings ? (
        <Tab.Screen
          name="Settings"
          component={SettingsNavigator}
          options={{ headerShown: false, title: t("tabs.settings") }}
        />
      ) : null}
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{ headerShown: false, title: t("tabs.more") }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { state } = useAuth();

  if (state.status === "booting") {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {state.status === "signedIn" ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
});
