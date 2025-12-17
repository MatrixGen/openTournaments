import { memo, useState, useCallback, useMemo } from 'react';
import MessageActions from './MessageActions';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';

const MessageBubble = memo(({
  message,
  isFirstInGroup = true,
  isLastInGroup = true,
  onReply,
  isHighlighted = false,
}) => {
  const { onReactToMessage, onEditMessage, onDeleteMessage, retryFailedMessage, chatUser } = useChat();
  const { theme } = useTheme();
  const [showActions, setShowActions] = useState(false);

  // Consistency: Check if this message belongs to the logged-in user
  const isMe = useMemo(() => {
    const myId = chatUser?.user?.id || chatUser?.id;
    const senderId = message.sender?.id || message.user?.id || message.userId;
    return myId && senderId ? String(myId) === String(senderId) : false;
  }, [message, chatUser]);

  // Formatting Helper
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Actions
  const handleReact = useCallback((emoji) => message.id && onReactToMessage(message.id, emoji), [message.id, onReactToMessage]);
  const handleEdit = useCallback((content) => message.id && onEditMessage(message.id, content), [message.id, onEditMessage]);
  const handleDelete = useCallback(() => {
    if (window.confirm('Delete message?')) onDeleteMessage(message.id);
  }, [message.id, onDeleteMessage]);
  
  // Fix: Add proper retry callback
  const handleRetry = useCallback(() => {
    retryFailedMessage(message);
  }, [message, retryFailedMessage]);

  // Styles
  const bubbleTheme = isMe
    ? (theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
    : (theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-900 border border-gray-200');

  // Tail logic: Only the first message in a group gets the "speech bubble" corner
  const roundingClasses = isMe
    ? `${isFirstInGroup ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl'}`
    : `${isFirstInGroup ? 'rounded-2xl rounded-tl-none' : 'rounded-2xl'}`;

  return (
    <div
      className={`relative flex items-center group w-full ${isMe ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-2' : 'mb-1'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions Trigger - Floats outside the bubble */}
      {showActions && (
        <div className={`absolute z-20 top-0 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}>
          <MessageActions
            message={message}
            isCurrentUser={isMe}
            onReact={handleReact}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={onReply}
          />
        </div>
      )}

      {/* Main Bubble Container */}
      <div 
        className={`relative ${bubbleTheme} ${roundingClasses} px-3 py-2 shadow-sm transition-all duration-200 ${
          isHighlighted ? 'ring-2 ring-yellow-400 scale-[1.02]' : ''
        }`}
        style={{ maxWidth: '100%' }}
      >
        {/* Reply Context */}
        {message.parentMessage && (
          <div className="mb-2 p-2 rounded bg-black/10 border-l-4 border-blue-300 text-xs opacity-90 truncate">
            <span className="font-bold block mb-0.5">
              {message.parentMessage.sender?.username || 'User'}
            </span>
            {message.parentMessage.content || 'Media'}
          </div>
        )}

        {/* Media Content */}
        {renderMedia(message)}

        {/* Message Text */}
        {message.content && (
          <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </div>
        )}

        {/* Metadata Row (Time, Edited, Status) */}
        <div className={`flex items-center gap-1.5 mt-1 justify-end opacity-70`}>
          {message.isEdited && <span className="text-[10px] italic">edited</span>}
          <span className="text-[10px] select-none">
            {formatTime(message.createdAt || message.created_at)}
          </span>
          {isMe && <StatusIndicator message={message} onRetry={handleRetry} />}
        </div>

        {/* Reactions List */}
        {message.reactions?.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-2 -mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
            {renderReactions(message.reactions, theme, handleReact)}
          </div>
        )}
      </div>
    </div>
  );
});

// --- HELPER RENDERS ---

