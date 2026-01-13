import { memo, useEffect, useRef, useState } from "react";
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

    const isBlobLike = (file) =>
      file &&
      typeof file === "object" &&
      typeof file.size === "number" &&
      typeof file.type === "string" &&
      typeof file.slice === "function";

    const previewMapRef = useRef(new Map());
    const [, forceRender] = useState(0);

    useEffect(() => {
      let isActive = true;

      const createPreview = async (file) => {
        if (!isBlobLike(file)) {
          console.log("preview invalid file:", file);
          return null;
        }

        try {
          const blobUrl = URL.createObjectURL(file);
          console.log("createObjectURL url:", blobUrl);
          return blobUrl;
        } catch (error) {
          console.log("createObjectURL FAIL", error);
        }

        try {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          console.log("FileReader data url:", dataUrl);
          return dataUrl;
        } catch (error) {
          console.log("FileReader FAIL", error);
          return null;
        }
      };

      const updatePreviews = async () => {
        const nextMap = new Map(previewMapRef.current);
        const keys = new Set(files);

        for (const [key, url] of nextMap.entries()) {
          if (!keys.has(key)) {
            if (typeof url === "string" && url.startsWith("blob:")) {
              URL.revokeObjectURL(url);
            }
            nextMap.delete(key);
          }
        }

        for (const file of files) {
          if (nextMap.has(file)) continue;
          if (!file.type?.startsWith("image/")) continue;
          const preview = await createPreview(file);
          if (!isActive) return;
          if (preview) {
            nextMap.set(file, preview);
          }
        }

        if (isActive) {
          previewMapRef.current = nextMap;
          forceRender((prev) => prev + 1);
        }
      };

      updatePreviews();

      return () => {
        isActive = false;
        previewMapRef.current.forEach((url) => {
          if (typeof url === "string" && url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
          }
        });
      };
    }, [files]);

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
                    {(() => {
                      const previewSrc = previewMapRef.current.get(file);
                      console.log("render preview src:", previewSrc);
                      if (!previewSrc) return null;
                      return (
                        <img
                          src={previewSrc}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      );
                    })()}
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
