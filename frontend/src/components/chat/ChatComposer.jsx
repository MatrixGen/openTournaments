import { memo, useState, useRef, useCallback, useEffect,useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';

const ChatComposer = memo(({
  draftMessage,
  setDraftMessage,
  editingMessage,
  replyToMessage,
  onSend,
  onCancelEdit,
  onCancelReply,
  onToggleEmojiPicker,
  maxMediaSize = 10 * 1024 * 1024, // 10MB default
  allowedMediaTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'],
  tournament,
}) => {
  const { theme } = useTheme();
  const { 
    currentChannel, 
    isConnected, 
    startTyping, 
    stopTyping, 
    onSendMedia,
    sendMessage,
    chatUser
  } = useChat();
  const { user: authUser } = useAuth();
  
  const [files, setFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [typingTimeoutId, setTypingTimeoutId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0); // Add this line
  
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimerRef = useRef(null);

  // Determine if user is participant
  const isUserParticipant = useCallback(() => {
    if (!tournament || !authUser?.id) return false;
    
    const participants = tournament.participants || tournament.players || [];
    return participants.some(p => 
      p.id === authUser.id || 
      p.user_id === authUser.id ||
      p.user?.id === authUser.id
    );
  }, [tournament, authUser]);

  const currentUserIsParticipant = isUserParticipant();

  // Theme classes
  const themeClasses = {
    container: theme === 'dark'
      ? 'bg-gray-900 border-gray-800'
      : 'bg-white border-gray-200',
    input: theme === 'dark'
      ? 'bg-gray-800 border-gray-700 text-gray-900 dark:text-white placeholder-gray-400'
      : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500',
    buttonDisabled: theme === 'dark'
      ? 'bg-gray-700 text-gray-400'
      : 'bg-gray-300 text-gray-400',
    preview: theme === 'dark'
      ? 'bg-gray-800'
      : 'bg-gray-100',
  };

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      if (typingTimeoutId) {
        clearTimeout(typingTimeoutId);
      }
    };
  }, [typingTimeoutId]);

  // Handle file selection
  const handleFileSelect = useCallback((event) => {
    const selectedFiles = Array.from(event.target.files);
    const validFiles = selectedFiles.filter(file => {
      if (!allowedMediaTypes.includes(file.type)) {
        alert(`Unsupported file type: ${file.type}. Allowed: ${allowedMediaTypes.join(', ')}`);
        return false;
      }
      if (file.size > maxMediaSize) {
        alert(`File too large. Max size: ${(maxMediaSize / (1024 * 1024)).toFixed(0)}MB`);
        return false;
      }
      return true;
    });

    setFiles(prev => [...prev, ...validFiles]);
    
    // Clear file input
    event.target.value = '';
  }, [allowedMediaTypes, maxMediaSize]);

  // Handle file removal
  const handleRemoveFile = useCallback((index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Get file type
  const getFileType = useCallback((file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    return 'file';
  }, []);

// Handle sending message
const handleSend = useCallback(async () => {
  console.log('💬 ChatComposer handleSend:', {
    draftMessage,
    filesCount: files.length,
    replyToMessageId: replyToMessage?.id,
    currentChannelId: currentChannel?.id,
    user: chatUser,
  });

  if ((!draftMessage.trim() && files.length === 0) || !currentChannel?.id) {
    console.log('❌ Cannot send: missing content or channel');
    return;
  }

  if (!currentUserIsParticipant) {
    alert('You need to join the tournament to send messages');
    return;
  }

  try {
    setIsUploading(true);
    setUploadProgress(0); // Reset progress
    
    // Send media file if present
    if (files.length > 0) {
      await onSendMedia?.(
        currentChannel.id, 
        files[0], 
        draftMessage.trim(), 
        { 
          type: getFileType(files[0]),
          replyTo: replyToMessage?.id,
          fileName: files[0].name,
          fileSize: files[0].size,
          mimeType: files[0].type,
          originalName: files[0].name,
          onUploadProgress: (progressEvent) => {
            // Calculate upload percentage
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
              console.log(`Upload progress: ${percentCompleted}%`);
            }
          }
        }
      );
    } else if (editingMessage?.id) {
      // Handle message editing
      await onSend?.(draftMessage.trim(), null, {
        replyTo: replyToMessage?.id,
        editingMessageId: editingMessage.id
      });
    } else {
      // Send text-only message
      await sendMessage(
        currentChannel.id, 
        draftMessage.trim(), 
        {
          replyTo: replyToMessage?.id,
          sender: chatUser?.user
        }
      );
    }
    
    // Clear state
    setDraftMessage('');
    setFiles([]);
    setUploadProgress(0); // Reset progress after successful upload
    stopTyping?.();
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Clear typing timer
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    
  } catch (error) {
    console.error('Failed to send:', error);
    setUploadProgress(0); // Reset progress on error
    alert(error.message || 'Failed to send message. Please try again.');
  } finally {
    setIsUploading(false);
  }
}, [
  draftMessage,
  files,
  replyToMessage?.id,
  currentChannel?.id,
  currentUserIsParticipant,
  editingMessage?.id,
  onSendMedia,
  onSend,
  chatUser,
  sendMessage,
  stopTyping,
  setDraftMessage,
  getFileType
]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle input changes with typing indicators
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    setDraftMessage(value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
    
    // Typing indicator logic
    if (value.trim() && currentChannel?.id) {
      // Clear existing timer
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      
      // Start typing
      startTyping?.();
      
      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimerRef.current = setTimeout(() => {
        stopTyping?.();
        typingTimerRef.current = null;
      }, 2000);
    } else {
      // Clear typing indicator
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      stopTyping?.();
    }
  }, [currentChannel?.id, setDraftMessage, startTyping, stopTyping]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setDraftMessage('');
    onCancelEdit?.();
    
    // Clear typing indicator
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    stopTyping?.();
  }, [setDraftMessage, onCancelEdit, stopTyping]);

  // Handle cancel reply
  const handleCancelReply = useCallback(() => {
    onCancelReply?.();
  }, [onCancelReply]);

  // Trigger file input
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (!isRecording) {
      alert('Voice messages are not yet implemented');
      return;
    }
    setIsRecording(!isRecording);
  }, [isRecording]);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setFiles([]);
  }, []);

  // Check if send is disabled
  const isSendDisabled = useMemo(() => {
    return (!draftMessage.trim() && files.length === 0) || 
           uploadProgress || 
           isUploading || 
           !currentChannel?.id || 
           !currentUserIsParticipant ||
           !isConnected;
  }, [
    draftMessage, 
    files.length, 
    uploadProgress, 
    isUploading, 
    currentChannel?.id, 
    currentUserIsParticipant,
    isConnected
  ]);

  // Check if chat is available
  const isChatAvailable = useMemo(() => {
    return tournament?.chat_channel_id && 
           tournament.chat_enabled !== false &&
           currentChannel?.id;
  }, [tournament, currentChannel]);

  // Connection states
  if (!isConnected) {
    return (
      <div className={`border-t p-4 ${themeClasses.container}`}>
        <div className="flex items-center justify-center space-x-2 py-2 text-yellow-500">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-500 border-t-transparent"></div>
          <span className="text-sm">Connecting to chat...</span>
        </div>
      </div>
    );
  }

  if (!isChatAvailable) {
    return (
      <div className={`border-t p-4 ${themeClasses.container}`}>
        <div className="text-center py-2 text-gray-500 dark:text-gray-400">
          <p>Chat is not available for this tournament</p>
        </div>
      </div>
    );
  }

  if (!currentUserIsParticipant) {
    return (
      <div className={`border-t p-4 ${themeClasses.container}`}>
        <div className="text-center py-2 text-gray-500 dark:text-gray-400">
          <p>Join the tournament to participate in chat</p>
          <button
            onClick={() => window.location.href = `/tournaments/${tournament?.id}`}
            className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm"
          >
            Join Tournament
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border-t p-3 md:p-4 ${themeClasses.container}`}>
      {/* Reply/Edit preview */}
      {(replyToMessage || editingMessage) && (
        <div className={`mb-3 p-3 rounded-lg ${themeClasses.preview}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-blue-500">
                {editingMessage ? '✏️ Editing:' : '↩️ Replying to:'}
              </div>
              <span className="text-sm font-medium truncate max-w-[200px]">
                {editingMessage?.content || replyToMessage?.content || 'Message'}
              </span>
            </div>
            <button
              onClick={editingMessage ? handleCancelEdit : handleCancelReply}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div className="mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {files.length} file{files.length > 1 ? 's' : ''} attached
            </span>
            <button
              onClick={clearAllFiles}
              className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400"
              type="button"
            >
              Clear all
            </button>
          </div>
          {files.map((file, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg flex items-center justify-between ${themeClasses.preview}`}
            >
              <div className="flex items-center space-x-2">
                {file.type.startsWith('image/') ? (
                  <div className="w-10 h-10 rounded overflow-hidden">
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-blue-500 flex items-center justify-center text-gray-900 dark:text-white">
                    {getFileType(file) === 'video' ? '🎬' : '📎'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate max-w-[150px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveFile(index)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                type="button"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-2">
        {/* Action buttons */}
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={uploadProgress || isUploading}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onToggleEmojiPicker}
            disabled={uploadProgress || isUploading}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add emoji"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={toggleRecording}
            disabled={uploadProgress || isUploading}
            className={`p-2 rounded-full transition-colors ${
              isRecording
                ? 'bg-red-100 text-red-500 dark:bg-red-900'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isRecording ? 'Stop recording' : 'Voice message (coming soon)'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>

        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={allowedMediaTypes.join(',')}
          onChange={handleFileSelect}
          multiple
        />

        {/* Text input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={draftMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              stopTyping?.();
              if (typingTimerRef.current) {
                clearTimeout(typingTimerRef.current);
                typingTimerRef.current = null;
              }
            }}
            placeholder={editingMessage ? "Edit your message..." : "Type your message..."}
            className={`w-full resize-none ${themeClasses.input} rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 max-h-32`}
            disabled={uploadProgress || isUploading}
            maxLength={2000}
            rows={1}
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={isSendDisabled}
          className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
            !isSendDisabled
              ? 'bg-blue-500 hover:bg-blue-600 text-gray-900 dark:text-white'
              : themeClasses.buttonDisabled + ' cursor-not-allowed'
          }`}
          title={isSendDisabled ? "Cannot send message" : "Send message"}
        >
          {uploadProgress || isUploading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>

      {/* Character counter */}
      {draftMessage.length > 0 && (
        <div className="text-right mt-1">
          <span className={`text-xs ${
            draftMessage.length > 1900 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {draftMessage.length}/2000
          </span>
        </div>
      )}

      {/* Upload progress */}
     {/* Upload progress - Show when uploading AND there's progress */}
{isUploading && uploadProgress > 0 && (
  <div className="mt-2">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {files.length > 0 ? `Uploading ${files[0].name}...` : 'Uploading...'}
      </span>
      <span className="text-xs text-blue-500 font-medium">
        {uploadProgress}%
      </span>
    </div>
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
      <div 
        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${uploadProgress}%` }}
      ></div>
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
      {uploadProgress < 100 ? 'Uploading...' : 'Processing...'}
    </div>
  </div>
)}
    </div>
  );
});

ChatComposer.displayName = 'ChatComposer';
export default ChatComposer;