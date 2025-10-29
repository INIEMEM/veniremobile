// utils/axiosInstance.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
// import { EXPO_PUBLIC_API_BASE_URL } from "@env";
const baseURL = "https://venire-backend.onrender.com/api/v1";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor to attach token only when required
api.interceptors.request.use(async (config) => {
  // Check if `config.requiresAuth` is true before adding token
  if (config.requiresAuth) {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log(" Unauthorized: redirecting to login...");

      //  Clear invalid token
      await AsyncStorage.removeItem("token");

      //  Redirect to login page
      router.replace("/auth/login");
    }

    // Continue rejecting so other errors are still catchable
    return Promise.reject(error);
  }
);

export default api;
