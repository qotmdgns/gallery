/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';

// 백그라운드 메시지 핸들러 등록
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('백그라운드 메시지 수신:', remoteMessage);
  
  const { notification, data } = remoteMessage;
  
  if (notification) {
    // 로컬 알림 표시
    await notifee.displayNotification({
      title: notification.title,
      body: notification.body,
      android: {
        channelId: data?.channelId || 'default',
        smallIcon: 'ic_notification',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
      data: data || {},
    });
  }
});

// 백그라운드 이벤트 핸들러 (Notifee)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;
  
  // 알림 클릭 이벤트 처리
  if (type === EventType.PRESS) {
    console.log('백그라운드에서 알림 클릭:', notification);
    
    // 알림 제거
    if (notification?.id) {
      await notifee.cancelNotification(notification.id);
    }
  }
  
  // 알림 해제 이벤트
  if (type === EventType.DISMISSED) {
    console.log('알림 해제됨:', notification);
  }
});

AppRegistry.registerComponent(appName, () => App);
