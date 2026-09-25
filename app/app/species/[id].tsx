import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { getTree } from "../../src/services/inference";

export default function SpeciesDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = getTree(id as string);
  if (!t) return <View style={{ padding: 24 }}><Text>Unknown species.</Text></View>;
  return (
    <View style={{ flex: 1, padding: 24, gap: 6 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>{t.commonName}</Text>
      <Text style={{ fontStyle: "italic" }}>{t.scientificName}</Text>
      <Text>Family: {t.family}</Text>
      <Text>Region: {t.region}</Text>
      <Text>Occurrence records: {t.occurrenceRecords}</Text>
      <Text>Field images: {t.fieldImages}</Text>
      {t.notes ? <Text>Note: {t.notes}</Text> : null}
    </View>
  );
}
