import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MOCK_TICKETS } from '../constants/ticketMockData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import api from '../utils/axiosInstance';
import { Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get("window");

export default function TicketList() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Transfer States
  const [showTransfer, setShowTransfer] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // Refund States
  const [isRefunding, setIsRefunding] = useState(false);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      
      // Attempt to fetch from backend. If it requires eventId and returns 400, we fallback.
      let fetchedTickets = [];
      try {
        const res = await api.get("/event/interest", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success) {
          fetchedTickets = res.data.data.map(interest => {
            const isPopulated = typeof interest.eventId === 'object' && interest.eventId !== null;
            return {
              _id: interest._id,
              event: isPopulated ? interest.eventId : {
                name: "Event ID: " + interest.eventId,
                start: new Date().toISOString(),
                address: "Location info unavailable",
                images: ["https://via.placeholder.com/150"]
              },
              ticketType: interest.ticketId ? (typeof interest.ticketId === 'object' ? interest.ticketId.name : "Ticket") : "General Admission",
              price: 0, 
              quantity: interest.ticketQuantity || 1,
              status: interest.status || "valid",
              qrCodeString: JSON.stringify({
                eventId: isPopulated ? interest.eventId._id : interest.eventId,
                ticket: interest._id
              }),
              ownerName: "You",
            };
          });
        }
      } catch (apiErr) {
        console.log("Global interest fetch not supported or requires event ID, using local tickets");
      }

      if (fetchedTickets.length > 0) {
        setTickets(fetchedTickets);
      } else {
        // Fallback to local storage / mock
        const storedTicketsStr = await AsyncStorage.getItem("user_tickets_local");
        let storedTickets = storedTicketsStr ? JSON.parse(storedTicketsStr) : [];
        if (storedTickets.length === 0) {
          storedTickets = MOCK_TICKETS;
        }
        setTickets(storedTickets);
      }
    } catch (err) {
      console.error("Error loading tickets:", err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const searchUsers = async (query) => {
    setSearchQuery(query);
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await api.get(`/auth/search-users?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.success) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUser) {
      Toast.show({ type: 'error', text1: 'Select a User', text2: 'Please select a recipient first.' });
      return;
    }
    setIsTransferring(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const res = await api.put(`/event/interest-transfer/${selectedTicket._id}`, {
        newUserId: selectedUser._id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data?.success) {
        Toast.show({
          type: "success",
          text1: "Ticket Transferred! ✈️",
          text2: `Ticket sent to ${selectedUser.username || selectedUser.firstName} successfully.`
        });
        setSelectedTicket(null);
        setShowTransfer(false);
        setSelectedUser(null);
        setSearchQuery("");
        loadTickets();
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: "error", text1: "Transfer Failed", text2: err.response?.data?.message || "Please try again." });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedTicket) return;
    
    Alert.alert(
      "Confirm Cancellation",
      "Are you sure you want to cancel this ticket? This action cannot be undone.",
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            setIsRefunding(true);
            try {
              const token = await AsyncStorage.getItem("token");
              const res = await api.post("/event/interest-cancel", {
                interestId: selectedTicket._id
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              if (res.data?.success) {
                Toast.show({
                  type: "success",
                  text1: "Ticket Cancelled",
                  text2: "Your ticket has been cancelled successfully."
                });
                setSelectedTicket(null);
                loadTickets();
              }
            } catch (err) {
              console.error(err);
              Toast.show({ type: "error", text1: "Cancellation Failed", text2: err.response?.data?.message || "Please try again." });
            } finally {
              setIsRefunding(false);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const renderTicketItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.cardContainer} 
        activeOpacity={0.9} 
        onPress={() => setSelectedTicket(item)}
      >
        <View style={styles.cardTop}>
          <Image source={{ uri: item.event.images[0] }} style={styles.eventImage} />
          <View style={styles.topInfo}>
            <Text style={styles.eventName} numberOfLines={2}>{item.event.name}</Text>
            <View style={styles.timeRow}>
              <Ionicons name="calendar-outline" size={14} color="#555" />
              <Text style={styles.timeText}>{formatDate(item.event.start)}</Text>
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="location-outline" size={14} color="#555" />
              <Text style={styles.timeText} numberOfLines={1}>{item.event.address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider}>
          <View style={styles.notchLeft} />
          <View style={styles.dashedLine} />
          <View style={styles.notchRight} />
        </View>

        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.label}>Ticket Type</Text>
            <Text style={styles.value}>{item.ticketType}</Text>
          </View>
          <View style={styles.scanBadge}>
            <Ionicons name="qr-code-outline" size={20} color="#5A31F4" />
            <Text style={styles.scanText}>Tap to Scan</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: 50 }]}>
        <ActivityIndicator size="large" color="#5A31F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {tickets.length > 0 ? (
          tickets.map((item) => (
            <React.Fragment key={item._id}>
              {renderTicketItem({ item })}
            </React.Fragment>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tickets found</Text>
          </View>
        )}
      </ScrollView>

      {/* QR Code Modal for viewing full ticket */}
      <Modal visible={!!selectedTicket} transparent animationType="slide" onRequestClose={() => {
        if (!isTransferring && !isRefunding) {
          setSelectedTicket(null);
          setShowTransfer(false);
        }
      }}>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={() => {
                setSelectedTicket(null);
                setShowTransfer(false);
              }}
              disabled={isTransferring || isRefunding}
            >
              <Ionicons name="close-circle" size={32} color="#333" />
            </TouchableOpacity>

            {showTransfer ? (
              <View style={{ width: '100%', paddingVertical: 10 }}>
                <Text style={styles.modalTitleText}>Transfer Ticket</Text>
                <Text style={styles.modalSubtitleText}>
                  Search for a user to transfer your ticket to.
                </Text>
                
                <Text style={styles.modalInputLabel}>Search User</Text>
                <View style={[styles.modalFormInput, { flexDirection: 'row', alignItems: 'center', paddingVertical: 0 }]}>
                  <Ionicons name="search-outline" size={20} color="#999" />
                  <TextInput
                    style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontFamily: 'Poppins_400Regular', fontSize: 14, color: '#1A1A1A' }}
                    value={searchQuery}
                    onChangeText={searchUsers}
                    placeholder="Search by name or email"
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                  {isSearching && <ActivityIndicator size="small" color="#5A31F4" />}
                </View>

                {searchResults.length > 0 && !selectedUser && (
                  <View style={{ maxHeight: 150, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginTop: 5 }}>
                    <ScrollView nestedScrollEnabled>
                      {searchResults.map((user) => (
                        <TouchableOpacity
                          key={user._id}
                          style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center' }}
                          onPress={() => setSelectedUser(user)}
                        >
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                            <Ionicons name="person" size={18} color="#999" />
                          </View>
                          <View>
                            <Text style={{ fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#333' }}>
                              {user.firstName} {user.lastName}
                            </Text>
                            <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#666' }}>
                              {user.email}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedUser && (
                  <View style={{ marginTop: 10, padding: 12, backgroundColor: '#F3EDFF', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#5A31F4', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                        <Ionicons name="person" size={18} color="#fff" />
                      </View>
                      <View>
                        <Text style={{ fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#5A31F4' }}>
                          {selectedUser.firstName} {selectedUser.lastName}
                        </Text>
                        <Text style={{ fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#666' }}>
                          {selectedUser.email}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedUser(null)}>
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalActionRow}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalCancelBtn]}
                    onPress={() => {
                      setShowTransfer(false);
                      setSelectedUser(null);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                    disabled={isTransferring}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, styles.modalConfirmBtn]}
                    onPress={handleTransfer}
                    disabled={isTransferring || !selectedUser}
                  >
                    {isTransferring ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.modalConfirmBtnText}>Transfer Ticket</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalEventName}>{selectedTicket?.event?.name}</Text>
                  <Text style={styles.modalTicketType}>
                    {selectedTicket?.ticketType} / ₦{selectedTicket?.price?.toLocaleString()}
                  </Text>
                </View>

                <View style={styles.qrPlaceholder}>
                  {selectedTicket?.qrCodeString ? (
                    <QRCode
                      value={selectedTicket.qrCodeString}
                      size={200}
                      color="#000"
                      backgroundColor="#FFF"
                    />
                  ) : (
                    <View style={styles.qrPlaceholder}>
                      <Text style={styles.qrPlaceholderText}>QR Code Unavailable</Text>
                    </View>
                  )}
                  <Text style={styles.qrString}>{selectedTicket?._id || "N/A"}</Text>
                </View>

                <View style={styles.ticketDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{selectedTicket?.ownerName}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={[
                      styles.detailValue,
                      { 
                        color: selectedTicket?.status === 'valid' ? '#2ECC71' : 
                               selectedTicket?.status === 'used' ? '#FF9800' : 
                               selectedTicket?.status === 'refunded' ? '#FF3B30' : '#1976D2' 
                      }
                    ]}>
                      {selectedTicket?.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Cancel & Transfer Buttons - only if valid */}
                {selectedTicket?.status === 'valid' && (
                  <View style={styles.ticketActionsRow}>
                    <TouchableOpacity
                      style={[styles.ticketActionBtn, styles.transferBtn]}
                      onPress={() => setShowTransfer(true)}
                    >
                      <Ionicons name="paper-plane-outline" size={18} color="#FFF" />
                      <Text style={styles.ticketActionBtnText}>Transfer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ticketActionBtn, styles.refundBtn]}
                      onPress={handleCancel}
                      disabled={isRefunding}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#FF3B30" />
                      <Text style={[styles.ticketActionBtnText, { color: '#FF3B30' }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.instructionText}>Show this code to the event host at the entrance</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  ticketActionsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  ticketActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  transferBtn: {
    backgroundColor: '#5A31F4',
    borderColor: '#5A31F4',
  },
  refundBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#5A31F4',
  },
  ticketActionBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  modalTitleText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitleText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  modalInputLabel: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#444444',
    marginBottom: 6,
  },
  modalFormInput: {
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  modalActionRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  modalActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#F5F5F5',
  },
  modalCancelBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  modalConfirmBtn: {
    backgroundColor: '#5A31F4',
  },
  modalConfirmBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTop: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  eventImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  topInfo: {
    flex: 1,
  },
  eventName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timeText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#555',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    position: 'relative',
  },
  notchLeft: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    position: 'absolute',
    left: -10,
  },
  notchRight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    position: 'absolute',
    right: -10,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    marginHorizontal: 15,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FAFAFA',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  label: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 11,
    color: '#999',
  },
  value: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#333',
  },
  scanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3EDFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8DBFF'
  },
  scanText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#5A31F4',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 10,
    fontFamily: "Poppins_500Medium",
    color: "#999",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: '#FFF',
    width: '100%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
    position: 'relative'
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10
  },
  modalHeader: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  modalEventName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 5,
  },
  modalTicketType: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#FAB843',
  },
  qrPlaceholder: {
    width: 240,
    height: 240,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  qrString: {
    marginTop: 10,
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
    color: '#666',
    letterSpacing: 2
  },
  ticketDetails: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailItem: {
    alignItems: 'center'
  },
  detailLabel: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#888',
  },
  detailValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#333',
  },
  instructionText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#999',
    textAlign: 'center'
  }
});
