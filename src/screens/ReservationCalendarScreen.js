// src/screens/ReservationCalendarScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import TextInput from '../components/KoreanTextInput';

// 한국어 설정
LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

const ReservationCalendarScreen = ({ route, navigation }) => {
  const { galleryId, galleryName, price, galleryOwnerId } = route.params;
  const currentUser = auth().currentUser;

  // 상태 관리
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [bookedSlots, setBookedSlots] = useState({});
  const [loading, setLoading] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [requirements, setRequirements] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [visitorCount, setVisitorCount] = useState('1');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [gallerySettings, setGallerySettings] = useState(null);

  // 시간 슬롯 정의 (기본값)
  const defaultTimeSlots = [
    { id: '09:00', time: '09:00 - 10:00', available: true },
    { id: '10:00', time: '10:00 - 11:00', available: true },
    { id: '11:00', time: '11:00 - 12:00', available: true },
    { id: '13:00', time: '13:00 - 14:00', available: true },
    { id: '14:00', time: '14:00 - 15:00', available: true },
    { id: '15:00', time: '15:00 - 16:00', available: true },
    { id: '16:00', time: '16:00 - 17:00', available: true },
    { id: '17:00', time: '17:00 - 18:00', available: true },
  ];

  const [timeSlots, setTimeSlots] = useState(defaultTimeSlots);

  // 갤러리 설정 및 예약 정보 가져오기
  const fetchGallerySettings = useCallback(async () => {
    try {
      // 갤러리 예약 설정 가져오기
      const galleryDoc = await firestore()
        .collection('galleries')
        .doc(galleryId)
        .get();

      if (galleryDoc.exists) {
        const data = galleryDoc.data();
        setGallerySettings(data);
        
        // 갤러리별 커스텀 시간 슬롯이 있으면 사용
        if (data.timeSlots) {
          setTimeSlots(data.timeSlots);
        }
      }

      // 기존 예약 정보 가져오기
      const reservationsSnapshot = await firestore()
        .collection('reservations')
        .where('galleryId', '==', galleryId)
        .where('status', 'in', ['pending', 'confirmed'])
        .get();

      const booked = {};
      const marked = {};

      reservationsSnapshot.forEach((doc) => {
        const reservation = doc.data();
        const dateValue = reservation.date || reservation.startDate;
        const dateStr = typeof dateValue === 'string'
          ? dateValue
          : dateValue?.toDate?.().toISOString().split('T')[0];

        if (!dateStr) {
          return;
        }
        
        // 예약된 시간 슬롯 저장
        if (!booked[dateStr]) {
          booked[dateStr] = [];
        }
        booked[dateStr].push(reservation.timeSlot);

        // 캘린더에 표시할 날짜 마킹
        marked[dateStr] = {
          marked: true,
          dotColor: '#FF6B6B',
        };
      });

      setBookedSlots(booked);
      setMarkedDates(marked);
    } catch (error) {
      console.error('갤러리 설정 로드 오류:', error);
    }
  }, [galleryId]);

  useEffect(() => {
    fetchGallerySettings();
  }, [fetchGallerySettings]);

  // 날짜 선택 처리
  const onDayPress = (day) => {
    const today = new Date().toISOString().split('T')[0];
    
    if (day.dateString < today) {
      Alert.alert('선택 불가', '과거 날짜는 선택할 수 없습니다.');
      return;
    }

    setSelectedDate(day.dateString);
    
    // 선택된 날짜 마킹 업데이트
    const newMarkedDates = { ...markedDates };
    Object.keys(newMarkedDates).forEach(date => {
      if (newMarkedDates[date].selected) {
        delete newMarkedDates[date].selected;
        delete newMarkedDates[date].selectedColor;
      }
    });
    
    newMarkedDates[day.dateString] = {
      ...newMarkedDates[day.dateString],
      selected: true,
      selectedColor: '#4B7BFF',
    };
    
    setMarkedDates(newMarkedDates);
    
    // 시간 선택 모달 표시
    updateTimeSlots(day.dateString);
    setShowTimeModal(true);
  };

  // 선택된 날짜의 시간 슬롯 업데이트
  const updateTimeSlots = (date) => {
    const bookedTimes = bookedSlots[date] || [];
    const updatedSlots = timeSlots.map(slot => ({
      ...slot,
      available: !bookedTimes.includes(slot.id)
    }));
    setTimeSlots(updatedSlots);
  };

  // 시간 슬롯 선택
  const selectTimeSlot = (slot) => {
    if (!slot.available) {
      Alert.alert('선택 불가', '이미 예약된 시간입니다.');
      return;
    }
    setSelectedTimeSlot(slot);
    setShowTimeModal(false);
  };

  // 예약 생성
  const handleReservation = async () => {
    if (!currentUser) {
      Alert.alert('로그인 필요', '예약은 로그인 후 이용할 수 있습니다.');
      return;
    }

    if (!selectedDate || !selectedTimeSlot) {
      Alert.alert('알림', '날짜와 시간을 선택해주세요.');
      return;
    }

    if (!phoneNumber.trim()) {
      Alert.alert('알림', '연락처를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const selectedDateObject = new Date(`${selectedDate}T00:00:00`);
      const visitorTotal = parseInt(visitorCount, 10) || 1;
      const numericPrice = Number(price) || 0;
      const reservationData = {
        galleryId,
        galleryName,
        galleryOwnerId,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userEmail: currentUser.email,
        date: selectedDate,
        startDate: firestore.Timestamp.fromDate(selectedDateObject),
        endDate: firestore.Timestamp.fromDate(selectedDateObject),
        timeSlot: selectedTimeSlot.id,
        timeSlotText: selectedTimeSlot.time,
        visitorCount: visitorTotal,
        purpose,
        requirements,
        phoneNumber,
        contactPhone: phoneNumber,
        status: 'pending',
        paymentStatus: 'pending',
        price: numericPrice,
        totalPrice: numericPrice,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      await firestore().collection('reservations').add(reservationData);

      Alert.alert(
        '예약 완료',
        `${selectedDate} ${selectedTimeSlot.time}\n예약이 성공적으로 접수되었습니다.`,
        [
          {
            text: '확인',
            onPress: () => navigation.navigate('BookingHistory'),
          },
        ]
      );
    } catch (error) {
      console.error('예약 생성 오류:', error);
      Alert.alert('오류', '예약 처리 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 시간 슬롯 렌더링
  const renderTimeSlot = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.timeSlot,
        !item.available && styles.timeSlotDisabled,
        selectedTimeSlot?.id === item.id && styles.timeSlotSelected
      ]}
      onPress={() => selectTimeSlot(item)}
      disabled={!item.available}
    >
      <Text style={[
        styles.timeSlotText,
        !item.available && styles.timeSlotTextDisabled,
        selectedTimeSlot?.id === item.id && styles.timeSlotTextSelected
      ]}>
        {item.time}
      </Text>
      {!item.available && (
        <Text style={styles.bookedText}>예약됨</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* 갤러리 정보 */}
      <View style={styles.galleryInfo}>
        <Text style={styles.galleryName}>{galleryName}</Text>
        <Text style={styles.price}>₩{price?.toLocaleString()} / 시간</Text>
      </View>

      {/* 캘린더 */}
      <View style={styles.calendarSection}>
        <Text style={styles.sectionTitle}>날짜 선택</Text>
        <Calendar
          onDayPress={onDayPress}
          markedDates={markedDates}
          minDate={new Date().toISOString().split('T')[0]}
          theme={{
            backgroundColor: '#ffffff',
            calendarBackground: '#ffffff',
            textSectionTitleColor: '#b6c1cd',
            selectedDayBackgroundColor: '#4B7BFF',
            selectedDayTextColor: '#ffffff',
            todayTextColor: '#4B7BFF',
            dayTextColor: '#2d4150',
            textDisabledColor: '#d9e1e8',
            dotColor: '#4B7BFF',
            selectedDotColor: '#ffffff',
            arrowColor: '#4B7BFF',
            monthTextColor: '#2d4150',
            textDayFontFamily: 'System',
            textMonthFontFamily: 'System',
            textDayHeaderFontFamily: 'System',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
        />
      </View>

      {/* 선택된 날짜와 시간 */}
      {selectedDate && (
        <View style={styles.selectedInfo}>
          <View style={styles.selectedRow}>
            <Icon name="calendar-today" size={20} color="#4B7BFF" />
            <Text style={styles.selectedText}>선택된 날짜: {selectedDate}</Text>
          </View>
          
          {selectedTimeSlot && (
            <View style={styles.selectedRow}>
              <Icon name="access-time" size={20} color="#4B7BFF" />
              <Text style={styles.selectedText}>선택된 시간: {selectedTimeSlot.time}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.changeTimeButton}
            onPress={() => setShowTimeModal(true)}
          >
            <Text style={styles.changeTimeText}>시간 변경</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 예약 정보 입력 */}
      <View style={styles.inputSection}>
        <Text style={styles.sectionTitle}>예약 정보</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>방문 인원</Text>
          <TextInput
            style={styles.input}
            value={visitorCount}
            onChangeText={setVisitorCount}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>연락처 *</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="010-0000-0000"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>방문 목적</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="방문 목적을 입력해주세요"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>요청사항</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={requirements}
            onChangeText={setRequirements}
            placeholder="특별한 요청사항이 있으면 입력해주세요"
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* 예약 버튼 */}
      <TouchableOpacity
        style={[styles.reserveButton, loading && styles.buttonDisabled]}
        onPress={handleReservation}
        disabled={loading || !selectedDate || !selectedTimeSlot}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.reserveButtonText}>예약하기</Text>
        )}
      </TouchableOpacity>

      {/* 시간 선택 모달 */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>시간 선택</Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={timeSlots}
              renderItem={renderTimeSlot}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.timeSlotRow}
              contentContainerStyle={styles.timeSlotList}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  galleryInfo: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  galleryName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  price: {
    fontSize: 16,
    color: '#4B7BFF',
  },
  calendarSection: {
    backgroundColor: 'white',
    marginTop: 10,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  selectedInfo: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  changeTimeButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  changeTimeText: {
    color: '#4B7BFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inputSection: {
    backgroundColor: 'white',
    marginTop: 10,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  reserveButton: {
    backgroundColor: '#4B7BFF',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  reserveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timeSlotList: {
    padding: 20,
  },
  timeSlotRow: {
    justifyContent: 'space-between',
  },
  timeSlot: {
    flex: 0.48,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  timeSlotDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  timeSlotSelected: {
    backgroundColor: '#4B7BFF',
    borderColor: '#4B7BFF',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#333',
  },
  timeSlotTextDisabled: {
    color: '#999',
  },
  timeSlotTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  bookedText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
});

export default ReservationCalendarScreen;
