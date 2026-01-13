import { memo } from "react";
import {
  Loader2,
  Mic,
  Paperclip,
  SendHorizontal,
  Smile,
} from "lucide-react";

const ChatComposerInput = memo(
  ({
    enableFileAttachments,
    enableEmojiPicker,
    enableVoiceMessages,
    isRecording,
    onToggleRecording,
    onTriggerFileInput,
    fileInputRef,
    allowedMediaTypes,
    onFileChange,
    onToggleEmojiPicker,
    uploadProgress,
    isUploading,
    editingMessage,
    isTypingActive,
    draftMessage,
    textareaRef,
    onInputChange,
    onKeyDown,
    onFocus,
    onBlur,
    placeholderText,
    inputClassName,
    buttonDisabledClassName,
    isCharLimitExceeded,
    isCharLimitWarning,
    remainingChars,
    isSendDisabled,
    onSend,
    typingUsers,
    filesCount,
  }) => {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 relative min-h-[44px]">
          <div
            className={`
        flex items-center gap-1 flex-shrink-0 transition-all duration-300 ease-in-out self-stretch
        ${
          isTypingActive
            ? "opacity-0 scale-95 w-0 overflow-hidden"
            : "opacity-100 scale-100 w-auto"
        }
      `}
          >
            {enableFileAttachments && (
              <button
                type="button"
                onClick={onTriggerFileInput}
                disabled={uploadProgress || isUploading || editingMessage}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedMediaTypes.join(",")}
              onChange={onFileChange}
              className="hidden"
            />

            {enableEmojiPicker && (
              <button
                type="button"
                onClick={onToggleEmojiPicker}
                disabled={uploadProgress || isUploading || editingMessage}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Add emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
            )}

            {enableVoiceMessages && (
              <button
                type="button"
                onClick={onToggleRecording}
                disabled={uploadProgress || isUploading || editingMessage}
                className={`p-2 rounded-full transition-colors ${
                  isRecording
                    ? "bg-red-100 text-red-500 dark:bg-red-900"
                    : "hover:bg-gray-200 dark:hover:bg-gray-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isRecording ? "Stop recording" : "Voice message"}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="flex-1 flex items-center relative">
            <textarea
              ref={textareaRef}
              value={draftMessage}
              onChange={onInputChange}
              onKeyDown={onKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
              placeholder={placeholderText}
              className={`w-full resize-none ${inputClassName} rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-32 transition-all duration-200 flex items-center`}
              disabled={uploadProgress || isUploading}
              rows={1}
              style={{
                lineHeight: "24px",
                minHeight: "44px",
                paddingTop: "10px",
                paddingBottom: "10px",
              }}
            />

            {draftMessage.length > 0 && (
              <div className="absolute bottom-2 right-3">
                <span
                  className={`text-[10px] font-medium ${
                    isCharLimitExceeded
                      ? "text-red-500"
                      : isCharLimitWarning
                      ? "text-yellow-500"
                      : "text-gray-400"
                  }`}
                >
                  {remainingChars}
                </span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 flex items-center self-stretch">
            <button
              type="button"
              onClick={onSend}
              disabled={isSendDisabled}
              className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${
                !isSendDisabled
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
                  : buttonDisabledClassName + " cursor-not-allowed"
              }`}
              title={isSendDisabled ? "Cannot send message" : "Send message"}
            >
              {uploadProgress || isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <SendHorizontal className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {isUploading && uploadProgress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filesCount > 0 ? `Uploading...` : "Sending..."}
              </span>
              <span className="text-xs text-blue-500 font-medium">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {typingUsers.length > 0 && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
              <div
                className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              />
              <div
                className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
      </div>
    );
  }
);

ChatComposerInput.displayName = "ChatComposerInput";

export default ChatComposerInput;
