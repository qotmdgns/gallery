// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import Logo from '../components/Logo';
import useLoginStore from '../store/useLoginStore';
import firestore from '@react-native-firebase/firestore';
import { handleError } from '../utils/errorHandler';
import { ERROR_MESSAGES } from '../constants/errorMessages';
import NotificationService from '../services/NotificationService';
import TextInput from '../components/KoreanTextInput';

const LoginScreen = ({ navigation, route }) => {
  const { logined } = useLoginStore();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  // 이메일 찾기에서 전달받은 이메일이 있으면 설정
  useEffect(() => {
    if (route?.params?.email) {
      setUserId(route.params.email);
    }
  }, [route]);

const handleLogin = async () => {
  try {
    if (!userId || !password) {
      Alert.alert('알림', '아이디와 비밀번호를 입력하세요.');
      return;
    }

    let email;
    let userDoc;
    
    // userId가 이메일 형식인지 확인
    if (userId.includes('@')) {
      // 이메일로 직접 로그인
      email = userId;
    } else {
      // 일반 아이디로 로그인 - Firestore에서 userId로 검색
      const usersQuery = await firestore()
        .collection('users')
        .where('userId', '==', userId)
        .limit(1)
        .get();
      
      if (usersQuery.empty) {
        Alert.alert('로그인 실패', '존재하지 않는 아이디입니다.');
        return;
      }
      
      userDoc = usersQuery.docs[0].data();
      email = userDoc.email;
    }

    // Firebase Auth로 로그인
    const cred = await auth().signInWithEmailAndPassword(email, password);

    // userDoc이 없으면 uid로 다시 조회
    if (!userDoc) {
      const snap = await firestore().collection('users').doc(cred.user.uid).get();
      userDoc = snap.data();
    }
    
    const userType = userDoc?.userType || 'user';
    const displayName = userDoc?.displayName || cred.user.displayName || userId;

    // 전역 상태 업데이트 - userId 추가
    logined(displayName, userType, cred.user.uid);

    // FCM 토큰 동기화
    try {
      const notificationService = new NotificationService();
      await notificationService.syncFCMTokenAfterLogin();
      console.log('FCM 토큰 동기화 완료');
    } catch (syncError) {
      console.error('FCM 토큰 동기화 실패:', syncError);
      // FCM 동기화 실패해도 로그인은 계속 진행
    }

    // 화면 전환
    if (navigation && navigation.replace) {
      navigation.replace('MainApp');
    }
  } catch (e) {
    // 중앙화된 에러 처리 사용
    handleError(e, {
      screen: 'LoginScreen',
      action: 'login',
      userId: userId
    });
  }
};


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Logo size="large" />

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="아이디"
              placeholderTextColor="#999"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TextInput
              style={styles.input}
              placeholder="패스워드"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>로그인</Text>
            </TouchableOpacity>

            <View style={styles.linkContainer}>
              <TouchableOpacity
                style={styles.findLink}
                onPress={() => navigation.navigate('FindEmail')}
              >
                <Text style={styles.linkText}>이메일 찾기</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.findLink}
                onPress={() => navigation.navigate('ResetPassword')}
              >
                <Text style={styles.linkText}>비밀번호 찾기</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.signupLink}
              onPress={() => navigation.navigate('Signup')}
            >
              <Text style={styles.signupText}>
                갤러링이 처음이신가요?
                <Text style={styles.signupTextBold}> 회원가입</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  formContainer: {
    width: '100%',
    marginTop: 50,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#3A6FE8',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  signupText: {
    color: 'white',
    fontSize: 14,
  },
  signupTextBold: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  findLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 12,
  },
  testButton: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  testResultsContainer: {
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    padding: 15,
    maxHeight: 300,
  },
  testResultsScroll: {
    maxHeight: 250,
  },
  testResultsText: {
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  closeButton: {
    marginTop: 10,
    backgroundColor: '#4B7BFF',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 15,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
