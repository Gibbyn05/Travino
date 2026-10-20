import * as ImageManipulator from 'expo-image-manipulator';

export type PreparedMemoryPhoto = {
  image: string;
  thumbnail: string;
  imageBytes?: number;
  thumbnailBytes?: number;
  compressMs: number;
};

const MAX_IMAGE_SIDE = 1600;
const MAX_THUMBNAIL_SIDE = 400;

function resizeAction(width?: number, height?: number, maximum = MAX_IMAGE_SIDE) {
  if (!width || !height || Math.max(width, height) <= maximum) return [];
  return width >= height ? [{ resize: { width: maximum } }] : [{ resize: { height: maximum } }];
}

async function sizeOf(uri: string) {
  try { return (await fetch(uri)).blob().then((blob) => blob.size); } catch { return undefined; }
}

export async function prepareMemoryPhoto(asset: { uri: string; width?: number; height?: number }): Promise<PreparedMemoryPhoto> {
  const startedAt = Date.now();
  const [image, thumbnail] = await Promise.all([
    ImageManipulator.manipulateAsync(asset.uri, resizeAction(asset.width, asset.height, MAX_IMAGE_SIDE), { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }),
    ImageManipulator.manipulateAsync(asset.uri, resizeAction(asset.width, asset.height, MAX_THUMBNAIL_SIDE), { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }),
  ]);
  const [imageBytes, thumbnailBytes] = await Promise.all([sizeOf(image.uri), sizeOf(thumbnail.uri)]);
  return { image: image.uri, thumbnail: thumbnail.uri, imageBytes, thumbnailBytes, compressMs: Date.now() - startedAt };
}

export const memoryPhotoLimits = { imageLongSide: MAX_IMAGE_SIDE, thumbnailLongSide: MAX_THUMBNAIL_SIDE };
