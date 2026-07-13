import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Share } from "react-native";
import { storeCrashLog, getCrashLogs, clearCrashLogs } from "../utils/crashLogger";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, logs: [] };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  async componentDidCatch(error, info) {
    await storeCrashLog(error, info?.componentStack || "");
    const logs = await getCrashLogs();
    this.setState({ logs });
  }

  async componentDidMount() {
    const logs = await getCrashLogs();
    if (logs.length > 0) {
      this.setState({ logs });
    }
  }

  render() {
    const { hasError, logs } = this.state;

    if (!hasError && logs.length === 0) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {hasError ? "💥 App Crashed" : "⚠️ Previous Crash Detected"}
        </Text>
        <Text style={styles.subtitle}>
          {hasError
            ? "The app encountered an error. Share the log below."
            : "The app crashed on a previous launch. Logs are shown below."}
        </Text>

        <ScrollView style={styles.logContainer}>
          {logs.map((log, i) => (
            <View key={i} style={styles.logEntry}>
              <Text style={styles.logTime}>{log.timestamp}</Text>
              <Text style={styles.logMessage}>❌ {log.message}</Text>
              {!!log.stack && (
                <Text style={styles.logStack}>{log.stack}</Text>
              )}
              {!!log.extra && (
                <Text style={styles.logStack}>{log.extra}</Text>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.buttons}>
          <Pressable
            style={[styles.btn, styles.shareBtn]}
            onPress={async () => {
              const text = logs
                .map((l) => `[${l.timestamp}]\n${l.message}\n${l.stack}\n${l.extra}`)
                .join("\n\n---\n\n");
              await Share.share({ message: text, title: "Venire Crash Log" });
            }}
          >
            <Text style={styles.btnText}>📋 Share Logs</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.clearBtn]}
            onPress={async () => {
              await clearCrashLogs();
              this.setState({ hasError: false, error: null, logs: [] });
            }}
          >
            <Text style={styles.btnText}>🗑️ Clear & Continue</Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F0F0F",
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FF453A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#999",
    marginBottom: 16,
  },
  logContainer: {
    flex: 1,
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  logEntry: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingBottom: 12,
  },
  logTime: {
    fontSize: 10,
    color: "#666",
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 13,
    color: "#FF6B6B",
    fontWeight: "bold",
    marginBottom: 6,
  },
  logStack: {
    fontSize: 10,
    color: "#AAA",
    lineHeight: 16,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  shareBtn: {
    backgroundColor: "#5A31F4",
  },
  clearBtn: {
    backgroundColor: "#333",
  },
  btnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 13,
  },
});