const renderMedia = (msg) => {
  // Handle multiple media sources
  const media = msg.mediaUrl || msg.attachments?.[0];
  if (!media) return null;
  
  // Get the URL - could be string, object, or blob URL
  const url = typeof media === 'string' ? media : media.url;
  if (!url) return null;
  
  // Get media type from various sources
  const mediaType = 
    msg.type || 
    media.type || 
    media.mimeType ||
    (url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 
     url.match(/\.(mp4|webm|mov|avi|mkv)$/i) ? 'video' :
     url.match(/\.(mp3|wav|ogg|flac)$/i) ? 'audio' : 'file');
  
  // Get file info
  const fileName = media.fileName || msg.fileName || 'Attachment';
  const fileSize = media.fileSize || msg.fileSize;
  
  // Check if it's a blob URL (optimistic upload)
  const isBlobUrl = url.startsWith('blob:');
  
  // Check if it's an image
  const isImage = mediaType === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  
  // Check if it's a video
  const isVideo = mediaType === 'video' || url.match(/\.(mp4|webm|mov|avi|mkv)$/i);
  
  // Check if it's audio
  const isAudio = mediaType === 'audio' || url.match(/\.(mp3|wav|ogg|flac)$/i);
  
  // Loading indicator for optimistic uploads
  const isLoading = msg.isOptimistic && !msg.isConfirmed;
  
  return (
    <div className="mb-2">
      {/* Loading overlay for optimistic uploads */}
      {isLoading && (
        <div className="relative">
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center z-10">
            <div className="text-white text-xs flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              <span>Uploading...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Image */}
      {isImage && (
        <div className="rounded-lg overflow-hidden border border-black/5">
          <img 
            src={url} 
            alt={msg.content || 'Shared image'} 
            className="max-w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => !isBlobUrl && window.open(url, '_blank')}
            loading="lazy"
            onError={(e) => {
              // Handle blob URL expiration
              if (isBlobUrl) {
                e.target.src = '/placeholder-image.png';
                e.target.onclick = null; // Disable click
              }
            }}
          />
          {/* Failed upload indicator */}
          {msg.failed && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-b-lg">
              <div className="flex items-center gap-2">
                <span className="text-red-500">⚠️</span>
                <span>Upload failed. {msg.error || 'Please try again.'}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Video */}
      {isVideo && (
        <div className="rounded-lg overflow-hidden border border-black/5">
          <video
            src={url}
            className="max-w-full max-h-80 rounded-lg"
            controls
            playsInline
            preload="metadata"
            onError={(e) => {
              if (isBlobUrl) {
                e.target.parentElement.innerHTML = `
                  <div class="p-4 bg-gray-100 text-center rounded-lg">
                    <p class="text-sm text-gray-600">Video preview not available</p>
                    <a href="${url}" download="${fileName}" class="text-xs text-blue-500 underline mt-1 inline-block">Download video</a>
                  </div>
                `;
              }
            }}
          />
        </div>
      )}
      
      {/* Audio */}
      {isAudio && (
        <div className="p-3 rounded-lg bg-black/5 border border-black/10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">🎵</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{fileName}</p>
              {fileSize && (
                <p className="text-[10px] text-gray-500">
                  {(fileSize / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </div>
          <audio 
            src={url} 
            controls 
            className="w-full h-8"
            onError={(e) => {
              if (isBlobUrl) {
                e.target.parentElement.innerHTML = `
                  <div class="text-center py-2">
                    <p class="text-xs text-gray-600">Audio not available</p>
                    <a href="${url}" download="${fileName}" class="text-[10px] text-blue-500 underline mt-1 inline-block">Download audio</a>
                  </div>
                `;
              }
            }}
          />
        </div>
      )}
      
      {/* Generic file (not image/video/audio) */}
      {!isImage && !isVideo && !isAudio && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-black/5 border border-black/10">
          <div className="w-10 h-10 rounded bg-blue-500 flex items-center justify-center text-white">
            {getFileIcon(fileName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{fileName}</p>
            {fileSize && (
              <p className="text-[10px] text-gray-500">
                {(fileSize / 1024).toFixed(1)} KB
              </p>
            )}
            {/* Show download link for non-blob URLs, otherwise show message */}
            {isBlobUrl ? (
              <p className="text-[10px] text-gray-500">Processing upload...</p>
            ) : (
              <a 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[10px] text-blue-500 hover:underline"
                download={fileName}
              >
                Download
              </a>
            )}
          </div>
        </div>
      )}
      
      {/* File info caption */}
      {msg.content && (
        <div className="mt-1 text-xs text-gray-600">
          {msg.content}
        </div>
      )}
    </div>
  );
};

// Helper function to get file icon
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  
  const icons = {
    pdf: '📕',
    doc: '📘',
    docx: '📘',
    xls: '📗',
    xlsx: '📗',
    ppt: '📙',
    pptx: '📙',
    txt: '📄',
    zip: '📦',
    rar: '📦',
    '7z': '📦',
  };
  
  return icons[ext] || '📎';
};

const renderReactions = (reactions, theme, onReact) => {
  const groups = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(groups).map(([emoji, count]) => (
    <button
      key={emoji}
      onClick={() => onReact(emoji)}
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition-transform hover:scale-110 ${
        theme === 'dark' ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200 shadow-sm'
      }`}
    >
      <span>{emoji}</span>
      <span className="font-bold">{count}</span>
    </button>
  ));
};

const StatusIndicator = ({ message, onRetry }) => {
  if (message.failed) {
    return (
      <button 
        onClick={onRetry} 
        className="text-red-300 hover:text-red-500 transition-colors"
        title="Retry sending"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    );
  }
  
  if (message.isOptimistic) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
        <span className="text-[8px] text-white/60">Sending</span>
      </div>
    );
  }
  
  return (
    <svg 
      className="w-3 h-3 text-blue-200" 
      fill="currentColor" 
      viewBox="0 0 20 20"
      title="Sent"
    >
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
};

MessageBubble.displayName = 'MessageBubble';
export default MessageBubble;