import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const FilterModal = ({ visible, onClose, selectedFilter, onSelectFilter }) => {
  const [localFilter, setLocalFilter] = useState({
    status: "all",
    distance: "any",
    price: "all",
    date: "any",
  });

  useEffect(() => {
    if (visible && selectedFilter) {
      if (typeof selectedFilter === 'string') {
        setLocalFilter({ status: selectedFilter, distance: "any", price: "all", date: "any" });
      } else {
        setLocalFilter(selectedFilter);
      }
    }
  }, [visible, selectedFilter]);

  const updateLocal = (key, val) => {
    setLocalFilter((prev) => ({ ...prev, [key]: val }));
  };

  const handleApply = () => {
    onSelectFilter(localFilter);
    onClose();
  };

  const clearFilters = () => {
    setLocalFilter({ status: "all", distance: "any", price: "all", date: "any" });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Smart Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Status Section */}
            <Text style={styles.sectionTitle}> Status</Text>
            <View style={styles.chipRow}>
              {[{ id: "all", label: "All" }, { id: "ongoing", label: "Live" }, { id: "pending", label: "Upcoming" }, { id: "completed", label: "Past" }].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, localFilter.status === item.id && styles.chipActive]}
                  onPress={() => updateLocal('status', item.id)}
                >
                  <Text style={[styles.chipText, localFilter.status === item.id && styles.chipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Distance Section */}
            <Text style={styles.sectionTitle}>Distance</Text>
            <View style={styles.chipRow}>
              {[{ id: "any", label: "Anywhere" }, { id: "5", label: "Within 5km" }, { id: "10", label: "Within 10km" }, { id: "50", label: "Within 50km" }].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, localFilter.distance === item.id && styles.chipActive]}
                  onPress={() => updateLocal('distance', item.id)}
                >
                  <Text style={[styles.chipText, localFilter.distance === item.id && styles.chipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price Section */}
            <Text style={styles.sectionTitle}>Price</Text>
            <View style={styles.chipRow}>
              {[{ id: "all", label: "Any Price" }, { id: "free", label: "Free Only" }, { id: "paid", label: "Paid Only" }].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, localFilter.price === item.id && styles.chipActive]}
                  onPress={() => updateLocal('price', item.id)}
                >
                  <Text style={[styles.chipText, localFilter.price === item.id && styles.chipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Section */}
            <Text style={styles.sectionTitle}>Date</Text>
            <View style={styles.chipRow}>
              {[{ id: "any", label: "Any Date" }, { id: "today", label: "Today" }, { id: "weekend", label: "This Weekend" }].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, localFilter.date === item.id && styles.chipActive]}
                  onPress={() => updateLocal('date', item.id)}
                >
                  <Text style={[styles.chipText, localFilter.date === item.id && styles.chipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Show Results</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
    marginTop: 15,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f8f8f8",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chipActive: {
    backgroundColor: "#5A31F4",
    borderColor: "#5A31F4",
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#666",
  },
  chipTextActive: {
    color: "#fff",
  },
  footerRow: {
    flexDirection: "row",
    gap: 15,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  clearButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#666",
  },
  applyButton: {
    flex: 2,
    backgroundColor: "#5A31F4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
});

export default FilterModal;