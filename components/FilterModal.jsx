import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const FilterModal = ({ visible, onClose, selectedFilter, onSelectFilter }) => {
  const filters = [
    { id: "all", label: "All Events", icon: "grid-outline" },
    { id: "ongoing", label: "Happening Now", icon: "play-circle-outline" },
    { id: "pending", label: "Upcoming", icon: "time-outline" },
    { id: "completed", label: "Past Events", icon: "checkmark-circle-outline" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity activeOpacity={1}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter Events</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.filterList}>
                {filters.map((filter) => (
                  <TouchableOpacity
                    key={filter.id}
                    style={[
                      styles.filterItem,
                      selectedFilter === filter.id && styles.filterItemActive,
                    ]}
                    onPress={() => {
                      onSelectFilter(filter.id);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.filterItemLeft}>
                      <View
                        style={[
                          styles.iconContainer,
                          selectedFilter === filter.id &&
                            styles.iconContainerActive,
                        ]}
                      >
                        <Ionicons
                          name={filter.icon}
                          size={22}
                          color={
                            selectedFilter === filter.id ? "#5A31F4" : "#666"
                          }
                        />
                      </View>
                      <Text
                        style={[
                          styles.filterLabel,
                          selectedFilter === filter.id &&
                            styles.filterLabelActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </View>

                    {selectedFilter === filter.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#5A31F4"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  modalContent: {
    paddingHorizontal: width * 0.05,
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Poppins_600SemiBold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  filterList: {
    marginBottom: 20,
  },
  filterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#f8f8f8",
  },
  filterItemActive: {
    backgroundColor: "#f8f4ff",
    borderWidth: 1,
    borderColor: "#e8dbff",
  },
  filterItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerActive: {
    backgroundColor: "#f0e8ff",
  },
  filterLabel: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#666",
  },
  filterLabelActive: {
    color: "#5A31F4",
    fontFamily: "Poppins_600SemiBold",
  },
  applyButton: {
    backgroundColor: "#5A31F4",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  applyButtonText: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
});

export default FilterModal;