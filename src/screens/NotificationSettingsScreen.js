import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const NotificationSettingsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [bookingNotification, setBookingNotification] = useState(true);
  const [chatNotification, setChatNotification] = useState(true);
  const [promotionNotification, setPromotionNotification] = useState(false);
  const [systemNotification, setSystemNotification] = useState(true);
  
  const currentUser = auth().currentUser;

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      // NotificationService 인스턴스 생성
      const notificationService = new NotificationService();

      // 시스템 알림 권한 상태 확인
      const settings = await notificationService.getNotificationSettings();
      setNotificationEnabled(settings?.enabled || false);
      
      // 사용자별 알림 설정 불러오기
      const userSettings = await AsyncStorage.getItem(`notification_settings_${currentUser.uid}`);
      if (userSettings) {
        const parsed = JSON.parse(userSettings);
        setBookingNotification(parsed.booking !== false);
        setChatNotification(parsed.chat !== false);
        setPromotionNotification(parsed.promotion || false);
        setSystemNotification(parsed.system !== false);
      }
      
      // Firestore에서도 설정 불러오기
      const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
      const userData = userDoc.data();
      if (userData?.notificationSettings) {
        setBookingNotification(userData.notificationSettings.booking !== false);
        setChatNotification(userData.notificationSettings.chat !== false);
        setPromotionNotification(userData.notificationSettings.promotion || false);
        setSystemNotification(userData.notificationSettings.system !== false);
      }
    } catch (error) {
      console.error('알림 설정 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNotificationPermission = async () => {
    try {
      if (!notificationEnabled) {
        // NotificationService 인스턴스 생성
        const notificationService = new NotificationService();

        // 알림 권한 요청
        const granted = await notificationService.requestPermission();
        if (granted) {
          setNotificationEnabled(true);
          Alert.alert('알림 허용', '알림이 활성화되었습니다.');
        } else {
          Alert.alert(
            '알림 권한 필요',
            '알림을 받으려면 설정에서 알림 권한을 허용해주세요.',
            [
              { text: '취소', style: 'cancel' },
              { text: '설정 열기', onPress: () => {
                // 시스템 설정 열기 (react-native-permissions 라이브러리 필요)
                Alert.alert('안내', '설정 > 앱 > MyApp > 알림에서 권한을 허용해주세요.');
              }},
            ]
          );
        }
      } else {
        Alert.alert(
          '알림 끄기',
          '알림을 끄시겠습니까? 중요한 알림을 받지 못할 수 있습니다.',
          [
            { text: '취소', style: 'cancel' },
            { text: '끄기', onPress: () => setNotificationEnabled(false) },
          ]
        );
      }
    } catch (error) {
      console.error('알림 권한 토글 실패:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settings = {
        booking: bookingNotification,
        chat: chatNotification,
        promotion: promotionNotification,
        system: systemNotification,
      };
      
      // AsyncStorage에 저장
      await AsyncStorage.setItem(
        `notification_settings_${currentUser.uid}`,
        JSON.stringify(settings)
      );
      
      // Firestore에도 저장
      await firestore().collection('users').doc(currentUser.uid).update({
        notificationSettings: settings,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
      
      Alert.alert('저장 완료', '알림 설정이 저장되었습니다.');
    } catch (error) {
      console.error('설정 저장 실패:', error);
      Alert.alert('오류', '설정 저장에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="notifications" size={24} color="#4B7BFF" />
          <Text style={styles.sectionTitle}>알림 설정</Text>
        </View>
        
        <View style={styles.mainToggle}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>푸시 알림</Text>
              <Text style={styles.settingDescription}>
                모든 알림을 받으려면 활성화하세요
              </Text>
            </View>
            <Switch
              value={notificationEnabled}
              onValueChange={toggleNotificationPermission}
              trackColor={{ false: '#E0E0E0', true: '#B3D4FF' }}
              thumbColor={notificationEnabled ? '#4B7BFF' : '#9E9E9E'}
            />
          </View>
        </View>
      </View>

      {notificationEnabled && (
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>알림 유형별 설정</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.iconTextRow}>
                <Icon name="event" size={20} color="#666" />
                <Text style={styles.settingTitle}>예약 알림</Text>
              </View>
              <Text style={styles.settingDescription}>
                예약 확정, 취소, 변경 알림
              </Text>
            </View>
            <Switch
              value={bookingNotification}
              onValueChange={setBookingNotification}
              trackColor={{ false: '#E0E0E0', true: '#B3D4FF' }}
              thumbColor={bookingNotification ? '#4B7BFF' : '#9E9E9E'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.iconTextRow}>
                <Icon name="chat" size={20} color="#666" />
                <Text style={styles.settingTitle}>채팅 알림</Text>
              </View>
              <Text style={styles.settingDescription}>
                새 메시지 알림
              </Text>
            </View>
            <Switch
              value={chatNotification}
              onValueChange={setChatNotification}
              trackColor={{ false: '#E0E0E0', true: '#B3D4FF' }}
              thumbColor={chatNotification ? '#4B7BFF' : '#9E9E9E'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.iconTextRow}>
                <Icon name="local-offer" size={20} color="#666" />
                <Text style={styles.settingTitle}>프로모션 알림</Text>
              </View>
              <Text style={styles.settingDescription}>
                이벤트, 할인 정보 알림
              </Text>
            </View>
            <Switch
              value={promotionNotification}
              onValueChange={setPromotionNotification}
              trackColor={{ false: '#E0E0E0', true: '#B3D4FF' }}
              thumbColor={promotionNotification ? '#4B7BFF' : '#9E9E9E'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <View style={styles.iconTextRow}>
                <Icon name="info" size={20} color="#666" />
                <Text style={styles.settingTitle}>시스템 알림</Text>
              </View>
              <Text style={styles.settingDescription}>
                중요 공지사항 및 업데이트
              </Text>
            </View>
            <Switch
              value={systemNotification}
              onValueChange={setSystemNotification}
              trackColor={{ false: '#E0E0E0', true: '#B3D4FF' }}
              thumbColor={systemNotification ? '#4B7BFF' : '#9E9E9E'}
            />
          </View>
        </View>
      )}

      <TouchableOpacity 
        style={[styles.saveButton, !notificationEnabled && styles.disabledButton]}
        onPress={saveSettings}
        disabled={!notificationEnabled}
      >
        <Text style={styles.saveButtonText}>설정 저장</Text>
      </TouchableOpacity>

      <View style={styles.infoSection}>
        <Icon name="info-outline" size={20} color="#999" />
        <Text style={styles.infoText}>
          알림 설정을 변경하면 즉시 적용됩니다.{'\n'}
          중요한 예약 및 메시지 알림을 놓치지 않으려면{'\n'}
          알림을 켜두시는 것을 권장합니다.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 15,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  mainToggle: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  settingInfo: {
    flex: 1,
    marginRight: 15,
  },
  iconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
    marginTop: 3,
    marginLeft: 28,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 20,
    marginVertical: 5,
  },
  saveButton: {
    backgroundColor: '#4B7BFF',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    flexDirection: 'row',
    padding: 20,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
});

export default NotificationSettingsScreen;