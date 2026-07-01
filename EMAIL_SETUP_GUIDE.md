# 📧 Firebase Trigger Email Extension 설정 가이드

## 🚀 빠른 시작

Firebase Trigger Email Extension을 사용하면 Firestore 문서 생성만으로 이메일을 자동 발송할 수 있습니다.

## 📋 전체 설정 절차

### Step 1: Firebase Console에서 Extension 설치

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/galleryproject-e61c4/extensions
   ```

2. **Extension 찾기**
   - "Browse Extensions" 클릭
   - "Trigger Email from Firestore" 검색
   - "Install" 버튼 클릭

3. **필수 설정값 입력**

   | 설정 항목 | 입력값 | 설명 |
   |----------|--------|------|
   | **Email documents collection** | `mail` | 이메일 문서 저장 컬렉션 |
   | **SMTP connection URI** | 아래 참조 | SMTP 서버 정보 |
   | **SMTP password** | 앱 비밀번호 | Gmail/SMTP 비밀번호 |
   | **Default FROM** | `Gallery App <noreply@galleryapp.com>` | 발신자 |

### Step 2: Gmail 앱 비밀번호 생성

> **중요**: 일반 Gmail 비밀번호가 아닌 앱 비밀번호가 필요합니다!

1. **Google 계정 설정 접속**
   - https://myaccount.google.com/security

2. **2단계 인증 활성화** (필수)
   - 보안 → 2단계 인증 → 활성화

3. **앱 비밀번호 생성**
   - 보안 → 2단계 인증 → 앱 비밀번호
   - 앱 선택: "메일"
   - 기기 선택: "기타 (맞춤 이름)"
   - 이름 입력: "Firebase Email"
   - 생성 클릭

4. **16자리 비밀번호 복사**
   - 공백 없이 복사
   - 예: `abcd efgh ijkl mnop` → `abcdefghijklmnop`

### Step 3: SMTP 연결 설정

#### Gmail 사용 시:
```
smtps://your-email@gmail.com@smtp.gmail.com:465
```

#### SendGrid 사용 시:
```
smtps://apikey@smtp.sendgrid.net:465
```
- Password: SendGrid API Key

#### Outlook 사용 시:
```
smtp://your-email@outlook.com@smtp-mail.outlook.com:587
```

### Step 4: Extension 배포

```bash
# Extension만 배포
firebase deploy --only extensions

# 또는 전체 프로젝트 배포
firebase deploy
```

## ✅ 코드 구현 완료 사항

### FirebaseService.js
이미 `mail` 컬렉션에 이메일을 추가하도록 구현되어 있습니다:

```javascript
// src/services/FirebaseService.js - line 600-621
await this.db.collection('mail').add({
  to: realEmail,
  message: {
    subject: '갤러리 앱 - 이메일 인증 코드',
    text: `인증 코드: ${verificationCode}`,
    html: `
      <div style="...">
        <h2>이메일 인증</h2>
        <div style="...">
          <h1>${verificationCode}</h1>
        </div>
        <p>10분 내에 입력해주세요.</p>
      </div>
    `
  }
});
```

## 🧪 테스트 방법

### 1. Firebase Console에서 직접 테스트

Firestore에 직접 문서 추가:

```javascript
// Collection: mail
// Document: (Auto-ID)
{
  "to": "your-test-email@gmail.com",
  "message": {
    "subject": "테스트 이메일",
    "text": "테스트 내용",
    "html": "<h1>테스트</h1><p>HTML 이메일입니다.</p>"
  }
}
```

### 2. 앱에서 테스트

1. 프로필 편집 화면 접속
2. "추가 이메일" → "인증하기" 클릭
3. 이메일 주소 입력
4. 이메일 확인 후 인증 코드 입력

### 3. 발송 상태 확인

Firestore `mail` 컬렉션 문서 확인:
```javascript
{
  "delivery": {
    "state": "SUCCESS",  // 또는 "ERROR"
    "startTime": "...",
    "endTime": "...",
    "error": "..."       // 에러 발생 시
  }
}
```

## 🔧 문제 해결

### 이메일이 발송되지 않는 경우

1. **Extension 로그 확인**
   ```bash
   firebase functions:log --only ext-firestore-send-email-processQueue
   ```

2. **일반적인 오류와 해결법**

   | 오류 | 원인 | 해결법 |
   |------|------|--------|
   | `Invalid login` | 잘못된 앱 비밀번호 | Gmail 앱 비밀번호 재생성 |
   | `Connection timeout` | SMTP URI 오류 | URI 형식 확인 |
   | `Quota exceeded` | 일일 발송 한도 초과 | SendGrid 등으로 변경 |
   | `Not authorized` | 2단계 인증 미설정 | Google 계정 2단계 인증 활성화 |

3. **Gmail 설정 확인**
   - 2단계 인증 활성화 여부
   - 앱 비밀번호 올바른 입력
   - 보안 수준이 낮은 앱 차단 해제

### 이메일이 스팸함에 들어가는 경우

1. **발신자 도메인 설정**
   - 실제 도메인 이메일 사용
   - SPF/DKIM 레코드 설정

2. **이메일 내용 개선**
   - 스팸 키워드 제거
   - HTML과 텍스트 버전 모두 제공
   - 수신거부 링크 추가

## 📊 모니터링

### Firebase Console 대시보드
- **Extensions**: 설치 상태 및 설정
- **Functions**: `processQueue` 실행 로그
- **Firestore**: `mail` 컬렉션 문서

### 통계 확인
```javascript
// 발송 성공/실패 카운트
const mailDocs = await firestore()
  .collection('mail')
  .where('delivery.state', '==', 'SUCCESS')
  .get();

