import AsyncStorage from 'expo-sqlite/kv-store';

// SQLite is reliable for persisted app state in native Expo builds.
export default AsyncStorage;
