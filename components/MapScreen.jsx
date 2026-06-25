import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Platform,
  Animated
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Default to a central location (e.g., Lagos for Venire, or user's current loc)
const DEFAULT_REGION = {
  latitude: 6.5244,
  longitude: 3.3792,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function MapScreen({ events }) {
  const router = useRouter();
  const mapRef = useRef(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const slideAnim = useRef(new Animated.Value(height)).current;

  // Animate the bottom card when an event is selected
  useEffect(() => {
    if (selectedEvent) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [selectedEvent]);

  // Try to fit all markers when events load
  useEffect(() => {
    if (events && events.length > 0 && mapRef.current) {
      const coordinates = events
        .filter(e => e.lat && e.long)
        .map(e => ({
          latitude: parseFloat(e.lat),
          longitude: parseFloat(e.long)
        }));
      
      if (coordinates.length > 0) {
        // slight delay to ensure map is ready
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(coordinates, {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          });
        }, 500);
      }
    }
  }, [events]);

  const handleMarkerPress = (event) => {
    setSelectedEvent(event);
  };

  const closeCard = () => {
    setSelectedEvent(null);
  };

  const navigateToEvent = () => {
    if (selectedEvent) {
      router.push(`/(tabs)/Events/${selectedEvent._id}`);
    }
  };

  const getEventMedia = (event) => {
    if (event.images && event.images.length > 0) return event.images[0];
    return 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=800';
  };

  const getMarkerColor = (event) => {
    // Determine color based on status or type
    if (event.userStatus === 'ongoing') return '#FF3B30';
    if (!event.isTicket) return '#4CAF50';
    return '#5A31F4';
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {events.map((event) => {
          const lat = parseFloat(event.lat);
          const lng = parseFloat(event.long);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={event._id}
              coordinate={{ latitude: lat, longitude: lng }}
              onPress={() => handleMarkerPress(event)}
              pinColor={getMarkerColor(event)}
            />
          );
        })}
      </MapView>

      {/* Selected Event Bottom Card */}
      <Animated.View 
        style={[
          styles.eventCardContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        {selectedEvent && (
          <TouchableOpacity 
            style={styles.eventCard} 
            activeOpacity={0.9}
            onPress={navigateToEvent}
          >
            <TouchableOpacity 
              style={styles.closeBtn} 
              onPress={closeCard}
            >
              <Ionicons name="close-circle" size={24} color="#333" />
            </TouchableOpacity>
            
            <Image 
              source={{ uri: getEventMedia(selectedEvent) }} 
              style={styles.cardImage} 
            />
            
            <View style={styles.cardInfo}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {selectedEvent.name}
                </Text>
                <View style={[
                  styles.priceTag, 
                  !selectedEvent.isTicket && styles.freeTag
                ]}>
                  <Text style={[
                    styles.priceText,
                    !selectedEvent.isTicket && styles.freeText
                  ]}>
                    {selectedEvent.isTicket ? `₦${selectedEvent.ticketAmount}` : 'FREE'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.cardAddress} numberOfLines={1}>
                <Ionicons name="location" size={12} color="#666" />{' '}
                {selectedEvent.address || 'Address TBA'}
              </Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.cardDate}>
                  <Ionicons name="calendar" size={12} color="#5A31F4" />{' '}
                  {new Date(selectedEvent.start).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric'
                  })}
                </Text>
                
                <TouchableOpacity style={styles.detailsBtn} onPress={navigateToEvent}>
                  <Text style={styles.detailsBtnText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  eventCardContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  cardImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#eee',
  },
  cardInfo: {
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  priceTag: {
    backgroundColor: '#F3EDFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    color: '#5A31F4',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  freeTag: {
    backgroundColor: '#E8F5E9',
  },
  freeText: {
    color: '#4CAF50',
  },
  cardAddress: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#5A31F4',
  },
  detailsBtn: {
    backgroundColor: '#5A31F4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  detailsBtnText: {
    color: '#fff',
    fontFamily: 'Poppins_500Medium',
    fontSize: 12,
  },
});
