// src/utils/firebaseHelpers.js
import firestore from '@react-native-firebase/firestore';

// Station 데이터 읽기
export const readStationData = async () => {
  try {
    const querySnapshot = await firestore()
      .collection('Station')
      .get();
    
    const stations = [];
    querySnapshot.forEach((doc) => {
      stations.push({ 
        id: doc.id, 
        ...doc.data() 
      });
    });
    
    return stations;
  } catch (error) {
    console.error('Station 데이터 읽기 오류:', error);
    throw error;
  }
};

// 갤러리 데이터 읽기
export const readGalleryData = async () => {
  try {
    const querySnapshot = await firestore()
      .collection('galleries')
      .get();
    
    const galleries = [];
    querySnapshot.forEach((doc) => {
      galleries.push({ 
        id: doc.id, 
        ...doc.data() 
      });
    });
    
    return galleries;
  } catch (error) {
    console.error('갤러리 데이터 읽기 오류:', error);
    throw error;
  }
};

// 특정 컬렉션의 모든 문서 읽기
export const readCollection = async (collectionName) => {
  try {
    const querySnapshot = await firestore()
      .collection(collectionName)
      .get();
    
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ 
        id: doc.id, 
        ...doc.data() 
      });
    });
    
    return data;
  } catch (error) {
    console.error(`${collectionName} 데이터 읽기 오류:`, error);
    throw error;
  }
};