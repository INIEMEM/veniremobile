// context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = await AsyncStorage.getItem("token");
      if (token) setUser({ token });
      setLoading(false);
    };
    loadUser();
  }, []);

  const login = async (token) => {
    await AsyncStorage.setItem("token", token);
    setUser({ token });
  };

  const logout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("isGuest");
    setUser(null);
  };


  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
