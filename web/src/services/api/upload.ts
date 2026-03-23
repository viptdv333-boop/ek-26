import { useAuthStore } from '../../stores/authStore';

const BASE_URL = '/api';

export interface Attachment {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

export async function uploadFile(file: File): Promise<Attachment> {
  const token = useAuthStore.getState().token;
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${BASE_URL}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }

  return res.json();
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}
