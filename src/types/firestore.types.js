// src/types/firestore.types.js
// Firestore 데이터베이스 구조 타입 정의

// 사용자 타입
export const UserTypes = {
  USER: 'user',
  OWNER: 'owner',
  ADMIN: 'admin',
};

// 사용자 데이터 구조
export const UserSchema = {
  uid: '',
  email: '',
  displayName: '',
  phoneNumber: '',
  birthDate: '',
  profileImage: null,
  userType: UserTypes.USER,
  isVerified: false,
  bio: '',
  favoriteGalleries: [],
  notificationSettings: {
    push: true,
    email: true,
    marketing: false,
  },
  createdAt: null,
  updatedAt: null,
};

// 갤러리 상태
export const GalleryStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
};

// 갤러리 데이터 구조
export const GallerySchema = {
  ownerId: '',
  ownerName: '',
  galleryName: '',
  location: '',
  address: '',
  price: 0,
  area: 0,
  description: '',
  imageUrls: [],
  facilities: [],
  operatingHours: {
    weekday: '10:00-19:00',
    weekend: '11:00-18:00',
  },
  status: GalleryStatus.ACTIVE,
  isVerified: false,
  viewCount: 0,
  likeCount: 0,
  rating: 0,
  reviewCount: 0,
  createdAt: null,
  updatedAt: null,
};

// 예약 상태
export const ReservationStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

// 결제 상태
export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
};

// 예약 데이터 구조
export const ReservationSchema = {
  userId: '',
  userName: '',
  galleryId: '',
  galleryName: '',
  ownerId: '',
  startDate: null,
  endDate: null,
  purpose: '',
  requirements: '',
  totalPrice: 0,
  status: ReservationStatus.PENDING,
  paymentStatus: PaymentStatus.PENDING,
  createdAt: null,
  updatedAt: null,
};

// 리뷰 데이터 구조
export const ReviewSchema = {
  userId: '',
  userName: '',
  galleryId: '',
  reservationId: '',
  rating: 5,
  text: '',
  imageUrls: [],
  createdAt: null,
  isVerified: false,
};

// 컬렉션 이름 상수
export const Collections = {
  USERS: 'users',
  GALLERIES: 'galleries',
  RESERVATIONS: 'reservations',
  REVIEWS: 'reviews',
  GALLERY_OWNERS: 'gallery_owners',
  CHAT_ROOMS: 'chatRooms',
  NOTIFICATIONS: 'notifications',
};

// 시설 옵션
export const FacilityOptions = {
  PARKING: '주차장',
  ELEVATOR: '엘리베이터',
  RESTROOM: '화장실',
  AIR_CONDITIONER: '에어컨',
  HEATING: '난방',
  WIFI: 'Wi-Fi',
  WHEELCHAIR: '휠체어 접근 가능',
  STORAGE: '물품 보관소',
};

// Helper 함수들
export const createUserData = (uid, email, displayName, userType = UserTypes.USER) => ({
  ...UserSchema,
  uid,
  email,
  displayName,
  userType,
  userId: email.split('@')[0],
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createGalleryData = (ownerId, ownerName, galleryData) => ({
  ...GallerySchema,
  ownerId,
  ownerName,
  ...galleryData,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createReservationData = (userId, userName, galleryData, reservationDetails) => ({
  ...ReservationSchema,
  userId,
  userName,
  galleryId: galleryData.id,
  galleryName: galleryData.galleryName,
  ownerId: galleryData.ownerId,
  ...reservationDetails,
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const createReviewData = (userId, userName, galleryId, reviewDetails) => ({
  ...ReviewSchema,
  userId,
  userName,
  galleryId,
  ...reviewDetails,
  createdAt: new Date(),
});