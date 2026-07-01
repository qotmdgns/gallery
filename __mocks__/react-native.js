// Mock React Native
import * as ReactNative from 'react-native';

jest.doMock('react-native', () => {
  return Object.setPrototypeOf(
    {
      Platform: {
        OS: 'ios',
        Version: 14,
        select: jest.fn((obj) => obj.ios),
        isTV: false,
        isTesting: true,
      },
      NativeModules: {
        ...ReactNative.NativeModules,
        RNCAsyncStorage: {
          setItem: jest.fn(),
          getItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        RNGestureHandlerModule: {
          attachGestureHandler: jest.fn(),
          createGestureHandler: jest.fn(),
          dropGestureHandler: jest.fn(),
          updateGestureHandler: jest.fn(),
          State: {},
          Directions: {},
        },
      },
      NativeEventEmitter: jest.fn(() => ({
        addListener: jest.fn(),
        removeAllListeners: jest.fn(),
        removeSubscription: jest.fn(),
      })),
      Animated: {
        ...ReactNative.Animated,
        timing: jest.fn(() => ({
          start: jest.fn((cb) => cb && cb()),
          stop: jest.fn(),
        })),
        spring: jest.fn(() => ({
          start: jest.fn((cb) => cb && cb()),
          stop: jest.fn(),
        })),
        Value: jest.fn(() => ({
          setValue: jest.fn(),
          setOffset: jest.fn(),
          flattenOffset: jest.fn(),
          extractOffset: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
          removeAllListeners: jest.fn(),
          stopAnimation: jest.fn(),
          interpolate: jest.fn(),
        })),
        createAnimatedComponent: jest.fn((component) => component),
        View: ReactNative.View,
        Text: ReactNative.Text,
        Image: ReactNative.Image,
      },
    },
    ReactNative,
  );
});

module.exports = ReactNative;