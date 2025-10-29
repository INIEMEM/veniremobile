import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import api from "../../utils/axiosInstance";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomLoader from "../../components/CustomFormLoader";
import { useAuth } from "../../context/AuthContext";
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import {
//   GoogleSignin,
//   GoogleSigninButton,
//   statusCodes,
// } from '@react-native-google-signin/google-signin';
// import * as WebBrowser from 'expo-web-browser';
// import * as Google from 'expo-auth-session/providers/google';


WebBrowser.maybeCompleteAuthSession();
export default function SignupScreen() {
  // GoogleSignin.configure({
  //   webClientId: '431768632462-k4mlc652auqkq5f8khcjf4nudt8e81rr.apps.googleusercontent.com', 
  // });
  // useEffect(() => {
  //   GoogleSignin.configure({
  //     webClientId: "431768632462-k4mlc652auqkq5f8khcjf4nudt8e81rr.apps.googleusercontent.com",
  //     offlineAccess: true, // for server-side auth if needed
  //     scopes: ["profile", "email"],
  //   });
  // }, []);
  // const signInWithGoogle = async () => {
  //   try {
  //     await GoogleSignin.hasPlayServices({
  //       showPlayServicesUpdateDialog: true,
  //     });

  //     const userInfo = await GoogleSignin.signIn();

  //     const idToken = userInfo?.idToken;
  //     if (!idToken) {
  //       throw new Error("No ID token received from Google");
  //     }

  //     // Send token to backend
  //     const res = await fetch(
  //       "https://venire-backend.onrender.com/api/auth/google/login",
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ idToken }),
  //       }
  //     );

  //     const data = await res.json();

  //     if (!res.ok) {
  //       throw new Error(data?.message || "Failed to login with Google");
  //     }

  //     // Store JWT from backend
  //     await AsyncStorage.setItem("authToken", data.jwt);

  //     Toast.show({
  //       type: "success",
  //       text1: "Login Successful 🎉",
  //       text2: "Welcome to Venire!",
  //     });

  //     router.replace("/(tabs)/Home");
  //   } catch (error) {
  //     console.error("Google Sign-In Error:", error);
  //     if (error.code === statusCodes.SIGN_IN_CANCELLED) {
  //       // user cancelled the login flow
  //       return;
  //     } else if (error.code === statusCodes.IN_PROGRESS) {
  //       return Toast.show({
  //         type: "info",
  //         text1: "Google Sign-In",
  //         text2: "Sign-In already in progress.",
  //       });
  //     } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
  //       return Toast.show({
  //         type: "error",
  //         text1: "Google Play Services Error",
  //         text2: "Google Play Services not available or outdated.",
  //       });
  //     } else {
  //       Toast.show({
  //         type: "error",
  //         text1: "Google Sign-In Failed",
  //         text2: error.message || "Something went wrong.",
  //       });
  //     }
  //   }
  // };
  // const [request, response, promptAsync] = Google.useAuthRequest({
  //   webClientId: '431768632462-k4mlc652auqkq5f8khcjf4nudt8e81rr.apps.googleusercontent.com',
  //   iosClientId: '431768632462-0mv02q7p3ocvepa21bqdrb0ornqqgru4.apps.googleusercontent.com',
  //   scopes: ['profile', 'email'],

  // });

  // useEffect(() => {
  //   if (response?.type === 'success') {
  //     const { authentication } = response;
  //     handleGoogleLogin(authentication.accessToken);
  //   }
  // }, [response]);

  // const handleGoogleLogin = async (token) => {
  //   try {
  //     const res = await fetch("https://venire-backend.onrender.com/api/auth/google/login", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ idToken: token }),
  //     });

  //     const data = await res.json();
  //     if (!res.ok) throw new Error(data?.message || "Google login failed");

  //     await AsyncStorage.setItem("authToken", data.jwt);
  //     Toast.show({ type: "success", text1: "Login Successful 🎉", text2: "Welcome to Venire!" });
  //     router.replace("/(tabs)/Home");
  //   } catch (error) {
  //     Toast.show({
  //       type: "error",
  //       text1: "Google Sign-In Failed",
  //       text2: error.message,
  //     });
  //   }
  // };

  // co
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {setLoggedEmail} = useAuth()
  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSignup = async () => {
    const { firstName, lastName, email, password, confirmPassword } = form;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return Toast.show({
        type: "error",
        text1: "Error",
        text2: "All fields are required.",
      });
    }

    if (password !== confirmPassword) {
      return Toast.show({
        type: "error",
        text1: "Password Mismatch",
        text2: "Passwords do not match.",
      });
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/auth/register", {
        firstname:firstName,
        lastname:lastName,
        email:email,
        password:password,
        password_confirm: confirmPassword
      });
      setLoggedEmail(email)
      Toast.show({
        type: "success",
        text1: "Account Created 🎉",
        text2: "You can now log in to Venire.",
      });

      
      router.replace("/auth/checksignupmail");
     
    } catch (error) {
      console.error(error.response);
      const message =
        error.response?.data?.message || "Signup failed. Please try again.";
      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2: message,
      });
    } finally {
      setIsSubmitting(false);
    }
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
      <Text style={styles.welcomeText}>Create an account to start</Text>
      <Text style={styles.welcomeText}>discovering events!</Text>

      {/* Signup Form */}
      <View style={styles.form}>
        <View style={styles.row}>
          <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={form.firstName}
              onChangeText={(text) => handleChange("firstName", text)}
              placeholderTextColor="#999"
            />
          </View>
          <View style={[styles.inputContainer, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={form.lastName}
              onChangeText={(text) => handleChange("lastName", text)}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={form.email}
          onChangeText={(text) => handleChange("email", text)}
          keyboardType="email-address"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={form.password}
          onChangeText={(text) => handleChange("password", text)}
          secureTextEntry
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          value={form.confirmPassword}
          onChangeText={(text) => handleChange("confirmPassword", text)}
          secureTextEntry
          placeholderTextColor="#999"
        />
      </View>

      {/* Signup Button */}
      <View style={{width:' 100%', paddingHorizontal: 24}}>

          <TouchableOpacity
            style={[styles.button, styles.signupButton]}
            onPress={handleSignup}
          >
            <Text style={styles.signupText}>
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </Text>
          </TouchableOpacity>
      </View>

      {/* Login Redirect */}
      <TouchableOpacity>
        <Text style={styles.loginRedirect}>Sign in with Google</Text>
      </TouchableOpacity>


      {/* Google auth here */}

      <TouchableOpacity onPress={() => router.push("/auth/login")}>
        <Text style={styles.loginRedirect}>
          Already have an account?{" "}
          <Text style={styles.loginLink}>Login</Text>
        </Text>
      </TouchableOpacity>

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
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 12,
    resizeMode: "contain",
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#5A31F4",
    textAlign: "center",
    marginBottom: 4,
    fontFamily: "Poppins_600SemiBold",
  },
  welcomeText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Poppins_400Regular",
    fontWeight: "600",
  },
  form: {
    width: "100%",
    marginTop: 40,
    marginBottom: 30,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputContainer: {
    flex: 1,
    fontFamily: "Poppins_400Regular",
  },
  label: {
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
    fontFamily: "Poppins_400Regular",

  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingVertical: 8,
    marginBottom: 20,
    fontSize: 15,
    color: "#666",
    fontFamily: "Poppins_400Regular",
  },
  button: {
    width: "100%",
    height: 51,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  signupButton: {
    backgroundColor: "#5A31F4",
  },
  signupText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
    fontFamily: "Poppins_400Regular",

  },
  loginRedirect: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    fontFamily: "Poppins_400Regular",

  },
  loginLink: {
    color: "#5A31F4",
    fontWeight: "700",
    fontFamily: "Poppins_500Medium",

  },
});
