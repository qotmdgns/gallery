/**
 * Firestore 서비스 메인 엔트리 포인트
 *
 * 모든 Firestore 관련 기능을 한 곳에서 export합니다.
 */

// 메인 매니저
export { default as firestoreManager } from './FirestoreManager';

// 스키마 및 상수
export * from './schemas';

// 시드 데이터
export * from './seedData';

// 마이그레이션
export * from './migrations';

// 헬퍼 함수들
export * from './helpers';

// 기본 export
import firestoreManager from './FirestoreManager';
export default firestoreManager;