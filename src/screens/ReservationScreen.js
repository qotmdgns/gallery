import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Calendar } from 'react-native-calendars';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';

const ReservationScreen = ({ route, navigation }) => {
  const { galleryId, galleryName, price, galleryOwnerId } = route.params;
  const [selectedDates, setSelectedDates] = useState({});
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [timeSlot, setTimeSlot] = useState('10:00-18:00');
  const [purpose, setPurpose] = useState('');
  const [requirements, setRequirements] = useState('');
  const [visitorCount, setVisitorCount] = useState('1');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookedDates, setBookedDates] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [galleryInfo, setGalleryInfo] = useState(null);
  const firebaseService = new FirebaseService();
  const [availableTimeSlots] = useState([
    '10:00-12:00',
    '12:00-14:00',
    '14:00-16:00',
    '16:00-18:00',
    '10:00-18:00',
  ]);
  
  // 예약 진행 상태 확인
  const hasReservationData = () => {
    return purpose.trim() !== '' || 
           requirements.trim() !== '' ||
           startDate !== null ||
           endDate !== null ||
           contactPhone.trim() !== '' ||
           visitorCount !== '1';
  };

  const currentUser = auth().currentUser;

  useEffect(() => {
    navigation.setOptions({
      title: '갤러리 예약',
    });
    fetchGalleryInfo();
    fetchBookedDates();
  }, []);

  // Android 백 버튼 처리
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [purpose, requirements, startDate, endDate, contactPhone, visitorCount]);

  // 헤더 백 버튼 커스터마이징
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBackPress}
          style={{ marginLeft: 15 }}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, purpose, requirements, startDate, endDate, contactPhone, visitorCount]);

  const handleBackPress = () => {
    if (hasReservationData()) {
      Alert.alert(
        '예약 취소',
        '작성 중인 예약 정보가 있습니다.\n이 페이지를 나가면 입력한 정보가 사라집니다.',
        [
          { 
            text: '계속 작성', 
            style: 'cancel' 
          },
          { 
            text: '나가기', 
            style: 'destructive',
            onPress: () => navigation.goBack() 
          },
        ],
        { cancelable: true }
      );
    } else {
      navigation.goBack();
    }
  };

  const fetchGalleryInfo = async () => {
    try {
      const gallery = await firebaseService.getGalleryById(galleryId);
      setGalleryInfo(gallery);
    } catch (error) {
      console.error('갤러리 정보 로드 실패:', error);
    }
  };

  const fetchBookedDates = async () => {
    try {
      const reservations = await firebaseService.getGalleryReservations(galleryId);
      const markedDates = {};
      
      reservations.forEach(reservation => {
        if (reservation.status === 'confirmed' || reservation.status === 'pending') {
          const start = reservation.startDate.toDate();
          const end = reservation.endDate.toDate();
          
          for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateString = formatDate(new Date(d));
            markedDates[dateString] = {
              selected: true,
              selectedColor: reservation.status === 'confirmed' ? '#FF6B6B' : '#FFA500',
              disabled: reservation.status === 'confirmed',
            };
          }
        }
      });
      
      setBookedDates(markedDates);
    } catch (error) {
      console.error('예약 날짜 로드 실패:', error);
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const onDayPress = (day) => {
    const selectedDate = new Date(day.dateString);
    
    if (!startDate || (startDate && endDate)) {
      // 새로운 선택 시작
      setStartDate(selectedDate);
      setEndDate(null);
      setSelectedDates({
        [day.dateString]: { selected: true, startingDay: true, color: '#007AFF' },
      });
    } else if (!endDate) {
      // 종료일 선택
      if (selectedDate < startDate) {
        // 시작일보다 이전 날짜 선택시 시작일로 변경
        setStartDate(selectedDate);
        setSelectedDates({
          [day.dateString]: { selected: true, startingDay: true, color: '#007AFF' },
        });
      } else {
        // 종료일 설정 및 기간 표시
        setEndDate(selectedDate);
        const markedDates = {};
        const start = new Date(startDate);
        const end = new Date(selectedDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateString = formatDate(new Date(d));
          if (d.getTime() === start.getTime()) {
            markedDates[dateString] = { selected: true, startingDay: true, color: '#007AFF' };
          } else if (d.getTime() === end.getTime()) {
            markedDates[dateString] = { selected: true, endingDay: true, color: '#007AFF' };
          } else {
            markedDates[dateString] = { selected: true, color: '#007AFF' };
          }
        }
        setSelectedDates(markedDates);
      }
    }
  };

  const calculateTotalPrice = () => {
    if (!startDate || !endDate || !price) return 0;
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    return days * price;
  };

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  };

  const validateReservation = () => {
    if (!startDate || !endDate) {
      Alert.alert('알림', '예약 날짜를 선택해주세요.');
      return false;
    }
    if (!purpose.trim()) {
      Alert.alert('알림', '전시 목적을 입력해주세요.');
      return false;
    }
    if (!contactPhone.trim()) {
      Alert.alert('알림', '연락처를 입력해주세요.');
      return false;
    }
    if (!visitorCount || parseInt(visitorCount) < 1) {
      Alert.alert('알림', '예상 관람객 수를 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleReservation = async () => {
    if (!validateReservation()) return;

    const days = calculateDays();
    const totalPrice = calculateTotalPrice();

    Alert.alert(
      '예약 확인',
      `${galleryName}\n\n` +
      `기간: ${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()} (${days}일)\n` +
      `시간: ${timeSlot}\n` +
      `예상 관람객: ${visitorCount}명\n` +
      `총 금액: ${totalPrice.toLocaleString()}원`,
      [
        { text: '취소', style: 'cancel' },
        { text: '예약', onPress: submitReservation },
      ]
    );
  };

  const submitReservation = async () => {
    setLoading(true);
    try {
      const reservationData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || '사용자',
        userEmail: currentUser.email,
        galleryId: galleryId,
        galleryName: galleryName,
        galleryOwnerId: galleryOwnerId || galleryInfo?.ownerId,
        startDate: firestore.Timestamp.fromDate(startDate),
        endDate: firestore.Timestamp.fromDate(endDate),
        timeSlot: timeSlot,
        purpose: purpose,
        requirements: requirements,
        visitorCount: parseInt(visitorCount),
        contactPhone: contactPhone,
        totalPrice: calculateTotalPrice(),
        status: 'pending',
        paymentStatus: 'pending',
      };

      const reservationId = await firebaseService.createReservation(reservationData);

      // 예약 알림 발송
      const notificationService = new NotificationService();
      await notificationService.displayBookingNotification({
        galleryName: galleryName,
        status: 'pending',
        reservationDate: `${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()}`,
      });

      Alert.alert(
        '예약 완료',
        '예약이 접수되었습니다.\n갤러리 운영자 확인 후 승인 예정입니다.\n\n예약번호: ' + reservationId.substring(0, 8).toUpperCase(),
        [
          {
            text: '확인',
            onPress: () => navigation.navigate('Bookings'),
          },
        ]
      );
    } catch (error) {
      console.error('예약 오류:', error);
      Alert.alert('오류', '예약 중 오류가 발생했습니다.\n잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>갤러리 정보</Text>
        <View style={styles.infoCard}>
          <Text style={styles.galleryName}>{galleryName}</Text>
          <Text style={styles.priceText}>일일 대관료: {price?.toLocaleString()}원</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>예약 날짜 선택</Text>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => setShowCalendar(true)}
        >
          <Icon name="event" size={24} color="#007AFF" />
          <Text style={styles.dateButtonText}>
            {startDate && endDate 
              ? `${startDate.toLocaleDateString()} ~ ${endDate.toLocaleDateString()} (${calculateDays()}일)`
              : '날짜를 선택해주세요'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>시간대 선택</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {availableTimeSlots.map((slot) => (
            <TouchableOpacity
              key={slot}
              style={[
                styles.timeSlotButton,
                timeSlot === slot && styles.timeSlotButtonSelected,
              ]}
              onPress={() => setTimeSlot(slot)}
            >
              <Text style={[
                styles.timeSlotText,
                timeSlot === slot && styles.timeSlotTextSelected,
              ]}>
                {slot}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>예약 정보</Text>
        
        <Text style={styles.label}>전시 목적 *</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 개인전, 그룹전, 기획전시 등"
          value={purpose}
          onChangeText={setPurpose}
          multiline
        />

        <Text style={styles.label}>예상 관람객 수 *</Text>
        <TextInput
          style={styles.input}
          placeholder="예상 일일 관람객 수"
          value={visitorCount}
          onChangeText={setVisitorCount}
          keyboardType="numeric"
        />

        <Text style={styles.label}>연락처 *</Text>
        <TextInput
          style={styles.input}
          placeholder="010-0000-0000"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>특별 요청사항</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="추가 요청사항이 있으시면 입력해주세요"
          value={requirements}
          onChangeText={setRequirements}
          multiline
          numberOfLines={4}
        />
      </View>

      {startDate && endDate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예약 요약</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>예약 기간</Text>
              <Text style={styles.summaryValue}>{calculateDays()}일</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>일일 대관료</Text>
              <Text style={styles.summaryValue}>{price?.toLocaleString()}원</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>총 금액</Text>
              <Text style={styles.totalValue}>{calculateTotalPrice().toLocaleString()}원</Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.reserveButton, loading && styles.disabledButton]}
        onPress={handleReservation}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.reserveButtonText}>예약하기</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>날짜 선택</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Calendar
              onDayPress={onDayPress}
              markedDates={{
                ...bookedDates,
                ...selectedDates,
              }}
              markingType={'period'}
              minDate={new Date().toISOString().split('T')[0]}
              theme={{
                selectedDayBackgroundColor: '#007AFF',
                todayTextColor: '#007AFF',
                arrowColor: '#007AFF',
              }}
            />
            
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
                <Text style={styles.legendText}>선택한 날짜</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
                <Text style={styles.legendText}>예약 불가</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FFA500' }]} />
                <Text style={styles.legendText}>예약 대기중</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </TouchableOpacity>
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
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoCard: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  galleryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  priceText: {
    fontSize: 14,
    color: '#666',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateButtonText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  timeSlotButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    backgroundColor: 'white',
  },
  timeSlotButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#666',
  },
  timeSlotTextSelected: {
    color: 'white',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  summaryCard: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  reserveButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  reserveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
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
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

/* eslint-disable no-unused-vars, no-undef, react-hooks/exhaustive-deps */
// 다단계 폼 예시 - 갤러리 등록
const MultiStepGalleryForm = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  
  // 각 단계별 데이터
  const [step1Data, setStep1Data] = useState({
    galleryName: '',
    location: '',
  });
  const [step2Data, setStep2Data] = useState({
    price: '',
    area: '',
  });
  const [step3Data, setStep3Data] = useState({
    description: '',
    images: [],
  });

  // 작성 여부 확인
  const hasFormData = () => {
    return step1Data.galleryName || step1Data.location ||
           step2Data.price || step2Data.area ||
           step3Data.description || step3Data.images.length > 0;
  };

  useEffect(() => {
    const backAction = () => {
      if (purpose || requirements) {
      
        Alert.alert(
          '작성 취소',
          '작성 중인 내용이 있습니다. 정말 나가시겠습니까?',
          [
            { text: '계속 작성', style: 'cancel' },
            { text: '나가기', onPress: () => navigation.goBack() },
          ]
        );
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [inputMessage]);

  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>기본 정보 입력</Text>
            <TextInput
              placeholder="갤러리명"
              value={step1Data.galleryName}
              onChangeText={(text) => setStep1Data({...step1Data, galleryName: text})}
              style={styles.input}
            />
            <TextInput
              placeholder="위치"
              value={step1Data.location}
              onChangeText={(text) => setStep1Data({...step1Data, location: text})}
              style={styles.input}
            />
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>가격 정보 입력</Text>
            <TextInput
              placeholder="대관료"
              value={step2Data.price}
              onChangeText={(text) => setStep2Data({...step2Data, price: text})}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              placeholder="면적"
              value={step2Data.area}
              onChangeText={(text) => setStep2Data({...step2Data, area: text})}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>상세 정보 입력</Text>
            <TextInput
              placeholder="갤러리 설명"
              value={step3Data.description}
              onChangeText={(text) => setStep3Data({...step3Data, description: text})}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.textArea]}
            />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progress, { width: `${(currentStep / totalSteps) * 100}%` }]} />
      </View>
      
      <Text style={styles.stepIndicator}>단계 {currentStep} / {totalSteps}</Text>
      
      {renderStep()}
      
      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.button, styles.prevButton]}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.buttonText}>이전</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < totalSteps ? (
          <TouchableOpacity
            style={[styles.button, styles.nextButton]}
            onPress={() => setCurrentStep(currentStep + 1)}
          >
            <Text style={styles.buttonText}>다음</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.submitButton]}
            onPress={() => {
              Alert.alert('완료', '갤러리 등록이 완료되었습니다!');
              navigation.goBack();
            }}
          >
            <Text style={styles.buttonText}>완료</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const multiStepStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 20,
  },
  progress: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  stepIndicator: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  prevButton: {
    backgroundColor: '#666',
  },
  nextButton: {
    backgroundColor: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
/* eslint-enable no-unused-vars, no-undef, react-hooks/exhaustive-deps */

export default ReservationScreen;
