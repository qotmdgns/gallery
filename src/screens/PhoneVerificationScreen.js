// src/screens/PhoneVerificationScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FirebaseService from '../services/FirebaseService';
import auth from '@react-native-firebase/auth';
import useLoginStore from '../store/useLoginStore';

const PhoneVerificationScreen = ({ navigation, route }) => {
  const { userType, displayName, phoneNumber: initialPhone, fromSignup, userId } = route.params || {};
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || '');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [step, setStep] = useState('phone'); // 'phone' or 'code'
  const [confirmation, setConfirmation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const firebaseService = new FirebaseService();
  const { logined } = useLoginStore();
  const codeInputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  useEffect(() => {
    // Firebase Auth 상태 체크
    const unsubscribe = auth().onAuthStateChanged(user => {
      console.log('Auth state changed - user:', user?.uid);
      setCurrentUser(user);
    });

    // 초기 상태 확인
    const user = auth().currentUser;
    console.log('Current auth user on mount:', user?.uid);
    setCurrentUser(user);

    return () => unsubscribe();
  }, []);

  // 전화번호 포맷팅
  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (cleaned.length > 3 && cleaned.length <= 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
    
    return formatted;
  };

  const handlePhoneNumberChange = (text) => {
    const formatted = formatPhoneNumber(text);
    setPhoneNumber(formatted);
  };

  // SMS 발송
  const handleSendSMS = async () => {
    const cleanPhone = phoneNumber.replace(/-/g, '');
    if (cleanPhone.length !== 11) {
      Alert.alert('알림', '올바른 전화번호를 입력해주세요.');
      return;
    }

    if (!cleanPhone.startsWith('010')) {
      Alert.alert('알림', '010으로 시작하는 번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const result = await firebaseService.sendPhoneVerification(phoneNumber);
      console.log('SMS 발송 결과:', result);

      // 테스트 모드일 경우 result 자체를, 아니면 result.confirmation을 저장
      if (result.isTestMode) {
        setConfirmation(result);
      } else {
        setConfirmation(result.confirmation || result);
      }

      Alert.alert('성공', result.message || '인증 코드가 SMS로 발송되었습니다.');
      setStep('code');
      setResendTimer(60); // 60초 재발송 제한
    } catch (error) {
      console.error('Phone verification error:', error);
      if (error.message?.includes('operation-not-allowed') || error.message?.includes('auth/operation-not-allowed')) {
        Alert.alert(
          '전화번호 인증 비활성화',
          'Firebase 콘솔에서 전화번호 인증을 활성화해야 합니다.\n\n' +
          '1. Firebase Console 접속\n' +
          '2. Authentication → Sign-in method\n' +
          '3. Phone 활성화\n\n' +
          '지금은 건너뛰고 나중에 인증하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { text: '건너뛰기', onPress: handleSkip }
          ]
        );
      } else {
        Alert.alert('오류', error.message || 'SMS 발송에 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 인증 코드 입력 처리
  const handleCodeChange = (index, value) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // 다음 입력칸으로 자동 이동
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // 백스페이스 처리
  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // 인증 코드 확인
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      Alert.alert('알림', '6자리 인증 코드를 입력해주세요.');
      return;
    }

    if (!confirmation) {
      Alert.alert('오류', '인증 세션이 만료되었습니다. 다시 시도해주세요.');
      setStep('phone');
      return;
    }

    // 현재 사용자 확인 - route params의 userId도 사용
    const authUser = auth().currentUser || currentUser;
    const targetUserId = authUser?.uid || userId; // route params의 userId를 fallback으로 사용

    console.log('Verifying code - Current user:', authUser?.uid, 'Route userId:', userId, 'Using:', targetUserId);

    if (!targetUserId && fromSignup) {
      Alert.alert(
        '오류',
        '사용자 정보를 찾을 수 없습니다. 회원가입을 다시 진행해주세요.',
        [
          {
            text: '확인',
            onPress: () => navigation.navigate('Signup')
          }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const result = await firebaseService.verifyPhoneCode(confirmation, code, targetUserId);

      if (result.success) {
        console.log('Phone verification completed successfully');

        const message = fromSignup
          ? '전화번호 인증이 완료되었습니다.'
          : '전화번호 인증이 완료되었습니다.\n프로필에 자동으로 반영되었습니다.';

        Alert.alert(
          '인증 완료',
          message,
          [
            {
              text: '확인',
              onPress: async () => {
                if (fromSignup) {
                  // 회원가입 후 인증이면 이메일 인증으로
                  navigation.replace('EmailVerification', {
                    userType,
                    displayName,
                    fromSignup: true,
                    userId: targetUserId
                  });
                } else {
                  // 프로필에서 인증이면 뒤로
                  // 짧은 딜레이 후 goBack (Firestore 업데이트 시간 확보)
                  await new Promise(resolve => setTimeout(resolve, 300));
                  navigation.goBack();
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Verification error:', error);

      // 특정 에러 메시지 처리
      let errorMessage = '인증에 실패했습니다.';

      if (error.message?.includes('not found')) {
        errorMessage = '사용자 정보를 찾을 수 없습니다. 다시 로그인 후 시도해주세요.';
      } else if (error.message?.includes('Invalid test code')) {
        errorMessage = '테스트 모드: 인증 코드 123456을 입력해주세요.';
      } else if (error.message?.includes('잘못된')) {
        errorMessage = error.message;
      } else if (error.code === 'firestore/not-found' || error.message?.includes('firestore/not-found')) {
        errorMessage = '사용자 계정 정보가 올바르지 않습니다. 회원가입을 다시 진행해주세요.';
      }

      Alert.alert('오류', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 재발송
  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      const result = await firebaseService.sendPhoneVerification(phoneNumber);
      setConfirmation(result.confirmation);
      
      Alert.alert('성공', '인증 코드가 재발송되었습니다.');
      setResendTimer(60);
      setVerificationCode(['', '', '', '', '', '']);
    } catch (error) {
      Alert.alert('오류', '재발송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 건너뛰기
  const handleSkip = () => {
    Alert.alert(
      '전화번호 인증 건너뛰기',
      '나중에 프로필 설정에서 인증할 수 있습니다.',
      [
        {
          text: '취소',
          style: 'cancel'
        },
        {
          text: '건너뛰기',
          onPress: () => {
            if (fromSignup) {
              // 이메일 인증으로 이동
              navigation.replace('EmailVerification', {
                userType,
                displayName,
                fromSignup: true
              });
            } else {
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          {fromSignup && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
            >
              <Text style={styles.skipText}>건너뛰기</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <Icon name="phone-android" size={80} color="white" />
          <Text style={styles.title}>전화번호 인증</Text>
          <Text style={styles.subtitle}>
            {step === 'phone' 
              ? '전화번호를 입력해주세요'
              : 'SMS로 발송된 6자리 코드를 입력해주세요'
            }
          </Text>

          {step === 'phone' ? (
            <>
              <TextInput
                style={styles.phoneInput}
                value={phoneNumber}
                onChangeText={handlePhoneNumberChange}
                placeholder="010-0000-0000"
                placeholderTextColor="#C0C0C0"
                keyboardType="phone-pad"
                maxLength={13}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleSendSMS}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>인증 코드 발송</Text>
                )}
              </TouchableOpacity>

              <View style={styles.infoContainer}>
                <Icon name="info-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
                <Text style={styles.infoText}>
                  Firebase Phone Auth가 활성화되어 있어야 합니다.
                </Text>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.phoneDisplay}>{phoneNumber}</Text>

              <View style={styles.codeContainer}>
                {verificationCode.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={ref => codeInputRefs.current[index] = ref}
                    style={styles.codeInput}
                    value={digit}
                    onChangeText={(value) => handleCodeChange(index, value)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>인증 확인</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResend}
                disabled={resendTimer > 0}
              >
                <Text style={[
                  styles.resendText,
                  resendTimer > 0 && styles.resendTextDisabled
                ]}>
                  {resendTimer > 0 
                    ? `재발송 (${resendTimer}초)` 
                    : '인증 코드 재발송'
                  }
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changePhoneButton}
                onPress={() => {
                  setStep('phone');
                  setVerificationCode(['', '', '', '', '', '']);
                  setConfirmation(null);
                }}
              >
                <Text style={styles.changePhoneText}>전화번호 변경</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#4B7BFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 40,
  },
  phoneInput: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    width: '100%',
    marginBottom: 20,
    color: '#333',
  },
  phoneDisplay: {
    fontSize: 18,
    color: 'white',
    fontWeight: '600',
    marginBottom: 30,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  codeInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: 45,
    height: 55,
    fontSize: 24,
    textAlign: 'center',
    color: '#333',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#3A6FE8',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendButton: {
    marginTop: 20,
  },
  resendText: {
    color: 'white',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    opacity: 0.5,
    textDecorationLine: 'none',
  },
  changePhoneButton: {
    marginTop: 15,
  },
  changePhoneText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginLeft: 5,
    flex: 1,
    textAlign: 'center',
  },
});

export default PhoneVerificationScreen;