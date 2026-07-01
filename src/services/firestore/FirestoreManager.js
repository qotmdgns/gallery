/**
 * FirestoreManager - Firestore 데이터베이스 관리 클래스
 *
 * 모든 Firestore 작업을 중앙에서 관리하는 매니저 클래스입니다.
 * CRUD 작업, 트랜잭션, 배치 작업, 실시간 리스너 등을 제공합니다.
 */

import firestore from '@react-native-firebase/firestore';
import { SCHEMAS, COLLECTIONS } from './schemas';

class FirestoreManager {
  constructor() {
    this.db = firestore();
    this.listeners = new Map(); // 실시간 리스너 관리
    this.cache = new Map(); // 간단한 캐시 구현
    this.cacheTimeout = 5 * 60 * 1000; // 5분
  }

  /**
   * 문서 생성
   * @param {string} collection - 컬렉션 이름
   * @param {Object} data - 문서 데이터
   * @param {string} documentId - 선택적 문서 ID
   * @returns {Promise<Object>} 생성된 문서 정보
   */
  async create(collection, data, documentId = null) {
    try {
      // 스키마 유효성 검사
      this.validateSchema(collection, data);

      // 타임스탬프 추가
      const timestamp = firestore.FieldValue.serverTimestamp();
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      let docRef;
      if (documentId) {
        docRef = this.db.collection(collection).doc(documentId);
        await docRef.set(documentData);
      } else {
        docRef = await this.db.collection(collection).add(documentData);
      }

      // 캐시 무효화
      this.invalidateCache(collection);

      return {
        id: docRef.id,
        ...documentData,
      };
    } catch (error) {
      console.error(`Error creating document in ${collection}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 문서 읽기
   * @param {string} collection - 컬렉션 이름
   * @param {string} documentId - 문서 ID
   * @param {boolean} useCache - 캐시 사용 여부
   * @returns {Promise<Object>} 문서 데이터
   */
  async read(collection, documentId, useCache = true) {
    try {
      // 캐시 확인
      const cacheKey = `${collection}/${documentId}`;
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const doc = await this.db.collection(collection).doc(documentId).get();

      if (!doc.exists) {
        throw new Error(`Document ${documentId} not found in ${collection}`);
      }

      const data = {
        id: doc.id,
        ...doc.data(),
      };

      // 캐시 저장
      if (useCache) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
      }

      return data;
    } catch (error) {
      console.error(`Error reading document from ${collection}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 문서 업데이트
   * @param {string} collection - 컬렉션 이름
   * @param {string} documentId - 문서 ID
   * @param {Object} data - 업데이트할 데이터
   * @param {boolean} merge - 병합 여부
   * @returns {Promise<void>}
   */
  async update(collection, documentId, data, merge = true) {
    try {
      // 스키마 유효성 검사 (부분 업데이트 허용)
      this.validateSchema(collection, data, true);

      const updateData = {
        ...data,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      const docRef = this.db.collection(collection).doc(documentId);

      if (merge) {
        await docRef.set(updateData, { merge: true });
      } else {
        await docRef.update(updateData);
      }

      // 캐시 무효화
      this.invalidateCache(collection, documentId);
    } catch (error) {
      console.error(`Error updating document in ${collection}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 문서 삭제
   * @param {string} collection - 컬렉션 이름
   * @param {string} documentId - 문서 ID
   * @returns {Promise<void>}
   */
  async delete(collection, documentId) {
    try {
      await this.db.collection(collection).doc(documentId).delete();

      // 캐시 무효화
      this.invalidateCache(collection, documentId);
    } catch (error) {
      console.error(`Error deleting document from ${collection}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 쿼리 실행
   * @param {string} collection - 컬렉션 이름
   * @param {Array} conditions - 쿼리 조건 배열
   * @param {Object} options - 추가 옵션 (orderBy, limit 등)
   * @returns {Promise<Array>} 문서 배열
   */
  async query(collection, conditions = [], options = {}) {
    try {
      let query = this.db.collection(collection);

      // Where 조건 적용
      conditions.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });

      // 정렬 적용
      if (options.orderBy) {
        const orders = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
        orders.forEach(order => {
          const [field, direction = 'asc'] = Array.isArray(order) ? order : [order, 'asc'];
          query = query.orderBy(field, direction);
        });
      }

      // 제한 적용
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // 시작 위치 적용 (페이지네이션)
      if (options.startAfter) {
        query = query.startAfter(options.startAfter);
      }

      const snapshot = await query.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error(`Error querying ${collection}:`, error);

      // 인덱스 오류 처리
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('Index required. Falling back to client-side filtering.');
        return this.queryWithoutIndex(collection, conditions, options);
      }

      throw this.handleError(error);
    }
  }

  /**
   * 인덱스 없이 쿼리 (클라이언트 사이드 필터링)
   */
  async queryWithoutIndex(collection, conditions = [], options = {}) {
    try {
      // 기본 쿼리 실행
      let query = this.db.collection(collection);

      // 가능한 Where 조건만 적용
      const simpleConditions = conditions.filter(c => c.operator === '==');
      simpleConditions.forEach(({ field, value }) => {
        query = query.where(field, '==', value);
      });

      const snapshot = await query.get();
      let results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 클라이언트 사이드 필터링
      const complexConditions = conditions.filter(c => c.operator !== '==');
      complexConditions.forEach(({ field, operator, value }) => {
        results = results.filter(doc => {
          const fieldValue = this.getFieldValue(doc, field);
          return this.evaluateCondition(fieldValue, operator, value);
        });
      });

      // 클라이언트 사이드 정렬
      if (options.orderBy) {
        const orders = Array.isArray(options.orderBy) ? options.orderBy : [options.orderBy];
        results.sort((a, b) => {
          for (const order of orders) {
            const [field, direction = 'asc'] = Array.isArray(order) ? order : [order, 'asc'];
            const aVal = this.getFieldValue(a, field);
            const bVal = this.getFieldValue(b, field);

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }

      // 제한 적용
      if (options.limit) {
        results = results.slice(0, options.limit);
      }

      return results;
    } catch (error) {
      console.error(`Error in fallback query for ${collection}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 배치 작업 실행
   * @param {Function} operations - 배치 작업을 정의하는 함수
   * @returns {Promise<void>}
   */
  async batch(operations) {
    const batch = this.db.batch();

    try {
      // 배치 작업 헬퍼 객체
      const batchHelper = {
        create: (collection, data, documentId = null) => {
          const docRef = documentId
            ? this.db.collection(collection).doc(documentId)
            : this.db.collection(collection).doc();

          batch.set(docRef, {
            ...data,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });

          return docRef;
        },

        update: (collection, documentId, data) => {
          const docRef = this.db.collection(collection).doc(documentId);
          batch.update(docRef, {
            ...data,
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        },

        delete: (collection, documentId) => {
          const docRef = this.db.collection(collection).doc(documentId);
          batch.delete(docRef);
        },
      };

      // 사용자 정의 작업 실행
      await operations(batchHelper);

      // 배치 커밋
      await batch.commit();

      // 캐시 전체 무효화
      this.cache.clear();
    } catch (error) {
      console.error('Error in batch operation:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 트랜잭션 실행
   * @param {Function} transaction - 트랜잭션 함수
   * @returns {Promise<any>} 트랜잭션 결과
   */
  async transaction(transaction) {
    try {
      return await this.db.runTransaction(async (t) => {
        const transactionHelper = {
          get: (collection, documentId) => {
            const docRef = this.db.collection(collection).doc(documentId);
            return t.get(docRef);
          },

          create: (collection, data, documentId = null) => {
            const docRef = documentId
              ? this.db.collection(collection).doc(documentId)
              : this.db.collection(collection).doc();

            t.set(docRef, {
              ...data,
              createdAt: firestore.FieldValue.serverTimestamp(),
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });

            return docRef;
          },

          update: (collection, documentId, data) => {
            const docRef = this.db.collection(collection).doc(documentId);
            t.update(docRef, {
              ...data,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
          },

          delete: (collection, documentId) => {
            const docRef = this.db.collection(collection).doc(documentId);
            t.delete(docRef);
          },
        };

        return await transaction(transactionHelper);
      });
    } catch (error) {
      console.error('Error in transaction:', error);
      throw this.handleError(error);
    }
  }

  /**
   * 실시간 리스너 등록
   * @param {string} collection - 컬렉션 이름
   * @param {string} listenerId - 리스너 ID
   * @param {Function} callback - 변경 콜백
   * @param {Object} options - 리스너 옵션
   * @returns {Function} 구독 해제 함수
   */
  subscribe(collection, listenerId, callback, options = {}) {
    try {
      // 기존 리스너 해제
      this.unsubscribe(listenerId);

      let query = this.db.collection(collection);

      // 문서 ID 지정
      if (options.documentId) {
        const unsubscribe = query.doc(options.documentId).onSnapshot(
          (doc) => {
            if (doc.exists) {
              callback({
                type: 'modified',
                data: {
                  id: doc.id,
                  ...doc.data(),
                },
              });
            } else {
              callback({
                type: 'removed',
                data: { id: doc.id },
              });
            }
          },
          (error) => {
            console.error(`Listener error for ${listenerId}:`, error);
            callback({ type: 'error', error });
          }
        );

        this.listeners.set(listenerId, unsubscribe);
        return unsubscribe;
      }

      // 쿼리 조건 적용
      if (options.conditions) {
        options.conditions.forEach(({ field, operator, value }) => {
          query = query.where(field, operator, value);
        });
      }

      // 정렬 적용
      if (options.orderBy) {
        const [field, direction = 'asc'] = Array.isArray(options.orderBy)
          ? options.orderBy
          : [options.orderBy, 'asc'];
        query = query.orderBy(field, direction);
      }

      // 제한 적용
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // 리스너 등록
      const unsubscribe = query.onSnapshot(
        (snapshot) => {
          const changes = [];

          snapshot.docChanges().forEach((change) => {
            const data = {
              id: change.doc.id,
              ...change.doc.data(),
            };

            changes.push({
              type: change.type,
              data,
            });
          });

          callback({
            type: 'changes',
            changes,
            docs: snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })),
          });
        },
        (error) => {
          console.error(`Listener error for ${listenerId}:`, error);

          // 인덱스 오류 처리
          if (error.code === 'failed-precondition') {
            console.log('Index required for listener. Please create the index.');
          }

          callback({ type: 'error', error });
        }
      );

      this.listeners.set(listenerId, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error(`Error setting up listener ${listenerId}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 리스너 해제
   * @param {string} listenerId - 리스너 ID
   */
  unsubscribe(listenerId) {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
    }
  }

  /**
   * 모든 리스너 해제
   */
  unsubscribeAll() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  /**
   * 스키마 유효성 검사
   */
  validateSchema(collection, data, partial = false) {
    const schema = SCHEMAS[collection];
    if (!schema) {
      console.warn(`No schema defined for collection: ${collection}`);
      return true;
    }

    const fields = schema.fields;

    // 필수 필드 검사 (부분 업데이트가 아닌 경우)
    if (!partial) {
      for (const [fieldName, fieldSchema] of Object.entries(fields)) {
        if (fieldSchema.required && !(fieldName in data)) {
          throw new Error(`Required field '${fieldName}' is missing in ${collection}`);
        }
      }
    }

    // 타입 검사
    for (const [fieldName, value] of Object.entries(data)) {
      const fieldSchema = fields[fieldName];
      if (!fieldSchema) {
        console.warn(`Unknown field '${fieldName}' in ${collection}`);
        continue;
      }

      // 타입 체크
      if (!this.validateFieldType(value, fieldSchema)) {
        throw new Error(
          `Invalid type for field '${fieldName}' in ${collection}. Expected ${fieldSchema.type}`
        );
      }

      // enum 체크
      if (fieldSchema.values && !fieldSchema.values.includes(value)) {
        throw new Error(
          `Invalid value for field '${fieldName}' in ${collection}. Must be one of: ${fieldSchema.values.join(', ')}`
        );
      }

      // min/max 체크
      if (fieldSchema.min !== undefined && value < fieldSchema.min) {
        throw new Error(
          `Value for field '${fieldName}' is below minimum (${fieldSchema.min})`
        );
      }
      if (fieldSchema.max !== undefined && value > fieldSchema.max) {
        throw new Error(
          `Value for field '${fieldName}' exceeds maximum (${fieldSchema.max})`
        );
      }
    }

    return true;
  }

  /**
   * 필드 타입 유효성 검사
   */
  validateFieldType(value, fieldSchema) {
    if (value === null || value === undefined) {
      return !fieldSchema.required;
    }

    switch (fieldSchema.type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'timestamp':
        return value instanceof Date ||
               value?.toDate instanceof Function ||
               value === firestore.FieldValue.serverTimestamp();
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      case 'enum':
        return fieldSchema.values?.includes(value);
      default:
        return true;
    }
  }

  /**
   * 중첩된 필드 값 가져오기
   */
  getFieldValue(doc, field) {
    const fields = field.split('.');
    let value = doc;

    for (const f of fields) {
      value = value?.[f];
      if (value === undefined) break;
    }

    return value;
  }

  /**
   * 조건 평가
   */
  evaluateCondition(fieldValue, operator, value) {
    switch (operator) {
      case '==':
        return fieldValue === value;
      case '!=':
        return fieldValue !== value;
      case '<':
        return fieldValue < value;
      case '<=':
        return fieldValue <= value;
      case '>':
        return fieldValue > value;
      case '>=':
        return fieldValue >= value;
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not-in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'array-contains':
        return Array.isArray(fieldValue) && fieldValue.includes(value);
      case 'array-contains-any':
        return Array.isArray(fieldValue) &&
               Array.isArray(value) &&
               value.some(v => fieldValue.includes(v));
      default:
        return false;
    }
  }

  /**
   * 캐시 무효화
   */
  invalidateCache(collection, documentId = null) {
    if (documentId) {
      this.cache.delete(`${collection}/${documentId}`);
    } else {
      // 컬렉션 전체 캐시 무효화
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${collection}/`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * 에러 처리
   */
  handleError(error) {
    const errorMessage = error.message || 'Unknown error occurred';
    const errorCode = error.code || 'unknown';

    return {
      code: errorCode,
      message: errorMessage,
      originalError: error,
    };
  }

  /**
   * 컬렉션 통계 가져오기
   */
  async getCollectionStats(collection) {
    try {
      const snapshot = await this.db.collection(collection).get();
      return {
        count: snapshot.size,
        empty: snapshot.empty,
      };
    } catch (error) {
      console.error(`Error getting stats for ${collection}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 컬렉션 초기화 (위험: 개발 환경에서만 사용)
   */
  async clearCollection(collection) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear collection in production environment');
    }

    try {
      const batch = this.db.batch();
      const snapshot = await this.db.collection(collection).get();

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      this.invalidateCache(collection);

      console.log(`Cleared ${snapshot.size} documents from ${collection}`);
    } catch (error) {
      console.error(`Error clearing ${collection}:`, error);
      throw this.handleError(error);
    }
  }
}

// 싱글톤 인스턴스
const firestoreManager = new FirestoreManager();

export default firestoreManager;