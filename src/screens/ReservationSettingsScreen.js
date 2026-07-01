// src/screens/ReservationSettingsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const ReservationSettingsScreen = ({ route, navigation }) => {
  const { galleryId } = route.params;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 예약 설정 상태
  const [allowReservation, setAllowReservation] = useState(true);
  const [maxVisitors, setMaxVisitors] = useState('10');
  const [minAdvanceDays, setMinAdvanceDays] = useState('1');
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('30');
  const [cancelPolicy, setCancelPolicy] = useState('24');
  const [blockedDates, setBlockedDates] = useState({});
  const [workingHours, setWorkingHours] = useState({
    monday: { open: '09:00', close: '18:00', enabled: true },
    tuesday: { open: '09:00', close: '18:00', enabled: true },
    wednesday: { open: '09:00', close: '18:00', enabled: true },
    thursday: { open: '09:00', close: '18:00', enabled: true },
    friday: { open: '09:00', close: '18:00', enabled: true },
    saturday: { open: '10:00', close: '17:00', enabled: true },
    sunday: { open: '10:00', close: '17:00', enabled: false },
  });
  
  const dayNames = {
    monday: '월요일',
    tuesday: '화요일',
    wednesday: '수요일',
    thursday: '목요일',
    friday: '금요일',
    saturday: '토요일',
    sunday: '일요일',
  };

  // 갤러리 설정 불러오기
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const doc = await firestore()
        .collection('galleries')
        .doc(galleryId)
        .get();

      if (doc.exists) {
        const data = doc.data();
        if (data.reservationSettings) {
          const settings = data.reservationSettings;
          setAllowReservation(settings.allowReservation ?? true);
          setMaxVisitors(settings.maxVisitors?.toString() || '10');
          setMinAdvanceDays(settings.minAdvanceDays?.toString() || '1');
          setMaxAdvanceDays(settings.maxAdvanceDays?.toString() || '30');
          setCancelPolicy(settings.cancelPolicy?.toString() || '24');
          
          if (settings.blockedDates) {
            setBlockedDates(settings.blockedDates);
          }
          
          if (settings.workingHours) {
            setWorkingHours(settings.workingHours);
          }
        }
      }
    } catch (error) {
      console.error('설정 불러오기 오류:', error);
      Alert.alert('오류', '설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // 날짜 차단/해제 토글
  const toggleBlockedDate = (dateString) => {
    const newBlockedDates = { ...blockedDates };
    
    if (newBlockedDates[dateString]) {
      delete newBlockedDates[dateString];
    } else {
      newBlockedDates[dateString] = {
        selected: true,
        selectedColor: '#FF6B6B',
        marked: true,
        dotColor: '#FF6B6B',
      };
    }
    
    setBlockedDates(newBlockedDates);
  };

  // 운영 시간 토글
  const toggleWorkingDay = (day) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }));
  };

  // 운영 시간 변경
  const updateWorkingHours = (day, type, value) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value,
      },
    }));
  };

  // 설정 저장
  const saveSettings = async () => {
    setSaving(true);
    
    try {
      const reservationSettings = {
        allowReservation,
        maxVisitors: parseInt(maxVisitors),
        minAdvanceDays: parseInt(minAdvanceDays),
        maxAdvanceDays: parseInt(maxAdvanceDays),
        cancelPolicy: parseInt(cancelPolicy),
        blockedDates,
        workingHours,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore()
        .collection('galleries')
        .doc(galleryId)
        .update({
          reservationSettings,
        });

      Alert.alert('성공', '예약 설정이 저장되었습니다.');
      navigation.goBack();
    } catch (error) {
      console.error('설정 저장 오류:', error);
      Alert.alert('오류', '설정 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
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
      {/* 예약 활성화 */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.sectionTitle}>예약 받기</Text>
          <Switch
            value={allowReservation}
            onValueChange={setAllowReservation}
            trackColor={{ false: '#ccc', true: '#4B7BFF' }}
            thumbColor="#fff"
          />
        </View>
        <Text style={styles.description}>
          비활성화 시 고객이 예약을 할 수 없습니다.
        </Text>
      </View>

      {/* 예약 정책 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>예약 정책</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>최대 방문 인원</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.numberInput}
              value={maxVisitors}
              onChangeText={setMaxVisitors}
              keyboardType="numeric"
              editable={allowReservation}
            />
            <Text style={styles.inputUnit}>명</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>최소 예약 가능일</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.numberInput}
              value={minAdvanceDays}
              onChangeText={setMinAdvanceDays}
              keyboardType="numeric"
              editable={allowReservation}
            />
            <Text style={styles.inputUnit}>일 전</Text>
          </View>
          <Text style={styles.hint}>오늘로부터 최소 {minAdvanceDays}일 후부터 예약 가능</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>최대 예약 가능일</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.numberInput}
              value={maxAdvanceDays}
              onChangeText={setMaxAdvanceDays}
              keyboardType="numeric"
              editable={allowReservation}
            />
            <Text style={styles.inputUnit}>일 후까지</Text>
          </View>
          <Text style={styles.hint}>오늘로부터 최대 {maxAdvanceDays}일 후까지 예약 가능</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>취소 가능 시간</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.numberInput}
              value={cancelPolicy}
              onChangeText={setCancelPolicy}
              keyboardType="numeric"
              editable={allowReservation}
            />
            <Text style={styles.inputUnit}>시간 전까지</Text>
          </View>
          <Text style={styles.hint}>예약 시간 {cancelPolicy}시간 전까지 취소 가능</Text>
        </View>
      </View>

      {/* 운영 시간 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>운영 시간</Text>
        
        {Object.keys(workingHours).map((day) => (
          <View key={day} style={styles.workingDayRow}>
            <View style={styles.dayToggle}>
              <Switch
                value={workingHours[day].enabled}
                onValueChange={() => toggleWorkingDay(day)}
                trackColor={{ false: '#ccc', true: '#4B7BFF' }}
                thumbColor="#fff"
                disabled={!allowReservation}
              />
              <Text style={styles.dayName}>{dayNames[day]}</Text>
            </View>
            
            {workingHours[day].enabled && (
              <View style={styles.timeInputs}>
                <TextInput
                  style={styles.timeInput}
                  value={workingHours[day].open}
                  onChangeText={(value) => updateWorkingHours(day, 'open', value)}
                  placeholder="09:00"
                  editable={allowReservation}
                />
                <Text style={styles.timeSeparator}>~</Text>
                <TextInput
                  style={styles.timeInput}
                  value={workingHours[day].close}
                  onChangeText={(value) => updateWorkingHours(day, 'close', value)}
                  placeholder="18:00"
                  editable={allowReservation}
                />
              </View>
            )}
          </View>
        ))}
      </View>

      {/* 예약 불가능 날짜 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>예약 불가능 날짜</Text>
        <Text style={styles.description}>
          휴무일이나 특별한 사정으로 예약을 받을 수 없는 날짜를 선택하세요.
        </Text>
        
        <Calendar
          onDayPress={(day) => toggleBlockedDate(day.dateString)}
          markedDates={blockedDates}
          minDate={new Date().toISOString().split('T')[0]}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            selectedDayBackgroundColor: '#FF6B6B',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#4B7BFF',
            dayTextColor: '#2d4150',
            textDisabledColor: '#d9e1e8',
            arrowColor: '#4B7BFF',
          }}
          disabled={!allowReservation}
        />
      </View>

      {/* 저장 버튼 */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.buttonDisabled]}
        onPress={saveSettings}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>설정 저장</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#333',
    width: 80,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  workingDayRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    fontWeight: '500',
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 50,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: '#333',
    width: 70,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
    color: '#333',
    marginHorizontal: 10,
  },
  saveButton: {
    backgroundColor: '#4B7BFF',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReservationSettingsScreen;