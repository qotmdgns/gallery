import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ReservationAutomationService {
  constructor() {
    this.checkInterval = null;
    this.lastCheckTime = null;
    this.AUTOMATION_KEY = '@reservation_automation_last_check';
  }

  // 서비스 시작
  async startAutomation() {
    console.log('예약 자동화 서비스 시작');

    // 마지막 체크 시간 로드
    const lastCheck = await AsyncStorage.getItem(this.AUTOMATION_KEY);
    this.lastCheckTime = lastCheck ? new Date(lastCheck) : new Date();

    // 즉시 한 번 실행
    await this.runAllAutomations();

    // 5분마다 자동화 실행
    this.checkInterval = setInterval(async () => {
      await this.runAllAutomations();
    }, 5 * 60 * 1000); // 5분

    // 알림 채널 생성 (Android)
    await this.createNotificationChannel();
  }

  // 서비스 중지
  stopAutomation() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('예약 자동화 서비스 중지');
  }

  // 모든 자동화 실행
  async runAllAutomations() {
    const now = new Date();

    try {
      await Promise.all([
        this.updateExpiredReservations(now),
        this.checkUpcomingReservations(now),
        this.handleNoShows(now),
        this.scheduleReminders(now),
      ]);

      // 마지막 체크 시간 저장
      this.lastCheckTime = now;
      await AsyncStorage.setItem(this.AUTOMATION_KEY, now.toISOString());
    } catch (error) {
      console.error('자동화 실행 오류:', error);
    }
  }

  // 1. 만료된 예약 상태 자동 업데이트
  async updateExpiredReservations(currentTime) {
    try {
      // confirmed 상태이면서 종료 시간이 지난 예약 조회
      const expiredReservations = await firestore()
        .collection('reservations')
        .where('status', '==', 'confirmed')
        .where('endDate', '<', currentTime)
        .get();

      const batch = firestore().batch();
      let updateCount = 0;

      expiredReservations.forEach(doc => {
        const data = doc.data();
        // 종료 후 2시간이 지났으면 completed로 변경
        const endTime = data.endDate.toDate();
        const hoursSinceEnd = (currentTime - endTime) / (1000 * 60 * 60);

        if (hoursSinceEnd >= 2) {
          batch.update(doc.ref, {
            status: 'completed',
            completedAt: firestore.FieldValue.serverTimestamp(),
            autoCompleted: true,
          });
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`${updateCount}개 예약이 자동으로 완료 처리됨`);
      }
    } catch (error) {
      console.error('예약 상태 업데이트 오류:', error);
    }
  }

  // 2. 예약 리마인더 자동 발송
  async checkUpcomingReservations(currentTime) {
    try {
      // 24시간 이내 예약 조회
      const tomorrow = new Date(currentTime);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const upcomingReservations = await firestore()
        .collection('reservations')
        .where('status', '==', 'confirmed')
        .where('startDate', '>', currentTime)
        .where('startDate', '<', tomorrow)
        .get();

      for (const doc of upcomingReservations.docs) {
        const reservation = { id: doc.id, ...doc.data() };
        const startTime = reservation.startDate.toDate();
        const hoursUntilStart = (startTime - currentTime) / (1000 * 60 * 60);

        // 리마인더 발송 체크
        await this.sendReminderIfNeeded(reservation, hoursUntilStart);
      }
    } catch (error) {
      console.error('예약 리마인더 체크 오류:', error);
    }
  }

  // 3. 리마인더 발송 로직
  async sendReminderIfNeeded(reservation, hoursUntilStart) {
    const reminderKey = `reminder_${reservation.id}`;

    try {
      // 이미 발송된 리마인더 확인
      const sentReminders = await AsyncStorage.getItem(reminderKey);
      const reminders = sentReminders ? JSON.parse(sentReminders) : {};

      // 24시간 전 리마인더
      if (hoursUntilStart <= 24 && hoursUntilStart > 23 && !reminders['24h']) {
        await this.sendNotification(
          reservation.userId,
          '예약 알림',
          `내일 ${reservation.galleryName} 예약이 있습니다.`,
          { reservationId: reservation.id, type: '24h_reminder' }
        );
        reminders['24h'] = true;
      }

      // 3시간 전 리마인더
      if (hoursUntilStart <= 3 && hoursUntilStart > 2.5 && !reminders['3h']) {
        await this.sendNotification(
          reservation.userId,
          '예약 임박 알림',
          `3시간 후 ${reservation.galleryName} 예약이 있습니다.`,
          { reservationId: reservation.id, type: '3h_reminder' }
        );
        reminders['3h'] = true;
      }

      // 1시간 전 리마인더
      if (hoursUntilStart <= 1 && hoursUntilStart > 0.5 && !reminders['1h']) {
        await this.sendNotification(
          reservation.userId,
          '예약 임박 알림',
          `1시간 후 ${reservation.galleryName} 예약이 있습니다. 준비해주세요!`,
          { reservationId: reservation.id, type: '1h_reminder' }
        );
        reminders['1h'] = true;
      }

      // 발송 기록 저장
      await AsyncStorage.setItem(reminderKey, JSON.stringify(reminders));
    } catch (error) {
      console.error('리마인더 발송 오류:', error);
    }
  }

  // 4. No-show 자동 처리
  async handleNoShows(currentTime) {
    try {
      // 시작 시간이 1시간 이상 지난 confirmed 예약 조회
      const oneHourAgo = new Date(currentTime);
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const noShowCandidates = await firestore()
        .collection('reservations')
        .where('status', '==', 'confirmed')
        .where('startDate', '<', oneHourAgo)
        .get();

      const batch = firestore().batch();
      let noShowCount = 0;

      for (const doc of noShowCandidates.docs) {
        const reservation = doc.data();
        const startTime = reservation.startDate.toDate();
        const hoursSinceStart = (currentTime - startTime) / (1000 * 60 * 60);

        // 시작 후 1시간이 지났고 아직 처리되지 않은 경우
        if (hoursSinceStart >= 1 && hoursSinceStart < 24) {
          batch.update(doc.ref, {
            status: 'no_show',
            noShowAt: firestore.FieldValue.serverTimestamp(),
            previousStatus: 'confirmed',
          });

          // 갤러리 오너에게 no-show 알림
          await this.sendNotification(
            reservation.galleryOwnerId,
            'No-show 발생',
            `${reservation.userName}님이 예약 시간에 나타나지 않았습니다.`,
            {
              reservationId: doc.id,
              type: 'no_show',
              userId: reservation.userId
            }
          );

          // 사용자에게도 알림
          await this.sendNotification(
            reservation.userId,
            '예약 미참석 안내',
            `${reservation.galleryName} 예약에 참석하지 않으셨습니다. 다음에는 미리 취소해주세요.`,
            { reservationId: doc.id, type: 'no_show_user' }
          );

          noShowCount++;
        }
      }

      if (noShowCount > 0) {
        await batch.commit();
        console.log(`${noShowCount}개 예약이 no-show 처리됨`);

        // No-show 통계 업데이트
        await this.updateNoShowStats(noShowCandidates.docs);
      }
    } catch (error) {
      console.error('No-show 처리 오류:', error);
    }
  }

  // 5. 예약 알림 스케줄링 (로컬 알림)
  async scheduleReminders(currentTime) {
    try {
      // 오늘과 내일 예약 조회
      const twoDaysLater = new Date(currentTime);
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);

      const upcomingReservations = await firestore()
        .collection('reservations')
        .where('status', '==', 'confirmed')
        .where('startDate', '>', currentTime)
        .where('startDate', '<', twoDaysLater)
        .get();

      for (const doc of upcomingReservations.docs) {
        const reservation = { id: doc.id, ...doc.data() };
        await this.scheduleLocalNotifications(reservation);
      }
    } catch (error) {
      console.error('알림 스케줄링 오류:', error);
    }
  }

  // 6. 로컬 알림 예약
  async scheduleLocalNotifications(reservation) {
    try {
      const startTime = reservation.startDate.toDate();
      const notificationId = `reservation_${reservation.id}`;

      // 기존 알림 취소
      await notifee.cancelTriggerNotifications([
        `${notificationId}_1h`,
        `${notificationId}_30m`,
      ]);

      // 1시간 전 알림
      const oneHourBefore = new Date(startTime);
      oneHourBefore.setHours(oneHourBefore.getHours() - 1);

      if (oneHourBefore > new Date()) {
        await notifee.createTriggerNotification(
          {
            id: `${notificationId}_1h`,
            title: '예약 알림',
            body: `1시간 후 ${reservation.galleryName} 예약이 있습니다.`,
            android: {
              channelId: 'reservation-reminder',
              importance: AndroidImportance.HIGH,
            },
            data: { reservationId: reservation.id },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: oneHourBefore.getTime(),
          }
        );
      }

      // 30분 전 알림
      const thirtyMinBefore = new Date(startTime);
      thirtyMinBefore.setMinutes(thirtyMinBefore.getMinutes() - 30);

      if (thirtyMinBefore > new Date()) {
        await notifee.createTriggerNotification(
          {
            id: `${notificationId}_30m`,
            title: '예약 임박',
            body: `30분 후 ${reservation.galleryName} 예약이 있습니다. 출발하세요!`,
            android: {
              channelId: 'reservation-reminder',
              importance: AndroidImportance.HIGH,
            },
            data: { reservationId: reservation.id },
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp: thirtyMinBefore.getTime(),
          }
        );
      }
    } catch (error) {
      console.error('로컬 알림 예약 오류:', error);
    }
  }

  // 7. 푸시 알림 발송
  async sendNotification(userId, title, body, data = {}) {
    try {
      // 사용자의 FCM 토큰 조회
      const userDoc = await firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) return;

      const userData = userDoc.data();
      const fcmToken = userData.fcmToken;

      if (!fcmToken) return;

      // FCM 메시지 전송
      const message = {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          timestamp: new Date().toISOString(),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'reservation-updates',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      // Admin SDK가 필요하므로 실제로는 Cloud Functions에서 처리
      // 여기서는 알림 기록만 저장
      await firestore()
        .collection('notifications')
        .add({
          userId,
          title,
          body,
          data,
          sentAt: firestore.FieldValue.serverTimestamp(),
          read: false,
        });

    } catch (error) {
      console.error('푸시 알림 발송 오류:', error);
    }
  }

  // 8. No-show 통계 업데이트
  async updateNoShowStats(noShowDocs) {
    try {
      const userStats = {};

      // 사용자별 no-show 횟수 집계
      noShowDocs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'no_show') {
          if (!userStats[data.userId]) {
            userStats[data.userId] = 0;
          }
          userStats[data.userId]++;
        }
      });

      // 사용자 통계 업데이트
      const batch = firestore().batch();

      for (const [userId, count] of Object.entries(userStats)) {
        const userRef = firestore().collection('users').doc(userId);
        batch.update(userRef, {
          noShowCount: firestore.FieldValue.increment(count),
          lastNoShow: firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
    } catch (error) {
      console.error('No-show 통계 업데이트 오류:', error);
    }
  }

  // 9. 알림 채널 생성 (Android)
  async createNotificationChannel() {
    try {
      await notifee.createChannel({
        id: 'reservation-reminder',
        name: '예약 알림',
        importance: AndroidImportance.HIGH,
        vibration: true,
        lights: true,
      });

      await notifee.createChannel({
        id: 'reservation-updates',
        name: '예약 업데이트',
        importance: AndroidImportance.DEFAULT,
      });
    } catch (error) {
      console.error('알림 채널 생성 오류:', error);
    }
  }

  // 10. 취소된 예약 정리
  async cleanupCancelledReservations() {
    try {
      // 30일 이상 지난 취소된 예약 조회
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldCancelled = await firestore()
        .collection('reservations')
        .where('status', '==', 'cancelled')
        .where('updatedAt', '<', thirtyDaysAgo)
        .limit(100)
        .get();

      if (!oldCancelled.empty) {
        const batch = firestore().batch();

        oldCancelled.forEach(doc => {
          // archived 컬렉션으로 이동
          const archivedRef = firestore()
            .collection('archived_reservations')
            .doc(doc.id);

          batch.set(archivedRef, {
            ...doc.data(),
            archivedAt: firestore.FieldValue.serverTimestamp(),
          });

          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`${oldCancelled.size}개 취소 예약 아카이빙 완료`);
      }
    } catch (error) {
      console.error('취소 예약 정리 오류:', error);
    }
  }

  // 11. 대기 리스트 처리
  async processWaitingList(galleryId, cancelledDate) {
    try {
      // 취소된 날짜의 대기 리스트 조회
      const waitingList = await firestore()
        .collection('waiting_list')
        .where('galleryId', '==', galleryId)
        .where('requestedDate', '==', cancelledDate)
        .where('notified', '==', false)
        .orderBy('createdAt', 'asc')
        .limit(5)
        .get();

      if (!waitingList.empty) {
        const batch = firestore().batch();

        for (const doc of waitingList.docs) {
          const waiting = doc.data();

          // 대기자에게 알림 발송
          await this.sendNotification(
            waiting.userId,
            '예약 가능 알림',
            `${waiting.galleryName}의 ${cancelledDate} 예약이 가능해졌습니다!`,
            {
              galleryId,
              date: cancelledDate,
              type: 'waiting_list_available'
            }
          );

          // 알림 발송 표시
          batch.update(doc.ref, {
            notified: true,
            notifiedAt: firestore.FieldValue.serverTimestamp(),
          });
        }

        await batch.commit();
        console.log(`${waitingList.size}명의 대기자에게 알림 발송`);
      }
    } catch (error) {
      console.error('대기 리스트 처리 오류:', error);
    }
  }
}

export default new ReservationAutomationService();