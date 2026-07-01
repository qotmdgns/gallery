# 📧 SendGrid 이메일 인증 설정 가이드

## 개요
이 가이드는 **어떤 이메일 주소로든** 인증 코드를 보낼 수 있도록 SendGrid를 설정하는 방법을 설명합니다.

## 🚀 SendGrid 설정 단계

### 1단계: SendGrid 계정 생성
1. [SendGrid 가입 페이지](https://signup.sendgrid.com/)로 이동
2. 무료 계정 생성 (하루 100개 이메일 무료)
3. 이메일 인증 완료
4. 전화번호 인증 (선택사항이지만 권장)

### 2단계: API Key 생성
1. SendGrid Dashboard 로그인
2. **Settings → API Keys** 이동
3. **Create API Key** 클릭
4. Key 이름: "Gallery App Email"
5. API Key Permissions: **Full Access** 선택
6. **Create & View** 클릭
7. **⚠️ 중요: API Key를 복사하여 안전한 곳에 저장 (한 번만 표시됨!)**

### 3단계: Sender Identity 설정 (중요!)
SendGrid는 발신자 이메일 주소를 인증해야 합니다.

#### 옵션 A: Single Sender Verification (빠른 테스트용)
1. **Settings → Sender Authentication** 이동
2. **Single Sender Verification** 선택
3. 발신자 정보 입력:
   - From Email: `noreply@yourdomain.com` 또는 실제 이메일
   - From Name: "갤러리 예약 플랫폼"
   - Reply To: 회신받을 이메일 주소
4. **Create** 클릭
5. 입력한 이메일로 인증 메일 확인
6. 인증 링크 클릭

#### 옵션 B: Domain Authentication (프로덕션 권장)
1. **Settings → Sender Authentication** 이동
2. **Authenticate Your Domain** 선택
3. DNS 제공업체 선택
4. 도메인 입력
5. DNS 레코드 추가 (도메인 관리 패널에서)
6. Verify 클릭

### 4단계: Firebase Functions 설정

#### 4-1. 환경 변수 설정
`functions/.env` 파일 열어서 편집:
```bash
cd functions
# .env 파일 생성 (이미 생성됨)
# SendGrid API Key 추가
```

`.env` 파일 내용:
```
SENDGRID_API_KEY=SG.실제_API_KEY_여기에_붙여넣기
```

#### 4-2. 발신자 이메일 수정
`functions/sendEmailVerification.js` 파일에서 26번 줄 수정:
```javascript
from: 'noreply@galleryapp.com', // SendGrid에서 인증한 이메일로 변경
```
↓
```javascript
from: 'noreply@yourdomain.com', // SendGrid에서 인증한 실제 이메일
```

### 5단계: Firebase Functions 배포

```bash
# functions 디렉토리에서
cd functions

# 의존성 설치 확인
npm install

# Functions 배포
firebase deploy --only functions
```

### 6단계: 테스트

1. 앱에서 이메일 인증 요청
2. 실제 이메일 주소 입력
3. 이메일 확인 (스팸 폴더도 확인)
4. 6자리 코드 입력

## ✅ 체크리스트

- [ ] SendGrid 계정 생성 완료
- [ ] API Key 생성 및 복사
- [ ] Sender Identity 인증 완료
- [ ] `.env` 파일에 API Key 추가
- [ ] `sendEmailVerification.js`의 from 이메일 수정
- [ ] Firebase Functions 배포
- [ ] 실제 이메일로 테스트 완료

## 🔍 문제 해결

### 이메일이 도착하지 않는 경우
1. **스팸 폴더 확인**
2. **SendGrid Dashboard** → Activity 확인
3. **Firebase Functions 로그 확인**:
   ```bash
   firebase functions:log
   ```
4. **Sender Identity 인증 상태 확인**

### "The from address does not match a verified Sender Identity" 오류
- SendGrid에서 발신자 이메일 인증 필요
- Settings → Sender Authentication에서 인증

### API Key 관련 오류
1. `.env` 파일 확인
2. API Key가 "SG."로 시작하는지 확인
3. Full Access 권한인지 확인

## 📊 SendGrid Dashboard 활용

### Activity Feed
- **Activity → Activity Feed**: 발송된 이메일 실시간 확인
- 각 이메일의 상태 확인 (Delivered, Opened, Clicked)
- 실패한 이메일의 이유 확인

### Statistics
- **Stats → Overview**: 이메일 발송 통계
- Delivery rate, Open rate, Click rate 확인

### Suppressions
- **Suppressions → Bounces**: 반송된 이메일 목록
- **Suppressions → Spam Reports**: 스팸 신고 목록
- 필요시 이메일 주소 제거 가능

## 🎯 추가 기능

### 이메일 템플릿 개선
`functions/sendEmailVerification.js`에서 HTML 템플릿 커스터마이징 가능

### 다국어 지원
사용자 언어 설정에 따라 이메일 템플릿 변경 가능

### 이메일 추적
SendGrid Webhooks를 사용하여 이메일 오픈, 클릭 추적 가능

## 📞 지원

- SendGrid 문서: https://docs.sendgrid.com/
- SendGrid Status: https://status.sendgrid.com/
- Firebase Functions 문서: https://firebase.google.com/docs/functions

## 💡 팁

1. **무료 계정 한도**: 하루 100개 이메일
2. **프로덕션 전환 시**: 유료 플랜 고려 (월 $19.95부터)
3. **이메일 도달률 향상**: Domain Authentication 설정
4. **모니터링**: SendGrid Dashboard 정기 확인