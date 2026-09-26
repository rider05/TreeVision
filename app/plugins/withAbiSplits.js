// Expo config plugin: per-ABI APK splits.
//
// Produces one lean APK per architecture (e.g. app-arm64-v8a-debug.apk)
// instead of one fat universal APK, so each device installs only its own
// native libraries. Exists because android/app/build.gradle is regenerated
// on every `expo prebuild` — direct edits there do not survive.
const { withAppBuildGradle } = require('@expo/config-plugins');

const SPLITS_BLOCK = `    splits {
        abi {
            enable true
            reset()
            include "armeabi-v7a", "arm64-v8a", "x86_64"
            universalApk false
        }
    }
`;

function withAbiSplits(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (contents.includes('universalApk false')) {
      return config; // already applied
    }
    const anchor = '    buildTypes {';
    if (!contents.includes(anchor)) {
      throw new Error('withAbiSplits: could not find `buildTypes {` anchor in app/build.gradle');
    }
    config.modResults.contents = contents.replace(anchor, `${SPLITS_BLOCK}${anchor}`);
    return config;
  });
}

module.exports = withAbiSplits;
