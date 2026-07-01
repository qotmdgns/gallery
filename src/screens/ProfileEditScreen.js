// src/screens/ProfileEditScreen.js
import React, { useState, useLayoutEffect, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import FirebaseService from '../services/FirebaseService';

const ProfileEditScreen = ({ route, navigation }) => {
  const { userData } = route.params;
  const [loading, setLoading] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const firebaseService = new FirebaseService();

  // 폼 상태
  const [displayName, setDisplayName] = useState(userData?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(userData?.phoneNumber || '');
  const [email, setEmail] = useState(userData?.email || '');
  const [realEmail, setRealEmail] = useState('');
  const [bio, setBio] = useState(userData?.bio || '');

  // 인증 상태
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [realEmailVerified, setRealEmailVerified] = useState(false);

  // 원본 데이터 저장 (변경사항 확인용)
  const [originalData] = useState({
    displayName: userData?.displayName || '',
    phoneNumber: userData?.phoneNumber || '',
    email: userData?.email || '',
    bio: userData?.bio || '',
  });

  // 사용자 데이터 로드 및 인증 상태 확인
  useEffect(() => {
    loadUserData();

    // 화면이 포커스를 받을 때마다 데이터 새로고침 (인증 후 자동 반영)
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.warn('No current user in loadUserData');
        return;
      }

      console.log('Loading user data for:', currentUser.uid);

      // Firestore에서 최신 사용자 데이터 가져오기 (재시도 로직 포함)
      let userDoc = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        userDoc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();

        if (userDoc.exists && userDoc.data()) {
          break;
        }

        // 문서가 없거나 데이터가 없으면 재시도
        console.log(`Retry ${retryCount + 1}/${maxRetries} - User document not found or empty`);
        retryCount++;

        if (retryCount < maxRetries) {
          // 0.5초 대기 후 재시도
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (userDoc && userDoc.exists) {
        const data = userDoc.data();

        // data가 존재하는지 확인
        if (data) {
          console.log('User data loaded:', {
            phoneNumberVerified: data.phoneNumberVerified,
            realEmailVerified: data.realEmailVerified,
            hasPhoneNumber: !!data.phoneNumber,
            hasRealEmail: !!data.realEmail,
          });

          // 인증된 정보로 자동 업데이트
          if (data.phoneNumber && data.phoneNumberVerified) {
            setPhoneNumber(formatPhoneNumberForDisplay(data.phoneNumber));
            setPhoneVerified(true);
          } else {
            // 인증되지 않은 경우 기본값 유지
            setPhoneVerified(false);
          }

          if (data.realEmail && data.realEmailVerified) {
            setRealEmail(data.realEmail);
            setRealEmailVerified(true);
          } else {
            setRealEmailVerified(false);
          }

          // 기타 정보
          setDisplayName(data.displayName || currentUser.displayName || '');
          setBio(data.bio || '');
        } else {
          console.warn('User document exists but data is empty');
          // 기본값 설정
          setDisplayName(currentUser.displayName || '');
          setBio('');
        }
      } else {
        console.warn('User document does not exist after retries');
        // Firestore 문서가 없으면 Firebase Auth 정보로 초기화
        setDisplayName(currentUser.displayName || '');
        setEmail(currentUser.email || '');
        setBio('');
      }

      // Firebase Auth 이메일 인증 상태 (currentUser에서 가져옴)
      setEmailVerified(currentUser.emailVerified);
    } catch (error) {
      console.error('Error loading user data:', error);
      Alert.alert(
        '데이터 로드 오류',
        '사용자 정보를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.',
        [
          {
            text: '재시도',
            onPress: () => loadUserData()
          },
          {
            text: '닫기',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoadingUserData(false);
    }
  };

  // 전화번호 표시 포맷팅 (+8210... -> 010...)
  const formatPhoneNumberForDisplay = (phone) => {
    if (!phone) return '';

    // +82 형식을 010 형식으로 변환
    if (phone.startsWith('+82')) {
      const numbers = phone.substring(3);
      if (numbers.length === 10) {
        return `0${numbers.substring(0, 2)}-${numbers.substring(2, 6)}-${numbers.substring(6)}`;
      }
    }

    // 이미 010 형식이면 그대로 반환
    return formatPhoneNumber(phone);
  };

  // 변경사항 확인
  const hasChanges = () => {
    return displayName !== originalData.displayName ||
           phoneNumber !== originalData.phoneNumber ||
           email !== originalData.email ||
           bio !== originalData.bio;
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '프로필 수정',
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBackPress}
          style={{ marginLeft: 15 }}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, displayName, phoneNumber, bio, email]);

  const handleBackPress = () => {
    if (hasChanges()) {
      Alert.alert(
        '변경사항 저장',
        '변경사항을 저장하지 않고 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '나가기',
            style: 'destructive',
            onPress: () => navigation.goBack()
          },
        ],
      );
    } else {
      navigation.goBack();
    }
  };

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
    // 번호가 변경되면 인증 상태 초기화
    if (formatted !== userData?.phoneNumber) {
      setPhoneVerified(false);
    }
  };

  // 이메일 인증 화면으로 이동
  const handleEmailVerification = () => {
    navigation.navigate('EmailVerification', {
      fromSignup: false,
      userType: userData?.userType,
      displayName: displayName,
    });
  };

  // 전화번호 인증 화면으로 이동
  const handlePhoneVerification = () => {
    if (!phoneNumber || phoneNumber.replace(/-/g, '').length !== 11) {
      Alert.alert('알림', '올바른 전화번호를 입력해주세요.');
      return;
    }

    navigation.navigate('PhoneVerification', {
      fromSignup: false,
      phoneNumber: phoneNumber,
      userType: userData?.userType,
      displayName: displayName,
      userId: auth().currentUser?.uid,
    });
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('알림', '이름을 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const currentUser = auth().currentUser;

      // Firebase Auth 프로필 업데이트
      await currentUser.updateProfile({
        displayName: displayName,
      });

      // Firestore 업데이트
      const updateData = {
        displayName: displayName,
        bio: bio,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // 인증된 전화번호가 있으면 저장
      if (phoneVerified) {
        updateData.phoneNumber = phoneNumber;
      }

      // 인증된 추가 이메일이 있으면 저장
      if (realEmailVerified && realEmail) {
        updateData.realEmail = realEmail;
      }

      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .update(updateData);

      Alert.alert(
        '저장 완료',
        '프로필이 성공적으로 수정되었습니다.',
        [
          {
            text: '확인',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('프로필 수정 오류:', error);
      Alert.alert('오류', '프로필 수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = () => {
    navigation.navigate('PasswordChange');
  };

  const handleAccountDelete = () => {
    Alert.alert(
      '계정 삭제',
      '정말로 계정을 삭제하시겠습니까?\n\n모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => confirmAccountDelete(),
        },
      ],
    );
  };

  const confirmAccountDelete = async () => {
    // 실제 구현 시 재인증 필요
    Alert.alert('알림', '계정 삭제 기능은 준비 중입니다.');
  };

  if (loadingUserData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
        <Text style={styles.loadingText}>정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 계정 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정 정보</Text>

          <View style={styles.infoItem}>
            <Text style={styles.label}>아이디</Text>
            <Text style={styles.infoText}>@{userData?.userId}</Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>로그인 이메일</Text>
              {emailVerified ? (
                <View style={styles.verifiedBadge}>
                  <Icon name="verified" size={14} color="#4CAF50" />
                  <Text style={styles.verifiedText}>인증됨</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleEmailVerification}>
                  <Text style={styles.verifyButton}>인증하기</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.infoText}>{email}</Text>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>추가 이메일</Text>
              {realEmailVerified ? (
                <View style={styles.verifiedBadge}>
                  <Icon name="verified" size={14} color="#4CAF50" />
                  <Text style={styles.verifiedText}>인증됨</Text>
                </View>
              ) : (
                <TouchableOpacity onPress={handleEmailVerification}>
                  <Text style={styles.verifyButton}>인증하기</Text>
                </TouchableOpacity>
              )}
            </View>
            {realEmail ? (
              <Text style={styles.infoText}>{realEmail}</Text>
            ) : (
              <Text style={styles.placeholderText}>추가 이메일을 인증해주세요</Text>
            )}
          </View>

          <View style={styles.infoItem}>
            <Text style={styles.label}>가입일</Text>
            <Text style={styles.infoText}>
              {userData?.createdAt?.toDate?.().toLocaleDateString() || ''}
            </Text>
          </View>
        </View>

        {/* 기본 정보 수정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>기본 정보</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이름 *</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="이름을 입력하세요"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>전화번호 *</Text>
              {phoneVerified ? (
                <View style={styles.verifiedBadge}>
                  <Icon name="verified" size={14} color="#4CAF50" />
                  <Text style={styles.verifiedText}>인증됨</Text>
                </View>
              ) : phoneNumber && phoneNumber.replace(/-/g, '').length === 11 ? (
                <TouchableOpacity onPress={handlePhoneVerification}>
                  <Text style={styles.verifyButton}>인증하기</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <TextInput
              style={[styles.input, phoneVerified && styles.verifiedInput]}
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              placeholder="010-0000-0000"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              maxLength={13}
              editable={!phoneVerified}
            />
            {phoneVerified && (
              <Text style={styles.helperText}>
                인증된 전화번호는 수정할 수 없습니다
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>자기소개</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="간단한 자기소개를 작성해주세요"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={100}
            />
            <Text style={styles.charCount}>{bio.length} / 100</Text>
          </View>
        </View>

        {/* 비밀번호 변경 */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.passwordButton}
            onPress={handlePasswordChange}
          >
            <Icon name="lock-outline" size={20} color="#4B7BFF" />
            <Text style={styles.passwordButtonText}>비밀번호 변경</Text>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        {/* 저장 버튼 */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges() || loading) && styles.disabledButton
          ]}
          onPress={handleSave}
          disabled={!hasChanges() || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Icon name="check" size={20} color="white" />
              <Text style={styles.saveButtonText}>변경사항 저장</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 계정 삭제 */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleAccountDelete}
        >
          <Text style={styles.deleteButtonText}>계정 삭제</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  infoItem: {
    marginBottom: 15,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '600',
  },
  verifyButton: {
    fontSize: 12,
    color: '#4B7BFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#333',
  },
  verifiedInput: {
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    fontStyle: 'italic',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  passwordButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#4B7BFF',
    marginLeft: 10,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4B7BFF',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteButtonText: {
    color: '#FF4444',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default ProfileEditScreen;