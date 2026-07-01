// src/screens/SignupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Logo from '../components/Logo';
import CustomDropdown from '../components/CustomDropdown';
import { handleError } from '../utils/errorHandler';
import TextInput from '../components/KoreanTextInput';

const SignupScreen = ({ navigation }) => {
  // 기본 정보
  const [displayName, setDisplayName] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // 생년월일
  const [birthYear, setBirthYear] = useState('2000');
  const [birthMonth, setBirthMonth] = useState('01');
  const [birthDay, setBirthDay] = useState('01');
  
  // 사용자 타입
  const [userType, setUserType] = useState('user'); // user, owner, or artist
  
  // 로딩 상태
  const [loading, setLoading] = useState(false);
  
  // 약관 동의
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  // 년도, 월, 일 배열 생성
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => 
    String(currentYear - i)
  );
  const months = Array.from({ length: 12 }, (_, i) => 
    String(i + 1).padStart(2, '0')
  );
  const days = Array.from({ length: 31 }, (_, i) => 
    String(i + 1).padStart(2, '0')
  );

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

  // 유효성 검사
  const validateForm = () => {
    if (!displayName || !userId || !password || !passwordConfirm || !phoneNumber) {
      Alert.alert('알림', '모든 필드를 입력해주세요.');
      return false;
    }

    if (userId.length < 4) {
      Alert.alert('알림', '아이디는 4자 이상이어야 합니다.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자리 이상이어야 합니다.');
      return false;
    }

    if (password !== passwordConfirm) {
      Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
      return false;
    }

    const cleanPhone = phoneNumber.replace(/-/g, '');
    if (cleanPhone.length !== 11) {
      Alert.alert('알림', '올바른 전화번호를 입력해주세요.');
      return false;
    }

    if (!agreeTerms || !agreePrivacy) {
      Alert.alert('알림', '필수 약관에 동의해주세요.');
      return false;
    }

  return true;
};

