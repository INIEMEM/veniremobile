import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import api from "../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

import CommentInput from "./CommentInput";
import CommentItem from "./CommentItem";

export default function CommentsSection({ eventId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const flatListRef = useRef(null);
  
  console.log('the event id', eventId);
  
  useEffect(() => {
    if (eventId) {
      fetchComments();
    }
  }, [eventId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      
      const response = await api.get(`/event/comment?eventId=${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data) {
        const topLevelComments = response.data.data.filter(
          (comment) => comment.depth === 0 || comment.commentId === null
        );
        setComments(topLevelComments);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      Toast.show({
        type: "error",
        text1: "Failed to load comments",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComments();
    setRefreshing(false);
  };

  const handlePostComment = async (message) => {
    if (!message.trim()) {
      Toast.show({
        type: "error",
        text1: "Comment cannot be empty",
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem("token");

      const payload = {
        eventId,
        message: message.trim(),
      };

      if (replyingTo) {
        payload.commentId = replyingTo._id;
      }

      const response = await api.post("/event/comment", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Toast.show({
        type: "success",
        text1: replyingTo ? "Reply posted" : "Comment posted",
      });

      setReplyingTo(null);
      await fetchComments();
    } catch (error) {
      console.error("Error posting comment:", error);
      Toast.show({
        type: "error",
        text1: "Failed to post comment",
        text2: error.response?.data?.message || "Please try again",
      });
    } finally {
      setSubmitting(false);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  };

  const handleReply = (comment) => {
    setReplyingTo(comment);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const renderComment = ({ item }) => (
    <CommentItem
      comment={item}
      onReply={handleReply}
      eventId={eventId}
      onCommentUpdate={fetchComments}
    />
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.loadingText}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Comments ({comments.length})
        </Text>
      </View>

      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No comments yet</Text>
          <Text style={styles.emptySubtext}>Be the first to comment!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
      )}

      <CommentInput
        onSubmit={handlePostComment}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        submitting={submitting}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontFamily: "Poppins_400Regular",
    color: "#666",
  },
  header: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: "#999",
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#bbb",
    marginTop: 5,
  },
  listContent: {
    paddingBottom: 10,
  },
});