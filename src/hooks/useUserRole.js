// src/hooks/useUserRole.js
import { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const useUserRole = () => {
  const [userRole, setUserRole] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ownerData, setOwnerData] = useState(null);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const currentUser = auth().currentUser;
        
        if (!currentUser) {
          setUserRole(null);
          setIsOwner(false);
          setLoading(false);
          return;
        }

        // 사용자 정보 가져오기
        const userDoc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();

        if (userDoc.exists) {
          const userData = userDoc.data();
          const userType = userData.userType || 'user';
          
          setUserRole(userType);
          setIsOwner(userType === 'owner');
          
          // 갤러리 운영자인 경우 추가 정보 확인
          if (userType === 'owner') {
            setIsVerified(userData.isVerified || false);
            
            // 운영자 상세 정보 가져오기
            const ownerDoc = await firestore()
              .collection('gallery_owners')
              .doc(currentUser.uid)
              .get();
              
            if (ownerDoc.exists) {
              setOwnerData(ownerDoc.data());
            }
          }
        }
      } catch (error) {
        console.error('사용자 권한 확인 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth().onAuthStateChanged(() => {
      checkUserRole();
    });

    return () => unsubscribe();
  }, []);

  return {
    userRole,
    isOwner,
    isVerified,
    loading,
    ownerData,
  };
};

export default useUserRole;