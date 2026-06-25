import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const TOAST_CONFIG = {
  success: {
    icon: 'checkmark-circle',
    accent: '#22C55E',
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    title: 'Success',
  },
  error: {
    icon: 'close-circle',
    accent: '#EF4444',
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    title: 'Something went wrong',
  },
  warning: {
    icon: 'warning',
    accent: '#D97706',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    title: 'Heads up',
  },
  info: {
    icon: 'information-circle',
    accent: '#5A31F4',
    backgroundColor: '#F8F4FF',
    borderColor: '#E8DBFF',
    title: 'Note',
  },
};

const getConfig = (type = 'info') => TOAST_CONFIG[type] || TOAST_CONFIG.info;

const ToastCard = ({
  type = 'info',
  title,
  message,
  onPress,
  onClose,
}) => {
  const config = getConfig(type);
  const displayTitle = title || config.title;

  return (
    <TouchableOpacity
      activeOpacity={0.94}
      onPress={onPress}
      style={[
        styles.toastContent,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: config.accent }]}>
        <Ionicons name={config.icon} size={20} color="#FFFFFF" />
      </View>

      <View style={styles.copyWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {displayTitle}
        </Text>
        {!!message && (
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
        )}
      </View>

      {!!onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={18} color="#999" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const CustomToast = ({
  visible,
  message,
  type = 'success',
  duration = 3000,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 16,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }

    hideToast();
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onHide) onHide();
    });
  };

  if (!visible && translateY._value === -120) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <ToastCard
        type={type}
        title={getConfig(type).title}
        message={message}
        onPress={hideToast}
        onClose={hideToast}
      />
    </Animated.View>
  );
};

export const toastConfig = {
  success: ({ text1, text2 }) => (
    <ToastCard type="success" title={text1} message={text2} />
  ),
  error: ({ text1, text2 }) => (
    <ToastCard type="error" title={text1} message={text2} />
  ),
  warning: ({ text1, text2 }) => (
    <ToastCard type="warning" title={text1} message={text2} />
  ),
  info: ({ text1, text2 }) => (
    <ToastCard type="info" title={text1} message={text2} />
  ),
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 88 : 72,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 999,
  },
  toastContent: {
    width: width - 32,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#5A31F4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  copyWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
    color: '#1A1A1A',
  },
  message: {
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#666',
    lineHeight: 17,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default CustomToast;