const handleSignup = async () => {
  if (!validateForm()) return;

  setLoading(true);

  try {
    // 고유한 이메일 생성 (사용자에게는 보이지 않음)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const email = `${userId}_${timestamp}_${randomStr}@gallering.com`;

    // 1. Firebase Auth로 계정 생성
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);

    // 2. 계정 생성 후 중복 아이디 체크
    try {
      const existingUser = await firestore()
        .collection('users')
        .where('userId', '==', userId)
        .limit(1)
        .get();

      if (!existingUser.empty) {
        // 중복된 아이디가 있으면 생성한 계정 삭제
        await userCredential.user.delete();
        Alert.alert('알림', '이미 사용 중인 아이디입니다.');
        setLoading(false);
        return;
      }
    } catch (queryError) {
      console.log('중복 체크 중 오류:', queryError.message);
    }
      
      // 3. 사용자 프로필 업데이트
      await userCredential.user.updateProfile({
        displayName: displayName,
      });

      // 4. Firestore에 사용자 정보 저장
      const userData = {
        uid: userCredential.user.uid,
        email: email,
        userId: userId,
        displayName: displayName,
        phoneNumber: phoneNumber,
        birthDate: `${birthYear}-${birthMonth}-${birthDay}`,
        userType: userType,
        isVerified: false,
        profileImage: null,
        bio: '',
        favoriteGalleries: [],
        notificationSettings: {
          push: true,
          email: true,
          marketing: agreeMarketing,
        },
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('users').doc(userCredential.user.uid).set(userData);

      // 5. 갤러리 운영자인 경우 추가 정보 저장
      if (userType === 'owner') {
        await firestore().collection('gallery_owners').doc(userCredential.user.uid).set({
          uid: userCredential.user.uid,
          displayName: displayName,
          isVerified: false,
          galleryCount: 0,
          totalRevenus: 0,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
      }

      // 전화번호 인증 화면으로 이동
      navigation.replace('PhoneVerification', {
        userType: userType,
        displayName: displayName,
        phoneNumber: phoneNumber,
        userId: userCredential.user.uid,
        fromSignup: true
      });
    } catch (error) {
      // 중앙화된 에러 처리 사용
      handleError(error, {
        screen: 'SignupScreen',
        action: 'signup',
        userId: userId,
        userType: userType
      });
    } finally {
      setLoading(false);
    }
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
        <View style={styles.content}>
          <Logo size="large" />
          
          <View style={styles.formContainer}>
            {/* 사용자 타입 선택 */}
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'user' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('user')}
              >
                <Icon 
                  name="person" 
                  size={24} 
                  color={userType === 'user' ? 'white' : '#666'} 
                />
                <Text style={[
                  styles.userTypeText,
                  userType === 'user' && styles.userTypeTextActive
                ]}>
                  일반 회원
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'artist' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('artist')}
              >
                <Icon 
                  name="palette" 
                  size={24} 
                  color={userType === 'artist' ? 'white' : '#666'} 
                />
                <Text style={[
                  styles.userTypeText,
                  userType === 'artist' && styles.userTypeTextActive
                ]}>
                  아티스트
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'owner' && styles.userTypeButtonActive
                ]}
                onPress={() => setUserType('owner')}
              >
                <Icon 
                  name="store" 
                  size={24} 
                  color={userType === 'owner' ? 'white' : '#666'} 
                />
                <Text style={[
                  styles.userTypeText,
                  userType === 'owner' && styles.userTypeTextActive
                ]}>
                  갤러리
                </Text>
              </TouchableOpacity>
            </View>

            {/* 이름 */}
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="실명을 입력해주세요"
              placeholderTextColor="#C0C0C0"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* ID */}
            <Text style={styles.label}>아이디</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="4자 이상의 아이디"
              placeholderTextColor="#C0C0C0"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* 패스워드 */}
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="6자 이상의 비밀번호"
              placeholderTextColor="#C0C0C0"
              secureTextEntry
              autoCapitalize="none"
            />

            {/* 패스워드 확인 */}
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={styles.input}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호를 다시 입력해주세요"
              placeholderTextColor="#C0C0C0"
              secureTextEntry
              autoCapitalize="none"
            />

            {/* 생년월일 */}
            <Text style={styles.label}>생년월일</Text>
            <View style={styles.birthDateContainer}>
              <View style={styles.dropdownWrapper}>
                <CustomDropdown
                  value={birthYear}
                  options={years}
                  onValueChange={setBirthYear}
                  placeholder="년"
                />
              </View>
              
              <View style={styles.dropdownWrapper}>
                <CustomDropdown
                  value={birthMonth}
                  options={months}
                  onValueChange={setBirthMonth}
                  placeholder="월"
                />
              </View>
              
              <View style={styles.dropdownWrapper}>
                <CustomDropdown
                  value={birthDay}
                  options={days}
                  onValueChange={setBirthDay}
                  placeholder="일"
                />
              </View>
            </View>

            {/* 전화번호 */}
            <Text style={styles.label}>전화번호</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              placeholder="010-0000-0000"
              placeholderTextColor="#C0C0C0"
              keyboardType="phone-pad"
              maxLength={13}
            />

            {/* 약관 동의 */}
            <View style={styles.agreementContainer}>
              <TouchableOpacity
                style={styles.agreementItem}
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                <Icon 
                  name={agreeTerms ? "check-box" : "check-box-outline-blank"} 
                  size={24} 
                  color={agreeTerms ? "#4B7BFF" : "#999"} 
                />
                <Text style={styles.agreementText}>[필수] 이용약관 동의</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.agreementItem}
                onPress={() => setAgreePrivacy(!agreePrivacy)}
              >
                <Icon 
                  name={agreePrivacy ? "check-box" : "check-box-outline-blank"} 
                  size={24} 
                  color={agreePrivacy ? "#4B7BFF" : "#999"} 
                />
                <Text style={styles.agreementText}>[필수] 개인정보 처리방침 동의</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.agreementItem}
                onPress={() => setAgreeMarketing(!agreeMarketing)}
              >
                <Icon 
                  name={agreeMarketing ? "check-box" : "check-box-outline-blank"} 
                  size={24} 
                  color={agreeMarketing ? "#4B7BFF" : "#999"} 
                />
                <Text style={styles.agreementText}>[선택] 마케팅 정보 수신 동의</Text>
              </TouchableOpacity>
            </View>

            {/* 회원가입 버튼 */}
            <TouchableOpacity 
              style={[styles.signupButton, loading && styles.disabledButton]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.signupButtonText}>회원가입</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 로그인 링크 */}
            <TouchableOpacity 
              style={styles.loginLink}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.loginLinkText}>
                이미 계정이 있으신가요? 로그인
              </Text>
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
    backgroundColor: '#4B7BFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 35,
    paddingBottom: 30,
  },
  formContainer: {
    marginTop: 30,
  },
  userTypeContainer: {
    flexDirection: 'row',
    marginBottom: 25,
    gap: 10,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    borderRadius: 25,
    gap: 4,
  },
  userTypeButtonActive: {
    backgroundColor: '#3A6FE8',
  },
  userTypeText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  userTypeTextActive: {
    color: 'white',
  },
  label: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 10,
    fontWeight: '500',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 20,
    color: '#333',
  },
  birthDateContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  dropdownWrapper: {
    flex: 1,
  },
  agreementContainer: {
    marginVertical: 20,
  },
  agreementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  agreementText: {
    color: 'white',
    fontSize: 14,
  },
  signupButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3A6FE8',
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  checkmark: {
    color: 'white',
    fontSize: 20,
    marginRight: 8,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 30,
    alignItems: 'center',
  },
  loginLinkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});

export default SignupScreen;
