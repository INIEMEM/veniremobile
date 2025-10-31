import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, Modal, Button } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function CustomDatePicker({ label, value, onChange }) {
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState(value ? new Date(value) : new Date());

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShow(false);
      if (selectedDate) onChange(selectedDate.toISOString());
    } else {
      if (selectedDate) setTempDate(selectedDate);
    }
  };

  const handleConfirm = () => {
    setShow(false);
    onChange(tempDate.toISOString());
  };

  return (
    <View style={{ marginBottom: 15 }}>
      <Text style={{ fontWeight: "500", marginBottom: 5, color: "#444" }}>{label}</Text>

      <TouchableOpacity
        onPress={() => setShow(true)}
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 8,
          padding: 12,
          backgroundColor: "#fff",
        }}
      >
        <Text style={{ color: value ? "#333" : "#aaa" }}>
          {value ? new Date(value).toISOString() : "Select date and time"}
        </Text>
      </TouchableOpacity>

      {/* iOS modal */}
      {Platform.OS === "ios" && show && (
        <Modal transparent animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(0,0,0,0.3)",
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                padding: 10,
              }}
            >
              <DateTimePicker
                value={tempDate}
                mode="datetime"
                display="spinner"
                onChange={onDateChange}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  marginTop: 10,
                }}
              >
                <Button title="Cancel" onPress={() => setShow(false)} />
                <Button title="Confirm" onPress={handleConfirm} />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android picker */}
      {Platform.OS === "android" && show && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode="datetime"
          display="default"
          onChange={onDateChange}
        />
      )}
    </View>
  );
}
