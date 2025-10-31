// context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../utils/axiosInstance"; 
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);  // full user details
  const [token, setToken] = useState(null); // store token separately
  const [loading, setLoading] = useState(true);
  const [loggedEmail, setLoggedEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const { signOut: clerkSignOut } = useClerkAuth();

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
      console.log("User data set successfully:", userData);
    } catch (error) {
      console.error("Error fetching user details:", error);
      throw error; // Re-throw so the calling function knows login failed
    }
  };

  // ✅ Logout function - handles both regular and Google logout
  const logout = async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.multiRemove(["token", "user", "isGuest"]);
      
      // Clear state
      setUser(null);
      setToken(null);
      
      // Sign out from Clerk if signed in
      try {
        await clerkSignOut();
      } catch (clerkError) {
        // If user wasn't signed in with Clerk, this will fail silently
        console.log("Clerk sign out:", clerkError.message);
      }
      
      console.log("Logout successful");
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        login, 
        logout, 
        loading, 
        setUser, 
        loggedEmail, 
        setLoggedEmail, 
        resetToken, 
        setResetToken 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);