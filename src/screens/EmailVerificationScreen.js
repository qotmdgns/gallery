// src/screens/EmailVerificationScreen.js
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
import useLoginStore from '../store/useLoginStore';

const EmailVerificationScreen = ({ navigation, route }) => {
  const { userType, displayName, fromSignup, userId } = route.params || {};
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [step, setStep] = useState('email'); // 'email' or 'code'

  const firebaseService = new FirebaseService();
  const { logined } = useLoginStore();
  const codeInputRefs = useRef([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // ?대찓??諛쒖넚
  const handleSendEmail = async () => {
    if (!email) {
      Alert.alert('?뚮┝', '?대찓??二쇱냼瑜??낅젰?댁＜?몄슂.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('?뚮┝', '?щ컮瑜??대찓???뺤떇???꾨떃?덈떎.');
      return;
    }

    setLoading(true);
    try {
      await firebaseService.sendRealEmailVerification(email);

      // 媛쒕컻 ?섍꼍?먯꽌??肄섏넄??肄붾뱶 ?쒖떆

      Alert.alert('?깃났', '?몄쬆 肄붾뱶媛 ?대찓?쇰줈 諛쒖넚?섏뿀?듬땲??');
      setStep('code');
      setResendTimer(60); // 60珥??щ컻???쒗븳
    } catch (error) {
      console.error('Email verification send error:', error);

      // ?ъ슜???뺣낫 ?놁쓬 ?먮윭 泥섎━
      if (error.message?.includes('濡쒓렇?몃릺吏') || error.message?.includes('not authenticated')) {
        Alert.alert(
          '濡쒓렇???꾩슂',
          '?ъ슜???뺣낫瑜?李얠쓣 ???놁뒿?덈떎. ?ㅼ떆 濡쒓렇?명빐二쇱꽭??',
          [
            {
              text: '?뺤씤',
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else {
        Alert.alert('?ㅻ쪟', error.message || '?대찓??諛쒖넚???ㅽ뙣?덉뒿?덈떎.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ?몄쬆 肄붾뱶 ?낅젰 泥섎━
  const handleCodeChange = (index, value) => {
    if (value.length > 1) {
      value = value[value.length - 1];
    }
    
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);

    // ?ㅼ쓬 ?낅젰移몄쑝濡??먮룞 ?대룞
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // 諛깆뒪?섏씠??泥섎━
  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  // ?몄쬆 肄붾뱶 ?뺤씤
  const handleVerifyCode = async () => {
    const code = verificationCode.join('');
    if (code.length !== 6) {
      Alert.alert('?뚮┝', '6?먮━ ?몄쬆 肄붾뱶瑜??낅젰?댁＜?몄슂.');
      return;
    }

    setLoading(true);
    try {
      await firebaseService.verifyRealEmailCode(code);

      const message = fromSignup
        ? '?대찓???몄쬆???꾨즺?섏뿀?듬땲??'
        : '?대찓???몄쬆???꾨즺?섏뿀?듬땲??\n?꾨줈?꾩뿉 ?먮룞?쇰줈 諛섏쁺?섏뿀?듬땲??';

      Alert.alert(
        '?몄쬆 ?꾨즺',
        message,
        [
          {
            text: '?뺤씤',
            onPress: async () => {
              if (fromSignup) {
                if (userType && displayName) {
                  logined(displayName, userType);
                }
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainApp' }],
                });
              } else {
                await new Promise(resolve => setTimeout(resolve, 300));
                navigation.goBack();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Email verification error:', error);

      // ?뱀젙 ?먮윭 硫붿떆吏 泥섎━
      let errorMessage = '?몄쬆???ㅽ뙣?덉뒿?덈떎.';

      if (error.message?.includes('not found') || error.message?.includes('李얠쓣 ???놁뒿?덈떎')) {
        errorMessage = '?몄쬆 ?붿껌??李얠쓣 ???놁뒿?덈떎. ?몄쬆 肄붾뱶瑜??ㅼ떆 諛쒖넚?댁＜?몄슂.';
      } else if (error.message?.includes('留뚮즺')) {
        errorMessage = error.message;
      } else if (error.message?.includes('잘못')) {
        errorMessage = error.message;
      } else if (error.message?.includes('로그')) {
        errorMessage = '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.';
      }

      Alert.alert('?ㅻ쪟', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    try {
      await firebaseService.sendRealEmailVerification(email);
      
      Alert.alert('?깃났', '?몄쬆 肄붾뱶媛 ?щ컻?〓릺?덉뒿?덈떎.');
      setResendTimer(60);
      setVerificationCode(['', '', '', '', '', '']);
    } catch (error) {
      Alert.alert('?ㅻ쪟', '?щ컻?≪뿉 ?ㅽ뙣?덉뒿?덈떎.');
    } finally {
      setLoading(false);
    }
  };

  // 嫄대꼫?곌린
  const handleSkip = () => {
    Alert.alert(
      '?대찓???몄쬆 嫄대꼫?곌린',
      '?섏쨷???꾨줈???ㅼ젙?먯꽌 ?몄쬆?????덉뒿?덈떎.',
      [
        {
          text: '痍⑥냼',
          style: 'cancel'
        },
        {
          text: '嫄대꼫?곌린',
          onPress: () => {
            if (fromSignup && userType && displayName) {
              logined(displayName, userType);
            }
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainApp' }],
            });
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
              <Text style={styles.skipText}>嫄대꼫?곌린</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          <Icon name="email" size={80} color="white" />
          <Text style={styles.title}>?대찓???몄쬆</Text>
          <Text style={styles.subtitle}>
            {step === 'email' 
              ? '?대찓??二쇱냼瑜??낅젰?댁＜?몄슂'
              : '?대찓?쇰줈 諛쒖넚??6?먮━ 肄붾뱶瑜??낅젰?댁＜?몄슂'
            }
          </Text>

          {step === 'email' ? (
            <>
              <TextInput
                style={styles.emailInput}
                value={email}
                onChangeText={setEmail}
                placeholder="example@email.com"
                placeholderTextColor="#C0C0C0"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleSendEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>?몄쬆 肄붾뱶 諛쒖넚</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
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
                  <Text style={styles.buttonText}>?몄쬆 ?뺤씤</Text>
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
                style={styles.changeEmailButton}
                onPress={() => {
                  setStep('email');
                  setVerificationCode(['', '', '', '', '', '']);
                }}
              >
                <Text style={styles.changeEmailText}>이메일 변경</Text>
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
  emailInput: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    width: '100%',
    marginBottom: 20,
    color: '#333',
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
  changeEmailButton: {
    marginTop: 15,
  },
  changeEmailText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
});

export default EmailVerificationScreen;
