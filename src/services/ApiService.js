import auth from '@react-native-firebase/auth';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

// Cloud Functions 엔드포인트 설정
// 개발 환경에서도 실제 Cloud Functions 사용 (Emulator 미사용)
const FUNCTIONS_BASE_URL = 'https://us-central1-galleryproject-e61c4.cloudfunctions.net';

class ApiService {
  constructor() {
    this.baseUrl = FUNCTIONS_BASE_URL;
  }

  // API 요청 헬퍼 메서드
  async request(endpoint, method = 'GET', body = null) {
    try {
      const url = `${this.baseUrl}/${endpoint}`;
      console.log(`API Request: ${method} ${url}`);
      
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      // 인증 토큰 추가
      const currentUser = auth().currentUser;
      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        options.headers['Authorization'] = `Bearer ${idToken}`;
      }

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const responseText = await response.text();
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      console.log('Response text (first 200 chars):', responseText.substring(0, 200));
      
      // HTML 응답 감지 (404, 500 등의 에러 페이지)
      if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
        console.error('Received HTML instead of JSON. This usually means:');
        console.error('1. Cloud Function is not deployed');
        console.error('2. Wrong URL or function name');
        console.error('3. Authentication error');
        throw new Error(`Cloud Function not available: ${endpoint}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Response text:', responseText);
        throw new Error(`Invalid JSON response from ${endpoint}`);
      }

      if (!response.ok) {
        throw new Error(data.error || `API request failed with status ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ============= FCM 토큰 관리 =============

  // FCM 토큰 저장
  async saveFCMToken(fcmToken) {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // 디바이스 정보 수집 (에러 안전하게 처리)
      let deviceInfo = {};
      try {
        deviceInfo = {
          brand: await DeviceInfo.getBrand(),
          model: await DeviceInfo.getModel(),
          systemVersion: await DeviceInfo.getSystemVersion(),
          appVersion: await DeviceInfo.getVersion(),
          buildNumber: await DeviceInfo.getBuildNumber(),
          deviceId: await DeviceInfo.getUniqueId(),
        };
      } catch (deviceError) {
        console.warn('Failed to get device info:', deviceError);
        // 기본값 사용
        deviceInfo = {
          brand: 'Unknown',
          model: 'Unknown',
          systemVersion: Platform.OS,
          appVersion: '1.0.0',
          buildNumber: '1',
          deviceId: `${Platform.OS}-${Date.now()}`,
        };
      }

      console.log('Saving FCM token to server:', {
        userId: currentUser.uid,
        fcmToken: fcmToken.substring(0, 20) + '...',
        platform: Platform.OS,
      });

      const response = await this.request('saveFCMToken', 'POST', {
        userId: currentUser.uid,
        fcmToken: fcmToken,
        platform: Platform.OS,
        deviceInfo: deviceInfo,
      });

      console.log('FCM token saved successfully:', response);

      return response;
    } catch (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  }

  // FCM 토큰 삭제 (로그아웃 시)
  async deleteFCMToken() {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        return;
      }

      const response = await this.request('deleteFCMToken', 'POST', {
        userId: currentUser.uid,
      });

      return response;
    } catch (error) {
      console.error('Error deleting FCM token:', error);
      // 로그아웃 시 실패해도 계속 진행
    }
  }

  // ============= 푸시 알림 전송 =============

  // 단일 사용자에게 알림 전송
  async sendNotification(userId, title, body, data = {}, channelId = 'default') {
    try {
      const response = await this.request('sendPushNotification', 'POST', {
        userId,
        title,
        body,
        data,
        channelId,
      });

      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // 여러 사용자에게 알림 전송
  async sendBatchNotifications(userIds, title, body, data = {}, channelId = 'default') {
    try {
      const response = await this.request('sendBatchNotifications', 'POST', {
        userIds,
        title,
        body,
        data,
        channelId,
      });

      return response;
    } catch (error) {
      console.error('Error sending batch notifications:', error);
      throw error;
    }
  }

  // ============= 예약 관련 알림 =============

  // 예약 확정 알림 전송
  async sendBookingConfirmation(bookingId, userId) {
    try {
      const response = await this.request('sendBookingConfirmation', 'POST', {
        bookingId,
        userId,
      });

      return response;
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      throw error;
    }
  }

  // 예약 취소 알림 전송
  async sendBookingCancellation(bookingId, userId, reason = '') {
    try {
      const response = await this.request('sendBookingCancellation', 'POST', {
        bookingId,
        userId,
        reason,
      });

      return response;
    } catch (error) {
      console.error('Error sending booking cancellation:', error);
      throw error;
    }
  }

  // ============= 채팅 관련 알림 =============

  // 채팅 메시지 알림 전송
  async sendChatNotification(chatRoomId, recipientId, message) {
    try {
      const response = await this.request('sendChatNotification', 'POST', {
        chatRoomId,
        recipientId,
        message,
      });

      return response;
    } catch (error) {
      console.error('Error sending chat notification:', error);
      throw error;
    }
  }

  // ============= 프로모션 알림 =============

  // 프로모션 알림 전송 (관리자용)
  async sendPromotionNotification(title, body, targetUserIds = null) {
    try {
      const endpoint = targetUserIds ? 'sendTargetedPromotion' : 'sendGlobalPromotion';
      
      const response = await this.request(endpoint, 'POST', {
        title,
        body,
        userIds: targetUserIds,
      });

      return response;
    } catch (error) {
      console.error('Error sending promotion:', error);
      throw error;
    }
  }

  // ============= 시스템 알림 =============

  // 시스템 공지사항 전송
  async sendSystemNotification(title, body, priority = 'normal') {
    try {
      const response = await this.request('sendSystemNotification', 'POST', {
        title,
        body,
        priority,
      });

      return response;
    } catch (error) {
      console.error('Error sending system notification:', error);
      throw error;
    }
  }

  // ============= 알림 로그 =============

  // 사용자별 알림 히스토리 조회
  async getNotificationHistory(userId = null, limit = 50) {
    try {
      const currentUser = auth().currentUser;
      const targetUserId = userId || currentUser?.uid;

      if (!targetUserId) {
        throw new Error('User ID required');
      }

      const response = await this.request(
        `getNotificationHistory?userId=${targetUserId}&limit=${limit}`,
        'GET'
      );

      return response;
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }

  // 알림 읽음 처리
  async markNotificationAsRead(notificationId) {
    try {
      const response = await this.request('markNotificationAsRead', 'POST', {
        notificationId,
      });

      return response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // 모든 알림 읽음 처리
  async markAllNotificationsAsRead() {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const response = await this.request('markAllNotificationsAsRead', 'POST', {
        userId: currentUser.uid,
      });

      return response;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
}

export default new ApiService();