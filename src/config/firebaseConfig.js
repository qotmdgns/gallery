// Import the functions you need from the SDKs you need
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

// React Native Firebase는 자동으로 google-services.json (Android)과 
// GoogleService-Info.plist (iOS)를 사용하여 초기화됩니다.
// 따라서 별도의 초기화 코드가 필요하지 않습니다.

// Firebase 서비스 export
export { firestore, auth, storage };
export default {
  auth,
  firestore,
  storage,
};