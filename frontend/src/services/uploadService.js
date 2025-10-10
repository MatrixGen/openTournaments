import api from './api';

export const uploadService = {
  uploadEvidence: async (file) => {
    const formData = new FormData();
    formData.append('evidence', file);

    const response = await api.post('/uploads/evidence', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  validateFile: (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'application/pdf'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload images, videos, or PDF files only.');
    }

    if (file.size > maxSize) {
      throw new Error('File must be less than 50MB.');
    }

    return true;
  },

  getFilePreview: (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  },
};