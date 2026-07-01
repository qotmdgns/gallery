import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import ApiService from './ApiService';
import FirebaseService from './FirebaseService';

class NotificationService {
  constructor() {
    this.messageListener = null;
  }

  // 알림 권한 요청
  async requestPermission() {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('알림 권한이 승인되었습니다.');
          return true;
        }
      } else {
        // Android 13+ 알림 권한 요청
        if (Platform.Version >= 33) {
          const settings = await notifee.requestPermission();
          return settings.authorizationStatus >= 1;
        }
        return true;
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      return false;
    }
  }

  // FCM 토큰 가져오기 및 저장
// FCM 토큰 가져오기 및 저장
async getFCMToken() {
  try {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      await AsyncStorage.setItem('fcmToken', fcmToken);
      console.log('FCM 토큰 로컬 저장:', fcmToken.substring(0, 20) + '...');
      
      // 사용자 인증 상태 확인
      const currentUser = auth().currentUser;
      if (currentUser) {
        // 로그인된 경우에만 서버에 저장
        try {
          console.log('Attempting to save FCM token for user:', currentUser.uid);
          
          try {
            const firebaseService = new FirebaseService();
            await firebaseService.saveFCMToken(fcmToken);
            console.log('FCM 토큰 Firestore 직접 저장 성공');
          } catch (firestoreError) {
            console.error('Firestore 직접 저장 실패, Cloud Functions 시도:', firestoreError);
            await ApiService.saveFCMToken(fcmToken);
            console.log('FCM 토큰 Cloud Functions 통해 저장 성공');
          }
        } catch (error) {
          console.error('FCM 토큰 서버 저장 실패:', error);
          // 서버 저장 실패해도 로컬에는 저장되어 있으므로 계속 진행
        }
      } else {
        console.log('사용자 미인증 상태 - FCM 토큰을 로컬에만 저장');
        // 나중에 로그인 시 동기화하도록 플래그 설정
        await AsyncStorage.setItem('fcmTokenPendingSync', 'true');
      }
      
      return fcmToken;
    }
  } catch (error) {
    console.error('FCM 토큰 가져오기 실패:', error);
    return null;
  }
}

