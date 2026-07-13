import AsyncStorage from "@react-native-async-storage/async-storage";

const CRASH_LOG_KEY = "@venire_crash_log";

export async function storeCrashLog(error, extra) {
  try {
    const existing = await AsyncStorage.getItem(CRASH_LOG_KEY);
    const logs = existing ? JSON.parse(existing) : [];
    logs.unshift({
      timestamp: new Date().toISOString(),
      message: error?.message || String(error),
      stack: error?.stack || "",
      extra: extra || "",
    });
    await AsyncStorage.setItem(CRASH_LOG_KEY, JSON.stringify(logs.slice(0, 10)));
  } catch (e) {
    // silent fail
  }
}

export async function getCrashLogs() {
  try {
    const raw = await AsyncStorage.getItem(CRASH_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function clearCrashLogs() {
  try {
    await AsyncStorage.removeItem(CRASH_LOG_KEY);
  } catch (e) {}
}
