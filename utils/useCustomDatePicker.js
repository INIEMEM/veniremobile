import { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";

/**
 * useCustomDateTimePicker
 * - returns: { open, close, PickerModal, formatDateTime, selectedDateTime }
 */
export default function useCustomDateTimePicker() {
  const [visible, setVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState({ hours: "00", minutes: "00" });
  const [viewDate, setViewDate] = useState(new Date());

  const open = (opts = {}) => {
    if (opts.initialDate) {
      const init = new Date(opts.initialDate);
      setSelectedDate(init);
      setSelectedTime({
        hours: String(init.getHours()).padStart(2, "0"),
        minutes: String(init.getMinutes()).padStart(2, "0"),
      });
      setViewDate(new Date(init.getFullYear(), init.getMonth(), 1));
    } else {
      setViewDate(new Date());
    }
    setVisible(true);
  };

  const close = () => setVisible(false);

  const formatDateTime = (date) => {
    if (!date) return "";
    return date.toISOString();
  };

  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const monthNames = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  const PickerModal = ({ onSelect }) => {
    if (!visible) return null;

    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const totalDays = daysInMonth(y, m);
    const leadingEmpty = firstDayOfMonth(y, m);

    const buildGrid = () => {
      const cells = [];
      for (let i = 0; i < leadingEmpty; i++) cells.push(null);
      for (let d = 1; d <= totalDays; d++) cells.push(new Date(y, m, d));
      return cells;
    };

    const onConfirm = () => {
      if (!selectedDate) return;
      const combined = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        parseInt(selectedTime.hours),
        parseInt(selectedTime.minutes)
      );
      onSelect && onSelect(combined);
      close();
    };

    return (
      <Modal visible transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setViewDate(new Date(y, m - 1, 1))}
                style={styles.navBtn}
              >
                <Text style={styles.navText}>‹</Text>
              </TouchableOpacity>

              <View style={styles.monthLabel}>
                <Text style={styles.monthText}>{monthNames[m]} {y}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setViewDate(new Date(y, m + 1, 1))}
                style={styles.navBtn}
              >
                <Text style={styles.navText}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Week Row */}
            <View style={styles.weekRow}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w) => (
                <Text key={w} style={styles.weekText}>{w}</Text>
              ))}
            </View>

            {/* Date Grid */}
            <ScrollView style={{ maxHeight: 260 }}>
              <View style={styles.grid}>
                {buildGrid().map((cell, idx) => {
                  const isSelected =
                    cell &&
                    selectedDate &&
                    cell.getFullYear() === selectedDate.getFullYear() &&
                    cell.getMonth() === selectedDate.getMonth() &&
                    cell.getDate() === selectedDate.getDate();

                  return (
                    <TouchableOpacity
                      key={String(idx)}
                      disabled={!cell}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                      ]}
                      onPress={() => setSelectedDate(cell)}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {cell ? cell.getDate() : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Time Input Section */}
            <View style={styles.timeSection}>
              <Text style={styles.timeLabel}>Time (HH:MM)</Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={selectedTime.hours}
                  onChangeText={(t) =>
                    setSelectedTime({
                      ...selectedTime,
                      hours: t.replace(/[^0-9]/g, "").slice(0, 2),
                    })
                  }
                />
                <Text style={styles.colon}>:</Text>
                <TextInput
                  style={styles.timeInput}
                  keyboardType="number-pad"
                  maxLength={2}
                  value={selectedTime.minutes}
                  onChangeText={(t) =>
                    setSelectedTime({
                      ...selectedTime,
                      minutes: t.replace(/[^0-9]/g, "").slice(0, 2),
                    })
                  }
                />
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={close}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return {
    open,
    close,
    PickerModal,
    selectedDateTime:
      selectedDate &&
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        parseInt(selectedTime.hours),
        parseInt(selectedTime.minutes)
      ),
    formatDateTime,
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBtn: { padding: 6 },
  navText: { fontSize: 22, color: "#444" },
  monthLabel: { flex: 1, alignItems: "center" },
  monthText: { fontSize: 16, fontWeight: "600" },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  weekText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    color: "#666",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  dayCellSelected: {
    backgroundColor: "#5A31F4",
    borderRadius: 20,
  },
  dayText: { color: "#333" },
  dayTextSelected: { color: "#fff", fontWeight: "600" },
  timeSection: { marginTop: 12, alignItems: "center" },
  timeLabel: { fontWeight: "600", color: "#333", marginBottom: 6 },
  timeRow: { flexDirection: "row", alignItems: "center" },
  timeInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 50,
    textAlign: "center",
    borderRadius: 6,
  },
  colon: { marginHorizontal: 4, fontSize: 18, fontWeight: "bold" },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  cancelBtn: { padding: 10 },
  cancelText: { color: "#666" },
  confirmBtn: {
    backgroundColor: "#5A31F4",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmText: { color: "#fff", fontWeight: "600" },
});
