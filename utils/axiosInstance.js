// utils/axiosInstance.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

export default api;
