# 에러 처리 및 크래시 모니터링 가이드

## 구현 완료 사항

### 1. Sentry 통합
- **패키지**: `@sentry/react-native`
- **설정 파일**: `src/config/sentryConfig.js`
- **기능**:
  - 자동 크래시 리포팅
  - 성능 모니터링
  - 사용자 세션 추적
  - 브레드크럼 기록

### 2. 전역 에러 핸들러
- **파일**: `src/utils/errorHandler.js`
- **기능**:
  - 에러 분류 (네트워크, 인증, 권한, 서버 등)
  - 사용자 친화적 메시지 변환
  - 재시도 가능 여부 판단
  - Promise rejection 처리

### 3. React 에러 바운더리
- **컴포넌트**: `src/components/ErrorBoundary.js`
- **적용 위치**: App.js 최상위
- **기능**:
  - 컴포넌트 에러 캐치
  - 폴백 UI 표시
  - 에러 복구 옵션

### 4. 로딩/에러 상태 컴포넌트
- **파일**: `src/components/LoadingErrorHandler.js`
- **컴포넌트**:
  - `LoadingView`: 로딩 인디케이터
  - `ErrorView`: 에러 표시 및 재시도
  - `EmptyView`: 빈 상태 표시
  - `OfflineView`: 오프라인 상태
  - `useLoadingError`: 커스텀 훅

### 5. API 에러 처리
- **파일**: `src/services/FirebaseService.js`
- **기능**:
  - 자동 재시도 (지수 백오프)
  - 에러 컨텍스트 로깅
  - 네트워크 에러 처리

## 사용 방법

### 1. Sentry DSN 설정
```javascript
// src/config/sentryConfig.js
const SENTRY_DSN = 'YOUR_ACTUAL_SENTRY_DSN_HERE';
```

### 2. 화면에서 에러 처리 적용
```javascript
import { handleError } from '../utils/errorHandler';
import { LoadingView, ErrorView, useLoadingError } from '../components/LoadingErrorHandler';

// 컴포넌트에서 사용
const MyScreen = () => {
  const { loading, error, executeAsync } = useLoadingError();
  
  const fetchData = async () => {
    await executeAsync(async () => {
      // API 호출
    });
  };
  
  if (loading) return <LoadingView />;
  if (error) return <ErrorView error={error} onRetry={fetchData} />;
  
  return <YourContent />;
};
```

### 3. 수동 에러 로깅
```javascript
import { logError, logMessage } from '../config/sentryConfig';

// 에러 로깅
try {
  // 위험한 작업
} catch (error) {
  logError(error, { 
    screen: 'MyScreen',
    action: 'fetchData' 
  });
}

// 메시지 로깅
logMessage('중요한 이벤트 발생', 'info', { userId: '123' });
```

## 에러 메시지 매핑

### Firebase Auth 에러
- `auth/invalid-email`: "올바른 이메일 형식이 아닙니다."
- `auth/user-not-found`: "등록되지 않은 사용자입니다."
- `auth/wrong-password`: "비밀번호가 일치하지 않습니다."
- `auth/email-already-in-use`: "이미 사용 중인 이메일입니다."

### Firestore 에러
- `permission-denied`: "권한이 없습니다."
- `not-found`: "요청한 데이터를 찾을 수 없습니다."
- `unavailable`: "서비스를 일시적으로 사용할 수 없습니다."

### 네트워크 에러
- `network-request-failed`: "네트워크 연결을 확인해주세요."
- `Failed to fetch`: "서버 연결에 실패했습니다."

## 테스트 방법

### 1. 에러 시뮬레이션
```javascript
// 강제 에러 발생
throw new Error('테스트 에러');

// 네트워크 에러 시뮬레이션
firestore().terminate();

// Promise rejection
Promise.reject(new Error('Promise 에러'));
```

### 2. 개발 모드 확인
- 개발 모드에서는 콘솔에 자세한 에러 정보 출력
- 에러 바운더리에서 스택 트레이스 표시
- Sentry 전송은 비활성화

### 3. 프로덕션 테스트
```bash
# 릴리즈 빌드
npm run android -- --variant=release
npm run ios -- --configuration Release
```

## 모니터링 대시보드

### Sentry 대시보드에서 확인 가능한 정보
1. **에러 트렌드**: 시간대별 에러 발생 추이
2. **에러 그룹**: 유사한 에러 그룹화
3. **사용자 영향도**: 영향받은 사용자 수
4. **성능 메트릭**: 앱 성능 지표
5. **릴리즈 추적**: 버전별 에러 비교

## 향후 개선사항

1. **에러 복구 전략**
   - 자동 재연결
   - 오프라인 큐
   - 데이터 동기화

2. **사용자 피드백**
   - 에러 발생 시 피드백 수집
   - 스크린샷 첨부
   - 재현 단계 기록

3. **에러 분석**
   - 에러 패턴 분석
   - 자동 알림 설정
   - 에러 우선순위 설정

## 주의사항

1. **민감한 정보 제외**
   - 비밀번호, 토큰 등 로깅 제외
   - 개인정보 마스킹

2. **성능 고려**
   - 과도한 로깅 방지
   - 샘플링 레이트 조정

3. **사용자 경험**
   - 명확한 에러 메시지
   - 복구 옵션 제공
   - 로딩 상태 표시