import { useState } from 'react';
import { compressGalleryImage } from '@/lib/image-compression';

export interface UploadedMedia {
  id: number;
  url: string;
  file_name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  media_type: string;
  width?: number;
  height?: number;
  optimizing?: boolean; // Indicates background optimization
}

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [optimizing, setOptimizing] = useState(false);

  const uploadFile = async (file: File, mediaType: string = 'photo'): Promise<UploadedMedia | null> => {
    setUploading(true);
    setProgress(0);
    setOptimizing(false);

    return new Promise((resolve) => {
      // Сжимаем фото перед загрузкой
      const processFile = async () => {
        let fileToUpload = file;
        
        if (mediaType === 'photo' && file.type.startsWith('image/')) {
          try {
            console.log(`🖼️ Сжимаю фото перед загрузкой...`);
            fileToUpload = await compressGalleryImage(file);
          } catch (error) {
            console.error('⚠️ Ошибка сжатия фото, загружаю оригинал:', error);
            // Если сжатие не удалось, загружаем оригинал
          }
        }

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('media_type', mediaType);

        console.log(`⏳ Загрузка файла ${fileToUpload.name}...`);

        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setProgress(percentComplete);
            console.log(`📊 Прогресс загрузки: ${percentComplete}%`);
          }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              
              if (!result.data) {
                console.error('❌ Нет данных в ответе:', result);
                alert('Ошибка: нет данных в ответе');
                resolve(null);
              } else {
                console.log('✅ Файл успешно загружен:', result.data);
                setProgress(100);
                resolve(result.data);
              }
            } catch (error) {
              console.error('❌ Ошибка парсинга ответа:', error);
              alert('Ошибка обработки ответа сервера');
              resolve(null);
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              console.error('❌ Ошибка загрузки:', error);
              alert(error.error || 'Ошибка загрузки файла');
            } catch {
              alert('Ошибка загрузки файла');
            }
            resolve(null);
          }
          
          setUploading(false);
          setOptimizing(false);
          setTimeout(() => setProgress(0), 1000);
        });

        // Handle errors
        xhr.addEventListener('error', () => {
          console.error('❌ Ошибка сети при загрузке');
          alert('Ошибка сети при загрузке файла');
          setUploading(false);
          setOptimizing(false);
          setProgress(0);
          resolve(null);
        });

        // Detect when upload is complete and optimization starts
        xhr.upload.addEventListener('load', () => {
          if (mediaType === 'video') {
            setOptimizing(true);
            console.log('🎬 Видео загружено, начинается оптимизация...');
          }
        });

        xhr.open('POST', 'http://localhost:8000/api/media/upload');
        xhr.withCredentials = true;
        xhr.send(formData);
      };

      processFile();
    });
  };

  const uploadMultiple = async (files: File[], mediaType: string = 'photo'): Promise<UploadedMedia[]> => {
    // ✅ Загружаем все файлы параллельно, чтобы сохранить порядок
    const uploadPromises = files.map(file => uploadFile(file, mediaType));
    const results = await Promise.all(uploadPromises);
    
    // Фильтруем null результаты (ошибки загрузки)
    return results.filter((result): result is UploadedMedia => result !== null);
  };

  return {
    uploadFile,
    uploadMultiple,
    uploading,
    optimizing,
    progress,
  };
}
