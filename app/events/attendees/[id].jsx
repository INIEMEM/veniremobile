import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../../../utils/axiosInstance';
import { useToast } from '../../../context/ToastContext';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function MarkPresentScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [ticketId, setTicketId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const scannedTickets = useRef(new Set()).current; // Prevent duplicate rapid scans

  const handleMarkPresent = async (manualTicketId = null) => {
    const targetTicket = typeof manualTicketId === 'string' ? manualTicketId : ticketId;
    const trimmedTicket = targetTicket.trim();
    
    if (!trimmedTicket) {
      toast('Please enter a valid Ticket ID');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/event/attend', {
        eventId: id,
        ticket: trimmedTicket,
      });
      
      if (res.data?.success || res.status === 200 || res.status === 201) {
        toast('Attendee successfully marked as present!');
        setTicketId('');
        // Resume scanning after 2 seconds
        setTimeout(() => setScanning(true), 2000);
      } else {
        toast(res.data?.message || 'Failed to mark as present.');
        setTimeout(() => setScanning(true), 2000);
      }
    } catch (e) {
      console.log('Mark present error:', e?.response?.data || e?.message);
      toast(e?.response?.data?.error || e?.response?.data?.message || 'Failed to check in attendee.');
      setTimeout(() => setScanning(true), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = ({ data }) => {
    if (!scanning) return;
    
    try {
      const parsedData = JSON.parse(data);
      if (parsedData.ticket) {
        // Only process if we haven't just scanned this ticket
        if (!scannedTickets.has(parsedData.ticket)) {
          setScanning(false);
          scannedTickets.add(parsedData.ticket);
          setTicketId(parsedData.ticket);
          handleMarkPresent(parsedData.ticket);
        }
      } else {
        toast("Invalid QR code format. Missing ticket ID.");
      }
    } catch (e) {
      // If it's not JSON, maybe it's just the raw ticket ID
      if (!scannedTickets.has(data)) {
        setScanning(false);
        scannedTickets.add(data);
        setTicketId(data);
        handleMarkPresent(data);
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Check-in Attendee</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        
        {/* Camera Section */}
        <View style={styles.cameraContainer}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Ionicons name="camera-outline" size={40} color="#999" style={{marginBottom: 10}}/>
              <Text style={styles.permissionText}>We need your permission to show the camera</Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                <Text style={styles.permissionBtnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView 
              style={styles.camera} 
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={scanning ? handleBarcodeScanned : undefined}
            >
              <View style={styles.overlay}>
                <View style={styles.scanTarget} />
                {!scanning && (
                  <View style={styles.processingBadge}>
                    <ActivityIndicator color="#FFF" size="small" style={{marginRight: 8}}/>
                    <Text style={styles.processingText}>Processing...</Text>
                  </View>
                )}
              </View>
            </CameraView>
          )}
        </View>

        <Text style={styles.title}>Or enter manually</Text>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Ticket ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 6a39e13e2a2603a3e9c0f716"
            value={ticketId}
            onChangeText={setTicketId}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity 
          style={[styles.btn, (!ticketId.trim() || loading) && styles.btnDisabled]} 
          onPress={() => handleMarkPresent(ticketId)}
          disabled={!ticketId.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>Check-in / Mark Present</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { padding: 5 },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#1A1A1A' },
  content: { flex: 1, padding: 24, alignItems: 'center' },
  cameraContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTarget: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  processingBadge: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    bottom: 20,
  },
  processingText: {
    color: '#FFF',
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  permissionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  permissionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFF',
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 18, color: '#1A1A1A', marginBottom: 16, alignSelf: 'flex-start' },
  inputBox: { width: '100%', marginBottom: 24 },
  inputLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#444', marginBottom: 8 },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 12, paddingHorizontal: 16, height: 52,
    fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#1A1A1A',
  },
  btn: {
    backgroundColor: '#10B981',
    width: '100%', height: 52, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#FFF' },
});
