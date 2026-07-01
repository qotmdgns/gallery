import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FirebaseService from '../services/FirebaseService';

const BookingDetailScreen = ({ route, navigation }) => {
  const booking = route?.params?.booking || null;

  // FirebaseService 인스턴스를 메모이제이션
  const firebaseService = useMemo(() => new FirebaseService(), []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'confirmed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'cancelled':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#999';
    }
  }, []);

  const getStatusText = useCallback((status) => {
    switch (status) {
      case 'confirmed':
        return '예약 확정';
      case 'pending':
        return '승인 대기';
      case 'cancelled':
        return '취소됨';
      case 'completed':
        return '이용 완료';
      default:
        return status || '알 수 없음';
    }
  }, []);

  const formatDate = useCallback((date) => {
    try {
      if (!date) return '날짜 미정';
      let d;
      if (date.toDate && typeof date.toDate === 'function') {
        d = date.toDate();
      } else if (date instanceof Date) {
        d = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        d = new Date(date);
      } else {
        return '날짜 미정';
      }

      if (isNaN(d.getTime())) {
        return '날짜 미정';
      }

      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    } catch (error) {
      console.error('날짜 포맷 오류:', error);
      return '날짜 미정';
    }
  }, []);

  const formatDateRange = useCallback((startDate, endDate) => {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return start === end ? start : `${start} ~ ${end}`;
  }, [formatDate]);

  const handleCancelBooking = useCallback(async () => {
    if (!booking?.id) {
      return;
    }

    Alert.alert(
      '예약 취소',
      '정말로 이 예약을 취소하시겠습니까?',
      [
        { text: '아니요', style: 'cancel' },
        {
          text: '예, 취소합니다',
          style: 'destructive',
          onPress: async () => {
            try {
              await firebaseService.updateReservationStatus(booking.id, 'cancelled');
              Alert.alert('성공', '예약이 취소되었습니다.', [
                { text: '확인', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('예약 취소 오류:', error);
              Alert.alert('오류', '예약 취소 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  }, [booking?.id, firebaseService, navigation]);

  const handleWriteReview = useCallback(() => {
    if (booking?.status !== 'completed') {
      Alert.alert('알림', '완료된 예약에 대해서만 리뷰를 작성할 수 있습니다.');
      return;
    }

    navigation.navigate('WriteReview', {
      galleryId: booking?.galleryId,
      galleryName: booking?.galleryName,
      bookingId: booking?.id,
    });
  }, [booking?.status, booking?.galleryId, booking?.galleryName, booking?.id, navigation]);

  // 안전하게 날짜 비교
  const canCancel = useMemo(() => {
    try {
      if (!booking) return false;
      if (booking.status === 'pending') return true;
      if (booking.status === 'confirmed' && booking.startDate) {
        let startDate;
        if (booking.startDate.toDate && typeof booking.startDate.toDate === 'function') {
          startDate = booking.startDate.toDate();
        } else {
          startDate = new Date(booking.startDate);
        }
        return startDate > new Date();
      }
      return false;
    } catch (error) {
      console.error('canCancel 계산 오류:', error);
      return false;
    }
  }, [booking?.status, booking?.startDate]);

  const canReview = useMemo(() => {
    return booking?.status === 'completed' && !booking?.hasReview;
  }, [booking?.status, booking?.hasReview]);

  if (!booking || !booking.id) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={60} color="#F44336" />
        <Text style={styles.errorText}>예약 정보를 불러올 수 없습니다</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>예약 상세</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
            <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
          </View>
          {booking.isManualBooking && (
            <View style={styles.manualBookingBadge}>
              <Icon name="edit" size={14} color="#FF9800" />
              <Text style={styles.manualBookingText}>수동 등록</Text>
            </View>
          )}
        </View>

        {/* Booking Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예약 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>예약번호</Text>
            <Text style={styles.value}>{booking.id.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>예약일시</Text>
            <Text style={styles.value}>{formatDateRange(booking.startDate, booking.endDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>시간</Text>
            <Text style={styles.value}>{booking.timeSlot || '10:00-18:00'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>예상 인원</Text>
            <Text style={styles.value}>{booking.visitorCount || 1}명</Text>
          </View>
        </View>

        {/* Gallery Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>갤러리 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>갤러리명</Text>
            <Text style={styles.value}>{booking.galleryName}</Text>
          </View>
          {booking.galleryLocation && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>위치</Text>
              <Text style={styles.value}>{booking.galleryLocation}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.label}>이용 목적</Text>
            <Text style={styles.value}>{booking.purpose || '정보 없음'}</Text>
          </View>
        </View>

        {/* Payment Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>결제 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>총 금액</Text>
            <Text style={[styles.value, styles.price]}>{booking.totalPrice?.toLocaleString()}원</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>결제 상태</Text>
            <Text style={styles.value}>
              {booking.paymentStatus === 'paid' ? '결제 완료' : '미결제'}
            </Text>
          </View>
        </View>

        {/* Requirements Section */}
        {booking.requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>특별 요청사항</Text>
            <Text style={styles.requirementsText}>{booking.requirements}</Text>
          </View>
        )}

        {/* Contact Info for Owner - 수동 예약 및 앱 예약 모두 지원 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {booking.isManualBooking ? '고객 정보 (수동 등록)' : '예약자 정보'}
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>이름</Text>
            <Text style={styles.value}>
              {booking.userName || booking.customerName || '정보 없음'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>연락처</Text>
            <Text style={styles.value}>
              {booking.contactPhone || booking.customerPhone || '정보 없음'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>이메일</Text>
            <Text style={styles.value}>
              {booking.userEmail || booking.customerEmail || '정보 없음'}
            </Text>
          </View>
          {booking.isManualBooking && booking.createdBy && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>등록자</Text>
              <Text style={styles.value}>갤러리 오너</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {canCancel && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelBooking}
          >
            <Text style={styles.actionButtonText}>예약 취소</Text>
          </TouchableOpacity>
        )}
        {canReview && (
          <TouchableOpacity
            style={[styles.actionButton, styles.reviewButton]}
            onPress={handleWriteReview}
          >
            <Text style={styles.actionButtonText}>리뷰 작성</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.galleryButton]}
          onPress={() => navigation.navigate('GalleryDetail', { galleryId: booking.galleryId })}
        >
          <Text style={styles.actionButtonText}>갤러리 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 34,
  },
  content: {
    flex: 1,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manualBookingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 15,
  },
  manualBookingText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  requirementsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  reviewButton: {
    backgroundColor: '#4CAF50',
  },
  galleryButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default BookingDetailScreen;
