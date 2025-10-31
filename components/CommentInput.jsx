import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CommentInput({
  onSubmit,
  replyingTo,
  onCancelReply,
  submitting,
}) {
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  const handleSubmit = () => {
    if (message.trim()) {
      onSubmit(message);
      setMessage("");
    }
  };

  return (
    <View style={styles.container}>
      {replyingTo && (
        <View style={styles.replyingBar}>
          <View style={styles.replyingInfo}>
            <Ionicons name="return-down-forward" size={16} color="#5A31F4" />
            <Text style={styles.replyingText}>
              Replying to{" "}
              <Text style={styles.replyingUsername}>
                {replyingTo.userId?.firstname ||
                  replyingTo.userId?.email ||
                  "User"}
              </Text>
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
          placeholderTextColor="#999"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          editable={!submitting}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || submitting) && styles.sendButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!message.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={message.trim() ? "#fff" : "#ccc"}
            />
          )}
        </TouchableOpacity>
      </View>

      {message.length > 0 && (
        <Text style={styles.charCount}>{message.length}/500</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#fff",
    paddingBottom: Platform.OS === "ios" ? 34 : 10,
  },
  replyingBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "#f8f4ff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0d4ff",
  },
  replyingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  replyingText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#666",
  },
  replyingUsername: {
    fontFamily: "Poppins_600SemiBold",
    color: "#5A31F4",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 15,
    paddingTop: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#333",
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#5A31F4",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#e0e0e0",
  },
  charCount: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
    textAlign: "right",
    paddingHorizontal: 15,
    paddingTop: 4,
  },
});