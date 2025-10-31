// utils/axiosInstance.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const baseURL = "https://venire-backend.onrender.com/api/v1";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// List of endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot',
  '/auth/reset',
  '/event/explore',  // Public explore endpoint
];

// Check if endpoint is public
const isPublicEndpoint = (url) => {
  return PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// Interceptor to attach token automatically for protected routes
api.interceptors.request.use(async (config) => {
  // Skip auth for public endpoints UNLESS explicitly set
  const skipAuth = config.skipAuth || isPublicEndpoint(config.url);
  
  if (!skipAuth) {
    const token = await AsyncStorage.getItem("token");
    const isGuest = await AsyncStorage.getItem("isGuest");
    
    // Only add token if user is not a guest and token exists
    if (token && isGuest !== "true") {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401) {
      console.log("Unauthorized: handling 401 error...");
      
      // Check if this is a guest trying to access protected content
      const isGuest = await AsyncStorage.getItem("isGuest");
      
      if (isGuest === "true") {
        // Guest users should not trigger logout
        console.log("Guest user hit protected endpoint, skipping redirect");
        return Promise.reject(error);
      }

      // For authenticated users, clear token and redirect
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      
      // Only redirect if not already on auth screen
      const currentRoute = router.pathname;
      if (!currentRoute?.includes('/auth/')) {
        router.replace("/auth/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;