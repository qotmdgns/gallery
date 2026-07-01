/**
 * Firestore 데이터베이스 스키마 정의
 * 모든 컬렉션과 문서 구조를 정의합니다.
 */

// 사용자 타입 열거형
export const UserTypes = {
  USER: 'user',
  OWNER: 'owner',
  ARTIST: 'artist',
};

// 예약 상태 열거형
export const ReservationStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
};

// 채팅 메시지 타입
export const MessageTypes = {
  USER: 'user',
  GALLERY: 'gallery',
  ARTIST: 'artist',
  SYSTEM: 'system',
};

// 알림 타입
export const NotificationTypes = {
  CHAT: 'chat',
  RESERVATION: 'reservation',
  REVIEW: 'review',
  EXHIBITION: 'exhibition',
  SYSTEM: 'system',
};

// 전시 제안 상태
export const ExhibitionStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

/**
 * Firestore 컬렉션 스키마
 */
export const SCHEMAS = {
  // 사용자 컬렉션
  users: {
    collectionName: 'users',
    fields: {
      // 기본 정보
      uid: { type: 'string', required: true },
      email: { type: 'string', required: true },
      displayName: { type: 'string', required: true },
      userType: { type: 'enum', values: Object.values(UserTypes), required: true },
      phoneNumber: { type: 'string', required: false },
      profileImage: { type: 'string', required: false },

      // 추가 정보
      bio: { type: 'string', required: false },
      birthDate: { type: 'timestamp', required: false },
      gender: { type: 'string', required: false },

      // 설정
      notificationSettings: {
        type: 'object',
        properties: {
          push: { type: 'boolean', default: true },
          email: { type: 'boolean', default: true },
          sms: { type: 'boolean', default: false },
          chat: { type: 'boolean', default: true },
          reservation: { type: 'boolean', default: true },
        },
      },

      // 사용자 활동
      favoriteGalleries: { type: 'array', items: 'string', default: [] },
      followingArtists: { type: 'array', items: 'string', default: [] },

      // FCM 토큰
      fcmToken: { type: 'string', required: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
      lastLoginAt: { type: 'timestamp', required: false },
    },
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['userType', 'createdAt'] },
    ],
  },

  // 갤러리 컬렉션
  galleries: {
    collectionName: 'galleries',
    fields: {
      // 기본 정보
      galleryName: { type: 'string', required: true },
      ownerId: { type: 'string', required: true },
      ownerName: { type: 'string', required: true },

      // 위치 정보
      location: { type: 'string', required: true },
      address: { type: 'string', required: true },
      latitude: { type: 'number', required: false },
      longitude: { type: 'number', required: false },

      // 상세 정보
      description: { type: 'string', required: false },
      area: { type: 'number', required: false }, // 평방미터
      floor: { type: 'string', required: false },

      // 운영 정보
      operatingHours: {
        type: 'object',
        properties: {
          monday: { type: 'string' },
          tuesday: { type: 'string' },
          wednesday: { type: 'string' },
          thursday: { type: 'string' },
          friday: { type: 'string' },
          saturday: { type: 'string' },
          sunday: { type: 'string' },
        },
      },
      closedDays: { type: 'array', items: 'string', default: [] },

      // 시설 정보
      facilities: {
        type: 'object',
        properties: {
          parking: { type: 'boolean', default: false },
          elevator: { type: 'boolean', default: false },
          wheelchair: { type: 'boolean', default: false },
          wifi: { type: 'boolean', default: false },
          cafe: { type: 'boolean', default: false },
        },
      },

      // 가격 정보
      price: { type: 'number', required: true }, // 1주 단위 가격
      priceType: { type: 'string', default: 'weekly' },

      // 이미지
      imageUrls: { type: 'array', items: 'string', default: [] },
      thumbnailUrl: { type: 'string', required: false },

      // 카테고리
      categories: { type: 'array', items: 'string', default: [] },
      tags: { type: 'array', items: 'string', default: [] },

      // 통계
      rating: { type: 'number', default: 0 },
      reviewCount: { type: 'number', default: 0 },
      likeCount: { type: 'number', default: 0 },
      viewCount: { type: 'number', default: 0 },

      // 연락처
      phoneNumber: { type: 'string', required: false },
      email: { type: 'string', required: false },
      website: { type: 'string', required: false },
      instagram: { type: 'string', required: false },

      // 상태
      isActive: { type: 'boolean', default: true },
      isVerified: { type: 'boolean', default: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
    },
    indexes: [
      { fields: ['ownerId', 'createdAt'] },
      { fields: ['location', 'rating'] },
      { fields: ['isActive', 'rating'] },
      { fields: ['categories', 'isActive'] },
    ],
  },

  // 예약 컬렉션
  reservations: {
    collectionName: 'reservations',
    fields: {
      // 기본 정보
      reservationId: { type: 'string', required: true },
      galleryId: { type: 'string', required: true },
      galleryName: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      userName: { type: 'string', required: true },

      // 예약 상세
      startDate: { type: 'timestamp', required: true },
      endDate: { type: 'timestamp', required: true },
      purpose: { type: 'string', required: false },
      requirements: { type: 'string', required: false },

      // 가격 정보
      totalPrice: { type: 'number', required: true },
      deposit: { type: 'number', default: 0 },
      paidAmount: { type: 'number', default: 0 },

      // 상태
      status: { type: 'enum', values: Object.values(ReservationStatus), required: true },

      // 수동 예약 여부
      isManualBooking: { type: 'boolean', default: false },
      manualBookingInfo: {
        type: 'object',
        properties: {
          customerName: { type: 'string' },
          customerPhone: { type: 'string' },
          customerEmail: { type: 'string' },
          notes: { type: 'string' },
        },
      },

      // 취소 정보
      cancellationReason: { type: 'string', required: false },
      cancelledAt: { type: 'timestamp', required: false },
      cancelledBy: { type: 'string', required: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
      confirmedAt: { type: 'timestamp', required: false },
      completedAt: { type: 'timestamp', required: false },
    },
    indexes: [
      { fields: ['galleryId', 'startDate'] },
      { fields: ['userId', 'createdAt'] },
      { fields: ['status', 'createdAt'] },
      { fields: ['galleryId', 'status', 'startDate'] },
    ],
  },

  // 리뷰 컬렉션
  reviews: {
    collectionName: 'reviews',
    fields: {
      // 기본 정보
      galleryId: { type: 'string', required: true },
      galleryName: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      userName: { type: 'string', required: true },
      userProfileImage: { type: 'string', required: false },

      // 리뷰 내용
      rating: { type: 'number', min: 1, max: 5, required: true },
      content: { type: 'string', required: true },
      imageUrls: { type: 'array', items: 'string', default: [] },

      // 예약 정보
      reservationId: { type: 'string', required: false },

      // 상호작용
      likes: { type: 'number', default: 0 },
      isEdited: { type: 'boolean', default: false },

      // 오너 답글
      ownerReply: { type: 'string', required: false },
      ownerReplyDate: { type: 'timestamp', required: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
    },
    indexes: [
      { fields: ['galleryId', 'createdAt'] },
      { fields: ['userId', 'createdAt'] },
      { fields: ['rating', 'createdAt'] },
    ],
  },

  // 채팅방 컬렉션
  chatRooms: {
    collectionName: 'chatRooms',
    fields: {
      // 참여자 정보
      participants: { type: 'array', items: 'string', required: true },
      userId: { type: 'string', required: true },
      userName: { type: 'string', required: true },
      userType: { type: 'enum', values: Object.values(UserTypes), required: true },

      // 갤러리 정보
      galleryId: { type: 'string', required: true },
      galleryName: { type: 'string', required: true },
      ownerId: { type: 'string', required: true },

      // 아티스트 정보 (아티스트 채팅인 경우)
      artistId: { type: 'string', required: false },
      artistName: { type: 'string', required: false },

      // 마지막 메시지
      lastMessage: { type: 'string', default: '' },
      lastMessageTime: { type: 'timestamp', required: true },
      lastMessageSenderId: { type: 'string', required: false },

      // 읽지 않은 메시지 수
      unreadCount: {
        type: 'object',
        properties: {
          [UserTypes.USER]: { type: 'number', default: 0 },
          [UserTypes.OWNER]: { type: 'number', default: 0 },
        },
      },

      // 상태
      isActive: { type: 'boolean', default: true },
      isBlocked: { type: 'boolean', default: false },
      blockedBy: { type: 'string', required: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
    },
    indexes: [
      { fields: ['participants', 'lastMessageTime'] },
      { fields: ['galleryId', 'lastMessageTime'] },
      { fields: ['userId', 'lastMessageTime'] },
      { fields: ['ownerId', 'lastMessageTime'] },
    ],

    // 서브컬렉션: messages
    subcollections: {
      messages: {
        fields: {
          // 메시지 정보
          text: { type: 'string', required: false },
          imageUrl: { type: 'string', required: false },
          fileUrl: { type: 'string', required: false },
          fileName: { type: 'string', required: false },

          // 발신자 정보
          senderId: { type: 'string', required: true },
          senderName: { type: 'string', required: true },
          type: { type: 'enum', values: Object.values(MessageTypes), required: true },

          // 읽음 상태
          isRead: { type: 'boolean', default: false },
          readAt: { type: 'timestamp', required: false },

          // 타임스탬프
          createdAt: { type: 'timestamp', required: true },
        },
        indexes: [
          { fields: ['createdAt'] },
        ],
      },
    },
  },

  // 아티스트 컬렉션
  artists: {
    collectionName: 'artists',
    fields: {
      // 기본 정보
      artistId: { type: 'string', required: true },
      userId: { type: 'string', required: true },
      displayName: { type: 'string', required: true },
      profileImage: { type: 'string', required: false },

      // 소개
      bio: { type: 'string', required: false },
      statement: { type: 'string', required: false },

      // 장르 및 스타일
      genre: { type: 'array', items: 'string', default: [] },
      style: { type: 'array', items: 'string', default: [] },
      medium: { type: 'array', items: 'string', default: [] },

      // 경력
      education: { type: 'string', required: false },
      awards: { type: 'string', required: false },
      exhibitions: { type: 'array', items: 'object', default: [] },
      experience: { type: 'string', required: false },

      // 연락처
      email: { type: 'string', required: false },
      phone: { type: 'string', required: false },
      website: { type: 'string', required: false },
      instagram: { type: 'string', required: false },

      // 통계
      followersCount: { type: 'number', default: 0 },
      worksCount: { type: 'number', default: 0 },
      exhibitionCount: { type: 'number', default: 0 },

      // 상태
      isActive: { type: 'boolean', default: true },
      isVerified: { type: 'boolean', default: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
    },
    indexes: [
      { fields: ['userId'], unique: true },
      { fields: ['genre', 'isActive'] },
      { fields: ['followersCount', 'isActive'] },
    ],
  },

  // 포트폴리오 컬렉션
  portfolio: {
    collectionName: 'portfolio',
    fields: {
      // 기본 정보
      artistId: { type: 'string', required: true },
      artistName: { type: 'string', required: true },

      // 작품 정보
      title: { type: 'string', required: true },
      description: { type: 'string', required: false },
      imageUrl: { type: 'string', required: true },
      thumbnailUrl: { type: 'string', required: false },

      // 작품 상세
      year: { type: 'number', required: false },
      medium: { type: 'string', required: false },
      size: { type: 'string', required: false },
      price: { type: 'number', required: false },

      // 상태
      isAvailable: { type: 'boolean', default: true },
      isSold: { type: 'boolean', default: false },
      isExhibited: { type: 'boolean', default: false },

      // 전시 정보
      exhibitionId: { type: 'string', required: false },
      galleryId: { type: 'string', required: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
    },
    indexes: [
      { fields: ['artistId', 'createdAt'] },
      { fields: ['isAvailable', 'createdAt'] },
      { fields: ['galleryId', 'createdAt'] },
    ],
  },

  // 전시 제안 컬렉션
  exhibitionProposals: {
    collectionName: 'exhibitionProposals',
    fields: {
      // 기본 정보
      proposalId: { type: 'string', required: true },

      // 갤러리 정보
      galleryId: { type: 'string', required: true },
      galleryName: { type: 'string', required: true },
      ownerId: { type: 'string', required: true },

      // 아티스트 정보
      artistId: { type: 'string', required: true },
      artistName: { type: 'string', required: true },

      // 제안 내용
      title: { type: 'string', required: true },
      description: { type: 'string', required: true },
      proposedStartDate: { type: 'timestamp', required: true },
      proposedEndDate: { type: 'timestamp', required: true },

      // 조건
      commissionRate: { type: 'number', required: false },
      rentalFee: { type: 'number', required: false },
      requirements: { type: 'string', required: false },

      // 상태
      status: { type: 'enum', values: Object.values(ExhibitionStatus), required: true },
      rejectionReason: { type: 'string', required: false },

      // 메시지
      message: { type: 'string', required: false },
      ownerReply: { type: 'string', required: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
      respondedAt: { type: 'timestamp', required: false },
    },
    indexes: [
      { fields: ['galleryId', 'status', 'createdAt'] },
      { fields: ['artistId', 'status', 'createdAt'] },
      { fields: ['ownerId', 'status', 'createdAt'] },
    ],
  },

  // 알림 컬렉션
  notifications: {
    collectionName: 'notifications',
    fields: {
      // 수신자 정보
      to: { type: 'string', required: true }, // FCM 토큰 또는 userId
      userId: { type: 'string', required: false },

      // 알림 내용
      type: { type: 'enum', values: Object.values(NotificationTypes), required: true },
      title: { type: 'string', required: true },
      body: { type: 'string', required: true },

      // 추가 데이터
      data: { type: 'object', default: {} },

      // 상태
      isRead: { type: 'boolean', default: false },
      isSent: { type: 'boolean', default: false },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      sentAt: { type: 'timestamp', required: false },
      readAt: { type: 'timestamp', required: false },
    },
    indexes: [
      { fields: ['userId', 'createdAt'] },
      { fields: ['userId', 'isRead', 'createdAt'] },
    ],
  },

  // 통계 컬렉션 (일별 집계)
  statistics: {
    collectionName: 'statistics',
    fields: {
      // 날짜
      date: { type: 'string', required: true }, // YYYY-MM-DD
      type: { type: 'string', required: true }, // 'gallery', 'user', 'system'
      targetId: { type: 'string', required: false }, // galleryId, userId 등

      // 통계 데이터
      views: { type: 'number', default: 0 },
      likes: { type: 'number', default: 0 },
      reservations: { type: 'number', default: 0 },
      revenue: { type: 'number', default: 0 },
      messages: { type: 'number', default: 0 },

      // 상세 데이터
      hourlyData: { type: 'object', default: {} },

      // 타임스탬프
      createdAt: { type: 'timestamp', required: true },
      updatedAt: { type: 'timestamp', required: true },
    },
    indexes: [
      { fields: ['date', 'type'] },
      { fields: ['targetId', 'date'] },
    ],
  },
};

/**
 * 컬렉션 이름 상수
 */
export const COLLECTIONS = Object.keys(SCHEMAS).reduce((acc, key) => {
  acc[key.toUpperCase()] = SCHEMAS[key].collectionName;
  return acc;
}, {});