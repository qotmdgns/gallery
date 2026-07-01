import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import useLoginStore from '../store/useLoginStore';

const ExhibitionProposalScreen = ({ navigation, route }) => {
  const { artistId, artistName } = route.params || {};
  const { userId, userName } = useLoginStore();
  const [loading, setLoading] = useState(false);
  const [galleryInfo, setGalleryInfo] = useState(null);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  
  const [proposal, setProposal] = useState({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후
    commission: '',
    supportDetails: '',
    requirements: '',
    message: '',
  });

  useEffect(() => {
    loadGalleryInfo();
  }, []);

  const loadGalleryInfo = async () => {
    try {
      const snapshot = await firestore()
        .collection('galleries')
        .where('ownerId', '==', userId)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const gallery = {
          id: snapshot.docs[0].id,
          ...snapshot.docs[0].data()
        };
        setGalleryInfo(gallery);
      }
    } catch (error) {
      console.error('갤러리 정보 로드 실패:', error);
    }
  };

  const sendProposal = async () => {
    if (!proposal.title || !proposal.description) {
      Alert.alert('알림', '전시 제목과 설명은 필수입니다.');
      return;
    }

    try {
      setLoading(true);

      const proposalData = {
        ...proposal,
        artistId: artistId,
        artistName: artistName,
        galleryId: galleryInfo?.id,
        galleryName: galleryInfo?.name,
        galleryOwnerId: userId,
        status: 'pending', // pending, accepted, rejected, cancelled
        createdAt: firestore.FieldValue.serverTimestamp(),
        startDate: firestore.Timestamp.fromDate(proposal.startDate),
        endDate: firestore.Timestamp.fromDate(proposal.endDate),
      };

      const docRef = await firestore()
        .collection('proposals')
        .add(proposalData);

      // 아티스트에게 알림 생성
      await firestore()
        .collection('notifications')
        .add({
          userId: artistId,
          type: 'proposal',
          title: '새로운 전시 제안',
          message: `${galleryInfo?.name}에서 전시를 제안했습니다.`,
          proposalId: docRef.id,
          read: false,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert(
        '성공',
        '전시 제안이 전송되었습니다.',
        [{ text: '확인', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('제안 전송 실패:', error);
      Alert.alert('오류', '제안 전송에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>전시 제안서</Text>
        <TouchableOpacity onPress={sendProposal}>
          <Text style={styles.sendButton}>전송</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recipientSection}>
        <Text style={styles.recipientLabel}>받는 사람</Text>
        <Text style={styles.recipientName}>{artistName}</Text>
      </View>

      {galleryInfo && (
        <View style={styles.gallerySection}>
          <Text style={styles.sectionTitle}>갤러리 정보</Text>
          <Text style={styles.galleryName}>{galleryInfo.name}</Text>
          <Text style={styles.galleryAddress}>{galleryInfo.address}</Text>
        </View>
      )}

      <View style={styles.inputSection}>
        <Text style={styles.label}>전시 제목 *</Text>
        <TextInput
          style={styles.input}
          value={proposal.title}
          onChangeText={(text) => setProposal(prev => ({ ...prev, title: text }))}
          placeholder="전시 제목을 입력하세요"
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>전시 소개 *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={proposal.description}
          onChangeText={(text) => setProposal(prev => ({ ...prev, description: text }))}
          placeholder="전시 기획 의도와 컨셉을 설명해주세요"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.dateSection}>
        <View style={styles.dateInput}>
          <Text style={styles.label}>시작일</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowStartDate(true)}
          >
            <Icon name="event" size={20} color="#666" />
            <Text style={styles.dateText}>{formatDate(proposal.startDate)}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dateInput}>
          <Text style={styles.label}>종료일</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowEndDate(true)}
          >
            <Icon name="event" size={20} color="#666" />
            <Text style={styles.dateText}>{formatDate(proposal.endDate)}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showStartDate && (
        <DateTimePicker
          value={proposal.startDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartDate(false);
            if (date) {
              setProposal(prev => ({ ...prev, startDate: date }));
            }
          }}
        />
      )}

      {showEndDate && (
        <DateTimePicker
          value={proposal.endDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndDate(false);
            if (date) {
              setProposal(prev => ({ ...prev, endDate: date }));
            }
          }}
        />
      )}

      <View style={styles.inputSection}>
        <Text style={styles.label}>판매 수수료 (%)</Text>
        <TextInput
          style={styles.input}
          value={proposal.commission}
          onChangeText={(text) => setProposal(prev => ({ ...prev, commission: text }))}
          placeholder="예: 30"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>지원 사항</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={proposal.supportDetails}
          onChangeText={(text) => setProposal(prev => ({ ...prev, supportDetails: text }))}
          placeholder="전시 공간, 홍보, 오프닝 행사 등 지원 내용"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>요구 사항</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={proposal.requirements}
          onChangeText={(text) => setProposal(prev => ({ ...prev, requirements: text }))}
          placeholder="작품 수량, 크기 제한 등"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.label}>추가 메시지</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={proposal.message}
          onChangeText={(text) => setProposal(prev => ({ ...prev, message: text }))}
          placeholder="아티스트에게 전하고 싶은 메시지"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.noticeSection}>
        <Icon name="info-outline" size={20} color="#999" />
        <Text style={styles.noticeText}>
          전시 제안서는 아티스트에게 직접 전달되며, 
          수락 여부는 아티스트가 결정합니다.
        </Text>
      </View>

      <View style={{ height: 50 }} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sendButton: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recipientSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recipientLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  gallerySection: {
    padding: 16,
    backgroundColor: '#fafafa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  galleryName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  galleryAddress: {
    fontSize: 14,
    color: '#666',
  },
  inputSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  dateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  noticeSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  noticeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});

export default ExhibitionProposalScreen;