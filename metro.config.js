const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  transformer: {
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      keep_fnames: true,
      mangle: {
        keep_fnames: true,
      },
      compress: {
        drop_console: true,
        reduce_funcs: false,
      },
      output: {
        ascii_only: true,
        quote_style: 3,
        wrap_iife: true,
      },
    },
  },
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return middleware(req, res, next);
      };
    },
  },
  maxWorkers: 4,
  resetCache: false,
  cacheVersion: '1.0',
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
