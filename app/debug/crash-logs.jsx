import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Share,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { getCrashLogs, clearCrashLogs } from "../../utils/crashLogger";
import { useRouter } from "expo-router";

export default function CrashLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getCrashLogs().then((l) => {
      setLogs(l);
      setLoading(false);
    });
  }, []);

  const handleShare = async () => {
    const text = logs
      .map((l) => `[${l.timestamp}]\n${l.message}\n${l.stack}\n${l.extra}`)
      .join("\n\n---\n\n");
    await Share.share({ message: text || "No logs found.", title: "Venire Crash Log" });
  };

  const handleClear = async () => {
    await clearCrashLogs();
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Crash Logs</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#5A31F4" style={{ marginTop: 40 }} />
      ) : logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>✅ No crash logs found!</Text>
        </View>
      ) : (
        <ScrollView style={styles.logContainer}>
          {logs.map((log, i) => (
            <View key={i} style={styles.logEntry}>
              <Text style={styles.logTime}>{log.timestamp}</Text>
              <Text style={styles.logMessage}>❌ {log.message}</Text>
              {!!log.extra && <Text style={styles.logBadge}>{log.extra}</Text>}
              {!!log.stack && <Text style={styles.logStack}>{log.stack}</Text>}
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.buttons}>
        <Pressable style={[styles.btn, styles.shareBtn]} onPress={handleShare}>
          <Text style={styles.btnText}>📋 Share Logs</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.clearBtn]} onPress={handleClear}>
          <Text style={styles.btnText}>🗑️ Clear</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0F0F0F" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    gap: 12,
  },
  back: { paddingVertical: 4, paddingHorizontal: 8 },
  backText: { color: "#5A31F4", fontSize: 15, fontWeight: "600" },
  title: { color: "#FFF", fontSize: 17, fontWeight: "bold" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { color: "#4CAF50", fontSize: 16 },
  logContainer: { flex: 1, padding: 16 },
  logEntry: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
    paddingBottom: 12,
  },
  logTime: { fontSize: 10, color: "#555", marginBottom: 4 },
  logMessage: { fontSize: 13, color: "#FF6B6B", fontWeight: "bold", marginBottom: 4 },
  logBadge: {
    fontSize: 10,
    color: "#FAB843",
    fontWeight: "600",
    marginBottom: 4,
  },
  logStack: { fontSize: 9, color: "#888", lineHeight: 14 },
  buttons: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  shareBtn: { backgroundColor: "#5A31F4" },
  clearBtn: { backgroundColor: "#333" },
  btnText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
});
