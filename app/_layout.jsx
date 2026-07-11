import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { AppDataProvider, useAppData } from "../src/lib/store";
import { ensureNotificationSetup, resyncDoseNotifications } from "../src/lib/notifications";
import { useTheme } from "../src/theme";

function NotificationsSync() {
  const { data, ready } = useAppData();
  const lastSynced = useRef(null);

  useEffect(() => {
    ensureNotificationSetup();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const signature = JSON.stringify({ meds: data.medications, rules: data.rules, slots: data.slotTimes });
    if (signature === lastSynced.current) return;
    lastSynced.current = signature;
    resyncDoseNotifications(data.medications, data.rules, data.slotTimes).catch(() => {});
  }, [ready, data.medications, data.rules, data.slotTimes]);

  return null;
}

function RootStack() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.surface },
        headerTintColor: theme.ink,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="lek/nowy" options={{ title: "Nowy lek", presentation: "modal" }} />
      <Stack.Screen name="lek/[id]" options={{ title: "Edytuj lek" }} />
      <Stack.Screen name="regula/nowy" options={{ title: "Nowy etap dawkowania", presentation: "modal" }} />
      <Stack.Screen name="regula/[ruleId]" options={{ title: "Edytuj etap dawkowania", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppDataProvider>
      <NotificationsSync />
      <RootStack />
    </AppDataProvider>
  );
}
