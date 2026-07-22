import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { updateBusinessPhotos } from '../lib/localData';

interface BusinessGalleryProps {
  businessId: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}

const MAX_PHOTOS = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export const BusinessGallery = ({ businessId, photos, onPhotosChange }: BusinessGalleryProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modalIndex, setModalIndex] = useState<number | null>(null);
  const [confirmDeleteUrl, setConfirmDeleteUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Close modal on ESC
  useEffect(() => {
    if (modalIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalIndex(null);
      if (e.key === 'ArrowLeft') {
        setModalIndex((prev) =>
          prev !== null && prev > 0 ? prev - 1 : photos.length - 1
        );
      }
      if (e.key === 'ArrowRight') {
        setModalIndex((prev) =>
          prev !== null && prev < photos.length - 1 ? prev + 1 : 0
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalIndex, photos.length]);

  const uploadFile = async (file: File) => {
    // Client-side validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast(
        `Tipo não suportado: ${file.type}. Permitidos: JPEG, PNG, WebP`,
        'error'
      );
      return;
    }
    if (file.size > MAX_SIZE) {
      showToast('Arquivo muito grande. Máximo permitido: 5MB', 'error');
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      showToast(`Máximo de ${MAX_PHOTOS} fotos atingido`, 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessId', businessId);

      const result = await new Promise<{ url: string; key: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || 'Erro ao fazer upload'));
            } catch {
              reject(new Error('Erro ao fazer upload'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Erro de conexão')));
        xhr.addEventListener('abort', () => reject(new Error('Upload cancelado')));

        xhr.open('POST', '/api/upload-image');
        xhr.send(formData);
      });

      const updatedPhotos = [...photos, result.url];
      updateBusinessPhotos(businessId, updatedPhotos);
      onPhotosChange(updatedPhotos);
      showToast('Foto enviada com sucesso! ✅', 'success');
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar foto', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSetCover = (index: number) => {
    const updated = [...photos];
    const [photo] = updated.splice(index, 1);
    updated.unshift(photo);
    updateBusinessPhotos(businessId, updated);
    onPhotosChange(updated);
    showToast('Foto definida como portada ⭐', 'success');
  };

  const handleDelete = async (url: string) => {
    // Extract blob key from URL
    const key = url.replace('/.netlify/blobs/business-images/', '');

    // Try to delete from blob store
    try {
      await fetch(`/api/delete-image?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
    } catch {
      // If blob delete fails, still remove from the array (user can re-upload)
      console.warn('Could not delete blob from store; removing from array only');
    }

    const updated = photos.filter((p) => p !== url);
    updateBusinessPhotos(businessId, updated);
    onPhotosChange(updated);
    setConfirmDeleteUrl(null);
    showToast('Foto removida 🗑️', 'success');
  };

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      ALLOWED_TYPES.includes(f.type)
    );
    if (files.length > 0) {
      uploadFile(files[0]);
    } else {
      showToast('Arraste apenas imagens (JPEG, PNG, WebP)', 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white">
          📸 Galeria de Fotos
        </h2>
        {photos.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {photos.length}/{MAX_PHOTOS}
          </span>
        )}
      </div>

      {/* Upload zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          dragOver
            ? 'border-aji-rojo bg-aji-rojo/5 scale-[1.02]'
            : 'border-oro-inca/30 hover:border-aji-rojo/50 hover:bg-aji-rojo/5'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => {
          if (!uploading && photos.length < MAX_PHOTOS) {
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!uploading && photos.length < MAX_PHOTOS) {
              fileInputRef.current?.click();
            }
          }
        }}
        aria-label="Upload de foto - clique ou arraste uma imagem"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpeg,.jpg,.png,.webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {uploading ? (
          <div className="space-y-3">
            <div className="text-4xl animate-pulse">⏳</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Enviando imagem...
            </p>
            <div className="w-full max-w-xs mx-auto bg-gray-200 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full bg-aji-rojo rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {uploadProgress}%
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-5xl mb-2">📷</div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              {dragOver
                ? '🎯 Solte a imagem aqui'
                : 'Clique ou arraste uma imagem'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              JPEG, PNG ou WebP • Máx 5MB • {photos.length}/{MAX_PHOTOS}
            </p>
          </div>
        )}

        {photos.length >= MAX_PHOTOS && !uploading && (
          <div className="mt-3 text-amber-600 dark:text-amber-400 text-sm font-medium flex items-center justify-center gap-1">
            ⚠️ Limite máximo de fotos atingido
          </div>
        )}
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((url, index) => (
            <motion.div
              key={url}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative group rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 aspect-square shadow-md ring-1 ring-black/5 dark:ring-white/10"
            >
              <img
                src={url}
                alt={`Foto ${index + 1} de ${photos.length}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setModalIndex(index)}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop';
                }}
              />

              {/* Cover badge */}
              {index === 0 && (
                <div className="absolute top-2 left-2 bg-oro-inca text-noche-lima text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1 z-10">
                  ⭐ Portada
                </div>
              )}

              {/* Hover overlay actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {index > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetCover(index);
                    }}
                    className="bg-white/90 text-noche-lima p-2.5 rounded-xl hover:bg-white transition-all text-sm font-medium shadow-lg hover:scale-110"
                    title="Definir como portada"
                    aria-label="Definir como portada"
                  >
                    ⭐
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteUrl(url);
                  }}
                  className="bg-red-500/90 text-white p-2.5 rounded-xl hover:bg-red-500 transition-all text-sm font-medium shadow-lg hover:scale-110"
                  title="Eliminar foto"
                  aria-label="Eliminar foto"
                >
                  🗑️
                </button>
              </div>

              {/* Photo number indicator */}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                {index + 1}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !uploading && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-600">
          <p className="text-lg font-medium">Nenhuma foto ainda</p>
          <p className="text-sm mt-1">
            Adicione fotos do seu negócio para atrair mais clientes
          </p>
        </div>
      )}

      {/* ────── Fullscreen Modal ────── */}
      <AnimatePresence>
        {modalIndex !== null && (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setModalIndex(null)}
          >
            {/* Close button */}
            <button
              onClick={() => setModalIndex(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/50 transition-all backdrop-blur-sm"
              aria-label="Cerrar"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {/* Image counter */}
            <div className="absolute top-4 left-4 text-white/70 text-sm bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              {modalIndex + 1} / {photos.length}
            </div>

            {/* Previous button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalIndex(
                  modalIndex > 0 ? modalIndex - 1 : photos.length - 1
                );
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all backdrop-blur-sm"
              aria-label="Anterior"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            {/* Image */}
            <motion.img
              key={photos[modalIndex]}
              src={photos[modalIndex]}
              alt={`Foto ${modalIndex + 1}`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src =
                  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop';
              }}
            />

            {/* Next button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModalIndex(
                  modalIndex < photos.length - 1 ? modalIndex + 1 : 0
                );
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all backdrop-blur-sm"
              aria-label="Siguiente"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Keyboard hint */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-xs bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              ESC cerrar  •  ← → navegar
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────── Delete confirmation dialog ────── */}
      <AnimatePresence>
        {confirmDeleteUrl && (
          <motion.div
            key="confirm-delete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setConfirmDeleteUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-noche-lima rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-oro-inca/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="text-5xl mb-3">🗑️</div>
                <h3 className="text-xl font-bold text-noche-lima dark:text-white">
                  Eliminar foto
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                  Tem certeza que deseja remover esta foto? 
                  <br />
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setConfirmDeleteUrl(null)}
                  className="flex-1 py-3 rounded-xl border border-oro-inca/30 text-noche-lima dark:text-white font-semibold hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteUrl)}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors text-sm"
                >
                  Sim, eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────── Toast notifications ────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20, x: 20 }}
            className={`fixed top-20 right-4 z-50 px-5 py-3.5 rounded-xl shadow-xl border backdrop-blur-sm ${
              toast.type === 'success'
                ? 'bg-green-50/95 border-green-200 text-green-800 dark:bg-green-900/90 dark:border-green-700 dark:text-green-200'
                : 'bg-red-50/95 border-red-200 text-red-800 dark:bg-red-900/90 dark:border-red-700 dark:text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{toast.type === 'success' ? '✅' : '❌'}</span>
              <span className="font-medium text-sm">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
