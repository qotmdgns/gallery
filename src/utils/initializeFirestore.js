// src/utils/initializeFirestore.js
// 개발 환경에서 초기 데이터를 설정하는 스크립트

import firestore from '@react-native-firebase/firestore';

const initializeFirestore = async () => {
  try {
    // 컬렉션 구조 확인
    const collections = ['users', 'galleries', 'reservations', 'reviews', 'gallery_owners'];
    
    for (const collection of collections) {
      await firestore().collection(collection).limit(1).get();
      // 컬렉션 존재 확인만 수행
    }

    // console.log('Firestore 초기화 완료!');
  } catch (error) {
    // 실제 에러는 유지
    console.error('Firestore 초기화 오류:', error);
  }
};

// 컬렉션 구조 문서화
export const FIRESTORE_COLLECTIONS = {
  USERS: 'users',
  GALLERIES: 'galleries',
  RESERVATIONS: 'reservations',
  REVIEWS: 'reviews',
  GALLERY_OWNERS: 'gallery_owners',
  CHAT_ROOMS: 'chatRooms',
  NOTIFICATIONS: 'notifications',
};

// 필드 상수
export const USER_TYPES = {
  USER: 'user',
  OWNER: 'owner',
  ADMIN: 'admin',
};

export const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

export const GALLERY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
};

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
};

export default initializeFirestore;