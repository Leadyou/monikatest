import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { addDays, compareISODate, toISODate } from "./dates";
import { generateDayPlan } from "./schedule";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = "krople-dawki";

// Nie planujemy w nieskończoność dla otwartych reguł ("do końca opakowania") —
// to jawna, nazwana granica horyzontu powiadomień, nie limit medyczny.
const MAX_LOOKAHEAD_DAYS = 60;

export async function ensureNotificationSetup() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Pora podania kropli",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 250, 400],
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== "granted") {
    await Notifications.requestPermissionsAsync();
  }
}

function slotNotificationContent(slot) {
  const names = slot.doses.map((d) => d.medicationName);
  const title = names.length > 1 ? `Krople: ${names.join(" → ")}` : `Kropla: ${names[0]}`;
  const body =
    names.length > 1
      ? `Podaj w tej kolejności, zachowując min. 5 minut odstępu między każdą.`
      : `Podaj o wyznaczonej porze.`;
  return { title, body };
}

// Kasuje wszystkie zaplanowane powiadomienia i planuje je od nowa na
// podstawie aktualnych reguł dawkowania. Wywoływane po każdej zmianie leku
// lub reguły oraz przy starcie aplikacji.
export async function resyncDoseNotifications(medications, rules, slotTimes) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (rules.length === 0) return 0;

  const today = toISODate(new Date());
  let horizonEnd = null;
  for (const rule of rules) {
    const end = rule.end.type === "manual" && !rule.end.endDate
      ? addDays(rule.startDate, 45)
      : rule.end.type === "days"
        ? addDays(rule.startDate, rule.end.days - 1)
        : rule.end.date;
    if (horizonEnd === null || compareISODate(end, horizonEnd) > 0) horizonEnd = end;
  }
  const capDate = addDays(today, MAX_LOOKAHEAD_DAYS);
  if (compareISODate(horizonEnd, capDate) > 0) horizonEnd = capDate;

  let scheduled = 0;
  let cursor = today;
  while (compareISODate(cursor, horizonEnd) <= 0) {
    const plan = generateDayPlan(cursor, medications, rules, slotTimes);
    for (const slot of plan.slots) {
      if (slot.doses.length === 0) continue;
      const [h, m] = slot.time.split(":").map(Number);
      const fireDate = new Date(cursor + "T00:00:00");
      fireDate.setHours(h, m, 0, 0);
      if (fireDate.getTime() <= Date.now()) continue;

      const { title, body } = slotNotificationContent(slot);
      await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: "default" },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
          channelId: CHANNEL_ID,
        },
      });
      scheduled += 1;
    }
    cursor = addDays(cursor, 1);
  }
  return scheduled;
}
