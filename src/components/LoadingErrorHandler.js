import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

// 로딩 컴포넌트
export const LoadingView = ({ message = '로딩 중...' }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#007BFF" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

// 에러 컴포넌트
export const ErrorView = ({ 
  error, 
  onRetry, 
  message = '오류가 발생했습니다.' 
}) => (
  <View style={styles.container}>
    <Icon name="error-outline" size={60} color="#DC3545" />
    <Text style={styles.errorTitle}>{message}</Text>
    {error?.message && (
      <Text style={styles.errorMessage}>{error.message}</Text>
    )}
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Icon name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
    )}
  </View>
);

// 빈 상태 컴포넌트
export const EmptyView = ({ 
  message = '데이터가 없습니다.',
  icon = 'inbox',
  actionText,
  onAction 
}) => (
  <View style={styles.container}>
    <Icon name={icon} size={60} color="#ADB5BD" />
    <Text style={styles.emptyTitle}>{message}</Text>
    {onAction && actionText && (
      <TouchableOpacity style={styles.actionButton} onPress={onAction}>
        <Text style={styles.actionButtonText}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// 오프라인 컴포넌트
export const OfflineView = ({ onRetry }) => (
  <View style={styles.container}>
    <Icon name="wifi-off" size={60} color="#6C757D" />
    <Text style={styles.offlineTitle}>인터넷 연결 없음</Text>
    <Text style={styles.offlineMessage}>
      네트워크 연결을 확인하고 다시 시도해주세요.
    </Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Icon name="refresh" size={20} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>다시 시도</Text>
      </TouchableOpacity>
    )}
  </View>
);

// 커스텀 훅: 로딩/에러 상태 관리
export const useLoadingError = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const executeAsync = React.useCallback(async (asyncFunction) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await asyncFunction();
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = React.useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    executeAsync,
    reset,
    setLoading,
    setError,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6C757D',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 15,
    marginBottom: 5,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 5,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#6C757D',
    marginTop: 15,
    textAlign: 'center',
  },
  actionButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007BFF',
  },
  actionButtonText: {
    color: '#007BFF',
    fontSize: 16,
    fontWeight: '500',
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginTop: 15,
    marginBottom: 5,
  },
  offlineMessage: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default {
  LoadingView,
  ErrorView,
  EmptyView,
  OfflineView,
  useLoadingError,
};