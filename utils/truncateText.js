import React from "react";
import { StyleSheet, Text } from "react-native";

export function truncateText(text, maxLength, type) {
  if (text.length <= maxLength) {
    return <Text>{text}</Text>;
  }

  return (
    <Text>
      {text.slice(0, maxLength)}
      {type === "long" ? (
        <Text style={styles.text}> See more</Text>
      ) : (
        "..."
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
 
  text: {
    fontFamily: "Poppins_600SemiBold",
    color: "#5A31F4"
  },
  
});

