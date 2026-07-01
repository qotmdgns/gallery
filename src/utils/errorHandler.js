import { Alert, Platform } from 'react-native';
import { logError, logMessage } from '../config/sentryConfig';

// 에러 타입 정의
export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

// 에러 메시지 매핑
const ErrorMessages = {
  // 네트워크 에러
  'network-request-failed': '네트워크 연결을 확인해주세요.',
  'Network request failed': '네트워크 연결을 확인해주세요.',
  'Failed to fetch': '서버 연결에 실패했습니다.',
  
  // 인증 에러
  'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
  'auth/user-disabled': '비활성화된 계정입니다.',
  'auth/user-not-found': '등록되지 않은 사용자입니다.',
  'auth/wrong-password': '비밀번호가 일치하지 않습니다.',
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/invalid-credential': '인증 정보가 올바르지 않습니다.',
  
  // Firestore 에러
  'permission-denied': '권한이 없습니다.',
  'not-found': '요청한 데이터를 찾을 수 없습니다.',
  'already-exists': '이미 존재하는 데이터입니다.',
  'resource-exhausted': '요청 한도를 초과했습니다.',
  'unavailable': '서비스를 일시적으로 사용할 수 없습니다.',
  
  // 기본 메시지
  default: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

// 에러 분류 함수
export const classifyError = (error) => {
  const message = error?.message || '';
  const code = error?.code || '';
  
  // 네트워크 에러
  if (message.includes('network') || message.includes('Network') || 
      message.includes('fetch') || code === 'unavailable') {
    return ErrorTypes.NETWORK;
  }
  
  // 인증 에러
  if (code.startsWith('auth/') || message.includes('auth')) {
    return ErrorTypes.AUTH;
  }
  
  // 권한 에러
  if (code === 'permission-denied' || message.includes('permission')) {
    return ErrorTypes.PERMISSION;
  }
  
  // 유효성 검사 에러
  if (message.includes('validation') || message.includes('invalid')) {
    return ErrorTypes.VALIDATION;
  }
  
  // 서버 에러
  if (error?.status >= 500 || code === 'internal') {
    return ErrorTypes.SERVER;
  }
  
  // 클라이언트 에러
  if (error?.status >= 400 && error?.status < 500) {
    return ErrorTypes.CLIENT;
  }
  
  return ErrorTypes.UNKNOWN;
};

// 사용자 친화적 메시지 변환
export const getUserFriendlyMessage = (error) => {
  const code = error?.code || '';
  const message = error?.message || '';
  
  // 코드로 매칭
  if (ErrorMessages[code]) {
    return ErrorMessages[code];
  }
  
  // 메시지로 매칭
  for (const [key, value] of Object.entries(ErrorMessages)) {
    if (message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  
  return ErrorMessages.default;
};

// 전역 에러 핸들러
export const handleError = (error, context = {}, showAlert = true) => {
  // 에러 분류
  const errorType = classifyError(error);
  const userMessage = getUserFriendlyMessage(error);
  
  // 에러 로깅
  const errorContext = {
    ...context,
    errorType,
    originalMessage: error?.message,
    code: error?.code,
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  };
  
  // Sentry로 전송
  logError(error, errorContext);
  
  // 개발 환경에서는 콘솔에 자세히 출력
  if (__DEV__) {
    console.group('🔴 Error Handler');
    console.error('Error:', error);
    console.log('Type:', errorType);
    console.log('Context:', errorContext);
    console.log('User Message:', userMessage);
    console.groupEnd();
  }
  
  // 사용자에게 알림
  if (showAlert) {
    showErrorAlert(userMessage, errorType);
  }
  
  return {
    type: errorType,
    message: userMessage,
    originalError: error,
  };
};

// 에러 알림 표시
export const showErrorAlert = (message, errorType = ErrorTypes.UNKNOWN) => {
  const title = getErrorTitle(errorType);
  
  Alert.alert(
    title,
    message,
    [
      {
        text: '확인',
        style: 'default',
      },
    ],
    { cancelable: true }
  );
};

// 에러 타입별 제목
const getErrorTitle = (errorType) => {
  switch (errorType) {
    case ErrorTypes.NETWORK:
      return '네트워크 오류';
    case ErrorTypes.AUTH:
      return '인증 오류';
    case ErrorTypes.PERMISSION:
      return '권한 오류';
    case ErrorTypes.VALIDATION:
      return '입력 오류';
    case ErrorTypes.SERVER:
      return '서버 오류';
    default:
      return '오류';
  }
};

// 재시도 가능한 에러인지 확인
export const isRetryableError = (error) => {
  const errorType = classifyError(error);
  return [
    ErrorTypes.NETWORK,
    ErrorTypes.SERVER,
    ErrorTypes.UNKNOWN
  ].includes(errorType);
};

// Promise rejection 핸들러
export const handlePromiseRejection = (reason, promise) => {
  console.warn('Unhandled Promise Rejection:', reason);
  handleError(reason, {
    type: 'unhandled_promise_rejection',
    promise: promise.toString(),
  }, false);
};

// 전역 에러 핸들러 설정
export const setupGlobalErrorHandler = () => {
  // Promise rejection 핸들링
  if (!__DEV__) {
    const originalHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event) => {
      handlePromiseRejection(event.reason, event.promise);
      if (originalHandler) {
        originalHandler(event);
      }
    };
  }
  
  // React Native 에러 핸들링
  const originalErrorHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    handleError(error, { isFatal }, !isFatal);
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });
};