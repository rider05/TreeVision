// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Bundle ML model binaries as assets so they can be loaded at runtime
// with expo-asset:
//   - .onnx  -> ONNX models (loaded by onnxruntime-react-native)
//   - .data  -> ONNX external-data sidecar (mobilenetv3_41.onnx.data)
//   - .pt    -> TorchScript checkpoints (kept for future use)
config.resolver.assetExts.push('onnx', 'pt', 'data');

module.exports = config;
