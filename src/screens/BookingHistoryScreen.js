import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import FirebaseService from '../services/FirebaseService';
import NotificationService from '../services/NotificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Switch } from 'react-native';
import useLoginStore from '../store/useLoginStore';

LocaleConfig.locales['ko'] = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘'
};
LocaleConfig.defaultLocale = 'ko';

const BookingHistoryScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState(null);
  const [filteredByDate, setFilteredByDate] = useState([]);
  const [reminderSettings, setReminderSettings] = useState({});
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedBookingForReminder, setSelectedBookingForReminder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, price_desc, price_asc, name
  const [dateFilter, setDateFilter] = useState('all'); // all, week, month, 3months, 6months, year, custom
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: null });
  const [priceFilter, setPriceFilter] = useState({ min: null, max: null });
  const currentUser = auth().currentUser;
  const { userType } = useLoginStore();

  // 서비스 인스턴스를 메모이제이션
  const firebaseService = useMemo(() => new FirebaseService(), []);
  const notificationService = useMemo(() => new NotificationService(), []);

  const fetchBookings = useCallback(async () => {
    try {
      let bookingList = [];

      // 오너인 경우: 자신의 갤러리에 대한 예약 + 자신이 만든 예약
      if (userType === 'owner') {
        // 1. 오너의 갤러리 목록 조회
        const galleries = await firebaseService.getGalleries({ ownerId: currentUser.uid });
        const galleryIds = galleries.map(g => g.id);
        const galleryMap = {};
        galleries.forEach(g => { galleryMap[g.id] = g; });

        // 2. 각 갤러리에 대한 예약 조회 (ManageBookingsScreen과 동일한 로직)
        if (galleryIds.length > 0) {
          for (let i = 0; i < galleryIds.length; i += 10) {
            const batch = galleryIds.slice(i, i + 10);
            if (batch.length === 0) continue;

            const snapshot = await firestore()
              .collection('reservations')
              .where('galleryId', 'in', batch)
              .orderBy('createdAt', 'desc')
              .get();

            snapshot.docs.forEach(doc => {
              const data = doc.data();
              bookingList.push({
                id: doc.id,
                ...data,
                galleryName: galleryMap[data.galleryId]?.name || '갤러리',
                galleryLocation: galleryMap[data.galleryId]?.location || '',
                startDate: data.startDate,
                endDate: data.endDate,
                createdAt: data.createdAt,
              });
            });
          }
        }

        // 3. 자신이 만든 예약도 추가 (중복 제거)
        const userReservations = await firebaseService.getUserReservations(currentUser.uid);
        userReservations.forEach(reservation => {
          if (!bookingList.find(b => b.id === reservation.id)) {
            bookingList.push(reservation);
          }
        });
      } else {
        // 일반 사용자/아티스트: 자신이 만든 예약만
        bookingList = await firebaseService.getUserReservations(currentUser.uid);
      }

      setBookings(bookingList);
    } catch (error) {
      console.error('예약 내역 로드 오류:', error);
      Alert.alert('오류', '예약 내역을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, userType, firebaseService]);

  // 필터링된 예약 목록
  const filteredAndSortedBookings = useMemo(() => {
    let filtered = [...bookings];

    // 상태 필터
    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === filterStatus);
    }

    // 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.galleryName?.toLowerCase().includes(query) ||
        booking.id?.toLowerCase().includes(query) ||
        booking.galleryAddress?.toLowerCase().includes(query)
      );
    }

    // 날짜 필터
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch(dateFilter) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case '3months':
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case '6months':
          filterDate.setMonth(now.getMonth() - 6);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'custom':
          if (customDateRange.start && customDateRange.end) {
            filtered = filtered.filter(booking => {
              const bookingDate = booking.startDate?.toDate?.() || booking.createdAt?.toDate?.();
              return bookingDate >= customDateRange.start && bookingDate <= customDateRange.end;
            });
          }
          break;
      }

      if (dateFilter !== 'custom') {
        filtered = filtered.filter(booking => {
          const bookingDate = booking.startDate?.toDate?.() || booking.createdAt?.toDate?.();
          return bookingDate >= filterDate;
        });
      }
    }

    // 가격 필터
    if (priceFilter.min !== null || priceFilter.max !== null) {
      filtered = filtered.filter(booking => {
        const price = booking.totalPrice || 0;
        if (priceFilter.min !== null && price < priceFilter.min) return false;
        if (priceFilter.max !== null && price > priceFilter.max) return false;
        return true;
      });
    }

    // 정렬
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'date_desc':
          return (b.startDate?.toDate?.() || b.createdAt?.toDate?.() || 0) -
                 (a.startDate?.toDate?.() || a.createdAt?.toDate?.() || 0);
        case 'date_asc':
          return (a.startDate?.toDate?.() || a.createdAt?.toDate?.() || 0) -
                 (b.startDate?.toDate?.() || b.createdAt?.toDate?.() || 0);
        case 'price_desc':
          return (b.totalPrice || 0) - (a.totalPrice || 0);
        case 'price_asc':
          return (a.totalPrice || 0) - (b.totalPrice || 0);
        case 'name':
          return (a.galleryName || '').localeCompare(b.galleryName || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [bookings, filterStatus, searchQuery, dateFilter, customDateRange, priceFilter, sortBy]);

  const loadReminderSettings = useCallback(async () => {
    try {
      const settings = await notificationService.getAllReminderSettings();
      setReminderSettings(settings);
    } catch (error) {
      console.error('리마인더 설정 로드 오류:', error);
    }
  }, [notificationService]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await fetchBookings();
        await loadReminderSettings();
      }
    };

    loadData();

    // Cleanup: 컴포넌트 언마운트 시 플래그 설정
    return () => {
      isMounted = false;
    };
  }, []);  // 빈 배열: 마운트 시 한 번만 실행

  const handleReminderToggle = async (booking, reminderType, value) => {
    try {
      const bookingId = booking.id;
      const currentSettings = reminderSettings[bookingId] || {};

      if (value) {
        // 알림 활성화
        await notificationService.scheduleBookingReminder(booking, reminderType);
        currentSettings[reminderType] = true;
      } else {
        // 알림 비활성화
        await notificationService.cancelNotification(`booking-reminder-${bookingId}-${reminderType}`);
        delete currentSettings[reminderType];
      }

      // 설정 저장
      await notificationService.saveReminderSettings(bookingId, currentSettings);
      setReminderSettings({
        ...reminderSettings,
        [bookingId]: currentSettings,
      });

      Alert.alert('성공', value ? '알림이 설정되었습니다.' : '알림이 해제되었습니다.');
    } catch (error) {
      console.error('알림 설정 오류:', error);
      Alert.alert('오류', '알림 설정 중 오류가 발생했습니다.');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleCancelBooking = async (bookingId) => {
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
              await firebaseService.updateReservationStatus(bookingId, 'cancelled');
              Alert.alert('성공', '예약이 취소되었습니다.');
              handleCloseModal();
              fetchBookings();
            } catch (error) {
              console.error('예약 취소 오류:', error);
              Alert.alert('오류', '예약 취소 중 오류가 발생했습니다.');
            }
          },
        },
      ]
    );
  };

  const handleWriteReview = (booking) => {
    if (booking.status !== 'completed') {
      Alert.alert('알림', '완료된 예약에 대해서만 리뷰를 작성할 수 있습니다.');
      return;
    }
    
    navigation.navigate('WriteReview', {
      galleryId: booking.galleryId,
      galleryName: booking.galleryName,
      bookingId: booking.id,
    });
  };

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
        return status;
    }
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return '날짜 미정';
    const d = new Date(date);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const formatDateForCalendar = useCallback((date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // 달력 마크는 viewMode가 calendar일 때만 계산
  const markedDatesCalendar = useMemo(() => {
    if (viewMode !== 'calendar') return {};

    const marks = {};

    // 모든 예약을 처리 (나중에 추가된 예약이 이전 것을 덮어씀)
    bookings.forEach(booking => {
      try {
        const startDate = booking.startDate?.toDate?.();
        const endDate = booking.endDate?.toDate?.();

        if (startDate) {
          const startDateStr = formatDateForCalendar(startDate);
          const endDateStr = endDate ? formatDateForCalendar(endDate) : startDateStr;
          const color = getStatusColor(booking.status);

          // 단일 날짜 예약인 경우
          if (startDateStr === endDateStr) {
            marks[startDateStr] = {
              startingDay: true,
              endingDay: true,
              color: color,
              textColor: 'white',
            };
          } else {
            // 기간 예약인 경우 - 시작일
            marks[startDateStr] = {
              startingDay: true,
              color: color,
              textColor: 'white',
            };

            // 기간 예약인 경우 - 종료일
            marks[endDateStr] = {
              endingDay: true,
              color: color,
              textColor: 'white',
            };

            // 기간 예약인 경우 - 중간 날짜들 (최대 60일까지 처리)
            if (endDate && endDate > startDate) {
              let currentDate = new Date(startDate);
              currentDate.setDate(currentDate.getDate() + 1);
              let dayCount = 0;

              while (currentDate < endDate && dayCount < 60) {
                const currentDateStr = formatDateForCalendar(currentDate);
                marks[currentDateStr] = {
                  color: color,
                  textColor: 'white',
                };
                currentDate.setDate(currentDate.getDate() + 1);
                dayCount++;
              }
            }
          }
        }
      } catch (error) {
        console.error('마크 생성 오류:', error);
      }
    });

    return marks;
  }, [bookings, viewMode, formatDateForCalendar, getStatusColor]);

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);

    // 선택한 날짜의 예약 필터링
    const filtered = bookings.filter(booking => {
      const startDate = booking.startDate?.toDate?.();
      const endDate = booking.endDate?.toDate?.();

      if (!startDate) return false;

      const selectedDateObj = new Date(day.dateString);
      const startDateStr = formatDateForCalendar(startDate);

      // 단일 날짜 예약
      if (!endDate || formatDateForCalendar(endDate) === startDateStr) {
        return startDateStr === day.dateString;
      }

      // 날짜 범위 예약
      return selectedDateObj >= startDate && selectedDateObj <= endDate;
    });

    setFilteredByDate(filtered);

    if (filtered.length === 0) {
      Alert.alert('알림', '선택한 날짜에 예약이 없습니다.');
    } else {
      // 선택한 날짜의 예약을 모달로 표시
      setModalVisible(true);
    }
  };

  const formatDateRange = useCallback((startDate, endDate) => {
    const start = formatDate(startDate?.toDate?.());
    const end = formatDate(endDate?.toDate?.());
    return start === end ? start : `${start} ~ ${end}`;
  }, [formatDate]);

  const renderBookingItem = useCallback(({ item }) => {
    const isUpcoming = item.status === 'confirmed' &&
                       item.startDate?.toDate?.() > new Date();
    const canCancel = item.status === 'pending' ||
                      (item.status === 'confirmed' && isUpcoming);
    const canReview = item.status === 'completed' && !item.hasReview;
    const canSetReminder = isUpcoming && item.status === 'confirmed';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => {
          navigation.navigate('BookingDetail', { booking: item });
        }}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.galleryInfo}>
            <Text style={styles.galleryName}>{item.galleryName}</Text>
            <Text style={styles.bookingId}>예약번호: {item.id.substring(0, 8).toUpperCase()}</Text>
          </View>
          <View 
            style={[
              styles.statusBadge, 
              { backgroundColor: getStatusColor(item.status) }
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.bookingInfo}>
          <View style={styles.infoRow}>
            <Icon name="event" size={16} color="#666" />
            <Text style={styles.infoText}>
              {formatDateRange(item.startDate, item.endDate)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="access-time" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.timeSlot || '10:00-18:00'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="attach-money" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.totalPrice?.toLocaleString()}원
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Icon name="people" size={16} color="#666" />
            <Text style={styles.infoText}>
              {item.visitorCount || 1}명
            </Text>
          </View>
        </View>

        <View style={styles.bookingActions}>
          {canCancel && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCancelBooking(item.id)}
            >
              <Text style={[styles.actionButtonText, { color: '#F44336' }]}>
                예약 취소
              </Text>
            </TouchableOpacity>
          )}

          {canReview && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleWriteReview(item)}
            >
              <Text style={[styles.actionButtonText, { color: '#4CAF50' }]}>
                리뷰 작성
              </Text>
            </TouchableOpacity>
          )}

          {canSetReminder && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setSelectedBookingForReminder(item);
                setReminderModalVisible(true);
              }}
            >
              <Icon
                name="notifications"
                size={20}
                color={reminderSettings[item.id] ? '#FF9800' : '#666'}
              />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.bookingDate}>
          예약일: {item.createdAt?.toDate?.()?.toLocaleDateString() || ''}
        </Text>
      </TouchableOpacity>
    );
  }, [navigation, getStatusColor, getStatusText, formatDateRange, reminderSettings, handleCancelBooking, handleWriteReview]);

  const FilterTabs = () => (
    <View>
      {/* 검색 바 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="갤러리명 또는 예약번호 검색"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="tune" size={24} color="#007AFF" />
          {(dateFilter !== 'all' || priceFilter.min || priceFilter.max) && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      </View>

      {/* 상태 탭 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filterStatus === status && styles.filterTabActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[
              styles.filterTabText,
              filterStatus === status && styles.filterTabTextActive,
            ]}>
              {status === 'all' ? '전체' : getStatusText(status)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // 필터 모달
  const FilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFilterModal}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>필터 및 정렬</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalBody}>
            {/* 정렬 옵션 */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>정렬</Text>
              {[
                { value: 'date_desc', label: '최신순' },
                { value: 'date_asc', label: '오래된순' },
                { value: 'price_desc', label: '가격 높은순' },
                { value: 'price_asc', label: '가격 낮은순' },
                { value: 'name', label: '갤러리명순' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.filterOption}
                  onPress={() => setSortBy(option.value)}
                >
                  <Text style={styles.filterOptionText}>{option.label}</Text>
                  {sortBy === option.value && (
                    <Icon name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 기간 필터 */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>기간</Text>
              {[
                { value: 'all', label: '전체 기간' },
                { value: 'week', label: '최근 1주' },
                { value: 'month', label: '최근 1개월' },
                { value: '3months', label: '최근 3개월' },
                { value: '6months', label: '최근 6개월' },
                { value: 'year', label: '최근 1년' },
              ].map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.filterOption}
                  onPress={() => setDateFilter(option.value)}
                >
                  <Text style={styles.filterOptionText}>{option.label}</Text>
                  {dateFilter === option.value && (
                    <Icon name="check" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 가격 필터 */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>가격 범위</Text>
              <View style={styles.priceInputContainer}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="최소금액"
                  value={priceFilter.min?.toString() || ''}
                  onChangeText={(text) => setPriceFilter({
                    ...priceFilter,
                    min: text ? parseInt(text) : null
                  })}
                  keyboardType="numeric"
                />
                <Text style={styles.priceRangeText}>~</Text>
                <TextInput
                  style={styles.priceInput}
                  placeholder="최대금액"
                  value={priceFilter.max?.toString() || ''}
                  onChangeText={(text) => setPriceFilter({
                    ...priceFilter,
                    max: text ? parseInt(text) : null
                  })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterModalFooter}>
            <TouchableOpacity
              style={styles.filterResetButton}
              onPress={() => {
                setSortBy('date_desc');
                setDateFilter('all');
                setPriceFilter({ min: null, max: null });
                setCustomDateRange({ start: null, end: null });
              }}
            >
              <Text style={styles.filterResetText}>초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.filterApplyText}>적용</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const handleCloseModal = () => {
    setModalVisible(false);
    // 모든 모달 관련 상태 즉시 초기화
    setSelectedBooking(null);
    setSelectedDate(null);
    setFilteredByDate([]);
  };

  const BookingDetailModal = () => {
    // visible이 false면 아예 렌더링하지 않음
    if (!modalVisible) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate && filteredByDate.length > 0
                  ? `${selectedDate} 예약 내역`
                  : '예약 상세'}
              </Text>
              <TouchableOpacity onPress={handleCloseModal}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

          {selectedDate && filteredByDate.length > 0 ? (
            <FlatList
              data={filteredByDate}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dateBookingItem}
                  onPress={() => {
                    // 모달을 닫고 BookingDetail 화면으로 이동
                    setModalVisible(false);
                    setTimeout(() => {
                      navigation.navigate('BookingDetail', { booking: item });
                    }, 300);
                  }}
                >
                  <View style={styles.dateBookingHeader}>
                    <Text style={styles.dateBookingTitle}>{item.galleryName}</Text>
                    <View
                      style={[
                        styles.dateBookingStatus,
                        { backgroundColor: getStatusColor(item.status) }
                      ]}
                    >
                      <Text style={styles.dateBookingStatusText}>
                        {getStatusText(item.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateBookingTime}>
                    {item.timeSlot || '10:00-18:00'}
                  </Text>
                  <Text style={styles.dateBookingPrice}>
                    {item.totalPrice?.toLocaleString()}원
                  </Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.dateBookingList}
            />
          ) : selectedBooking && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>예약 정보</Text>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>예약번호</Text>
                  <Text style={styles.modalValue}>
                    {selectedBooking.id.substring(0, 8).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>상태</Text>
                  <Text style={[
                    styles.modalValue,
                    { color: getStatusColor(selectedBooking.status) }
                  ]}>
                    {getStatusText(selectedBooking.status)}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>예약일시</Text>
                  <Text style={styles.modalValue}>
                    {formatDateRange(selectedBooking.startDate, selectedBooking.endDate)}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>시간</Text>
                  <Text style={styles.modalValue}>
                    {selectedBooking.timeSlot || '10:00-18:00'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>갤러리 정보</Text>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>갤러리명</Text>
                  <Text style={styles.modalValue}>{selectedBooking.galleryName}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>이용 목적</Text>
                  <Text style={styles.modalValue}>
                    {selectedBooking.purpose || '정보 없음'}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>예상 인원</Text>
                  <Text style={styles.modalValue}>
                    {selectedBooking.visitorCount || 1}명
                  </Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>결제 정보</Text>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>총 금액</Text>
                  <Text style={styles.modalValue}>
                    {selectedBooking.totalPrice?.toLocaleString()}원
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>결제 상태</Text>
                  <Text style={styles.modalValue}>
                    {selectedBooking.paymentStatus === 'paid' ? '결제 완료' : '미결제'}
                  </Text>
                </View>
              </View>

              {selectedBooking.requirements && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>특별 요청사항</Text>
                  <Text style={styles.modalText}>{selectedBooking.requirements}</Text>
                </View>
              )}

              <View style={styles.modalActions}>
                {selectedBooking.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#F44336' }]}
                    onPress={() => handleCancelBooking(selectedBooking.id)}
                  >
                    <Text style={styles.modalButtonText}>예약 취소</Text>
                  </TouchableOpacity>
                )}

                {selectedBooking.status === 'confirmed' &&
                 selectedBooking.startDate?.toDate?.() > new Date() && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#F44336' }]}
                    onPress={() => handleCancelBooking(selectedBooking.id)}
                  >
                    <Text style={styles.modalButtonText}>예약 취소</Text>
                  </TouchableOpacity>
                )}

                {selectedBooking.status === 'completed' && !selectedBooking.hasReview && (
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                    onPress={() => {
                      handleCloseModal();
                      setTimeout(() => {
                        handleWriteReview(selectedBooking);
                      }, 300);
                    }}
                  >
                    <Text style={styles.modalButtonText}>리뷰 작성</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#007AFF' }]}
                  onPress={() => {
                    const galleryId = selectedBooking.galleryId;
                    handleCloseModal();
                    setTimeout(() => {
                      navigation.navigate('GalleryDetail', { galleryId });
                    }, 300);
                  }}
                >
                  <Text style={styles.modalButtonText}>갤러리 보기</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>
              {userType === 'owner' ? '예약 관리' : '예약 내역'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {searchQuery || dateFilter !== 'all' || priceFilter.min || priceFilter.max
                ? `${filteredAndSortedBookings.length}건 검색 결과`
                : userType === 'owner'
                  ? `총 ${bookings.length}건의 예약 (내 갤러리)`
                  : `총 ${bookings.length}건의 예약`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
          >
            <Icon
              name={viewMode === 'list' ? 'event' : 'view-list'}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
      </View>

      <FilterTabs />
      
      {viewMode === 'list' ? (
        <FlatList
          data={filteredAndSortedBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="event-note" size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                {filterStatus === 'all'
                  ? '예약 내역이 없습니다'
                  : `${getStatusText(filterStatus)} 예약이 없습니다`}
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.exploreButtonText}>갤러리 둘러보기</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <ScrollView
          style={styles.calendarContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
            />
          }
        >
          <Calendar
            onDayPress={handleDayPress}
            markedDates={{
              ...markedDatesCalendar,
              ...(selectedDate && {
                [selectedDate]: {
                  ...markedDatesCalendar[selectedDate],
                  selected: true,
                  selectedColor: '#007AFF',
                  selectedTextColor: '#ffffff'
                }
              })
            }}
            markingType={'period'}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#666',
              selectedDayBackgroundColor: '#007AFF',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#007AFF',
              dayTextColor: '#333',
              textDisabledColor: '#d9e1e8',
              arrowColor: '#007AFF',
              monthTextColor: '#333',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600'
            }}
          />

          <View style={styles.calendarLegend}>
            <Text style={styles.legendTitle}>예약 상태</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
                <Text style={styles.legendText}>예약 확정</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                <Text style={styles.legendText}>승인 대기</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
                <Text style={styles.legendText}>이용 완료</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
                <Text style={styles.legendText}>취소됨</Text>
              </View>
            </View>
          </View>

          {bookings.length === 0 && (
            <View style={styles.emptyContainer}>
              <Icon name="event-note" size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                {filterStatus === 'all'
                  ? '예약 내역이 없습니다'
                  : `${getStatusText(filterStatus)} 예약이 없습니다`}
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Search')}
              >
                <Text style={styles.exploreButtonText}>갤러리 둘러보기</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <BookingDetailModal />

      {/* 알림 설정 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reminderModalVisible}
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>알림 설정</Text>
              <TouchableOpacity onPress={() => setReminderModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedBookingForReminder && (
              <View style={styles.modalBody}>
                <View style={styles.reminderSection}>
                  <Text style={styles.reminderSectionTitle}>
                    {selectedBookingForReminder.galleryName}
                  </Text>
                  <Text style={styles.reminderDate}>
                    {formatDate(selectedBookingForReminder.startDate?.toDate?.())}
                    {' '}{selectedBookingForReminder.timeSlot || '10:00-18:00'}
                  </Text>
                </View>

                <View style={styles.reminderOptions}>
                  <View style={styles.reminderOption}>
                    <View style={styles.reminderOptionInfo}>
                      <Icon name="event" size={20} color="#666" />
                      <Text style={styles.reminderOptionText}>
                        하루 전 알림 (18:00)
                      </Text>
                    </View>
                    <Switch
                      value={reminderSettings[selectedBookingForReminder.id]?.day_before || false}
                      onValueChange={(value) =>
                        handleReminderToggle(selectedBookingForReminder, 'day_before', value)
                      }
                      trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                      thumbColor={reminderSettings[selectedBookingForReminder.id]?.day_before ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>

                  <View style={styles.reminderOption}>
                    <View style={styles.reminderOptionInfo}>
                      <Icon name="wb-sunny" size={20} color="#666" />
                      <Text style={styles.reminderOptionText}>
                        당일 오전 알림 (09:00)
                      </Text>
                    </View>
                    <Switch
                      value={reminderSettings[selectedBookingForReminder.id]?.morning_of || false}
                      onValueChange={(value) =>
                        handleReminderToggle(selectedBookingForReminder, 'morning_of', value)
                      }
                      trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                      thumbColor={reminderSettings[selectedBookingForReminder.id]?.morning_of ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>

                  <View style={styles.reminderOption}>
                    <View style={styles.reminderOptionInfo}>
                      <Icon name="access-time" size={20} color="#666" />
                      <Text style={styles.reminderOptionText}>
                        1시간 전 알림
                      </Text>
                    </View>
                    <Switch
                      value={reminderSettings[selectedBookingForReminder.id]?.['1_hour_before'] || false}
                      onValueChange={(value) =>
                        handleReminderToggle(selectedBookingForReminder, '1_hour_before', value)
                      }
                      trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                      thumbColor={reminderSettings[selectedBookingForReminder.id]?.['1_hour_before'] ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>

                  <View style={styles.reminderOption}>
                    <View style={styles.reminderOptionInfo}>
                      <Icon name="timer" size={20} color="#666" />
                      <Text style={styles.reminderOptionText}>
                        30분 전 알림
                      </Text>
                    </View>
                    <Switch
                      value={reminderSettings[selectedBookingForReminder.id]?.['30_min_before'] || false}
                      onValueChange={(value) =>
                        handleReminderToggle(selectedBookingForReminder, '30_min_before', value)
                      }
                      trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                      thumbColor={reminderSettings[selectedBookingForReminder.id]?.['30_min_before'] ? '#4CAF50' : '#f4f3f4'}
                    />
                  </View>
                </View>

                <View style={styles.reminderNote}>
                  <Icon name="info-outline" size={16} color="#999" />
                  <Text style={styles.reminderNoteText}>
                    설정한 시간에 푸시 알림이 발송됩니다.
                    알림을 받으려면 기기의 알림 설정이 활성화되어 있어야 합니다.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.reminderCloseButton}
                  onPress={() => setReminderModalVisible(false)}
                >
                  <Text style={styles.reminderCloseButtonText}>닫기</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* 필터 모달 */}
      <FilterModal />
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
    backgroundColor: '#007AFF',
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewModeButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterTabActive: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
  },
  filterTabTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  galleryInfo: {
    flex: 1,
  },
  galleryName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookingId: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  bookingActions: {
    flexDirection: 'row',
    marginBottom: 8,
    marginHorizontal: -5,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  bookingDate: {
    fontSize: 11,
    color: '#999',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
    marginBottom: 10,
    color: '#333',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
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
    paddingHorizontal: 8,
    marginHorizontal: 5,
    marginVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  calendarLegend: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#666',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  dateBookingList: {
    padding: 20,
  },
  dateBookingItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  dateBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateBookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dateBookingStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateBookingStatusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dateBookingTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateBookingPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  reminderSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  reminderSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  reminderDate: {
    fontSize: 14,
    color: '#666',
  },
  reminderOptions: {
    marginBottom: 20,
  },
  reminderOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reminderOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderOptionText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
  },
  reminderNote: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  reminderNoteText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  reminderCloseButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderCloseButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  filterModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  filterModalBody: {
    paddingHorizontal: 20,
  },
  filterSection: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  filterOptionText: {
    fontSize: 15,
    color: '#333',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  priceInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  priceRangeText: {
    marginHorizontal: 10,
    fontSize: 16,
    color: '#666',
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  filterResetButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  filterResetText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  filterApplyText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default BookingHistoryScreen;