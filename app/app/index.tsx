import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "bold" }}>TreeVision</Text>
      <Text>Coimbatore / Tamil Nadu tree identification (offline-first).</Text>
      <Link href="/identify" style={{ fontSize: 18, color: "green" }}>
        Identify a tree
      </Link>
      <Link href="/library" style={{ fontSize: 18, color: "green" }}>
        Tree library (50 species)
      </Link>
    </View>
  );
}
