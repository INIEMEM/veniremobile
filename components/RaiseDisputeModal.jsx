import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function RaiseDisputeModal({ visible, onClose, eventId, hireId }) {
  const toast = useToast();
  const { user } = useAuth();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Determine endpoint based on user role
  const isVendor = user?.role === 'vendor';
  const endpoint = isVendor ? '/vendor/disputes' : '/user/disputes';

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in both subject and description.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post(endpoint, {
        eventId: eventId || undefined,
        hireId: hireId || undefined,
        subject,
        description,
        images: [],
        videos: [],
        voiceNotes: [],
      });

      if (res.data?.success) {
        toast.success('Dispute submitted successfully.');
        setSubject('');
        setDescription('');
        onClose(res.data.data);
      } else {
        toast.error('Failed to submit dispute.');
      }
    } catch (error) {
      console.error('Raise dispute error:', error?.response?.data || error?.message);
      toast.error(error?.response?.data?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Raise a Dispute</Text>
            <TouchableOpacity onPress={() => onClose(null)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.infoText}>
              Disputes are reviewed by our admin team who will mediate between both parties.
            </Text>

            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Vendor did not complete setup"
              placeholderTextColor="#999"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Please explain in detail what happened..."
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Dispute</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_600SemiBold',
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#888',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins_500Medium',
    color: '#555',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#333',
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 120,
  },
  submitBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 30,
  },
  submitBtnDisabled: {
    backgroundColor: '#FFA19D',
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});
