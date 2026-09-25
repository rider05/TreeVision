import { Link, useLocalSearchParams } from "expo-router";
import { Image, Text, View } from "react-native";
import { getTree, type Prediction } from "../src/services/inference";

export default function Result() {
  const { uri, json } = useLocalSearchParams<{ uri: string; json: string }>();
  const p = JSON.parse(json as string) as Prediction;
  const info = getTree(p.speciesId);

  return (
    <View style={{ flex: 1, padding: 24, gap: 8 }}>
      {uri ? <Image source={{ uri }} style={{ width: "100%", height: 240 }} /> : null}
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>{p.commonName}</Text>
      <Text style={{ fontStyle: "italic" }}>{p.scientificName}</Text>
      <Text>Confidence: {(p.confidence * 100).toFixed(1)}% ({p.engine}, {p.latencyMs}ms)</Text>
      {p.needsMoreEvidence && (
        <Text style={{ color: "orange" }}>
          Low confidence — photograph the bark or whole tree for more evidence.
        </Text>
      )}
      <Text style={{ marginTop: 8, fontWeight: "bold" }}>Alternatives:</Text>
      {p.alternatives.map((a) => (
        <Text key={a.speciesId}>
          {a.commonName} — {(a.confidence * 100).toFixed(1)}%
        </Text>
      ))}
      {info && (
        <Text style={{ marginTop: 8 }}>
          {info.family} · {info.region} · {info.fieldImages} field images
        </Text>
      )}
      <Link href="/library" style={{ marginTop: 12, color: "green" }}>
        Back to library
      </Link>
    </View>
  );
}
