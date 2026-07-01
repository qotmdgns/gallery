import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const OwnerDashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalBookings: 0,
    todayBookings: 0,
    totalRevenus: 0,
    monthlyRevenus: 0,
    activeGalleries: 0,
    pendingBookings: 0,
    recentBookings: [],
    unreadMessages: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('No current user found');
        return;
      }

      console.log('Loading dashboard data for:', currentUser.uid);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // 갤러리 수 조회
      const galleriesSnapshot = await firestore()
        .collection('galleries')
        .where('ownerId', '==', currentUser.uid)
        .get();

      const galleryIds = galleriesSnapshot.docs.map(doc => doc.id);
      console.log(`Found ${galleryIds.length} galleries`);

      if (galleryIds.length === 0) {
        setDashboardData({
          totalBookings: 0,
          todayBookings: 0,
          totalRevenus: 0,
          monthlyRevenus: 0,
          activeGalleries: 0,
          pendingBookings: 0,
          recentBookings: [],
          unreadMessages: 0,
        });
        setLoading(false);
        return;
      }

      // 예약 데이터 조회 (Firestore 'in' 쿼리는 최대 10개 제한)
      let bookingsSnapshot;
      try {
        if (galleryIds.length <= 10) {
          // 인덱스가 있는 쿼리 시도
          try {
            bookingsSnapshot = await firestore()
              .collection('reservations')
              .where('galleryId', 'in', galleryIds)
              .orderBy('createdAt', 'desc')
              .limit(50)
              .get();
          } catch (indexError) {
            console.log('Index query failed, trying without orderBy:', indexError.message);
            // 인덱스 없이 쿼리 후 클라이언트 정렬
            bookingsSnapshot = await firestore()
              .collection('reservations')
              .where('galleryId', 'in', galleryIds)
              .limit(100)
              .get();
          }
        } else {
          // galleryIds가 10개를 초과하는 경우, 여러 쿼리로 나누어 실행
          console.log('Processing multiple batches for galleries');
          const bookingDocs = [];
          for (let i = 0; i < galleryIds.length; i += 10) {
            const batch = galleryIds.slice(i, i + 10);
            try {
              const snapshot = await firestore()
                .collection('reservations')
                .where('galleryId', 'in', batch)
                .get();
              bookingDocs.push(...snapshot.docs);
            } catch (batchError) {
              console.error('Batch query error:', batchError);
            }
          }
          // 날짜순 정렬 및 상위 50개 제한
          bookingDocs.sort((a, b) => {
            const aTime = a.data().createdAt?.toMillis() || 0;
            const bTime = b.data().createdAt?.toMillis() || 0;
            return bTime - aTime;
          });
          bookingsSnapshot = {
            size: Math.min(bookingDocs.length, 50),
            docs: bookingDocs.slice(0, 50)
          };
        }
      } catch (queryError) {
        console.error('Reservations query error:', queryError);
        bookingsSnapshot = { size: 0, docs: [] };
      }

      let totalBookings = bookingsSnapshot?.size || 0;
      let todayBookings = 0;
      let totalRevenus = 0;
      let monthlyRevenus = 0;
      let pendingBookings = 0;
      const recentBookings = [];

      // docs가 null이거나 배열이 아닌 경우 체크
      if (bookingsSnapshot?.docs && Array.isArray(bookingsSnapshot.docs)) {
        bookingsSnapshot.docs.forEach(doc => {
        const booking = { id: doc.id, ...doc.data() };
        
        // 오늘 예약 수
        const createdAtDate = booking.createdAt?.toDate?.();
        if (createdAtDate && createdAtDate >= today) {
          todayBookings++;
        }

        // 수익 계산
        if (booking.status === 'confirmed' || booking.status === 'completed') {
          const amount = booking.totalAmount || 0;
          totalRevenus += amount;
          
          const bookingDate = booking.createdAt?.toDate?.();
          if (bookingDate && bookingDate >= thisMonth) {
            monthlyRevenus += amount;
          }
        }

        // 대기 중인 예약
        if (booking.status === 'pending') {
          pendingBookings++;
        }

        // 최근 예약 5개
        if (recentBookings.length < 5) {
          recentBookings.push(booking);
        }
      });
      }

      // 읽지 않은 메시지 수 조회
      let unreadMessages = 0;
      try {
        const chatsSnapshot = await firestore()
          .collection('chatRooms')
          .where('galleryOwnerId', '==', currentUser.uid)
          .where('ownerUnreadCount', '>', 0)
          .get();

        unreadMessages = chatsSnapshot.docs.reduce((sum, doc) => {
          const count = doc.data().ownerUnreadCount;
          return sum + (typeof count === 'number' ? count : 0);
        }, 0);
      } catch (chatError) {
        console.error('Chat query error:', chatError);
        // 채팅 조회 실패해도 대시보드는 계속 표시
      }

      setDashboardData({
        totalBookings,
        todayBookings,
        totalRevenus,
        monthlyRevenus,
        activeGalleries: galleryIds.length,
        pendingBookings,
        recentBookings,
        unreadMessages,
      });
    } catch (error) {
      console.error('Dashboard data loading error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);

      // 에러가 발생해도 빈 대시보드 표시
      setDashboardData({
        totalBookings: 0,
        todayBookings: 0,
        totalRevenus: 0,
        monthlyRevenus: 0,
        activeGalleries: 0,
        pendingBookings: 0,
        recentBookings: [],
        unreadMessages: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatAmount = (amount) => {
    return `₩${amount.toLocaleString()}`;
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B7BFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>대시보드</Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 주요 지표 카드 */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricCard}>
          <Icon name="event-note" size={30} color="#4B7BFF" />
          <Text style={styles.metricValue}>{dashboardData.totalBookings}</Text>
          <Text style={styles.metricLabel}>전체 예약</Text>
        </View>

        <View style={styles.metricCard}>
          <Icon name="today" size={30} color="#4CAF50" />
          <Text style={styles.metricValue}>{dashboardData.todayBookings}</Text>
          <Text style={styles.metricLabel}>오늘 예약</Text>
        </View>

        <View style={styles.metricCard}>
          <Icon name="pending" size={30} color="#FFA500" />
          <Text style={styles.metricValue}>{dashboardData.pendingBookings}</Text>
          <Text style={styles.metricLabel}>대기중</Text>
        </View>

        <View style={styles.metricCard}>
          <Icon name="message" size={30} color="#F44336" />
          <Text style={styles.metricValue}>{dashboardData.unreadMessages}</Text>
          <Text style={styles.metricLabel}>새 메시지</Text>
        </View>
      </View>

      {/* 수익 정보 */}
      <View style={styles.revenusContainer}>
        <Text style={styles.sectionTitle}>수익 현황</Text>
        <View style={styles.revenusCard}>
          <View style={styles.revenusItem}>
            <Text style={styles.revenusLabel}>이번 달 수익</Text>
            <Text style={styles.revenusAmount}>
              {formatAmount(dashboardData.monthlyRevenus)}
            </Text>
          </View>
          <View style={styles.revenusDivider} />
          <View style={styles.revenusItem}>
            <Text style={styles.revenusLabel}>총 수익</Text>
            <Text style={styles.revenusAmount}>
              {formatAmount(dashboardData.totalRevenus)}
            </Text>
          </View>
        </View>
      </View>

      {/* 빠른 액션 */}
      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>빠른 메뉴</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Gallery')}
          >
            <Icon name="store" size={24} color="#4B7BFF" />
            <Text style={styles.actionButtonText}>갤러리 관리</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Bookings')}
          >
            <Icon name="event-available" size={24} color="#4B7BFF" />
            <Text style={styles.actionButtonText}>예약 관리</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('ManualBooking')}
          >
            <Icon name="add-circle" size={24} color="#4B7BFF" />
            <Text style={styles.actionButtonText}>예약 등록</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Chat')}
          >
            <Icon name="chat" size={24} color="#4B7BFF" />
            <Text style={styles.actionButtonText}>문의 관리</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Revenus')}
          >
            <Icon name="insights" size={24} color="#4B7BFF" />
            <Text style={styles.actionButtonText}>수익 분석</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 최근 예약 */}
      <View style={styles.recentBookings}>
        <Text style={styles.sectionTitle}>최근 예약</Text>
        {dashboardData.recentBookings.length > 0 ? (
          dashboardData.recentBookings.map(booking => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingItem}
              onPress={() => navigation.navigate('Bookings')}
            >
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingName}>
                  {booking.userName || '예약자'}
                </Text>
                <Text style={styles.bookingDate}>
                  {booking.bookingDate || '날짜 미정'}
                </Text>
              </View>
              <View style={styles.bookingStatus}>
                <Text style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) }
                ]}>
                  {getStatusText(booking.status)}
                </Text>
                <Text style={styles.bookingAmount}>
                  {formatAmount(booking.totalAmount || 0)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>최근 예약이 없습니다</Text>
        )}
      </View>

      {/* 갤러리 정보 */}
      <View style={styles.galleryInfo}>
        <View style={styles.infoCard}>
          <Icon name="store" size={24} color="#4B7BFF" />
          <Text style={styles.infoText}>
            등록된 갤러리: {dashboardData.activeGalleries}개
          </Text>
        </View>
      </View>
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
  header: {
    backgroundColor: '#4B7BFF',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  revenusContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  revenusCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  revenusItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  revenusAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B7BFF',
  },
  revenusDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  quickActions: {
    padding: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 14,
    color: '#333',
  },
  recentBookings: {
    padding: 15,
  },
  bookingItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  bookingDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  bookingStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    overflow: 'hidden',
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  galleryInfo: {
    padding: 15,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
});

export default OwnerDashboardScreen;