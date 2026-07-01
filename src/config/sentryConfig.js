// Sentry 설정 - 현재 완전 비활성화
// forEach 오류 해결을 위해 모든 Sentry 기능 비활성화

// 더미 Sentry 초기화 함수
export const initSentry = () => {
  // Sentry 비활성화 - 아무것도 하지 않음
  console.log('Sentry is disabled');
};

// 더미 사용자 설정 함수
export const setSentryUser = (user) => {
  // 아무것도 하지 않음
};

// 더미 에러 로깅 함수
export const logError = (error, context = {}) => {
  // 콘솔에만 출력
  if (error) {
    console.error('App Error:', error);
    if (context && Object.keys(context).length > 0) {
      console.log('Error Context:', context);
    }
  }
};

// 더미 메시지 로깅 함수
export const logMessage = (message, level = 'info', context = {}) => {
  // 콘솔에만 출력
  if (message) {
    console.log(`[${level.toUpperCase()}]`, message);
    if (context && Object.keys(context).length > 0) {
      console.log('Message Context:', context);
    }
  }
};

// 더미 브레드크럼 함수
export const addBreadcrumb = (message, category = 'navigation', data = {}) => {
  // 아무것도 하지 않음
};

// 더미 트랜잭션 함수
export const startTransaction = (name, op = 'navigation') => {
  // null 반환
  return null;
};

// 빈 객체를 기본 export
const DummySentry = {};
export default DummySentry;