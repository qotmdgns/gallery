import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';
import { Calendar } from 'react-native-calendars';

const ManageBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [dateBookings, setDateBookings] = useState([]);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const firebaseService = new FirebaseService();

  useEffect(() => {
    loadBookings();
  }, [selectedTab]);

  useEffect(() => {
    if (viewMode === 'calendar' && bookings.length > 0) {
      prepareCalendarData();
    }
  }, [viewMode, bookings]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '예약 관리',
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginLeft: 15 }}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const loadBookings = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      // 운영자의 갤러리 목록 조회
      const galleries = await firebaseService.getGalleries({ ownerId: currentUser.uid });

      if (galleries.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const galleryIds = galleries.map(g => g.id);
      const galleryMap = {};
      galleries.forEach(g => { galleryMap[g.id] = g; });

      // 모든 갤러리의 예약 조회
      let allReservations = [];

      // galleryIds가 비어있으면 빈 배열 반환
      if (galleryIds.length === 0) {
        setBookings([]);
        setLoading(false);
        return;
      }

      // Firestore의 'in' 쿼리는 최대 10개까지만 지원하므로 배치 처리
      for (let i = 0; i < galleryIds.length; i += 10) {
        const batch = galleryIds.slice(i, i + 10);
        if (batch.length === 0) continue; // 빈 배치는 건너뛰기

        let query = firestore()
          .collection('reservations')
          .where('galleryId', 'in', batch);

        // 탭에 따른 필터링
        if (selectedTab !== 'all') {
          query = query.where('status', '==', selectedTab);
        }

        const snapshot = await query.orderBy('createdAt', 'desc').get();

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          allReservations.push({
            id: doc.id,
            ...data,
            galleryName: galleryMap[data.galleryId]?.name || '갤러리',
            galleryLocation: galleryMap[data.galleryId]?.location || '',
            startDate: data.startDate?.toDate(),
            endDate: data.endDate?.toDate(),
            createdAt: data.createdAt?.toDate(),
          });
        });
      }

      // 날짜순 정렬
      allReservations.sort((a, b) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        return dateB - dateA;
      });

      setBookings(allReservations);
    } catch (error) {
      console.error('Error loading bookings:', error);
      Alert.alert('오류', '예약 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const prepareCalendarData = () => {
    const dates = {};
    const statusColors = {
      pending: '#FFA500',
      confirmed: '#4CAF50',
      cancelled: '#F44336',
      completed: '#2196F3',
    };

    bookings.forEach(booking => {
      if (booking.startDate && booking.endDate) {
        const start = new Date(booking.startDate);
        const end = new Date(booking.endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];

          if (!dates[dateStr]) {
            dates[dateStr] = {
              marked: true,
              dots: [],
            };
          }

          // Add dot for this booking's status
          const color = statusColors[booking.status] || '#757575';
          if (!dates[dateStr].dots.find(dot => dot.color === color)) {
            dates[dateStr].dots.push({ color });
          }
        }
      }
    });

    // Convert dots to single color if only one status
    Object.keys(dates).forEach(date => {
      if (dates[date].dots.length === 1) {
        dates[date].dotColor = dates[date].dots[0].color;
        delete dates[date].dots;
      } else if (dates[date].dots.length > 1) {
        // Keep multiple dots for multiple statuses
        dates[date].dots = dates[date].dots.slice(0, 3); // Limit to 3 dots
      }
    });

    setMarkedDates(dates);
  };

  const handleDayPress = (day) => {
    const selectedDateStr = day.dateString;
    setSelectedDate(selectedDateStr);

    // Filter bookings for selected date
    const dayBookings = bookings.filter(booking => {
      if (!booking.startDate || !booking.endDate) return false;

      const start = new Date(booking.startDate).toISOString().split('T')[0];
      const end = new Date(booking.endDate).toISOString().split('T')[0];

      return selectedDateStr >= start && selectedDateStr <= end;
    });

    setDateBookings(dayBookings);
    if (dayBookings.length > 0) {
      setDateModalVisible(true);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      await firebaseService.updateReservationStatus(bookingId, newStatus);

      // 상태 변경 알림 표시
      let message = '';
      switch(newStatus) {
        case 'confirmed':
          message = '예약이 확정되었습니다.';
          break;
        case 'cancelled':
          message = '예약이 취소되었습니다.\n\n⚠️ 취소된 예약은 2시간 후 자동으로 삭제됩니다.';
          break;
        case 'completed':
          message = '예약이 완료 처리되었습니다.';
          break;
        case 'pending':
          message = '예약이 대기 상태로 변경되었습니다.';
          break;
        default:
          message = '예약 상태가 업데이트되었습니다.';
      }

      Alert.alert('성공', message);
      loadBookings();
      setModalVisible(false);
    } catch (error) {
      console.error('Error updating booking:', error);
      Alert.alert('오류', '상태 업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleStatusChange = (bookingId, currentStatus) => {
    const statusOptions = [
      { label: '대기중', value: 'pending', color: '#FFA500' },
      { label: '확정', value: 'confirmed', color: '#4CAF50' },
      { label: '완료', value: 'completed', color: '#2196F3' },
      { label: '취소', value: 'cancelled', color: '#F44336' },
    ];

    Alert.alert(
      '상태 변경',
      '예약 상태를 선택하세요',
      statusOptions
        .filter(option => option.value !== currentStatus)
        .map(option => ({
          text: option.label,
          onPress: () => updateBookingStatus(bookingId, option.value),
        }))
        .concat([{ text: '취소', style: 'cancel' }]),
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'confirmed':
        return '#4CAF50';
      case 'cancelled':
        return '#F44336';
      case 'completed':
        return '#2196F3';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'confirmed':
        return '확정';
      case 'cancelled':
        return '취소';
      case 'completed':
        return '완료';
      default:
        return status;
    }
  };

  const formatDate = (date) => {
    if (!date) return '날짜 미정';
    if (typeof date === 'string') return date;

    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '날짜 미정';
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return start === end ? start : `${start} ~ ${end}`;
  };

  const formatAmount = (amount) => {
    return `₩${(amount || 0).toLocaleString()}`;
  };

  const renderBookingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        setSelectedBooking(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.galleryName}>{item.galleryName}</Text>
          <Text style={styles.userName}>{item.userName || '예약자'}</Text>
          {/* 취소된 예약이고 삭제 예정 시간이 있는 경우 표시 */}
          {item.status === 'cancelled' && item.deletionScheduledAt && (
            <Text style={styles.deletionWarning}>
              ⏱ {new Date(item.deletionScheduledAt.toDate()).toLocaleString('ko-KR')} 삭제 예정
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Icon name="event" size={16} color="#666" />
          <Text style={styles.detailText}>{formatDateRange(item.startDate, item.endDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="access-time" size={16} color="#666" />
          <Text style={styles.detailText}>{item.timeSlot || '10:00-18:00'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="people" size={16} color="#666" />
          <Text style={styles.detailText}>{item.visitorCount || 1}명</Text>
        </View>
        <View style={styles.detailRow}>
          <Icon name="attach-money" size={16} color="#666" />
          <Text style={styles.detailText}>{formatAmount(item.totalPrice)}</Text>
        </View>
      </View>

      <View style={styles.bookingFooter}>
        <Text style={styles.bookingId}>예약번호: {item.id.slice(-8)}</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleStatusChange(item.id, item.status)}
        >
          <Icon name="edit" size={20} color="#4B7BFF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderTabButton = (tab, label) => (
    <TouchableOpacity
      style={[styles.tabButton, selectedTab === tab && styles.tabButtonActive]}
      onPress={() => setSelectedTab(tab)}
    >
      <Text style={[styles.tabButtonText, selectedTab === tab && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const BookingDetailModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>예약 상세</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {selectedBooking && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>예약 정보</Text>
                <Text style={styles.modalText}>예약번호: {selectedBooking.id.substring(0, 8).toUpperCase()}</Text>
                <Text style={styles.modalText}>상태: {getStatusText(selectedBooking.status)}</Text>
                <Text style={styles.modalText}>예약일: {formatDateRange(selectedBooking.startDate, selectedBooking.endDate)}</Text>
                <Text style={styles.modalText}>시간: {selectedBooking.timeSlot || '10:00-18:00'}</Text>
                <Text style={styles.modalText}>인원: {selectedBooking.visitorCount || 1}명</Text>
                <Text style={styles.modalText}>목적: {selectedBooking.purpose || '정보 없음'}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>예약자 정보</Text>
                <Text style={styles.modalText}>이름: {selectedBooking.userName || '정보 없음'}</Text>
                <Text style={styles.modalText}>연락처: {selectedBooking.contactPhone || '정보 없음'}</Text>
                {selectedBooking.contactPhone && (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => Linking.openURL(`tel:${selectedBooking.contactPhone}`)}
                  >
                    <Icon name="phone" size={16} color="#007AFF" />
                    <Text style={styles.callButtonText}>전화 걸기</Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.modalText}>이메일: {selectedBooking.userEmail || '정보 없음'}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>갤러리 정보</Text>
                <Text style={styles.modalText}>갤러리: {selectedBooking.galleryName}</Text>
                <Text style={styles.modalText}>위치: {selectedBooking.galleryLocation || '정보 없음'}</Text>
                <Text style={styles.modalText}>총 금액: {formatAmount(selectedBooking.totalPrice)}</Text>
                <Text style={styles.modalText}>결제 상태: {selectedBooking.paymentStatus === 'paid' ? '결제완료' : '미결제'}</Text>
              </View>

              {selectedBooking.requirements && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>특별 요청사항</Text>
                  <Text style={styles.modalText}>{selectedBooking.requirements}</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                  onPress={() => {
                    updateBookingStatus(selectedBooking.id, 'confirmed');
                  }}
                >
                  <Text style={styles.modalButtonText}>예약 확정</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#F44336' }]}
                  onPress={() => {
                    updateBookingStatus(selectedBooking.id, 'cancelled');
                  }}
                >
                  <Text style={styles.modalButtonText}>예약 취소</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const DateBookingsModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={dateModalVisible}
      onRequestClose={() => setDateModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedDate && new Date(selectedDate).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })} 예약
            </Text>
            <TouchableOpacity onPress={() => setDateModalVisible(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {dateBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={styles.dateBookingCard}
                onPress={() => {
                  setDateModalVisible(false);
                  setSelectedBooking(booking);
                  setModalVisible(true);
                }}
              >
                <View style={styles.dateBookingHeader}>
                  <Text style={styles.dateBookingGallery}>{booking.galleryName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
                  </View>
                </View>
                <Text style={styles.dateBookingInfo}>{booking.userName || '예약자'}</Text>
                <Text style={styles.dateBookingInfo}>{booking.timeSlot || '10:00-18:00'} / {booking.visitorCount || 1}명</Text>
                <Text style={styles.dateBookingInfo}>{formatAmount(booking.totalPrice)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>예약 관리</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ManualBooking')}
            style={styles.headerButton}
          >
            <Icon name="add-circle-outline" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
            style={styles.headerButton}
          >
            <Icon name={viewMode === 'list' ? 'calendar-today' : 'list'} size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
            <Icon name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'list' ? (
        <>
          <View style={styles.tabContainer}>
            {renderTabButton('all', '전체')}
            {renderTabButton('pending', '대기중')}
            {renderTabButton('confirmed', '확정')}
            {renderTabButton('completed', '완료')}
            {renderTabButton('cancelled', '취소')}
          </View>

          <FlatList
            data={bookings}
            renderItem={renderBookingItem}
            keyExtractor={item => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="event-busy" size={64} color="#ccc" />
                <Text style={styles.emptyText}>예약이 없습니다</Text>
              </View>
            }
          />
        </>
      ) : (
        <ScrollView style={styles.calendarContainer}>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FFA500' }]} />
              <Text style={styles.legendText}>대기중</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>확정</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
              <Text style={styles.legendText}>완료</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
              <Text style={styles.legendText}>취소</Text>
            </View>
          </View>

          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            markingType={'multi-dot'}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              textSectionTitleDisabledColor: '#d9e1e8',
              selectedDayBackgroundColor: '#4B7BFF',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#4B7BFF',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#4B7BFF',
              selectedDotColor: '#ffffff',
              arrowColor: '#4B7BFF',
              disabledArrowColor: '#d9e1e8',
              monthTextColor: '#4B7BFF',
              indicatorColor: '#4B7BFF',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />

          <View style={styles.calendarInfo}>
            <Text style={styles.calendarInfoTitle}>예약 통계</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookings.filter(b => b.status === 'pending').length}</Text>
                <Text style={styles.statLabel}>대기중</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookings.filter(b => b.status === 'confirmed').length}</Text>
                <Text style={styles.statLabel}>확정</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookings.filter(b => b.status === 'completed').length}</Text>
                <Text style={styles.statLabel}>완료</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{bookings.length}</Text>
                <Text style={styles.statLabel}>전체</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}

      <BookingDetailModal />
      <DateBookingsModal />
    </View>
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
  header: {
    backgroundColor: '#4B7BFF',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 5,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#4B7BFF',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666',
  },
  tabButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  galleryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userName: {
    fontSize: 14,
    color: '#666',
  },
  deletionWarning: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  bookingId: {
    fontSize: 12,
    color: '#999',
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 20,
    marginBottom: 10,
    marginHorizontal: -5,
  },
  modalButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 5,
    marginVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  callButtonText: {
    color: '#007AFF',
    fontSize: 14,
    marginLeft: 5,
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  calendarInfo: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    marginTop: 10,
  },
  calendarInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B7BFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  dateBookingCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dateBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateBookingGallery: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  dateBookingInfo: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});

export default ManageBookingsScreen;
