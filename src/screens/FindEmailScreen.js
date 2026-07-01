// src/screens/FindEmailScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';

const FindEmailScreen = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [foundEmails, setFoundEmails] = useState([]);
  const [searchCompleted, setSearchCompleted] = useState(false);

  // 전화번호 포맷팅 (010-1234-5678)
  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,4})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join('-');
    }
    return value;
  };

  const handlePhoneNumberChange = (value) => {
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
  };

  // 이메일 마스킹 처리
  const maskEmail = (email) => {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 3) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.substring(0, 3)}***@${domain}`;
  };

  const handleFindEmail = async () => {
    if (!phoneNumber) {
      Alert.alert('알림', '전화번호를 입력해주세요.');
      return;
    }

    if (phoneNumber.replace(/-/g, '').length !== 11) {
      Alert.alert('알림', '올바른 전화번호 형식이 아닙니다.');
      return;
    }

    setLoading(true);
    setFoundEmails([]);
    setSearchCompleted(false);

    try {
      // Firestore에서 전화번호로 사용자 검색
      const cleanedPhone = phoneNumber.replace(/-/g, '');
      const usersSnapshot = await firestore()
        .collection('users')
        .where('phoneNumber', '==', cleanedPhone)
        .get();

      if (!usersSnapshot.empty) {
        const emails = usersSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            email: data.email,
            maskedEmail: maskEmail(data.email),
            createdAt: data.createdAt,
          };
        });
        
        setFoundEmails(emails);
        setSearchCompleted(true);
      } else {
        setSearchCompleted(true);
        Alert.alert(
          '검색 결과',
          '해당 전화번호로 등록된 계정이 없습니다.',
          [{ text: '확인' }]
        );
      }
    } catch (error) {
      console.error('Error finding email:', error);
      Alert.alert('오류', '이메일 찾기 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToLogin = (email) => {
    Alert.alert(
      '로그인 하기',
      `${email} 계정으로 로그인 하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '확인',
          onPress: () => navigation.navigate('Login', { email: email })
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>이메일 찾기</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Icon name="search" size={80} color="#4CAF50" style={styles.icon} />
          
          <Text style={styles.description}>
            회원가입 시 등록한 전화번호를 입력하면{'\n'}
            이메일을 찾을 수 있습니다.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>전화번호</Text>
            <View style={styles.inputWrapper}>
              <Icon name="phone" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="010-1234-5678"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                keyboardType="phone-pad"
                maxLength={13}
                autoFocus
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleFindEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>이메일 찾기</Text>
            )}
          </TouchableOpacity>

          {searchCompleted && foundEmails.length > 0 && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>검색 결과</Text>
              {foundEmails.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.emailCard}
                  onPress={() => handleGoToLogin(item.email)}
                >
                  <View style={styles.emailInfo}>
                    <Icon name="email" size={20} color="#4CAF50" />
                    <Text style={styles.emailText}>{item.maskedEmail}</Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#999" />
                </TouchableOpacity>
              ))}
              <Text style={styles.helpText}>
                이메일을 탭하면 로그인 화면으로 이동합니다
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.bottomLinks}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('ResetPassword')}
            >
              <Text style={styles.linkText}>비밀번호 찾기</Text>
            </TouchableOpacity>
            <View style={styles.linkDivider} />
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>로그인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  icon: {
    alignSelf: 'center',
    marginVertical: 24,
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f8f8',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  emailInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  linkDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
});

export default FindEmailScreen;