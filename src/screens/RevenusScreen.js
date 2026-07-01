// src/screens/RevenusScreen.js
import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Picker } from '@react-native-picker/picker';

const RevenusScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedGallery, setSelectedGallery] = useState('all');
  const [galleries, setGalleries] = useState([]);
  const [RevenusData, setRevenusData] = useState({
    totalRevenus: 0,
    periodRevenus: 0,
    reservationCount: 0,
    averagePrice: 0,
    monthlyData: [],
    galleryBreakdown: [],
  });
  
  const currentUser = auth().currentUser;

  useEffect(() => {
    fetchGalleries();
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '수익 관리',
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

  useEffect(() => {
    if (galleries.length > 0) {
      fetchRevenusData();
    }
  }, [selectedPeriod, selectedGallery, galleries]);

  const fetchGalleries = async () => {
    try {
      const querySnapshot = await firestore()
        .collection('galleries')
        .where('ownerId', '==', currentUser.uid)
        .get();
      
      const galleryList = [];
      querySnapshot.forEach(doc => {
        galleryList.push({ id: doc.id, ...doc.data() });
      });
      
      setGalleries(galleryList);
    } catch (error) {
      console.error('갤러리 로드 오류:', error);
    }
  };

  const fetchRevenusData = async () => {
    try {
      setLoading(true);
      
      // 날짜 범위 계산
      const now = new Date();
      let startDate = new Date();
      
      switch (selectedPeriod) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // 갤러리 필터링
      const galleryIds = selectedGallery === 'all' 
        ? galleries.map(g => g.id)
        : [selectedGallery];

      // galleryIds가 비어있으면 빈 결과 반환
      if (galleryIds.length === 0) {
        setRevenusData({
          totalRevenus: 0,
          periodRevenus: 0,
          reservationCount: 0,
          averagePrice: 0,
          monthlyData: [],
          galleryBreakdown: [],
        });
        setLoading(false);
        return;
      }

      // 예약 데이터 가져오기
      const reservationsQuery = firestore()
        .collection('reservations')
        .where('galleryId', 'in', galleryIds)
        .where('status', '==', 'confirmed');

      const reservationsSnapshot = await reservationsQuery.get();
      
      let totalRevenus = 0;
      let periodRevenus = 0;
      let reservationCount = 0;
      const galleryRevenus = {};
      const monthlyRevenus = {};

      reservationsSnapshot.forEach(doc => {
        const data = doc.data();
        const price = data.totalPrice || 0;
        const date = data.createdAt?.toDate();
        
        totalRevenus += price;
        
        if (date && date >= startDate) {
          periodRevenus += price;
          reservationCount++;
          
          // 월별 데이터
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyRevenus[monthKey] = (monthlyRevenus[monthKey] || 0) + price;
        }
        
        // 갤러리별 수익
        galleryRevenus[data.galleryId] = (galleryRevenus[data.galleryId] || 0) + price;
      });

      // 월별 데이터 정렬
      const monthlyData = Object.entries(monthlyRevenus)
        .map(([month, Revenus]) => ({ month, Revenus }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6); // 최근 6개월

      // 갤러리별 분석
      const galleryBreakdown = galleries.map(gallery => ({
        id: gallery.id,
        name: gallery.galleryName,
        Revenus: galleryRevenus[gallery.id] || 0,
      })).sort((a, b) => b.Revenus - a.Revenus);

      setRevenusData({
        totalRevenus,
        periodRevenus,
        reservationCount,
        averagePrice: reservationCount > 0 ? periodRevenus / reservationCount : 0,
        monthlyData,
        galleryBreakdown,
      });
    } catch (error) {
      console.error('수익 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `${(amount / 10000).toFixed(0)}만원`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* 필터 섹션 */}
      <View style={styles.filterSection}>
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>기간</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedPeriod}
              onValueChange={setSelectedPeriod}
              style={styles.picker}
            >
              <Picker.Item label="최근 1주일" value="week" />
              <Picker.Item label="최근 1개월" value="month" />
              <Picker.Item label="최근 1년" value="year" />
            </Picker>
          </View>
        </View>
        
        <View style={styles.filterItem}>
          <Text style={styles.filterLabel}>갤러리</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedGallery}
              onValueChange={setSelectedGallery}
              style={styles.picker}
            >
              <Picker.Item label="전체" value="all" />
              {galleries.map(gallery => (
                <Picker.Item 
                  key={gallery.id}
                  label={gallery.galleryName} 
                  value={gallery.id} 
                />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      {/* 수익 요약 */}
      <View style={styles.summarySection}>
        <View style={styles.summaryCard}>
          <Icon name="account-balance-wallet" size={40} color="#4CAF50" />
          <Text style={styles.summaryTitle}>기간 수익</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(RevenusData.periodRevenus)}
          </Text>
        </View>
        
        <View style={styles.summaryCard}>
          <Icon name="trending-up" size={40} color="#2196F3" />
          <Text style={styles.summaryTitle}>총 수익</Text>
          <Text style={styles.summaryAmount}>
            {formatCurrency(RevenusData.totalRevenus)}
          </Text>
        </View>
      </View>

      {/* 통계 */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>예약 통계</Text>
        <View style={styles.statCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>예약 건수</Text>
            <Text style={styles.statValue}>{RevenusData.reservationCount}건</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>평균 예약 금액</Text>
            <Text style={styles.statValue}>
              {formatCurrency(RevenusData.averagePrice)}
            </Text>
          </View>
        </View>
      </View>

      {/* 월별 수익 */}
      <View style={styles.monthlySection}>
        <Text style={styles.sectionTitle}>월별 수익 추이</Text>
        <View style={styles.chartContainer}>
          {RevenusData.monthlyData.map((data, index) => (
            <View key={data.month} style={styles.barContainer}>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: (data.Revenus / Math.max(...RevenusData.monthlyData.map(d => d.Revenus)) * 150) || 1 
                  }
                ]}
              />
              <Text style={styles.barLabel}>
                {data.month.split('-')[1]}월
              </Text>
              <Text style={styles.barValue}>
                {formatCurrency(data.Revenus)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 갤러리별 수익 */}
      {RevenusData.galleryBreakdown.length > 1 && (
        <View style={styles.gallerySection}>
          <Text style={styles.sectionTitle}>갤러리별 수익</Text>
          {RevenusData.galleryBreakdown.map((gallery) => (
            <View key={gallery.id} style={styles.galleryItem}>
              <Text style={styles.galleryName}>{gallery.name}</Text>
              <Text style={styles.galleryRevenus}>
                {formatCurrency(gallery.Revenus)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 수익 인출 버튼 */}
      <TouchableOpacity style={styles.withdrawButton}>
        <Icon name="account-balance" size={20} color="white" />
        <Text style={styles.withdrawButtonText}>수익 인출 신청</Text>
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
  filterSection: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 10,
  },
  filterItem: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  picker: {
    height: 40,
  },
  summarySection: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statsSection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  monthlySection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 200,
    paddingTop: 20,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    width: 30,
    backgroundColor: '#4CAF50',
    borderRadius: 5,
    marginBottom: 5,
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  barValue: {
    fontSize: 10,
    color: '#333',
    marginTop: 2,
  },
  gallerySection: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  galleryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  galleryName: {
    fontSize: 14,
    color: '#333',
  },
  galleryRevenus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    gap: 10,
  },
  withdrawButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RevenusScreen;
