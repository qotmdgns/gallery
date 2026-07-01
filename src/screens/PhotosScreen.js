// src/screens/PhotosScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useNavigation } from '@react-navigation/native';
import useLoginStore from '../store/useLoginStore';

const PhotosScreen = () => {
  const navigation = useNavigation();
  const isLogined = useLoginStore((state) => state.isLogined);
  
  const [displayList, setDisplayList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getData();
  }, []);

  const getData = async () => {
    try {
      const querySnapshot = await firestore()
        .collection('tourMemo')
        .orderBy('date', 'desc')
        .get();

      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setDisplayList(data);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      Alert.alert('오류', '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    getData();
  };

  const deleteHandle = async (docId, photoURL) => {
    Alert.alert(
      '삭제 확인',
      '정말 이 항목을 삭제하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              // Storage에서 이미지 삭제
              if (photoURL) {
                const imageRef = storage().refFromURL(photoURL);
                await imageRef.delete().catch((error) => {
                  // 이미지 삭제 실패는 에러로만 처리
                });
              }

              // Firestore에서 문서 삭제
              await firestore().collection('tourMemo').doc(docId).delete();

              Alert.alert('성공', '데이터가 제거되었습니다.');
              getData(); // 목록 새로고침
            } catch (error) {
              console.error('삭제 오류:', error);
              Alert.alert('오류', '삭제 중 오류가 발생했습니다.');
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.photoURL && (
        <Image
          source={{ uri: item.photoURL }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.location}</Text>
        <Text style={styles.cardText} numberOfLines={2}>
          {item.comment}
        </Text>
        <Text style={styles.cardDate}>{item.date}</Text>
      </View>

      {isLogined && (
        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.editButton]}
            onPress={() => navigation.navigate('EditGallery', { docId: item.id })}
          >
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => deleteHandle(item.id, item.photoURL)}
          >
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>로딩 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>갤러리 사진</Text>
      <Text style={styles.subHeader}>
        firestore db에 존재하는 각 문서의 필드명: [location, date, comment, photoURL]
      </Text>

      <FlatList
        data={displayList}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
        columnWrapperStyle={styles.row}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>표시할 갤러리가 없습니다.</Text>
          </View>
        }
      />
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
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  subHeader: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listContainer: {
    padding: 10,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    minHeight: 35,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
  },
  buttons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#666',
    borderRightWidth: 1,
    borderRightColor: '#fff',
  },
  deleteButton: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default PhotosScreen;