# Firestore 데이터 관리 시스템 사용 가이드

## 목차
1. [기본 사용법](#기본-사용법)
2. [사용자 관리](#사용자-관리)
3. [갤러리 관리](#갤러리-관리)
4. [예약 시스템](#예약-시스템)
5. [리뷰 시스템](#리뷰-시스템)
6. [채팅 시스템](#채팅-시스템)
7. [아티스트 관리](#아티스트-관리)
8. [시드 데이터](#시드-데이터)
9. [마이그레이션](#마이그레이션)

## 기본 사용법

### FirestoreManager 임포트

```javascript
import firestoreManager from '../services/firestore';
// 또는
import { firestoreManager, userHelpers, galleryHelpers } from '../services/firestore';
```

### 기본 CRUD 작업

```javascript
// CREATE - 문서 생성
const newDoc = await firestoreManager.create('galleries', {
  galleryName: '새 갤러리',
  location: '강남구',
  price: 500000,
});

// READ - 문서 읽기
const gallery = await firestoreManager.read('galleries', 'gallery_id');

// UPDATE - 문서 업데이트
await firestoreManager.update('galleries', 'gallery_id', {
  price: 600000,
  description: '업데이트된 설명',
});

// DELETE - 문서 삭제
await firestoreManager.delete('galleries', 'gallery_id');
```

### 쿼리 실행

```javascript
// 조건 검색
const galleries = await firestoreManager.query('galleries', [
  { field: 'location', operator: '==', value: '강남구' },
  { field: 'price', operator: '<=', value: 1000000 },
], {
  orderBy: ['rating', 'desc'],
  limit: 10,
});

// 페이지네이션
const firstPage = await firestoreManager.query('galleries', [], {
  orderBy: ['createdAt', 'desc'],
  limit: 20,
});

const lastDoc = firstPage[firstPage.length - 1];
const secondPage = await firestoreManager.query('galleries', [], {
  orderBy: ['createdAt', 'desc'],
  limit: 20,
  startAfter: lastDoc,
});
```

### 실시간 리스너

```javascript
// 리스너 등록
const unsubscribe = firestoreManager.subscribe(
  'chatRooms',
  'my_chat_listener',
  (event) => {
    if (event.type === 'changes') {
      console.log('Documents:', event.docs);
      event.changes.forEach(change => {
        console.log(`${change.type}: ${change.data.id}`);
      });
    }
  },
  {
    conditions: [
      { field: 'userId', operator: '==', value: currentUser.uid },
    ],
    orderBy: ['lastMessageTime', 'desc'],
    limit: 10,
  }
);

// 리스너 해제
unsubscribe();
// 또는
firestoreManager.unsubscribe('my_chat_listener');
```

## 사용자 관리

### 회원가입

```javascript
import { userHelpers } from '../services/firestore';

// 새 사용자 생성
const newUser = await userHelpers.createUser(auth().currentUser.uid, {
  email: 'user@example.com',
  displayName: '홍길동',
  userType: 'user', // 'user', 'owner', 'artist'
  phoneNumber: '010-1234-5678',
});
```

### 사용자 정보 조회

```javascript
// 특정 사용자 정보
const user = await userHelpers.getUser('user_id');

// 사용자 타입별 조회
const owners = await userHelpers.getUsersByType('owner');
const artists = await userHelpers.getUsersByType('artist');
```

### 찜 관리

```javascript
// 갤러리 찜하기/해제
const isAdded = await userHelpers.toggleFavorite(userId, galleryId);

// 찜 목록 가져오기
const favorites = await userHelpers.getUserFavorites(userId);
```

## 갤러리 관리

### 갤러리 등록

```javascript
import { galleryHelpers } from '../services/firestore';

const newGallery = await galleryHelpers.createGallery({
  galleryName: '아트 스페이스',
  ownerId: currentUser.uid,
  ownerName: currentUser.displayName,
  location: '강남구',
  address: '서울특별시 강남구 테헤란로 123',
  description: '현대 미술 전시 공간',
  price: 500000,
  phoneNumber: '02-1234-5678',
  imageUrls: ['url1', 'url2'],
  categories: ['회화', '조각'],
  facilities: {
    parking: true,
    wifi: true,
    cafe: false,
  },
});
```

### 갤러리 검색

```javascript
// 활성 갤러리 목록
const activeGalleries = await galleryHelpers.getActiveGalleries(20);

// 지역별 검색
const gangnamGalleries = await galleryHelpers.searchByLocation('강남구');

// 가격 범위 검색
const affordableGalleries = await galleryHelpers.searchByPriceRange(100000, 500000);

// 오너의 갤러리 목록
const myGalleries = await galleryHelpers.getOwnerGalleries(ownerId);
```

### 갤러리 통계

```javascript
// 조회수 증가
await galleryHelpers.incrementViewCount(galleryId);

// 평점 업데이트 (리뷰 작성 후 자동 실행)
await galleryHelpers.updateGalleryRating(galleryId);
```

## 예약 시스템

### 예약 생성

```javascript
import { reservationHelpers } from '../services/firestore';

// 일반 예약
const reservation = await reservationHelpers.createReservation({
  galleryId: 'gallery_123',
  galleryName: '아트 스페이스',
  userId: currentUser.uid,
  userName: currentUser.displayName,
  startDate: new Date('2024-02-01'),
  endDate: new Date('2024-02-07'),
  purpose: '개인 전시',
  totalPrice: 500000,
  deposit: 150000,
});

// 수동 예약 (오너가 직접 입력)
const manualBooking = await reservationHelpers.createManualBooking('gallery_123', {
  manualBookingInfo: {
    customerName: '김철수',
    customerPhone: '010-9876-5432',
    customerEmail: 'kim@example.com',
    notes: '전화로 예약',
  },
  startDate: new Date('2024-03-01'),
  endDate: new Date('2024-03-07'),
  totalPrice: 500000,
});
```

### 예약 조회

```javascript
// 사용자의 예약 목록
const myReservations = await reservationHelpers.getUserReservations(userId);

// 갤러리의 예약 목록
const galleryBookings = await reservationHelpers.getGalleryReservations(galleryId);

// 예약 가능 여부 확인
const isAvailable = await reservationHelpers.checkAvailability(
  galleryId,
  new Date('2024-02-01'),
  new Date('2024-02-07')
);
```

### 예약 상태 관리

```javascript
// 예약 확정
await reservationHelpers.updateReservationStatus(
  reservationId,
  'confirmed'
);

// 예약 취소
await reservationHelpers.updateReservationStatus(
  reservationId,
  'cancelled',
  {
    cancellationReason: '고객 요청',
    cancelledBy: userId,
  }
);
```

## 리뷰 시스템

### 리뷰 작성

```javascript
import { reviewHelpers } from '../services/firestore';

const review = await reviewHelpers.createReview({
  galleryId: 'gallery_123',
  galleryName: '아트 스페이스',
  userId: currentUser.uid,
  userName: currentUser.displayName,
  rating: 5,
  content: '정말 멋진 공간이었습니다!',
  imageUrls: ['review_image1.jpg'],
});
```

### 리뷰 조회

```javascript
// 갤러리 리뷰
const galleryReviews = await reviewHelpers.getGalleryReviews(galleryId, 20);

// 사용자가 작성한 리뷰
const myReviews = await reviewHelpers.getUserReviews(userId);
```

### 리뷰 관리

```javascript
// 리뷰 수정
await reviewHelpers.updateReview(reviewId, '수정된 내용', 4);

// 오너 답글
await reviewHelpers.addOwnerReply(reviewId, '감사합니다!');
```

## 채팅 시스템

### 채팅방 관리

```javascript
import { chatHelpers } from '../services/firestore';

// 채팅방 생성 또는 가져오기
const chatRoom = await chatHelpers.getOrCreateChatRoom(
  userId,
  galleryId,
  userData,
  galleryData
);

// 사용자의 채팅방 목록
const myChatRooms = await chatHelpers.getUserChatRooms(userId);

// 오너의 채팅방 목록
const ownerChats = await chatHelpers.getOwnerChatRooms(ownerId, galleryIds);
```

### 메시지 전송

```javascript
// 텍스트 메시지
await chatHelpers.sendMessage(chatRoomId, {
  text: '안녕하세요',
  senderId: currentUser.uid,
  senderName: currentUser.displayName,
  type: 'user', // 'user', 'gallery', 'artist'
});

// 이미지 메시지
await chatHelpers.sendMessage(chatRoomId, {
  imageUrl: 'https://example.com/image.jpg',
  senderId: currentUser.uid,
  senderName: currentUser.displayName,
  type: 'user',
});

// 읽음 처리
await chatHelpers.markMessagesAsRead(chatRoomId, userId);
```

## 아티스트 관리

### 아티스트 프로필

```javascript
import { artistHelpers } from '../services/firestore';

// 아티스트 프로필 생성
const artistProfile = await artistHelpers.createArtistProfile(userId, {
  displayName: '김아티스트',
  bio: '현대 미술 작가',
  genre: ['회화', '설치미술'],
  education: '홍익대학교 미술대학',
  website: 'https://artist.com',
});

// 활성 아티스트 목록
const activeArtists = await artistHelpers.getActiveArtists(20);

// 장르별 검색
const painters = await artistHelpers.searchByGenre('회화');
```

### 포트폴리오 관리

```javascript
// 작품 추가
const artwork = await artistHelpers.addPortfolioWork(artistId, {
  title: '도시의 풍경',
  description: '현대 도시의 모습을 담은 작품',
  imageUrl: 'artwork.jpg',
  year: 2024,
  medium: '캔버스에 아크릴',
  size: '100x80cm',
  price: 3000000,
});

// 포트폴리오 조회
const portfolio = await artistHelpers.getArtistPortfolio(artistId);
```

## 시드 데이터

### 개발/테스트용 데이터 생성

```javascript
import { seedAllData, clearAllData, testSeedData } from '../services/firestore';

// 모든 시드 데이터 생성 (개발 환경)
if (__DEV__) {
  await seedAllData();
}

// 소량 테스트 데이터
await testSeedData();

// 모든 데이터 삭제 (주의!)
if (__DEV__) {
  await clearAllData();
}
```

## 마이그레이션

### 마이그레이션 실행

```javascript
import {
  runAllMigrations,
  runMigration,
  getMigrationStatus,
  validateDatabase
} from '../services/firestore';

// 모든 마이그레이션 실행
await runAllMigrations();

// 특정 마이그레이션 실행
await runMigration('001_add_user_preferences');

// 마이그레이션 상태 확인
const status = await getMigrationStatus();
console.log('Migration status:', status);

// 데이터베이스 검증
const issues = await validateDatabase();
if (issues.length > 0) {
  console.log('Database validation issues:', issues);
}
```

## 배치 작업

### 여러 문서 동시 처리

```javascript
// 배치 작업
await firestoreManager.batch(async (batch) => {
  // 생성
  batch.create('users', { name: 'User 1' });

  // 업데이트
  batch.update('galleries', 'gallery_1', { price: 600000 });

  // 삭제
  batch.delete('reviews', 'review_1');
});

// 트랜잭션
const result = await firestoreManager.transaction(async (t) => {
  const gallery = await t.get('galleries', 'gallery_1');

  if (gallery.data().isActive) {
    t.update('galleries', 'gallery_1', {
      viewCount: gallery.data().viewCount + 1,
    });

    return { success: true };
  }

  return { success: false };
});
```

## 통계 관리

```javascript
import { statsHelpers } from '../services/firestore';

// 일별 통계 업데이트
await statsHelpers.updateDailyStats('gallery', galleryId, {
  views: 1,
  reservations: 1,
  revenue: 500000,
});

// 기간별 통계 조회
const stats = await statsHelpers.getStatsByPeriod(
  'gallery',
  galleryId,
  '2024-01-01',
  '2024-01-31'
);

// 월별 매출
const monthlyRevenue = await statsHelpers.getGalleryRevenue(
  galleryId,
  2024,
  1
);
```

## 에러 처리

```javascript
try {
  const gallery = await firestoreManager.read('galleries', 'invalid_id');
} catch (error) {
  if (error.code === 'not-found') {
    console.log('Gallery not found');
  } else if (error.code === 'permission-denied') {
    console.log('Permission denied');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## 캐시 관리

```javascript
// 캐시 사용
const gallery = await firestoreManager.read('galleries', 'gallery_1', true);

// 캐시 무시
const freshGallery = await firestoreManager.read('galleries', 'gallery_1', false);

// 캐시 무효화
firestoreManager.invalidateCache('galleries', 'gallery_1');
```

## 성능 최적화 팁

1. **배치 작업 사용**: 여러 문서를 한 번에 처리할 때는 배치를 사용
2. **인덱스 생성**: 복잡한 쿼리는 Firestore 콘솔에서 인덱스 생성
3. **페이지네이션**: 큰 데이터셋은 limit와 startAfter 사용
4. **캐싱 활용**: 자주 읽는 데이터는 캐시 활용
5. **리스너 관리**: 사용하지 않는 리스너는 반드시 해제

## 보안 규칙

Firestore 보안 규칙 예제:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 프로필만 수정 가능
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // 갤러리는 오너만 수정 가능
    match /galleries/{galleryId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid == resource.data.ownerId;
      allow delete: if request.auth != null &&
        request.auth.uid == resource.data.ownerId;
    }

    // 채팅방은 참여자만 접근 가능
    match /chatRooms/{chatRoomId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.participants;

      match /messages/{messageId} {
        allow read: if request.auth != null &&
          request.auth.uid in parent().data.participants;
        allow create: if request.auth != null &&
          request.auth.uid in parent().data.participants;
      }
    }
  }
}
```