/**
 * react-native.config.js
 *
 * Links the Healthy Media native Android module so that React Native's
 * autolinking picks up HealthyMediaPackage during `npx react-native run-android`.
 *
 * In the Expo managed workflow with dev-client this is supplemented by the
 * withHealthyMedia config plugin (plugins/with-healthy-media.ts) which injects
 * the required AndroidManifest entries at prebuild time.
 */
module.exports = {
  project: {
    android: {},
    ios: {},
  },
  dependencies: {
    'healthy-media-native': {
      root: __dirname,
      platforms: {
        android: {
          sourceDir: './native/android',
          packageImportPath: 'import com.healthymedia.HealthyMediaPackage;',
          packageInstance: 'new HealthyMediaPackage()',
        },
        ios: null,
      },
    },
  },
};
