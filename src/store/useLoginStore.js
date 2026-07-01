// src/store/useLoginStore.js
import { create } from "zustand";

const useLoginStore = create((set) => ({
  userName: null, // 사용자 정보 (null이면 로그인 안 된 상태)
  isLoggedIn: false, // 로그인이 완료되면 true로 변경
  userType: 'user', // 'user', 'owner', 'artist'
  userId: null, // Firebase UID 저장
  
  // actions
  logined: (displayName, userType = 'user', userId = null) =>
    set({
      userName: displayName,
      isLoggedIn: true,
      userType: userType,
      userId: userId,
    }),

  logout: () =>
    set({
      userName: null,
      isLoggedIn: false,
      userType: 'user',
      userId: null,
    }),
}));

export default useLoginStore;