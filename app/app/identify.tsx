import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { Button, Image, Text, View } from "react-native";
import { predictTree } from "../src/services/inference";

export default function Identify() {
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (camera: boolean) => {
    const fn = camera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;
    const res = await fn({ quality: 0.8 });
    if (!res.canceled) setUri(res.assets[0].uri);
  };

  const run = async () => {
    if (!uri) return;
    setBusy(true);
    try {
      const p = await predictTree(uri);
      router.push({
        pathname: "/result",
        params: { uri, json: JSON.stringify(p) },
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, gap: 12, justifyContent: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Identify tree</Text>
      <Button title="Take photo" onPress={() => pick(true)} />
      <Button title="Choose from gallery" onPress={() => pick(false)} />
      {uri && <Image source={{ uri }} style={{ width: "100%", height: 300 }} />}
      {uri && <Button title={busy ? "Identifying..." : "Identify"} disabled={busy} onPress={run} />}
    </View>
  );
}