console.log('발송 성공:', mailDocs.size);
```

## 🎯 추가 기능

### 이메일 템플릿 사용

1. **템플릿 컬렉션 생성**
```javascript
// Collection: email_templates
// Document: verification
{
  "subject": "{{app}} - 인증 코드 {{code}}",
  "html": "<h1>인증 코드: {{code}}</h1>"
}
```

2. **템플릿으로 발송**
```javascript
await firestore().collection('mail').add({
  to: email,
  template: {
    name: 'verification',
    data: {
      app: '갤러리 앱',
      code: '123456'
    }
  }
});
```

### CC/BCC 추가
```javascript
await firestore().collection('mail').add({
  to: ['user1@example.com', 'user2@example.com'],
  cc: ['cc@example.com'],
  bcc: ['bcc@example.com'],
  message: { ... }
});
```

### 첨부 파일
```javascript
await firestore().collection('mail').add({
  to: email,
  message: { ... },
  attachments: [{
    filename: 'invoice.pdf',
    path: 'gs://bucket/path/to/file.pdf'
  }]
});
```

## 📝 체크리스트

- [ ] Firebase Console에서 Extension 설치 완료
- [ ] Gmail 2단계 인증 활성화
- [ ] Gmail 앱 비밀번호 생성
- [ ] SMTP 설정 입력
- [ ] Extension 배포 (`firebase deploy --only extensions`)
- [ ] 테스트 이메일 발송 성공
- [ ] `mail` 컬렉션 권한 확인
- [ ] 프로덕션 FROM 주소 설정

## 🔗 유용한 링크

- [Firebase Extensions Marketplace](https://extensions.dev/extensions/firebase/firestore-send-email)
- [Extension 공식 문서](https://firebase.google.com/docs/extensions/official/firestore-send-email)
- [Gmail 앱 비밀번호 생성](https://myaccount.google.com/apppasswords)
- [SendGrid 가입](https://signup.sendgrid.com/)
- [Firebase Console - Extensions](https://console.firebase.google.com/project/galleryproject-e61c4/extensions)

## 💡 팁

1. **개발 환경**: 콘솔에 인증 코드 출력 (`__DEV__` 모드)
2. **테스트 계정**: 별도의 Gmail 계정 사용 권장
3. **발송 제한**: Gmail 일일 500통, SendGrid Free 일일 100통
4. **보안**: 앱 비밀번호는 절대 코드에 하드코딩하지 않기

---

문제가 있으신가요? Firebase Console의 Functions 로그를 확인하세요!