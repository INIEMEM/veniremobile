import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import api from "../../utils/axiosInstance";
import Toast from 'react-native-toast-message';
import CustomLoader from "../../components/CustomFormLoader";
import { useAuth } from "../../context/AuthContext";

// import '../../assets/'
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
 

  const handleLogin = async () => {
    // Simulated login logic (replace with API call)
    if (email === "" || password === "") {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'All fields are required.'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      const res = await api.post("/auth/login", { email, password });

      const token = res.data?.token ;
      if (!token) throw new Error("No token returned from server.");

      await login(token);
      router.replace("/(tabs)/Home");

      console.log("Login successful:", res.data);
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Try again.";

        // Request failed with status code 401
        if(message.includes("401")){
          Toast.show({
            type: 'error',
            text1: 'Login Failed',
            text2: 'Invalid email or password.'
          });
        }
        
      // Alert.alert("Login Error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExplore = async () => {
    await AsyncStorage.setItem("isGuest", "true");
    router.replace("/(tabs)/Home");
  };

  return (
    <View style={styles.container}>
      {/* Show loader when submitting */}
      {isSubmitting && <CustomLoader />}
      {/* App Logo */}
      
      <Image
        source={require("../../assets/splash.png")}
        style={styles.logo}
      />

      {/* App Name */}
      <Text style={styles.appName}>Venire</Text>
      <Text style={styles.welcomeText}>Welcome back, log in to discover</Text>
      <Text style={styles.welcomeText}>new events!</Text>

      {/* Login Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          // placeholder="Enter your email"
          placeholderTextColor="#999"
          keyboardType="email-address"
        />
         
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          // placeholder="Enter your password"
          placeholderTextColor="#999"
          secureTextEntry
        />
        <TouchableOpacity style={styles.fgPwd} onPress={()=> router.replace('/auth/forgot')}>
          <Text style={styles.fgPwdText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
      
      {/* Group all the buttons together */}


      <View style={{paddingHorizontal: 24, width: '100%'}}>
          {/* Buttons */}
      <TouchableOpacity style={[styles.button, styles.loginButton]} onPress={handleLogin}>
        <Text style={styles.loginText}>{isSubmitting ? "Logging in..." : "Login"}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.signupButton]}
        onPress={() => router.push("/auth/signup")}
      >
        <Text style={styles.signupText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.exploreButton]}
        onPress={handleExplore}
      >
        <Text style={styles.exploreText}>Explore</Text>
      </TouchableOpacity>
      </View>
      {/* Google auth here  */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 0,
    justifyContent: "center",
    alignItems: "center",
    // fontFamily: "Urbanist_400Regular",
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 12,
    resizeMode: "contain",
    // fontFamily: "Urbanist_400Regular",
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#5A31F4",
    textAlign: "center",
    marginBottom: 4,
    // fontFamily: "Urbanist_400Regular",
    fontFamily: "Poppins_400Regular",

  },
  welcomeText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    // fontFamily: "Urbanist_400Regular",
    fontFamily: "Poppins_400Regular",
  },
  form: {
    width: "100%",
    marginTop: 40,
    marginBottom: 30,
    paddingHorizontal: 24,
    // fontFamily: "Urbanist_400Regular",
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
    // fontFamily: "Urbanist_400Regular",
    fontFamily: "Poppins_400Regular",

  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    marginBottom: 20,
    fontSize: 15,
    color: "#666",
    // fontFamily: "Urbanist_400Regular",
    fontFamily: "Poppins_400Regular",
    
  },
  button: {
    width: "100%",
    height: 51,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    // fontFamily: "Urbanist_400Regular",
    fontFamily: "Poppins_400Regular",
    // paddingHorizontal: 24,

  },
  loginButton: {
    backgroundColor: "#5A31F4",
    // fontFamily: "Urbanist_400Regular",
  },
  loginText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    // fontFamily: "Urbanist_400Regular",
    fontFamily: "Poppins_600SemiBold",

  },
  signupButton: {
    backgroundColor: "#F3EDFF",
    // fontFamily: "Urbanist_400Regular",
  },
  signupText: {
    color: "#5A31F4",
    fontWeight: "700",
    fontSize: 16,
    // fontFamily: "Urbanist_400Regular",

    fontFamily: "Poppins_600SemiBold",

  },
  exploreButton: {
    backgroundColor: "#eee",
  },
  exploreText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 16,
    // fontFamily: "Urbanist_400Regular",
    fontFamily: "Poppins_600SemiBold",

  },
  fgPwd:{
    display: 'flex',
    alignItems: "flex-end",
   
  },
  fgPwdText:{
    color: '#5A31F4',
    fontWeight:600,
    // fontFamily: "Urbanist_400Regular",
    fontFamily: "Poppins_400Regular",

  }
});
