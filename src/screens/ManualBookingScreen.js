import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import useLoginStore from '../store/useLoginStore';
import TextInput from '../components/KoreanTextInput';

const ManualBookingScreen = ({ navigation }) => {
  const { userId } = useLoginStore();
  const [loading, setLoading] = useState(false);
  const [galleries, setGalleries] = useState([]);
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);

  // 예약 정보 상태
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [guestCount, setGuestCount] = useState('1');
  const [notes, setNotes] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, paid, cancelled

  useEffect(() => {
    loadOwnerGalleries();
  }, []);

  const loadOwnerGalleries = async () => {
    try {
      setLoading(true);
      const snapshot = await firestore()
        .collection('galleries')
        .where('ownerId', '==', userId)
        .get();

      const galleryList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setGalleries(galleryList);
      if (galleryList.length === 1) {
        setSelectedGallery(galleryList[0]);
      }
    } catch (error) {
      console.error('Error loading galleries:', error);
      Alert.alert('오류', '갤러리 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
      // 종료일이 시작일보다 이전이면 시작일과 같게 설정
      if (endDate < selectedDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const onEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const validateForm = () => {
    if (!selectedGallery) {
      Alert.alert('알림', '갤러리를 선택해주세요.');
      return false;
    }
    if (!customerName.trim()) {
      Alert.alert('알림', '고객 이름을 입력해주세요.');
      return false;
    }
    if (!customerPhone.trim()) {
      Alert.alert('알림', '고객 전화번호를 입력해주세요.');
      return false;
    }
    if (!guestCount || parseInt(guestCount, 10) < 1) {
      Alert.alert('알림', '올바른 인원수를 입력해주세요.');
      return false;
    }
    if (endDate < startDate) {
      Alert.alert('알림', '종료일은 시작일 이후여야 합니다.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    Alert.alert(
      '예약 등록',
      '이 예약을 등록하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '등록', onPress: createBooking }
      ]
    );
  };

  const createBooking = async () => {
    try {
      setLoading(true);

      const bookingData = {
        galleryId: selectedGallery.id,
        galleryName: selectedGallery.galleryName || selectedGallery.name,
        galleryImage: selectedGallery.images?.[0] || '',

        // 수동 예약 고객 정보 (BookingDetailScreen과 일치하는 필드명 사용)
        userName: customerName.trim(),
        contactPhone: customerPhone.trim(),
        userEmail: customerEmail.trim() || null,

        // 기존 필드명도 유지 (호환성)
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || null,

        startDate: firestore.Timestamp.fromDate(startDate),
        endDate: firestore.Timestamp.fromDate(endDate),
        // 이전 버전과의 호환성을 위해 date 필드도 유지 (startDate와 동일)
        date: firestore.Timestamp.fromDate(startDate),

        visitorCount: parseInt(guestCount, 10),
        guestCount: parseInt(guestCount, 10), // 기존 필드명도 유지

        requirements: notes.trim(),
        notes: notes.trim(), // 기존 필드명도 유지

        status: 'confirmed', // 주인이 직접 등록하므로 바로 확정
        paymentStatus: paymentStatus,
        isManualBooking: true, // 수동 예약 표시
        isDateRange: true, // 기간 예약 표시
        createdBy: userId, // 등록한 주인 ID
        userId: null, // 앱 사용자가 아닌 수동 등록 예약
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // 예약 저장
      await firestore()
        .collection('reservations')
        .add(bookingData);

      Alert.alert(
        '성공',
        '예약이 등록되었습니다.',
        [
          {
            text: '확인',
            onPress: () => {
              // 폼 초기화
              setCustomerName('');
              setCustomerPhone('');
              setCustomerEmail('');
              setStartDate(new Date());
              setEndDate(new Date());
              setGuestCount('1');
              setNotes('');
              setPaymentStatus('pending');

              // 예약 관리 화면으로 이동 (Tab Navigator 내의 화면)
              navigation.navigate('Main', {
                screen: 'Bookings'
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating manual booking:', error);
      Alert.alert('오류', '예약 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && galleries.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>예약 직접 등록</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* 갤러리 선택 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>갤러리 선택 *</Text>
          <TouchableOpacity
            style={styles.picker}
            onPress={() => setShowGalleryPicker(true)}
          >
            <Text style={[styles.pickerText, !selectedGallery && styles.placeholder]}>
              {selectedGallery ? selectedGallery.name : '갤러리를 선택하세요'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* 고객 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>고객 정보</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이름 *</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="고객 이름"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>전화번호 *</Text>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="010-0000-0000"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={styles.input}
              value={customerEmail}
              onChangeText={setCustomerEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* 예약 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예약 정보</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>시작일 *</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>{formatDate(startDate)}</Text>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>종료일 *</Text>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateTimeText}>{formatDate(endDate)}</Text>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* 예약 기간 표시 */}
          {startDate && endDate && (
            <View style={styles.dateRangeInfo}>
              <MaterialIcons name="info-outline" size={16} color="#007AFF" />
              <Text style={styles.dateRangeText}>
                예약 기간: {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1}일
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>인원 *</Text>
            <TextInput
              style={styles.input}
              value={guestCount}
              onChangeText={setGuestCount}
              placeholder="1"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>결제 상태</Text>
            <View style={styles.paymentStatusContainer}>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  paymentStatus === 'pending' && styles.statusButtonActive
                ]}
                onPress={() => setPaymentStatus('pending')}
              >
                <Text style={[
                  styles.statusButtonText,
                  paymentStatus === 'pending' && styles.statusButtonTextActive
                ]}>대기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  paymentStatus === 'paid' && styles.statusButtonActive
                ]}
                onPress={() => setPaymentStatus('paid')}
              >
                <Text style={[
                  styles.statusButtonText,
                  paymentStatus === 'paid' && styles.statusButtonTextActive
                ]}>완료</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusButton,
                  paymentStatus === 'cancelled' && styles.statusButtonActive
                ]}
                onPress={() => setPaymentStatus('cancelled')}
              >
                <Text style={[
                  styles.statusButtonText,
                  paymentStatus === 'cancelled' && styles.statusButtonTextActive
                ]}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>메모</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="예약 관련 메모 (선택사항)"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* 등록 버튼 */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>예약 등록</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Start Date Picker */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onStartDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* End Date Picker */}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onEndDateChange}
          minimumDate={startDate}
        />
      )}

      {/* Gallery Picker Modal */}
      <Modal
        visible={showGalleryPicker}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>갤러리 선택</Text>
              <TouchableOpacity onPress={() => setShowGalleryPicker(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {galleries.map(gallery => (
              <TouchableOpacity
                key={gallery.id}
                style={styles.galleryOption}
                onPress={() => {
                  setSelectedGallery(gallery);
                  setShowGalleryPicker(false);
                }}
              >
                <Text style={styles.galleryOptionText}>{gallery.name}</Text>
                {selectedGallery?.id === gallery.id && (
                  <MaterialIcons name="check" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  pickerText: {
    fontSize: 14,
    color: '#333',
  },
  placeholder: {
    color: '#999',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333',
  },
  dateRangeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    padding: 12,
    borderRadius: 8,
    marginTop: -8,
    marginBottom: 16,
  },
  dateRangeText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  galleryOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  galleryOptionText: {
    fontSize: 16,
    color: '#333',
  },
});

export default ManualBookingScreen;
