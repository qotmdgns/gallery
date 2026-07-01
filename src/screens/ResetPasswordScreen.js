// src/screens/ResetPasswordScreen.js
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
import auth from '@react-native-firebase/auth';

const ResetPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('알림', '이메일을 입력해주세요.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('알림', '올바른 이메일 형식이 아닙니다.');
      return;
    }

    setLoading(true);

    try {
      await auth().sendPasswordResetEmail(email);
      setEmailSent(true);
      Alert.alert(
        '이메일 전송 완료',
        '비밀번호 재설정 링크가 이메일로 전송되었습니다.\n이메일을 확인해주세요.',
        [
          {
            text: '확인',
            onPress: () => {
              // 로그인 화면으로 이동
              navigation.navigate('Login');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      
      let errorMessage = '비밀번호 재설정 중 오류가 발생했습니다.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = '등록되지 않은 이메일입니다.';
          break;
        case 'auth/invalid-email':
          errorMessage = '올바른 이메일 형식이 아닙니다.';
          break;
        case 'auth/too-many-requests':
          errorMessage = '너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.';
          break;
        case 'auth/network-request-failed':
          errorMessage = '네트워크 연결을 확인해주세요.';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }
      
      Alert.alert('오류', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email || !emailSent) return;
    
    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(email);
      Alert.alert('알림', '비밀번호 재설정 이메일이 다시 전송되었습니다.');
    } catch (error) {
      console.error('Resend email error:', error);
      Alert.alert('오류', '이메일 재전송에 실패했습니다.');
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
          <Text style={styles.headerTitle}>비밀번호 재설정</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Icon name="lock-reset" size={80} color="#4CAF50" style={styles.icon} />
          
          <Text style={styles.description}>
            가입하신 이메일 주소를 입력하시면{'\n'}
            비밀번호 재설정 링크를 보내드립니다.
          </Text>

          {!emailSent ? (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>이메일</Text>
                <View style={styles.inputWrapper}>
                  <Icon name="email" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="example@email.com"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>재설정 링크 보내기</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Icon name="check-circle" size={60} color="#4CAF50" />
              <Text style={styles.successTitle}>이메일 전송 완료!</Text>
              <Text style={styles.successText}>
                {email}으로{'\n'}
                비밀번호 재설정 링크를 보냈습니다.
              </Text>
              
              <TouchableOpacity
                style={[styles.resendButton, loading && styles.buttonDisabled]}
                onPress={handleResendEmail}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#4CAF50" />
                ) : (
                  <Text style={styles.resendButtonText}>이메일 다시 보내기</Text>
                )}
              </TouchableOpacity>
              
              <Text style={styles.spamNotice}>
                이메일이 도착하지 않았다면{'\n'}
                스팸 메일함을 확인해주세요.
              </Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Icon name="info-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              비밀번호 재설정 링크는 1시간 동안 유효합니다.{'\n'}
              링크 클릭 후 새로운 비밀번호를 설정해주세요.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.bottomLinks}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('FindEmail')}
            >
              <Text style={styles.linkText}>이메일 찾기</Text>
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  resendButton: {
    borderWidth: 1,
    borderColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 16,
  },
  resendButtonText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '500',
  },
  spamNotice: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginLeft: 8,
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

export default ResetPasswordScreen;