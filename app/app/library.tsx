import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { getAllTrees } from "../src/services/inference";

export default function Library() {
  const [q, setQ] = useState("");
  const trees = getAllTrees().filter(
    (t) =>
      t.commonName.toLowerCase().includes(q.toLowerCase()) ||
      t.scientificName.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: "bold" }}>Tree library</Text>
      <TextInput
        placeholder="Search species..."
        value={q}
        onChangeText={setQ}
        style={{ borderWidth: 1, padding: 8, marginVertical: 12 }}
      />
      <FlatList
        data={trees}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <Link href={`/species/${item.id}`} style={{ paddingVertical: 6 }}>
            <Text>
              {item.commonName} ({item.scientificName})
            </Text>
          </Link>
        )}
      />
    </View>
  );
}
