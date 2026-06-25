import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

export default function ManagingStaffScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState(null);

  useEffect(() => {
    fetchStaffList();
  }, [id]);

  const fetchStaffList = async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(`mockStaff_${id}`);
      if (data) {
        setStaffList(JSON.parse(data));
      }
    } catch (error) {
      console.error("Error fetching staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    // Mocking an immediate resolution of backend search via timeout
    setTimeout(() => {
      setSearching(false);
      // Generate a mock user from the query
      setFoundUser({
        _id: `usr_mock_${Math.random().toString(36).substring(7)}`,
        firstname: "Worker",
        lastname: searchQuery.split("@")[0],
        email: searchQuery.trim().toLowerCase(),
        profile_picture: "https://via.placeholder.com/150/FAB843/FFFFFF?text=W"
      });
    }, 800);
  };

  const handleAddStaff = async () => {
    if (!foundUser) return;

    // Check if already in list
    if (staffList.some(s => s.email === foundUser.email)) {
      Toast.show({ type: "error", text1: "User is already an event worker." });
      return;
    }

    try {
      const updatedList = [...staffList, foundUser];
      await AsyncStorage.setItem(`mockStaff_${id}`, JSON.stringify(updatedList));
      setStaffList(updatedList);
      setFoundUser(null);
      setSearchQuery('');
      Toast.show({ type: "success", text1: "Staff member added successfully!" });
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to add staff." });
    }
  };

  const handleRemoveStaff = async (staffId) => {
    try {
      const updatedList = staffList.filter(s => s._id !== staffId);
      await AsyncStorage.setItem(`mockStaff_${id}`, JSON.stringify(updatedList));
      setStaffList(updatedList);
      Toast.show({ type: "success", text1: "Staff member removed." });
    } catch (error) {
      Toast.show({ type: "error", text1: "Failed to remove staff." });
    }
  };

  const renderStaffItem = ({ item }) => (
    <View style={styles.staffCard}>
      <View style={styles.staffInfoRow}>
        <Image source={{ uri: item.profile_picture }} style={styles.avatar} />
        <View style={styles.staffTextGroup}>
          <Text style={styles.staffName}>{item.firstname} {item.lastname}</Text>
          <Text style={styles.staffEmail}>{item.email}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={() => handleRemoveStaff(item._id)} style={styles.removeBtn}>
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Event Staff</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Add New Staff</Text>
        <Text style={styles.instruction}>
          Search users by their registered email address to grant them ticket scanning permissions.
        </Text>

        <View style={styles.searchRow}>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#999" style={styles.searchIcon} />
            <TextInput 
              style={styles.input}
              placeholder="worker@example.com"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
            {searching ? (
               <ActivityIndicator size="small" color="#FFF" />
            ) : (
               <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>

        {foundUser && (
          <View style={styles.foundUserCard}>
            <View style={styles.staffInfoRow}>
               <Image source={{ uri: foundUser.profile_picture }} style={styles.avatar} />
               <View style={styles.staffTextGroup}>
                 <Text style={styles.staffName}>{foundUser.firstname} {foundUser.lastname}</Text>
                 <Text style={styles.staffEmail}>{foundUser.email}</Text>
               </View>
            </View>
            <TouchableOpacity style={styles.addBtn} onPress={handleAddStaff}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.divider} />

        <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Current Event Staff ({staffList.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#5A31F4" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={staffList}
            keyExtractor={(item) => item._id}
            renderItem={renderStaffItem}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No staff members added yet.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    color: '#333',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#Fafafa'
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  instruction: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#777',
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#333',
  },
  searchBtn: {
    backgroundColor: '#5A31F4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
    height: 48,
  },
  searchBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFF',
  },
  foundUserCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 15,
  },
  staffCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  staffInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eee',
  },
  staffTextGroup: {
    flex: 1,
  },
  staffName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#333',
  },
  staffEmail: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#777',
  },
  addBtn: {
    backgroundColor: '#FAB843',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#FFF',
  },
  removeBtn: {
    padding: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  }
});
