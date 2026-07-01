# 오류 해결 가이드

## ✅ 최종 해결: Gemini API 모델 업데이트

### 문제 요약
1. ~~`react-native-config` → `@env` 마이그레이션~~ ✅ 완료
2. ~~Gemini 1.5 모델 은퇴 (2025년 4월)~~ ✅ 완료

### 최종 수정 사항

**Gemini 모델**: `gemini-1.5-flash` → **`gemini-2.0-flash-exp`**

> **중요**: Gemini 1.0 및 1.5 모델은 2025년 4월 29일 완전히 은퇴되었습니다.

### 해결 명령어

```bash
# Metro 재시작 (Fast Refresh 적용)
# 터미널에서 R 키 누르기
# 또는
npm run android
```

### 확인 방법
앱 실행 후 DevTools 콘솔에서 확인:
```
✅ [GeminiService] API Key loaded successfully
```

**404 오류가 사라지고 Gemini API 정상 작동**

---

## Firebase 경고에 대하여

### 현재 상태
- **경고 타입**: Deprecation warnings (미래 버전 대비 경고)
- **심각도**: ⚠️ 낮음 (현재 버전에서는 정상 작동)
- **영향**: 앱 동작에는 영향 없음

### 경고 의미
React Native Firebase는 v23+ 버전에서 Web SDK와 유사한 모듈식 API로 완전 전환 예정입니다.

### 현재 코드 패턴 (v22에서 정상)
```javascript
import firestore from '@react-native-firebase/firestore';

// 현재 방식 (v22에서 올바름)
const snapshot = await firestore()
  .collection('users')
  .doc('userId')
  .get();
```

### 향후 마이그레이션이 필요할 패턴 (v23+)
```javascript
import { getFirestore, collection, doc, getDoc } from '@react-native-firebase/firestore';

// 미래 방식 (아직 구현 안 됨)
const db = getFirestore();
const docRef = doc(db, 'users', 'userId');
const snapshot = await getDoc(docRef);
```

### 권장 조치 시점
- **지금**: 경고 무시 가능 (정상 작동)
- **나중**: React Native Firebase v23+ 업그레이드 시 마이그레이션

---

## 추가 정리 사항

### 불필요한 패키지 제거 (선택사항)

`package.json`에 `react-native-config`와 `react-native-dotenv`가 둘 다 설치되어 있습니다.
현재 `react-native-dotenv`만 사용 중이므로 `react-native-config`는 제거 가능합니다:

```bash
npm uninstall react-native-config
```

---

## 참고 자료

- [React Native Firebase Migration Guide](https://rnfirebase.io/migrating-to-v6)
- [Firebase Web Modular SDK](https://firebase.google.com/docs/web/modular-upgrade)
