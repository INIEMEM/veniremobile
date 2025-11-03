import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Platform,
  Keyboard,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CustomKeyboardInput = ({
  value,
  onChangeText,
  placeholder,
  multiline = true,
  maxHeight = 120,
  label,
  onSubmit,
  visible,
  onClose,
  autoFocus = true,
}) => {
  const insets = useSafeAreaInsets();
  const [inputHeight, setInputHeight] = useState(40);
  const keyboardTranslateY = useRef(new Animated.Value(500)).current;
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.spring(keyboardTranslateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }).start(() => {
        if (autoFocus && inputRef.current) {
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }
      });
    } else {
      // Animate out
      Animated.timing(keyboardTranslateY, {
        toValue: 500,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        Keyboard.dismiss();
      });
    }
  }, [visible]);

  const handleContentSizeChange = (event) => {
    if (multiline) {
      const h = event.nativeEvent.contentSize.height;
      setInputHeight(Math.min(Math.max(40, h), maxHeight));
    }
  };

  const handleSend = () => {
    onSubmit?.();
    onClose?.();
  };

  if (!visible) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardAvoidingView}
    >
      <Animated.View
        style={[
          styles.customKeyboardContainer,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            transform: [{ translateY: keyboardTranslateY }],
          },
        ]}
      >
        {/* Header with Label and Close Button */}
        <View style={styles.header}>
          {label && <Text style={styles.floatingLabel}>{label}</Text>}
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Input Container */}
        <View style={styles.customInputContainer}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#999"
            multiline={multiline}
            onContentSizeChange={handleContentSizeChange}
            style={[
              styles.customInput,
              multiline && { height: Math.max(40, inputHeight) },
            ]}
            returnKeyType="done"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  customKeyboardContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  floatingLabel: {
    fontSize: 13,
    color: '#5A31F4',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    marginRight: -4,
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '400',
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    marginBottom: 8,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    paddingRight: 8,
  },
  sendButton: {
    backgroundColor: '#5A31F4',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CustomKeyboardInput;