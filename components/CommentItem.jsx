import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CommentItem({ comment, onReply, eventId, onCommentUpdate }) {
  const [showReplies, setShowReplies] = useState(false);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return date.toLocaleDateString();
  };

  const getProfilePicture = () => {
    return comment.userId?.profile_picture || 
      "https://via.placeholder.com/40/5A31F4/FFFFFF?text=" + 
      (comment.userId?.email?.charAt(0).toUpperCase() || "U");
  };

  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };

  return (
    <View style={styles.container}>
      <View style={styles.commentWrapper}>
        {/* Profile Picture */}
        <Image
          source={{ uri: getProfilePicture() }}
          style={styles.profilePic}
        />

        <View style={styles.contentWrapper}>
          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.username}>
              {comment.userId?.firstname || comment.userId?.email || "Anonymous"}
            </Text>
            <Text style={styles.timestamp}>
              {formatTimeAgo(comment.createdAt)}
            </Text>
          </View>

          {/* Comment Text */}
          <Text style={styles.commentText}>{comment.text}</Text>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons 
                name={comment.likes?.length > 0 ? "heart" : "heart-outline"} 
                size={16} 
                color={comment.likes?.length > 0 ? "red" : "#666"} 
              />
              <Text style={styles.actionText}>
                {comment.likes?.length || 0}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => onReply(comment)}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#666" />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          </View>

          {/* Replies Section */}
          {comment.replies && comment.replies.length > 0 && (
            <View style={styles.repliesSection}>
              <TouchableOpacity 
                style={styles.viewRepliesBtn}
                onPress={toggleReplies}
              >
                <Ionicons 
                  name={showReplies ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color="#5A31F4" 
                />
                <Text style={styles.viewRepliesText}>
                  {showReplies ? "Hide" : "View"} {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                </Text>
              </TouchableOpacity>

              {showReplies && (
                <View style={styles.repliesList}>
                  {comment.replies.map((reply) => (
                    <View key={reply._id} style={styles.replyItem}>
                      <Image
                        source={{ uri: reply.userId?.profile_picture || "https://via.placeholder.com/30" }}
                        style={styles.replyProfilePic}
                      />
                      <View style={styles.replyContent}>
                        <View style={styles.replyUserInfo}>
                          <Text style={styles.replyUsername}>
                            {reply.userId?.firstname || reply.userId?.email || "Anonymous"}
                          </Text>
                          <Text style={styles.replyTimestamp}>
                            {formatTimeAgo(reply.createdAt)}
                          </Text>
                        </View>
                        <Text style={styles.replyText}>{reply.text}</Text>
                        
                        <View style={styles.replyActions}>
                          <TouchableOpacity style={styles.replyActionBtn}>
                            <Ionicons 
                              name={reply.likes?.length > 0 ? "heart" : "heart-outline"} 
                              size={14} 
                              color={reply.likes?.length > 0 ? "red" : "#666"} 
                            />
                            <Text style={styles.replyActionText}>
                              {reply.likes?.length || 0}
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={styles.replyActionBtn}
                            onPress={() => onReply(comment)}
                          >
                            <Ionicons name="chatbubble-outline" size={14} color="#666" />
                            <Text style={styles.replyActionText}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  commentWrapper: {
    flexDirection: "row",
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eee",
  },
  contentWrapper: {
    flex: 1,
    marginLeft: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  username: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    color: "#333",
  },
  timestamp: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#999",
    marginLeft: 8,
  },
  commentText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    color: "#666",
  },
  repliesSection: {
    marginTop: 12,
  },
  viewRepliesBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  viewRepliesText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    color: "#5A31F4",
  },
  repliesList: {
    marginTop: 8,
  },
  replyItem: {
    flexDirection: "row",
    marginBottom: 12,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: "#e0e0e0",
  },
  replyProfilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#eee",
  },
  replyContent: {
    flex: 1,
    marginLeft: 10,
  },
  replyUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  replyUsername: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 13,
    color: "#333",
  },
  replyTimestamp: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#999",
    marginLeft: 6,
  },
  replyText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
    marginBottom: 6,
  },
  replyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  replyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  replyActionText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    color: "#666",
  },
});