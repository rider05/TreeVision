// Expo config plugin: manually register onnxruntime's ReactPackage.
//
// Expo's autolinking compiles onnxruntime-react-native but omits its
// ReactPackage from the generated PackageList, so NativeModules.Onnxruntime
// is undefined at runtime and inference always reports "native missing".
// MainApplication.kt is regenerated on every `expo prebuild` — direct edits
// there do not survive — hence this plugin.
const { withMainApplication } = require('@expo/config-plugins');

const IMPORT_LINE = 'import ai.onnxruntime.reactnative.OnnxruntimePackage';
const ADD_LINE = 'add(OnnxruntimePackage())';
const IMPORT_ANCHOR = 'import com.facebook.react.PackageList';
const ADD_ANCHOR = '// add(MyReactNativePackage())';

function withOnnxruntimePackage(config) {
  return withMainApplication(config, (config) => {
    const src = config.modResults.contents;
    if (src.includes(ADD_LINE)) {
      return config; // already applied
    }
    if (!src.includes(IMPORT_ANCHOR)) {
      throw new Error('withOnnxruntimePackage: could not find PackageList import anchor');
    }
    if (!src.includes(ADD_ANCHOR)) {
      throw new Error('withOnnxruntimePackage: could not find manual-package anchor');
    }
    let out = src;
    if (!out.includes(IMPORT_LINE)) {
      out = out.replace(IMPORT_ANCHOR, `${IMPORT_ANCHOR}\n${IMPORT_LINE}`);
    }
    out = out.replace(ADD_ANCHOR, `${ADD_ANCHOR}\n          ${ADD_LINE}`);
    config.modResults.contents = out;
    return config;
  });
}

module.exports = withOnnxruntimePackage;
