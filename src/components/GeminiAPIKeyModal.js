import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const GeminiAPIKeyModal = ({ visible, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    loadSavedKey();
  }, [visible]);

  const loadSavedKey = async () => {
    try {
      const key = await AsyncStorage.getItem('gemini_api_key');
      if (key) {
        setSavedKey(key);
        setApiKey(key);
      }
    } catch (error) {
      console.error('API 키 로드 오류:', error);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('오류', 'API 키를 입력해주세요.');
      return;
    }

    try {
      await AsyncStorage.setItem('gemini_api_key', apiKey.trim());
      Alert.alert('성공', 'API 키가 저장되었습니다.');
      onSave(apiKey.trim());
      onClose();
    } catch (error) {
      console.error('API 키 저장 오류:', error);
      Alert.alert('오류', 'API 키 저장에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      '확인',
      'API 키를 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('gemini_api_key');
              setApiKey('');
              setSavedKey('');
              Alert.alert('성공', 'API 키가 삭제되었습니다.');
            } catch (error) {
              console.error('API 키 삭제 오류:', error);
            }
          },
        },
      ]
    );
  };

  const openAPIKeyGuide = () => {
    Linking.openURL('https://makersuite.google.com/app/apikey');
  };

  const maskApiKey = (key) => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.title}>Gemini API 키 설정</Text>
              <TouchableOpacity onPress={onClose}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* 설명 */}
            <View style={styles.infoContainer}>
              <Icon name="info-outline" size={20} color="#007AFF" />
              <Text style={styles.infoText}>
                AI 갤러리 도우미를 사용하려면 Google Gemini API 키가 필요합니다.
              </Text>
            </View>

            {/* 현재 저장된 키 표시 */}
            {savedKey && (
              <View style={styles.savedKeyContainer}>
                <Text style={styles.savedKeyLabel}>현재 저장된 API 키:</Text>
                <Text style={styles.savedKeyValue}>
                  {showKey ? savedKey : maskApiKey(savedKey)}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowKey(!showKey)}
                  style={styles.eyeButton}
                >
                  <Icon 
                    name={showKey ? "visibility-off" : "visibility"} 
                    size={20} 
                    color="#666" 
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* API 키 입력 */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>API 키 입력</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="AIza..."
                placeholderTextColor="#999"
                secureTextEntry={!showKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* API 키 발급 가이드 */}
            <TouchableOpacity 
              style={styles.guideButton}
              onPress={openAPIKeyGuide}
            >
              <Icon name="open-in-new" size={16} color="#007AFF" />
              <Text style={styles.guideText}>API 키 발급 방법 보기</Text>
            </TouchableOpacity>

            {/* 안내 메시지 */}
            <View style={styles.warningContainer}>
              <Icon name="lock" size={16} color="#FF9800" />
              <Text style={styles.warningText}>
                API 키는 안전하게 기기에 저장되며, 외부로 전송되지 않습니다.
              </Text>
            </View>

            {/* 사용 안내 */}
            <View style={styles.stepsContainer}>
              <Text style={styles.stepsTitle}>API 키 발급 단계:</Text>
              <Text style={styles.stepItem}>1. Google AI Studio 접속</Text>
              <Text style={styles.stepItem}>2. Google 계정으로 로그인</Text>
              <Text style={styles.stepItem}>3. "Get API Key" 클릭</Text>
              <Text style={styles.stepItem}>4. 새 API 키 생성 또는 기존 키 복사</Text>
              <Text style={styles.stepItem}>5. 여기에 붙여넣기</Text>
            </View>

            {/* 버튼들 */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>

              {savedKey && (
                <TouchableOpacity 
                  style={[styles.button, styles.deleteButton]}
                  onPress={handleDelete}
                >
                  <Text style={styles.deleteButtonText}>삭제</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  savedKeyContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedKeyLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  savedKeyValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  eyeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
  },
  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    padding: 10,
  },
  guideText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 6,
    textDecorationLine: 'underline',
  },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },
  stepsContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  stepItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
    marginLeft: 10,
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
  },
});

export default GeminiAPIKeyModal;