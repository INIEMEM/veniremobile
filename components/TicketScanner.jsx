import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  Platform,
  StatusBar
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '../context/ToastContext';
import { MOCK_SCAN_RESPONSE } from '../constants/ticketMockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/axiosInstance';

const { width, height } = Dimensions.get('window');

export default function TicketScanner({ eventId, onClose }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // 'success' | 'error' | null
  const [cameraError, setCameraError] = useState(null);
  const toast = useToast();
  
  // Scanner animation line
  const scanAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('Camera permission error:', error);
        setCameraError('Unable to access the camera on this device.');
        setHasPermission(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Loop the scanner line
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 200,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [scanAnim]);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || scanning) return;
    if (!eventId) {
      toast.error('Cannot verify ticket for this event.');
      return;
    }
    
    setScanned(true);
    setScanning(true);
    setScanResult(null);
    
    try {
      let payload;
      try {
        payload = JSON.parse(data);
      } catch (e) {
        // Fallback for mock strings or legacy formats
        payload = null;
      }

      if (!payload || !payload.eventId || !payload.ticket) {
        setScanResult('error');
        toast.error('Invalid ticket QR code format.');
        setScanning(false);
        setTimeout(() => { setScanned(false); setScanResult(null); }, 3000);
        return;
      }
      
      if (payload.eventId !== eventId) {
        setScanResult('error');
        toast.error("This ticket is for a different event!");
        setScanning(false);
        setTimeout(() => { setScanned(false); setScanResult(null); }, 3000);
        return;
      }

      const token = await AsyncStorage.getItem("token");
      const res = await api.post("/event/attend", {
        eventId: payload.eventId,
        ticket: payload.ticket
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success) {
        setScanResult('success');
        toast.success(`Check-in Successful!`);
      } else {
        setScanResult('error');
        toast.error(res.data?.message || 'Invalid or fake ticket!');
      }
    } catch (error) {
      setScanResult('error');
      console.error("Scan error:", error.response?.data || error.message);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to verify ticket.');
    } finally {
      setScanning(false);
      // Automatically reset scanner after 3 seconds so they can scan the next
      setTimeout(() => {
        setScanned(false);
        setScanResult(null);
      }, 3000);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5A31F4" />
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#ccc" />
        <Text style={styles.text}>
          {cameraError || 'No access to camera'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={onClose}>
          <Text style={styles.btnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        onMountError={(event) => {
          const message = event?.nativeEvent?.message || 'Camera failed to start.';
          console.error('Camera mount error:', message);
          setCameraError(message);
          setHasPermission(false);
        }}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan Ticket</Text>
          <View style={{ width: 44 }} /> {/* Balance header */}
        </View>

        <View style={styles.scannerViewport}>
          <View style={styles.scannerFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            <Animated.View 
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanAnim }] }
              ]} 
            />

            {scanning && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#FAB843" />
                <Text style={styles.verifyingText}>Verifying...</Text>
              </View>
            )}

            {scanResult === 'success' && !scanning && (
              <View style={[styles.resultOverlay, { backgroundColor: 'rgba(34,197,94,0.9)' }]}>
                <Ionicons name="checkmark-circle" size={60} color="#FFF" />
                <Text style={styles.resultText}>VALID TICKET</Text>
              </View>
            )}

            {scanResult === 'error' && !scanning && (
              <View style={[styles.resultOverlay, { backgroundColor: 'rgba(239,68,68,0.9)' }]}>
                <Ionicons name="close-circle" size={60} color="#FFF" />
                <Text style={styles.resultText}>INVALID TICKET</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.instruction}>
            Align the QR code within the frame to scan
          </Text>
          
          {scanned && !scanning && (
            <TouchableOpacity 
              style={styles.rescanBtn} 
              onPress={() => {
                setScanned(false);
                setScanResult(null);
              }}
            >
              <Text style={styles.rescanText}>Tap to Scan Next</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#333',
    marginTop: 15,
  },
  btn: {
    marginTop: 20,
    backgroundColor: '#5A31F4',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: {
    color: '#FFF',
    fontFamily: 'Poppins_600SemiBold',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 40) + 10,
    paddingHorizontal: 20,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#FFF',
  },
  scannerViewport: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden' // for the scan line
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FAB843',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#FAB843',
    shadowColor: '#FAB843',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyingText: {
    fontFamily: 'Poppins_500Medium',
    color: '#FAB843',
    marginTop: 10,
    fontSize: 14,
  },
  resultOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: {
    fontFamily: 'Poppins_700Bold',
    color: '#FFF',
    fontSize: 18,
    marginTop: 10,
  },
  footer: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  instruction: {
    fontFamily: 'Poppins_400Regular',
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  rescanBtn: {
    backgroundColor: '#FFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  rescanText: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#000',
    fontSize: 14,
  }
});
