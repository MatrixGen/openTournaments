import { memo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const MediaUploader = memo(({ 
  files = [], 
  onRemove, 
  onUpload, 
  progress = {}, 
  maxSize = 10 * 1024 * 1024,
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime']
}) => {
  const { theme } = useTheme();

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎬';
    if (file.type.startsWith('audio/')) return '🎵';
    return '📎';
  };

  const validateFile = (file) => {
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Unsupported file type: ${file.type}` };
    }
    if (file.size > maxSize) {
      return { valid: false, error: `File too large (max: ${formatFileSize(maxSize)})` };
    }
    return { valid: true };
  };

  const renderFile = (file, index) => {
    const validation = validateFile(file);
    const fileProgress = progress[file.name] || 0;
    const isImage = file.type.startsWith('image/');

    return (
      <div
        key={index}
        className={`p-3 rounded-lg border ${
          validation.valid
            ? 'border-gray-200 dark:border-gray-700'
            : 'border-red-300 dark:border-red-700'
        }`}
      >
        <div className="flex items-center space-x-3">
          {isImage ? (
            <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl">
              {getFileIcon(file)}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <button
                onClick={() => onRemove?.(index)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-gray-500">
              {formatFileSize(file.size)}
            </p>
            
            {!validation.valid && (
              <p className="text-xs text-red-500 mt-1">{validation.error}</p>
            )}

            {fileProgress > 0 && (
              <div className="mt-2">
                <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${fileProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {fileProgress.toFixed(0)}%
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (files.length === 0) return null;

  const validFiles = files.filter(file => validateFile(file).valid);

  return (
    <div className={`rounded-lg p-4 ${
      theme === 'dark' 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-white border-gray-200'
    } border shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">
          {files.length} file{files.length > 1 ? 's' : ''} selected
        </h4>
        {validFiles.length > 0 && (
          <button
            onClick={() => onUpload?.(validFiles)}
            className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Upload {validFiles.length} file{validFiles.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {files.map(renderFile)}
      </div>

      <div className="mt-3 text-xs text-gray-500">
        <p>Allowed: {allowedTypes.map(t => t.split('/')[1]).join(', ')}</p>
        <p>Max size: {formatFileSize(maxSize)} per file</p>
      </div>
    </div>
  );
});

MediaUploader.displayName = 'MediaUploader';
export default MediaUploader;