/**
 * Firestore 헬퍼 함수들
 *
 * 자주 사용되는 Firestore 작업을 위한 유틸리티 함수들
 */

import firestoreManager from './FirestoreManager';
import { UserTypes, ReservationStatus } from './schemas';

/**
 * 사용자 관련 헬퍼
 */
export const userHelpers = {
  /**
   * 사용자 생성 (회원가입)
   */
  async createUser(uid, userData) {
    return await firestoreManager.create('users', {
      uid,
      ...userData,
      favoriteGalleries: [],
      followingArtists: [],
      notificationSettings: {
        push: true,
        email: true,
        sms: false,
        chat: true,
        reservation: true,
      },
    }, uid);
  },

  /**
   * 사용자 정보 가져오기
   */
  async getUser(uid) {
    return await firestoreManager.read('users', uid);
  },

  /**
   * 사용자 타입별 조회
   */
  async getUsersByType(userType) {
    return await firestoreManager.query('users', [
      { field: 'userType', operator: '==', value: userType },
    ]);
  },

  /**
   * 사용자 프로필 업데이트
   */
  async updateUserProfile(uid, profileData) {
    return await firestoreManager.update('users', uid, profileData);
  },

  /**
   * 사용자 찜 목록 가져오기
   */
  async getUserFavorites(uid) {
    const user = await firestoreManager.read('users', uid);
    if (!user.favoriteGalleries || user.favoriteGalleries.length === 0) {
      return [];
    }

    const galleries = [];
    for (const galleryId of user.favoriteGalleries) {
      try {
        const gallery = await firestoreManager.read('galleries', galleryId);
        galleries.push(gallery);
      } catch (error) {
        console.error(`Failed to fetch gallery ${galleryId}:`, error);
      }
    }
    return galleries;
  },

  /**
   * 갤러리 찜하기/찜 해제
   */
  async toggleFavorite(uid, galleryId) {
    const user = await firestoreManager.read('users', uid);
    const favorites = user.favoriteGalleries || [];
    const index = favorites.indexOf(galleryId);

    if (index > -1) {
      favorites.splice(index, 1);
    } else {
      favorites.push(galleryId);
    }

    await firestoreManager.update('users', uid, {
      favoriteGalleries: favorites,
    });

    return index === -1; // true if added, false if removed
  },
};

/**
 * 갤러리 관련 헬퍼
 */
