// Metro asset-module declarations for bundled ML model binaries.
// `require('../../assets/mobilenetv3_41.onnx')` returns a numeric module ID
// that is consumed by `Asset.fromModule(...)` from expo-asset.
declare module '*.onnx';
declare module '*.pt';
declare module '*.data';
