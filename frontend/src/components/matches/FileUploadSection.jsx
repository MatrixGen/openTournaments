import { useState } from 'react';
import { uploadService } from '../../services/uploadService';

export default function FileUploadSection({ onFileSelect, onUrlChange, currentFile, currentUrl }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [filePreview, setFilePreview] = useState(null);

  const handleFileSelect = async (file) => {
    try {
      setUploadError('');
      uploadService.validateFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const preview = await uploadService.getFilePreview(file);
        setFilePreview(preview);
      } else {
        setFilePreview(null);
      }
      
      onFileSelect(file);
    } catch (error) {
      setUploadError(error.message);
    }
  };

  const handleUrlChange = (url) => {
    setFilePreview(null);
    onUrlChange(url);
  };

  const removeFile = () => {
    setFilePreview(null);
    onFileSelect(null);
    onUrlChange('');
  };

  return (
    <div className="mb-2">
      <label className="text-gray-400 text-sm">Evidence (Optional)</label>
      
      {/* File Upload Option */}
      <div className="mb-2">
        <label className="block text-sm text-gray-400 mb-1">Upload File</label>
        <input
          type="file"
          accept="image/*,video/*,.pdf"
          onChange={(e) => handleFileSelect(e.target.files[0])}
          className="w-full text-sm text-gray-400 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-500 file:text-white hover:file:bg-primary-600"
        />
        <p className="text-xs text-gray-500 mt-1">
          Supported: Images (JPEG, PNG, GIF), Videos (MP4, AVI, MOV, WMV), PDF (Max 50MB)
        </p>
      </div>

      {/* OR Separator */}
      <div className="flex items-center my-2">
        <div className="flex-1 border-t border-gray-600"></div>
        <span className="px-2 text-sm text-gray-400">OR</span>
        <div className="flex-1 border-t border-gray-600"></div>
      </div>

      {/* URL Input Option */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Evidence URL</label>
        <input
          type="url"
          value={currentUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://example.com/screenshot.jpg"
          className="w-full rounded-md border border-neutral-600 bg-neutral-700 py-1 px-2 text-white text-sm"
        />
      </div>

      {/* File Preview */}
      {filePreview && (
        <div className="mt-2">
          <p className="text-sm text-gray-400 mb-1">Preview:</p>
          <div className="relative inline-block">
            <img 
              src={filePreview} 
              alt="Evidence preview" 
              className="max-w-xs max-h-32 rounded border border-gray-600"
            />
            <button
              type="button"
              onClick={removeFile}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Selected File Info */}
      {currentFile && !filePreview && (
        <div className="mt-2 p-2 bg-neutral-600 rounded text-sm">
          <div className="flex justify-between items-center">
            <span className="text-white">{currentFile.name}</span>
            <button
              type="button"
              onClick={removeFile}
              className="text-red-400 hover:text-red-300 text-sm"
            >
              Remove
            </button>
          </div>
          <p className="text-gray-400 text-xs">
            Size: {(currentFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <p className="text-red-400 text-xs mt-1">{uploadError}</p>
      )}

      {/* Uploading Indicator */}
      {isUploading && (
        <p className="text-yellow-400 text-xs mt-1">Uploading file...</p>
      )}
    </div>
  );
}