export const galleryHelpers = {
  /**
   * 갤러리 등록
   */
  async createGallery(galleryData) {
    return await firestoreManager.create('galleries', {
      ...galleryData,
      rating: 0,
      reviewCount: 0,
      likeCount: 0,
      viewCount: 0,
      isActive: true,
      isVerified: false,
    });
  },

  /**
   * 활성 갤러리 목록
   */
  async getActiveGalleries(limit = 20) {
    return await firestoreManager.query('galleries', [
      { field: 'isActive', operator: '==', value: true },
    ], {
      orderBy: ['rating', 'desc'],
      limit,
    });
  },

  /**
   * 오너의 갤러리 목록
   */
  async getOwnerGalleries(ownerId) {
    return await firestoreManager.query('galleries', [
      { field: 'ownerId', operator: '==', value: ownerId },
    ], {
      orderBy: ['createdAt', 'desc'],
    });
  },

  /**
   * 지역별 갤러리 검색
   */
  async searchByLocation(location) {
    return await firestoreManager.query('galleries', [
      { field: 'location', operator: '==', value: location },
      { field: 'isActive', operator: '==', value: true },
    ], {
      orderBy: ['rating', 'desc'],
    });
  },

  /**
   * 가격 범위로 검색
   */
  async searchByPriceRange(minPrice, maxPrice) {
    return await firestoreManager.query('galleries', [
      { field: 'price', operator: '>=', value: minPrice },
      { field: 'price', operator: '<=', value: maxPrice },
      { field: 'isActive', operator: '==', value: true },
    ], {
      orderBy: ['price', 'asc'],
    });
  },

  /**
   * 갤러리 조회수 증가
   */
  async incrementViewCount(galleryId) {
    const gallery = await firestoreManager.read('galleries', galleryId);
    await firestoreManager.update('galleries', galleryId, {
      viewCount: (gallery.viewCount || 0) + 1,
    });
  },

  /**
   * 갤러리 평점 업데이트
   */
  async updateGalleryRating(galleryId) {
    const reviews = await firestoreManager.query('reviews', [
      { field: 'galleryId', operator: '==', value: galleryId },
    ]);

    if (reviews.length === 0) {
      await firestoreManager.update('galleries', galleryId, {
        rating: 0,
        reviewCount: 0,
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await firestoreManager.update('galleries', galleryId, {
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length,
    });
  },
};

/**
 * 예약 관련 헬퍼
 */
export const reservationHelpers = {
  /**
   * 예약 생성
   */
  async createReservation(reservationData) {
    const reservationId = `RES${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

    return await firestoreManager.create('reservations', {
      reservationId,
      ...reservationData,
      status: ReservationStatus.PENDING,
      isManualBooking: false,
    });
  },

  /**
   * 수동 예약 생성
   */
  async createManualBooking(galleryId, bookingData) {
    const reservationId = `MANUAL${Date.now()}${Math.random().toString(36).substr(2, 5)}`;

    return await firestoreManager.create('reservations', {
      reservationId,
      galleryId,
      ...bookingData,
      status: ReservationStatus.CONFIRMED,
      isManualBooking: true,
    });
  },

  /**
   * 사용자의 예약 목록
   */
  async getUserReservations(userId) {
    return await firestoreManager.query('reservations', [
      { field: 'userId', operator: '==', value: userId },
    ], {
      orderBy: ['createdAt', 'desc'],
    });
  },

  /**
   * 갤러리의 예약 목록
   */
  async getGalleryReservations(galleryId) {
    return await firestoreManager.query('reservations', [
      { field: 'galleryId', operator: '==', value: galleryId },
    ], {
      orderBy: ['startDate', 'asc'],
    });
  },

  /**
   * 예약 상태 변경
   */
  async updateReservationStatus(reservationId, status, additionalData = {}) {
    const updateData = {
      status,
      ...additionalData,
    };

    if (status === ReservationStatus.CONFIRMED) {
      updateData.confirmedAt = new Date();
    } else if (status === ReservationStatus.CANCELLED) {
      updateData.cancelledAt = new Date();
    } else if (status === ReservationStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    return await firestoreManager.update('reservations', reservationId, updateData);
  },

  /**
   * 날짜 범위로 예약 충돌 확인
   */
  async checkAvailability(galleryId, startDate, endDate) {
    const reservations = await firestoreManager.query('reservations', [
      { field: 'galleryId', operator: '==', value: galleryId },
      { field: 'status', operator: 'in', value: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
    ]);

    for (const reservation of reservations) {
      const resStart = reservation.startDate.toDate ? reservation.startDate.toDate() : new Date(reservation.startDate);
      const resEnd = reservation.endDate.toDate ? reservation.endDate.toDate() : new Date(reservation.endDate);

      if (
        (startDate >= resStart && startDate <= resEnd) ||
        (endDate >= resStart && endDate <= resEnd) ||
        (startDate <= resStart && endDate >= resEnd)
      ) {
        return false; // 충돌
      }
    }

    return true; // 예약 가능
  },
};

/**
 * 리뷰 관련 헬퍼
 */
export const reviewHelpers = {
  /**
   * 리뷰 작성
   */
  async createReview(reviewData) {
    const review = await firestoreManager.create('reviews', {
      ...reviewData,
      likes: 0,
      isEdited: false,
    });

    // 갤러리 평점 업데이트
    await galleryHelpers.updateGalleryRating(reviewData.galleryId);

    return review;
  },

  /**
   * 갤러리 리뷰 목록
   */
  async getGalleryReviews(galleryId, limit = 20) {
    return await firestoreManager.query('reviews', [
      { field: 'galleryId', operator: '==', value: galleryId },
    ], {
      orderBy: ['createdAt', 'desc'],
      limit,
    });
  },

  /**
   * 사용자 리뷰 목록
   */
  async getUserReviews(userId) {
    return await firestoreManager.query('reviews', [
      { field: 'userId', operator: '==', value: userId },
    ], {
      orderBy: ['createdAt', 'desc'],
    });
  },

  /**
   * 리뷰 수정
   */
  async updateReview(reviewId, content, rating) {
    const review = await firestoreManager.read('reviews', reviewId);

    await firestoreManager.update('reviews', reviewId, {
      content,
      rating,
      isEdited: true,
    });

    // 갤러리 평점 재계산
    await galleryHelpers.updateGalleryRating(review.galleryId);
  },

  /**
   * 오너 답글 추가
   */
  async addOwnerReply(reviewId, reply) {
    return await firestoreManager.update('reviews', reviewId, {
      ownerReply: reply,
      ownerReplyDate: new Date(),
    });
  },
};

/**
 * 채팅 관련 헬퍼
 */
export const chatHelpers = {
  /**
   * 채팅방 생성 또는 가져오기
   */
  async getOrCreateChatRoom(userId, galleryId, userData, galleryData) {
    const chatRoomId = `${userId}_${galleryId}`;

    try {
      return await firestoreManager.read('chatRooms', chatRoomId);
    } catch (error) {
      // 채팅방이 없으면 생성
      return await firestoreManager.create('chatRooms', {
        participants: [userId, galleryData.ownerId],
        userId,
        userName: userData.displayName,
        userType: userData.userType,
        galleryId,
        galleryName: galleryData.galleryName,
        ownerId: galleryData.ownerId,
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: {
          user: 0,
          owner: 0,
        },
        isActive: true,
        isBlocked: false,
      }, chatRoomId);
    }
  },

  /**
   * 메시지 전송
   */
  async sendMessage(chatRoomId, message) {
    // 메시지 추가
    const messageDoc = await firestoreManager.create(`chatRooms/${chatRoomId}/messages`, message);

    // 채팅방 업데이트
    await firestoreManager.update('chatRooms', chatRoomId, {
      lastMessage: message.text || '사진',
      lastMessageTime: new Date(),
      lastMessageSenderId: message.senderId,
    });

    return messageDoc;
  },

  /**
   * 사용자의 채팅방 목록
   */
  async getUserChatRooms(userId) {
    return await firestoreManager.query('chatRooms', [
      { field: 'participants', operator: 'array-contains', value: userId },
    ], {
      orderBy: ['lastMessageTime', 'desc'],
    });
  },

  /**
   * 오너의 채팅방 목록
   */
  async getOwnerChatRooms(ownerId, galleryIds) {
    const chatRooms = await firestoreManager.query('chatRooms', [
      { field: 'participants', operator: 'array-contains', value: ownerId },
    ], {
      orderBy: ['lastMessageTime', 'desc'],
    });

    // 자신이 운영하는 갤러리의 채팅만 필터
    return chatRooms.filter(room => galleryIds.includes(room.galleryId));
  },

  /**
   * 메시지 읽음 처리
   */
  async markMessagesAsRead(chatRoomId, userId) {
    const messages = await firestoreManager.query(`chatRooms/${chatRoomId}/messages`, [
      { field: 'senderId', operator: '!=', value: userId },
      { field: 'isRead', operator: '==', value: false },
    ]);

    await firestoreManager.batch(async (batch) => {
      messages.forEach(message => {
        batch.update(`chatRooms/${chatRoomId}/messages`, message.id, {
          isRead: true,
          readAt: new Date(),
        });
      });
    });
  },
};

/**
 * 아티스트 관련 헬퍼
 */
export const artistHelpers = {
  /**
   * 아티스트 프로필 생성
   */
  async createArtistProfile(userId, profileData) {
    const artistId = `artist_${userId}`;
    return await firestoreManager.create('artists', {
      artistId,
      userId,
      ...profileData,
      followersCount: 0,
      worksCount: 0,
      exhibitionCount: 0,
      isActive: true,
      isVerified: false,
    }, artistId);
  },

  /**
   * 활성 아티스트 목록
   */
  async getActiveArtists(limit = 20) {
    return await firestoreManager.query('artists', [
      { field: 'isActive', operator: '==', value: true },
    ], {
      orderBy: ['followersCount', 'desc'],
      limit,
    });
  },

  /**
   * 장르별 아티스트 검색
   */
  async searchByGenre(genre) {
    return await firestoreManager.query('artists', [
      { field: 'genre', operator: 'array-contains', value: genre },
      { field: 'isActive', operator: '==', value: true },
    ]);
  },

  /**
   * 포트폴리오 작품 추가
   */
  async addPortfolioWork(artistId, workData) {
    const work = await firestoreManager.create('portfolio', {
      artistId,
      ...workData,
      isAvailable: true,
      isSold: false,
      isExhibited: false,
    });

    // 작품 수 증가
    const artist = await firestoreManager.read('artists', artistId);
    await firestoreManager.update('artists', artistId, {
      worksCount: (artist.worksCount || 0) + 1,
    });

    return work;
  },

  /**
   * 아티스트의 포트폴리오
   */
  async getArtistPortfolio(artistId) {
    return await firestoreManager.query('portfolio', [
      { field: 'artistId', operator: '==', value: artistId },
    ], {
      orderBy: ['createdAt', 'desc'],
    });
  },
};

/**
 * 통계 관련 헬퍼
 */
export const statsHelpers = {
  /**
   * 일별 통계 업데이트
   */
  async updateDailyStats(type, targetId, stats) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const statsId = `${date}_${type}_${targetId || 'system'}`;

    try {
      const existing = await firestoreManager.read('statistics', statsId);

      await firestoreManager.update('statistics', statsId, {
        views: (existing.views || 0) + (stats.views || 0),
        likes: (existing.likes || 0) + (stats.likes || 0),
        reservations: (existing.reservations || 0) + (stats.reservations || 0),
        revenue: (existing.revenue || 0) + (stats.revenue || 0),
        messages: (existing.messages || 0) + (stats.messages || 0),
      });
    } catch (error) {
      // 문서가 없으면 생성
      await firestoreManager.create('statistics', {
        date,
        type,
        targetId,
        ...stats,
      }, statsId);
    }
  },

  /**
   * 기간별 통계 조회
   */
  async getStatsByPeriod(type, targetId, startDate, endDate) {
    const stats = await firestoreManager.query('statistics', [
      { field: 'type', operator: '==', value: type },
      { field: 'targetId', operator: '==', value: targetId },
      { field: 'date', operator: '>=', value: startDate },
      { field: 'date', operator: '<=', value: endDate },
    ], {
      orderBy: ['date', 'asc'],
    });

    return stats;
  },

  /**
   * 갤러리 매출 통계
   */
  async getGalleryRevenue(galleryId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

    const stats = await this.getStatsByPeriod('gallery', galleryId, startDate, endDate);

    return stats.reduce((total, stat) => total + (stat.revenue || 0), 0);
  },
};

/**
 * 일반 유틸리티
 */
export const generalHelpers = {
  /**
   * 배치 삭제
   */
  async batchDelete(collection, ids) {
    await firestoreManager.batch(async (batch) => {
      ids.forEach(id => {
        batch.delete(collection, id);
      });
    });
  },

  /**
   * 배치 업데이트
   */
  async batchUpdate(collection, updates) {
    await firestoreManager.batch(async (batch) => {
      updates.forEach(({ id, data }) => {
        batch.update(collection, id, data);
      });
    });
  },

  /**
   * 실시간 구독 설정
   */
  subscribeToCollection(collection, callback, options = {}) {
    const listenerId = `listener_${Date.now()}`;
    return firestoreManager.subscribe(collection, listenerId, callback, options);
  },

  /**
   * 문서 존재 여부 확인
   */
  async documentExists(collection, documentId) {
    try {
      await firestoreManager.read(collection, documentId);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * 컬렉션 크기 가져오기
   */
  async getCollectionSize(collection) {
    const stats = await firestoreManager.getCollectionStats(collection);
    return stats.count;
  },
};