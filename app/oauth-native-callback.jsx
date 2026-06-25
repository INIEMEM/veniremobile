import { ActivityIndicator, StyleSheet, View } from "react-native";

export default function OAuthNativeCallback() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#5A31F4" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
});
