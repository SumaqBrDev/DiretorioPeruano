export interface UploadResult {
  url: string;
  key: string;
}

export interface UploadResponse {
  urls: UploadResult[];
  errors?: Array<{ filename: string; error: string }>;
  totalUploaded: number;
  totalErrors: number;
}

export interface BusinessGalleryUploadOptions {
  file: File;
  businessId: string;
  getToken: () => Promise<string | null>;
  createRequest?: () => XMLHttpRequest;
  onProgress: (progress: number) => void;
  onError: (message: string) => void;
  onSuccess?: (url: string) => void;
}

export async function uploadBusinessGalleryFile({
  file,
  businessId,
  getToken,
  createRequest = () => new XMLHttpRequest(),
  onProgress,
  onError,
  onSuccess,
}: BusinessGalleryUploadOptions): Promise<{ success: boolean; url?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('businessId', businessId);

  const xhr = createRequest();

  return new Promise((resolve) => {
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          if (response.urls && response.urls.length > 0) {
            const uploaded = response.urls[0];
            onSuccess?.(uploaded.url);
            resolve({ success: true, url: uploaded.url });
            return;
          }

          onError(response.errors?.[0]?.error || 'Erro ao fazer upload');
          resolve({ success: false });
          return;
        } catch {
          onError('Erro ao processar resposta');
          resolve({ success: false });
          return;
        }
      }

      let errorMessage = 'Erro ao fazer upload';
      try {
        const error = JSON.parse(xhr.responseText) as { error?: string };
        errorMessage = error.error || errorMessage;
      } catch {
        // use default
      }
      onError(errorMessage);
      resolve({ success: false });
    });

    xhr.addEventListener('error', () => {
      onError('Erro de conexão');
      resolve({ success: false });
    });

    xhr.addEventListener('abort', () => {
      onError('Upload cancelado');
      resolve({ success: false });
    });

    xhr.open('POST', '/api/upload-image');

    getToken()
      .then((token) => {
        if (!token) {
          onError('Sessão expirada. Faça login novamente para enviar fotos.');
          resolve({ success: false });
          return;
        }

        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      })
      .catch(() => {
        onError('Sessão expirada. Faça login novamente para enviar fotos.');
        resolve({ success: false });
      });
  });
}
