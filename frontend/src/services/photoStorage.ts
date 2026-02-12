// Simple IndexedDB storage for photos

const DB_NAME = 'RoomDisplayPhotos';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

interface StoredPhoto {
  id: string;
  eventId: string;
  eventTitle: string;
  timestamp: string;
  photoData: string; // base64
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('eventId', 'eventId', { unique: false });
      }
    };
  });
}

export async function savePhoto(
  eventId: string,
  eventTitle: string,
  photoData: string
): Promise<string> {
  const db = await openDB();
  const id = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const photo: StoredPhoto = {
    id,
    eventId,
    eventTitle,
    timestamp: new Date().toISOString(),
    photoData,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(photo);

    request.onsuccess = () => {
      console.log(`Photo saved: ${id}`);
      resolve(id);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPhotos(): Promise<StoredPhoto[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
