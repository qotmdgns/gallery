module.exports = {
  root: true,
  extends: '@react-native',
  ignorePatterns: [
    'android/**/build/**',
    'android/app/.cxx/**',
    'ios/Pods/**',
    'node_modules/**',
  ],
  rules: {
    'react-hooks/exhaustive-deps': 'warn',
  },
};
