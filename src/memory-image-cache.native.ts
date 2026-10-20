import * as FileSystem from 'expo-file-system/legacy';

const isLocal = (uri: string) => /^(file|content|asset):/i.test(uri);
const keyFor = (uri: string) => Array.from(uri).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0).toString(36);

/** Stores remote reader images in the OS cache. Local photo URIs are already cached. */
export async function cacheMemoryImage(uri: string) {
  if (!uri || isLocal(uri) || !/^https?:/i.test(uri) || !FileSystem.cacheDirectory) return uri;
  const target = `${FileSystem.cacheDirectory}travino-memory-${keyFor(uri)}.jpg`;
  try {
    const existing = await FileSystem.getInfoAsync(target);
    if (existing.exists) return target;
    const result = await FileSystem.downloadAsync(uri, target);
    return result.uri;
  } catch {
    return uri;
  }
}
