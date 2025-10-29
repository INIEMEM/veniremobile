import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import api from "../utils/axiosInstance";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from "@react-native-async-storage/async-storage";
export default function EditProfile() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [form, setForm] = useState({
    firstname: "",
    lastname: "",
    country: "",
    phone: "",
    gender: "",
    about: "",
    state: "",
    dob: new Date(),
  });

  const [loading, setLoading] = useState(false);

  // ✅ Prefill the form when user data is available
  useEffect(() => {
    if (user) {
      setForm({
        firstname: user.firstname || "",
        lastname: user.lastname || "",
        country: user.country || "",
        phone: user.phone || "",
        gender: user.gender || "",
        about: user.about || "",
        state: user.state || "",
        dob: user.dob || "",

      });
    }
  }, [user]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await api.put("/auth/profile", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        Alert.alert("✅ Success", "Profile updated successfully!");

        // Update global user state
        setUser(response.data.data);

        // Navigate back
        router.back();
      } else {
        Alert.alert("Error", response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error(error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update profile"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20, gap:20 }}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#444" />
        </TouchableOpacity>
      <Text style={styles.title}>Edit Profile</Text>
        
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          value={form.firstname}
          onChangeText={(text) => handleChange("firstname", text)}
          placeholder="Enter first name"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          value={form.lastname}
          onChangeText={(text) => handleChange("lastname", text)}
          placeholder="Enter last name"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>State</Text>
        <TextInput
          style={styles.input}
          value={form.state}
          onChangeText={(text) => handleChange("state", text)}
          placeholder="Enter state"
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Date of Birth</Text>

        <TouchableOpacity
              style={styles.input}
              onPress={() => setShowPicker(true)}
            >
              <Text style={{ color: form.dob ? "#333" : "#aaa" }}>
                {form.dob
                  ? new Date(form.dob).toDateString()
                  : "Select your date of birth"}
              </Text>
            </TouchableOpacity>

            {showPicker && (
              <DateTimePicker
                value={form.dob ? new Date(form.dob) : new Date()}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  setShowPicker(false);
                  if (selectedDate) handleChange("dob", selectedDate);
                }}
              />
            )}
       </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Country</Text>
        <TextInput
          style={styles.input}
          value={form.country}
          onChangeText={(text) => handleChange("country", text)}
          placeholder="Enter country"
          // keyboardType="email-address"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={(text) => handleChange("phone", text)}
          placeholder="Enter phone"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Gender</Text>
        <TextInput
          style={styles.input}
          value={form.gender}
          onChangeText={(text) => handleChange("gender", text)}
          placeholder="Male / Female"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>About</Text>
        <TextInput
          style={[styles.input, { height: 100 }]}
          multiline
          value={form.about}
          onChangeText={(text) => handleChange("about", text)}
          placeholder="Tell us something about yourself"
        />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 60,
    backgroundColor: "#fff",
    flexGrow: 1,
    // marginTop: 30,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
    color: '#555'
  },
  formGroup: {
    marginBottom: 15,
    marginTop: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 5,
    fontFamily: "Poppins_300Light",
    color: '#444'

  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color:  "#555",
    fontFamily: "Poppins_400Regular",
    // backgroundColor: "#fafafa",
  },
  button: {
    backgroundColor: "#5A31F4",
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
