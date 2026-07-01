import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

// Firebase 설정 최적화
export const configureFirebase = () => {
  // Firestore 오프라인 캐싱 활성화
  firestore().settings({
    persistence: true,
    cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
  });

  // Firestore 네트워크 최적화
  firestore().settings({
    ignoreUndefinedProperties: true,
    merge: true,
  });
};

// 자주 사용하는 쿼리 캐싱
const queryCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

export const getCachedQuery = async (key, queryFn) => {
  const cached = queryCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const data = await queryFn();
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
  });

  return data;
};

// 배치 쓰기 헬퍼
export const batchWrite = async (operations) => {
  const batch = firestore().batch();

  operations.forEach(({ type, ref, data }) => {
    switch (type) {
      case 'set':
        batch.set(ref, data);
        break;
      case 'update':
        batch.update(ref, data);
        break;
      case 'delete':
        batch.delete(ref);
        break;
    }
  });

  return batch.commit();
};

// 이미지 캐싱 및 최적화
export const getOptimizedImageUrl = async (path, options = {}) => {
  const { width = 800, quality = 0.8, cache = true } = options;

  try {
    const ref = storage().ref(path);
    const url = await ref.getDownloadURL();

    // URL에 크기 파라미터 추가 (Firebase Extensions 사용 시)
    if (width) {
      return `${url}?w=${width}&q=${quality}`;
    }

    return url;
  } catch (error) {
    console.error('Image optimization error:', error);
    return null;
  }
};

// 프리페치 헬퍼
export const prefetchData = async (userId) => {
  const promises = [];

  // 사용자 데이터 프리페치
  promises.push(
    firestore()
      .collection('users')
      .doc(userId)
      .get()
  );

  // 최근 예약 프리페치
  promises.push(
    firestore()
      .collection('reservations')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()
  );

  // 즐겨찾기 갤러리 프리페치
  promises.push(
    firestore()
      .collection('users')
      .doc(userId)
      .get()
      .then(doc => {
        const favoriteGalleries = doc.data()?.favoriteGalleries || [];
        if (favoriteGalleries.length > 0) {
          return firestore()
            .collection('galleries')
            .where(firestore.FieldPath.documentId(), 'in', favoriteGalleries.slice(0, 10))
            .get();
        }
        return null;
      })
  );

  try {
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Prefetch error:', error);
  }
};

export default {
  configureFirebase,
  getCachedQuery,
  batchWrite,
  getOptimizedImageUrl,
  prefetchData,
};