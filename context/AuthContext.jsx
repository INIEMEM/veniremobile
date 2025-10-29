// context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/axiosInstance"; 

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);  // full user details
  const [token, setToken] = useState(null); // store token separately
  const [loading, setLoading] = useState(true);
  const [loggedEmail, setLoggedEmail] = useState(true);
  const [resetToken, setResetToken] = useState('')

  // ✅ Load token + user when app starts
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedToken) setToken(storedToken);
        if (storedUser) setUser(JSON.parse(storedUser));

      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // ✅ Login function: Save token, fetch user, save user
  const login = async (token) => {
    try {
      // Save token in storage
      await AsyncStorage.setItem("token", token);
      setToken(token);

      // Fetch user details
      const res = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = res.data?.data;
      
      if (!userData) throw new Error("No user data returned from server");

      // Save user to AsyncStorage
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      console.log('the userData is set', user)
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  // ✅ Logout function
  const logout = async () => {
    await AsyncStorage.multiRemove(["token", "user", "isGuest"]);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, setUser, loggedEmail, setLoggedEmail, resetToken, setResetToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
