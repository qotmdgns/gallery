/**
 * Firestore 마이그레이션 관리
 *
 * 데이터베이스 스키마 변경 시 기존 데이터를 새 스키마에 맞게
 * 마이그레이션하는 함수들을 제공합니다.
 */

import firestoreManager from './FirestoreManager';
import { SCHEMAS } from './schemas';
import firestore from '@react-native-firebase/firestore';

/**
 * 마이그레이션 로그 저장
 */
async function logMigration(name, status, details = {}) {
  try {
    await firestoreManager.create('_migrations', {
      name,
      status,
      details,
      executedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log migration:', error);
  }
}

/**
 * 마이그레이션 실행 여부 확인
 */
async function isMigrationExecuted(name) {
  try {
    const migrations = await firestoreManager.query('_migrations', [
      { field: 'name', operator: '==', value: name },
      { field: 'status', operator: '==', value: 'completed' },
    ]);
    return migrations.length > 0;
  } catch (error) {
    console.error('Failed to check migration status:', error);
    return false;
  }
}

/**
 * 마이그레이션 정의
 */
export const migrations = {
  /**
   * 예제: 사용자 프로필에 새 필드 추가
   */
  '001_add_user_preferences': {
    description: 'Add preferences field to user profiles',
    up: async () => {
      const users = await firestoreManager.query('users', []);

      await firestoreManager.batch(async (batch) => {
        users.forEach(user => {
          if (!user.preferences) {
            batch.update('users', user.id, {
              preferences: {
                language: 'ko',
                currency: 'KRW',
                notifications: true,
              },
            });
          }
        });
      });

      console.log(`Updated ${users.length} user profiles`);
    },
    down: async () => {
      const users = await firestoreManager.query('users', []);

      await firestoreManager.batch(async (batch) => {
        users.forEach(user => {
          const { preferences, ...userData } = user;
          batch.update('users', user.id, userData);
        });
      });
    },
  },

  /**
   * 예제: 갤러리 평점 재계산
   */
  '002_recalculate_gallery_ratings': {
    description: 'Recalculate gallery ratings based on reviews',
    up: async () => {
      const galleries = await firestoreManager.query('galleries', []);

      for (const gallery of galleries) {
        const reviews = await firestoreManager.query('reviews', [
          { field: 'galleryId', operator: '==', value: gallery.id },
        ]);

        if (reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = totalRating / reviews.length;

          await firestoreManager.update('galleries', gallery.id, {
            rating: Math.round(averageRating * 10) / 10,
            reviewCount: reviews.length,
          });
        }
      }

      console.log(`Updated ratings for ${galleries.length} galleries`);
    },
    down: async () => {
      // 롤백 불필요 (계산된 값)
    },
  },

  /**
   * 예제: 채팅방 구조 업데이트
   */
  '003_update_chatroom_structure': {
    description: 'Add userType field to existing chat rooms',
    up: async () => {
      const chatRooms = await firestoreManager.query('chatRooms', []);

      await firestoreManager.batch(async (batch) => {
        for (const room of chatRooms) {
          if (!room.userType) {
            // 사용자 정보 가져오기
            const user = await firestoreManager.read('users', room.userId);

            batch.update('chatRooms', room.id, {
              userType: user.userType || 'user',
            });
          }
        }
      });

      console.log(`Updated ${chatRooms.length} chat rooms`);
    },
    down: async () => {
      const chatRooms = await firestoreManager.query('chatRooms', []);

      await firestoreManager.batch(async (batch) => {
        chatRooms.forEach(room => {
          const { userType, ...roomData } = room;
          batch.update('chatRooms', room.id, roomData);
        });
      });
    },
  },

  /**
   * 예제: 예약 상태 정규화
   */
  '004_normalize_reservation_status': {
    description: 'Normalize reservation status values',
    up: async () => {
      const reservations = await firestoreManager.query('reservations', []);
      const statusMap = {
        'PENDING': 'pending',
        'CONFIRMED': 'confirmed',
        'CANCELLED': 'cancelled',
        'COMPLETED': 'completed',
        '대기중': 'pending',
        '확정': 'confirmed',
        '취소': 'cancelled',
        '완료': 'completed',
      };

      await firestoreManager.batch(async (batch) => {
        reservations.forEach(reservation => {
          const normalizedStatus = statusMap[reservation.status] || reservation.status;

          if (normalizedStatus !== reservation.status) {
            batch.update('reservations', reservation.id, {
              status: normalizedStatus,
            });
          }
        });
      });

      console.log(`Normalized status for ${reservations.length} reservations`);
    },
    down: async () => {
      // 롤백 불필요
    },
  },

  /**
   * 예제: 중복 데이터 제거
   */
  '005_remove_duplicate_reviews': {
    description: 'Remove duplicate reviews from same user for same gallery',
    up: async () => {
      const reviews = await firestoreManager.query('reviews', [], {
        orderBy: ['createdAt', 'desc'],
      });

      const seen = new Set();
      const duplicates = [];

      for (const review of reviews) {
        const key = `${review.userId}_${review.galleryId}`;

        if (seen.has(key)) {
          duplicates.push(review.id);
        } else {
          seen.add(key);
        }
      }

      if (duplicates.length > 0) {
        await firestoreManager.batch(async (batch) => {
          duplicates.forEach(id => {
            batch.delete('reviews', id);
          });
        });
      }

      console.log(`Removed ${duplicates.length} duplicate reviews`);
    },
    down: async () => {
      // 롤백 불가능 (데이터 삭제)
    },
  },

  /**
   * 예제: 타임스탬프 필드 추가
   */
  '006_add_timestamps': {
    description: 'Add missing timestamp fields',
    up: async () => {
      const collections = ['users', 'galleries', 'artists', 'portfolio'];

      for (const collection of collections) {
        const docs = await firestoreManager.query(collection, []);

        await firestoreManager.batch(async (batch) => {
          docs.forEach(doc => {
            const updates = {};

            if (!doc.createdAt) {
              updates.createdAt = firestore.FieldValue.serverTimestamp();
            }
            if (!doc.updatedAt) {
              updates.updatedAt = firestore.FieldValue.serverTimestamp();
            }

            if (Object.keys(updates).length > 0) {
              batch.update(collection, doc.id, updates);
            }
          });
        });

        console.log(`Added timestamps to ${docs.length} documents in ${collection}`);
      }
    },
    down: async () => {
      // 롤백 불필요
    },
  },

  /**
   * 예제: 데이터 형식 변환
   */
  '007_convert_price_to_number': {
    description: 'Convert price fields from string to number',
    up: async () => {
      const galleries = await firestoreManager.query('galleries', []);

      await firestoreManager.batch(async (batch) => {
        galleries.forEach(gallery => {
          if (typeof gallery.price === 'string') {
            const numericPrice = parseInt(gallery.price.replace(/[^0-9]/g, ''), 10);

            batch.update('galleries', gallery.id, {
              price: isNaN(numericPrice) ? 0 : numericPrice,
            });
          }
        });
      });

      console.log(`Converted prices for ${galleries.length} galleries`);
    },
    down: async () => {
      // 롤백 불필요
    },
  },

  /**
   * 예제: 인덱스 필드 추가
   */
  '008_add_search_indexes': {
    description: 'Add search index fields for better querying',
    up: async () => {
      const galleries = await firestoreManager.query('galleries', []);

      await firestoreManager.batch(async (batch) => {
        galleries.forEach(gallery => {
          const searchTerms = [
            gallery.galleryName.toLowerCase(),
            gallery.location.toLowerCase(),
            ...(gallery.categories || []).map(c => c.toLowerCase()),
          ];

          batch.update('galleries', gallery.id, {
            searchIndex: searchTerms,
          });
        });
      });

      console.log(`Added search indexes to ${galleries.length} galleries`);
    },
    down: async () => {
      const galleries = await firestoreManager.query('galleries', []);

      await firestoreManager.batch(async (batch) => {
        galleries.forEach(gallery => {
          const { searchIndex, ...galleryData } = gallery;
          batch.update('galleries', gallery.id, galleryData);
        });
      });
    },
  },
};

/**
 * 모든 마이그레이션 실행
 */
export async function runAllMigrations() {
  console.log('Starting migrations...\n');

  for (const [name, migration] of Object.entries(migrations)) {
    if (await isMigrationExecuted(name)) {
      console.log(`⏭️  Skipping ${name} (already executed)`);
      continue;
    }

    console.log(`▶️  Running ${name}: ${migration.description}`);

    try {
      await logMigration(name, 'started');
      await migration.up();
      await logMigration(name, 'completed');
      console.log(`✅ ${name} completed successfully\n`);
    } catch (error) {
      await logMigration(name, 'failed', { error: error.message });
      console.error(`❌ ${name} failed:`, error);
      throw error;
    }
  }

  console.log('All migrations completed successfully!');
}

/**
 * 특정 마이그레이션 실행
 */
export async function runMigration(name) {
  const migration = migrations[name];

  if (!migration) {
    throw new Error(`Migration ${name} not found`);
  }

  if (await isMigrationExecuted(name)) {
    console.log(`Migration ${name} already executed`);
    return;
  }

  console.log(`Running migration ${name}: ${migration.description}`);

  try {
    await logMigration(name, 'started');
    await migration.up();
    await logMigration(name, 'completed');
    console.log(`Migration ${name} completed successfully`);
  } catch (error) {
    await logMigration(name, 'failed', { error: error.message });
    console.error(`Migration ${name} failed:`, error);
    throw error;
  }
}

/**
 * 마이그레이션 롤백
 */
export async function rollbackMigration(name) {
  const migration = migrations[name];

  if (!migration) {
    throw new Error(`Migration ${name} not found`);
  }

  if (!migration.down) {
    console.log(`Migration ${name} cannot be rolled back`);
    return;
  }

  console.log(`Rolling back migration ${name}`);

  try {
    await migration.down();
    await logMigration(name, 'rolled_back');
    console.log(`Migration ${name} rolled back successfully`);
  } catch (error) {
    await logMigration(name, 'rollback_failed', { error: error.message });
    console.error(`Rollback of ${name} failed:`, error);
    throw error;
  }
}

/**
 * 마이그레이션 상태 확인
 */
export async function getMigrationStatus() {
  const status = {};

  for (const name of Object.keys(migrations)) {
    status[name] = await isMigrationExecuted(name);
  }

  return status;
}

/**
 * 데이터베이스 상태 검증
 */
export async function validateDatabase() {
  console.log('Validating database schema...\n');
  const issues = [];

  for (const [collectionName, schema] of Object.entries(SCHEMAS)) {
    console.log(`Checking ${collectionName}...`);

    try {
      // 샘플 문서 가져오기
      const docs = await firestoreManager.query(collectionName, [], { limit: 10 });

      if (docs.length === 0) {
        console.log(`  ⚠️  No documents in ${collectionName}`);
        continue;
      }

      // 스키마 검증
      for (const doc of docs) {
        const requiredFields = Object.entries(schema.fields)
          .filter(([, field]) => field.required)
          .map(([name]) => name);

        for (const field of requiredFields) {
          if (!(field in doc) || doc[field] === undefined) {
            issues.push({
              collection: collectionName,
              document: doc.id,
              issue: `Missing required field: ${field}`,
            });
          }
        }
      }

      console.log(`  ✅ ${collectionName} validated`);
    } catch (error) {
      console.log(`  ❌ Error validating ${collectionName}:`, error.message);
      issues.push({
        collection: collectionName,
        issue: error.message,
      });
    }
  }

  if (issues.length > 0) {
    console.log('\n⚠️  Validation issues found:');
    issues.forEach(issue => {
      console.log(`  - ${issue.collection}: ${issue.issue}`);
    });
  } else {
    console.log('\n✅ Database validation completed successfully!');
  }

  return issues;
}