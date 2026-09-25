// TreeVision Local Offline Observation Storage
// Uses AsyncStorage with fallback to memory/localStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Observation } from '../types';

const STORAGE_KEY = '@treevision_observations_v1';

// Initial preloaded field observations from Coimbatore biodiversity hotspots
const SEED_OBSERVATIONS: Observation[] = [
  {
    id: 'obs-001',
    speciesId: 'azadirachta-indica',
    commonName: 'Neem Tree',
    scientificName: 'Azadirachta indica',
    tamilName: 'வேப்ப மரம்',
    imageUri: 'https://images.unsplash.com/photo-1629853974488-8889ff0a9f5f?auto=format&fit=crop&w=800&q=80',
    timestamp: '2026-09-24T09:30:00Z',
    confidence: 0.94,
    latitude: 11.001,
    longitude: 76.962,
    locationName: 'Singanallur Urban Lake Buffer, Coimbatore',
    status: 'Verified',
  },
  {
    id: 'obs-002',
    speciesId: 'ficus-religiosa',
    commonName: 'Peepal / Sacred Fig',
    scientificName: 'Ficus religiosa',
    tamilName: 'அரச மரம்',
    imageUri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    timestamp: '2026-09-23T16:15:00Z',
    confidence: 0.91,
    latitude: 11.045,
    longitude: 76.924,
    locationName: 'Marudhamalai Temple Hill Tract, Coimbatore',
    status: 'Verified',
  },
  {
    id: 'obs-003',
    speciesId: 'terminalia-arjuna',
    commonName: 'Arjuna Tree',
    scientificName: 'Terminalia arjuna',
    tamilName: 'மருத மரம்',
    imageUri: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
    timestamp: '2026-09-22T11:40:00Z',
    confidence: 0.88,
    latitude: 10.985,
    longitude: 76.885,
    locationName: 'Siruvani Catchment Basin, Coimbatore',
    status: 'Verified',
  },
  {
    id: 'obs-004',
    speciesId: 'pterocarpus-santalinus',
    commonName: 'Red Sandalwood',
    scientificName: 'Pterocarpus santalinus',
    tamilName: 'செஞ்சந்தனம்',
    imageUri: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80',
    timestamp: '2026-09-21T14:20:00Z',
    confidence: 0.58,
    latitude: 11.082,
    longitude: 76.812,
    locationName: 'Anaikatti Western Ghats Foothills',
    status: 'Pending Field Review',
  },
];

let inMemoryFallback: Observation[] = [...SEED_OBSERVATIONS];

export async function getSavedObservations(): Promise<Observation[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed initial observations on first run
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_OBSERVATIONS));
      return SEED_OBSERVATIONS;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Storage read fallback:', error);
    return inMemoryFallback;
  }
}

export async function saveObservation(observation: Observation): Promise<void> {
  try {
    const current = await getSavedObservations();
    const updated = [observation, ...current];
    inMemoryFallback = updated;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Storage write fallback:', error);
    inMemoryFallback = [observation, ...inMemoryFallback];
  }
}

export async function deleteObservation(id: string): Promise<void> {
  try {
    const current = await getSavedObservations();
    const updated = current.filter(o => o.id !== id);
    inMemoryFallback = updated;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Storage delete fallback:', error);
    inMemoryFallback = inMemoryFallback.filter(o => o.id !== id);
  }
}