// 사용자 로그인 후 FCM 토큰 동기화
async syncFCMTokenAfterLogin() {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      console.log('사용자가 로그인되지 않음');
      return;
    }

    const pendingSync = await AsyncStorage.getItem('fcmTokenPendingSync');
    if (pendingSync === 'true') {
      const fcmToken = await AsyncStorage.getItem('fcmToken');
      if (fcmToken) {
        console.log('저장 대기 중인 FCM 토큰 동기화 시작');
        
        try {
          const firebaseService = new FirebaseService();
          await firebaseService.saveFCMToken(fcmToken);
          console.log('FCM 토큰 동기화 성공');
        } catch (error) {
          console.error('FCM 토큰 동기화 실패, Cloud Functions 시도:', error);
          await ApiService.saveFCMToken(fcmToken);
        }
        
        // 동기화 완료 후 플래그 제거
        await AsyncStorage.removeItem('fcmTokenPendingSync');
      }
    }
  } catch (error) {
    console.error('FCM 토큰 동기화 실패:', error);
  }
}
  // 토큰 새로고침 리스너
  onTokenRefresh() {
    return messaging().onTokenRefresh(async (token) => {
      await AsyncStorage.setItem('fcmToken', token);
      
      // FCM 토큰 저장
      try {
        // Firestore 직접 저장 시도
        const firebaseService = new FirebaseService();
        await firebaseService.saveFCMToken(token);
        console.log('새로운 FCM 토큰 Firestore 저장 완료');
      } catch (error) {
        console.error('새 FCM 토큰 저장 실패:', error);
        // Cloud Functions 시도
        try {
          await ApiService.saveFCMToken(token);
          console.log('새로운 FCM 토큰 Cloud Functions 통해 저장 완료');
        } catch (apiError) {
          console.error('새 FCM 토큰 Cloud Functions 저장도 실패:', apiError);
        }
      }
    });
  }

  // 알림 채널 생성 (Android)
  async createNotificationChannels() {
    if (Platform.OS === 'android') {
      // 예약 알림 채널
      await notifee.createChannel({
        id: 'booking',
        name: '예약 알림',
        description: '예약 관련 알림을 받습니다',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      // 예약 리마인더 채널
      await notifee.createChannel({
        id: 'booking-reminder',
        name: '예약 리마인더',
        description: '예약 일정 리마인더 알림',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      // 채팅 알림 채널
      await notifee.createChannel({
        id: 'chat',
        name: '채팅 알림',
        description: '새로운 메시지 알림을 받습니다',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });

      // 프로모션 알림 채널
      await notifee.createChannel({
        id: 'promotion',
        name: '프로모션',
        description: '이벤트 및 프로모션 알림을 받습니다',
        importance: AndroidImportance.DEFAULT,
      });

      // 시스템 알림 채널
      await notifee.createChannel({
        id: 'system',
        name: '시스템',
        description: '중요한 시스템 알림을 받습니다',
        importance: AndroidImportance.HIGH,
      });
    }
  }

  // 로컬 알림 표시
  async displayNotification(title, body, data = {}, channelId = 'default') {
    try {
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId,
          smallIcon: 'ic_notification', // drawable 폴더에 아이콘 추가 필요
          pressAction: {
            id: 'default',
          },
          importance: AndroidImportance.HIGH,
          showTimestamp: true,
        },
        ios: {
          sound: 'default',
        },
        data,
      });
    } catch (error) {
      console.error('알림 표시 실패:', error);
    }
  }

  // 예약 알림 표시
  async displayBookingNotification(booking) {
    const { galleryName, status, reservationDate } = booking;
    let title = '';
    let body = '';

    switch (status) {
      case 'confirmed':
        title = '예약 확정';
        body = `${galleryName} 예약이 확정되었습니다. (${reservationDate})`;
        break;
      case 'cancelled':
        title = '예약 취소';
        body = `${galleryName} 예약이 취소되었습니다.`;
        break;
      case 'pending':
        title = '예약 대기중';
        body = `${galleryName} 예약이 접수되었습니다. 확정을 기다려주세요.`;
        break;
      default:
        return;
    }

    await this.displayNotification(title, body, booking, 'booking');
  }

  // 채팅 알림 표시
  async displayChatNotification(message) {
    const { senderName, text, galleryName } = message;
    
    await notifee.displayNotification({
      title: `${senderName} (${galleryName})`,
      body: text,
      android: {
        channelId: 'chat',
        smallIcon: 'ic_notification',
        largeIcon: message.senderAvatar, // 프로필 이미지 URL
        style: {
          type: AndroidStyle.MESSAGING,
          person: {
            name: senderName,
            icon: message.senderAvatar,
          },
          messages: [
            {
              text: text,
              timestamp: Date.now(),
            },
          ],
        },
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
      data: message,
    });
  }

  // 포그라운드 메시지 리스너
  onMessage() {
    return messaging().onMessage(async (remoteMessage) => {
      console.log('포그라운드 메시지:', remoteMessage);
      
      const { notification, data } = remoteMessage;
      
      if (notification) {
        // 알림 타입에 따라 다른 처리
        if (data?.type === 'booking') {
          await this.displayBookingNotification(data);
        } else if (data?.type === 'chat') {
          await this.displayChatNotification(data);
        } else {
          await this.displayNotification(
            notification.title,
            notification.body,
            data,
            data?.channelId || 'default'
          );
        }
      }
    });
  }

  // 백그라운드 메시지 핸들러 설정
  setBackgroundMessageHandler() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('백그라운드 메시지:', remoteMessage);
      
      const { notification, data } = remoteMessage;
      
      if (notification) {
        if (data?.type === 'booking') {
          await this.displayBookingNotification(data);
        } else if (data?.type === 'chat') {
          await this.displayChatNotification(data);
        }
      }
    });
  }

  // 알림 클릭 핸들러
  async onNotificationOpenedApp() {
    // 앱이 백그라운드 상태에서 알림 클릭
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('백그라운드에서 알림 열기:', remoteMessage);
      this.handleNotificationOpen(remoteMessage.data);
    });

    // 앱이 종료된 상태에서 알림 클릭
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      console.log('앱 종료 상태에서 알림 열기:', initialNotification);
      this.handleNotificationOpen(initialNotification.data);
    }

    // Notifee 알림 이벤트 리스너
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('Notifee 알림 클릭:', detail.notification);
        this.handleNotificationOpen(detail.notification?.data);
      }
    });
  }

  // 알림 열기 처리
  handleNotificationOpen(data) {
    if (!data) return;

    // 네비게이션 처리는 App.js에서 처리하도록 이벤트 발생
    if (data.type === 'booking') {
      // 예약 상세 화면으로 이동
      this.navigateToScreen('BookingDetail', { bookingId: data.bookingId });
    } else if (data.type === 'chat') {
      // 채팅 화면으로 이동
      this.navigateToScreen('ChatDetail', { 
        chatRoomId: data.chatRoomId,
        galleryName: data.galleryName 
      });
    }
  }

  // 화면 네비게이션 (App.js에서 구현)
  navigateToScreen(screen, params) {
    // 이 메서드는 App.js에서 navigation ref를 통해 구현
    console.log('Navigate to:', screen, params);
  }

  // 알림 설정 상태 가져오기
  async getNotificationSettings() {
    try {
      const settings = await notifee.getNotificationSettings();
      return {
        enabled: settings.authorizationStatus >= 1,
        sound: settings.android?.sound || settings.ios?.sound,
        badge: settings.ios?.badge,
        alert: settings.ios?.alert,
      };
    } catch (error) {
      console.error('알림 설정 조회 실패:', error);
      return null;
    }
  }

  // 배지 카운트 설정 (iOS)
  async setBadgeCount(count) {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(count);
    }
  }

  // 배지 카운트 초기화
  async clearBadgeCount() {
    if (Platform.OS === 'ios') {
      await notifee.setBadgeCount(0);
    }
  }

  // 특정 알림 제거
  async cancelNotification(notificationId) {
    await notifee.cancelNotification(notificationId);
  }

  // 모든 알림 제거
  async cancelAllNotifications() {
    await notifee.cancelAllNotifications();
  }

  // 예약 리마인더 스케줄링
  async scheduleBookingReminder(booking, reminderTime) {
    try {
      const { id, galleryName, startDate, timeSlot } = booking;
      const reminderDate = new Date(startDate.toDate());

      // reminderTime: 'day_before', 'morning_of', '1_hour_before', '30_min_before'
      switch(reminderTime) {
        case 'day_before':
          reminderDate.setDate(reminderDate.getDate() - 1);
          reminderDate.setHours(18, 0, 0, 0); // 전날 오후 6시
          break;
        case 'morning_of':
          reminderDate.setHours(9, 0, 0, 0); // 당일 오전 9시
          break;
        case '1_hour_before':
          const [startHour] = (timeSlot || '10:00').split(':')[0].split('-');
          reminderDate.setHours(parseInt(startHour) - 1, 0, 0, 0);
          break;
        case '30_min_before':
          const [startHour30] = (timeSlot || '10:00').split(':')[0].split('-');
          reminderDate.setHours(parseInt(startHour30), -30, 0, 0);
          break;
        default:
          return;
      }

      // 과거 시간이면 스케줄링하지 않음
      if (reminderDate <= new Date()) {
        console.log('리마인더 시간이 이미 지났습니다.');
        return;
      }

      const notificationId = `booking-reminder-${id}-${reminderTime}`;

      await notifee.createTriggerNotification(
        {
          id: notificationId,
          title: '🔔 예약 리마인더',
          body: this.getReminderMessage(galleryName, reminderTime, timeSlot),
          android: {
            channelId: 'booking-reminder',
            smallIcon: 'ic_notification',
            pressAction: {
              id: 'default',
            },
          },
          ios: {
            sound: 'default',
          },
          data: {
            type: 'booking-reminder',
            bookingId: id,
            reminderTime,
          },
        },
        {
          type: notifee.TriggerType.TIMESTAMP,
          timestamp: reminderDate.getTime(),
        }
      );

      console.log(`예약 리마인더 설정: ${galleryName} - ${reminderTime}`);
      return notificationId;
    } catch (error) {
      console.error('예약 리마인더 스케줄링 실패:', error);
      throw error;
    }
  }

  // 리마인더 메시지 생성
  getReminderMessage(galleryName, reminderTime, timeSlot) {
    switch(reminderTime) {
      case 'day_before':
        return `내일 ${galleryName} 예약이 있습니다. 준비하세요!`;
      case 'morning_of':
        return `오늘 ${timeSlot || ''}에 ${galleryName} 예약이 있습니다.`;
      case '1_hour_before':
        return `1시간 후 ${galleryName} 예약이 있습니다. 출발 준비하세요!`;
      case '30_min_before':
        return `30분 후 ${galleryName} 예약이 있습니다. 서둘러주세요!`;
      default:
        return `${galleryName} 예약 리마인더입니다.`;
    }
  }

  // 예약별 리마인더 취소
  async cancelBookingReminders(bookingId) {
    const reminderTypes = ['day_before', 'morning_of', '1_hour_before', '30_min_before'];

    for (const type of reminderTypes) {
      try {
        await notifee.cancelNotification(`booking-reminder-${bookingId}-${type}`);
      } catch (error) {
        console.log(`리마인더 취소 실패 (${type}):`, error);
      }
    }
  }

  // 예약 리마인더 설정 저장
  async saveReminderSettings(bookingId, settings) {
    try {
      const key = `reminder_settings_${bookingId}`;
      await AsyncStorage.setItem(key, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('리마인더 설정 저장 실패:', error);
      return false;
    }
  }

  // 예약 리마인더 설정 불러오기
  async getReminderSettings(bookingId) {
    try {
      const key = `reminder_settings_${bookingId}`;
      const settings = await AsyncStorage.getItem(key);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('리마인더 설정 불러오기 실패:', error);
      return null;
    }
  }

  // 전체 리마인더 설정 불러오기
  async getAllReminderSettings() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const reminderKeys = keys.filter(key => key.startsWith('reminder_settings_'));
      const settings = {};

      for (const key of reminderKeys) {
        const bookingId = key.replace('reminder_settings_', '');
        const value = await AsyncStorage.getItem(key);
        if (value) {
          settings[bookingId] = JSON.parse(value);
        }
      }

      return settings;
    } catch (error) {
      console.error('전체 리마인더 설정 불러오기 실패:', error);
      return {};
    }
  }

  // 서비스 초기화
  async initialize() {
    try {
      // 알림 권한 요청
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        console.log('알림 권한이 거부되었습니다.');
        return false;
      }

      // FCM 토큰 가져오기
      await this.getFCMToken();

      // 알림 채널 생성 (Android)
      await this.createNotificationChannels();

      // 리스너 설정
      this.messageListener = this.onMessage();
      this.onTokenRefresh();
      this.setBackgroundMessageHandler();
      await this.onNotificationOpenedApp();

      console.log('알림 서비스 초기화 완료');
      return true;
    } catch (error) {
      console.error('알림 서비스 초기화 실패:', error);
      return false;
    }
  }

  // 서비스 정리
  cleanup() {
    if (this.messageListener) {
      this.messageListener();
      this.messageListener = null;
    }
  }
}

export default NotificationService;