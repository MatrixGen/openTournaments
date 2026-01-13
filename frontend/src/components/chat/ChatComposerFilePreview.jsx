import { memo } from "react";
import { Trash2, X } from "lucide-react";

const ChatComposerFilePreview = memo(
  ({
    files,
    showFilePreview,
    onTogglePreview,
    onClearAll,
    onRemoveFile,
    getFileInfo,
    previewClassName,
  }) => {
    if (!showFilePreview || files.length === 0) return null;

    return (
      <div className="mx-4 mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {files.length} file{files.length > 1 ? "s" : ""} attached
          </span>
          <div className="flex items-center space-x-2">
            {files.length > 1 && (
              <button
                onClick={() => onTogglePreview(!showFilePreview)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                type="button"
              >
                {showFilePreview ? "Hide" : "Show"}
              </button>
            )}
            <button
              onClick={onClearAll}
              className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center space-x-1"
              type="button"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear all</span>
            </button>
          </div>
        </div>
        {files.map((file, index) => {
          const { type, Icon, color } = getFileInfo(file);
          return (
            <div
              key={index}
              className={`p-3 rounded-lg border flex items-center justify-between ${previewClassName}`}
            >
              <div className="flex items-center space-x-3">
                {type === "image" ? (
                  <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 border">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={`w-12 h-12 rounded ${color} flex items-center justify-center text-white flex-shrink-0`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{type.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemoveFile(index)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                type="button"
                aria-label="Remove file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    );
  }
);

ChatComposerFilePreview.displayName = "ChatComposerFilePreview";

export default ChatComposerFilePreview;
