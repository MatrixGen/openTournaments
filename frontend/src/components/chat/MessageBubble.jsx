import { memo, useState, useCallback, useMemo } from 'react';
import MessageActions from './MessageActions';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';
import { 
  Paperclip, 
  Image as ImageIcon,
  Film,
  File,
  Mic,
  Check,
  AlertCircle,
  Clock,
  Download
} from 'lucide-react';

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
    ? (theme === 'dark' ? 'bg-blue-600 text-gray-900 dark:text-white' : 'bg-blue-500 text-gray-900 dark:text-white')
    : (theme === 'dark' ? 'bg-gray-700 text-gray-100' : 'bg-white text-gray-900 border border-gray-200');

  // Tail logic: Only the first message in a group gets the "speech bubble" corner
  const roundingClasses = isMe
    ? `${isFirstInGroup ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl'}`
    : `${isFirstInGroup ? 'rounded-2xl rounded-tl-none' : 'rounded-2xl'}`;

  // Get bubble alignment classes
  const alignmentClasses = isMe 
    ? 'ml-auto items-end' 
    : 'mr-auto items-start';

  return (
    <div
      className={`relative flex flex-col group w-full ${alignmentClasses} ${isLastInGroup ? 'mb-4' : 'mb-2'} max-w-[85%]`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Actions Trigger - Floats outside the bubble */}
      {showActions && (
        <div className={`absolute z-20 top-0 ${isMe ? 'right-full -mr-8' : 'left-full -ml-8'}`}>
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

      {/* Reply Context */}
      {message.parentMessage && (
        <div className={`mb-1 p-2 rounded bg-black/10 border-l-4 border-blue-300 text-xs opacity-90 truncate max-w-full ${isMe ? 'self-end' : 'self-start'}`}>
          <span className="font-bold block mb-0.5">
            {message.parentMessage.sender?.username || 'User'}
          </span>
          {message.parentMessage.content?.slice(0, 100) || 'Media'}
        </div>
      )}

      {/* Main Bubble Container */}
      <div 
        className={`relative ${bubbleTheme} ${roundingClasses} px-3 py-2 shadow-sm transition-all duration-200 ${
          isHighlighted ? 'ring-2 ring-yellow-400 scale-[1.02]' : ''
        }`}
      >
        {/* Media Content */}
        {renderMedia(message, isMe)}

        {/* Message Text */}
        {message.content && (
          <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </div>
        )}

        {/* Metadata Row (Time, Edited, Status) */}
        <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'} opacity-70`}>
          {message.isEdited && <span className="text-[10px] italic">edited</span>}
          <span className="text-[10px] select-none">
            {formatTime(message.createdAt || message.created_at)}
          </span>
          {isMe && <StatusIndicator message={message} onRetry={handleRetry} />}
        </div>
      </div>

      {/* Reactions List - Now outside the bubble */}
      {message.reactions?.length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end mr-1' : 'justify-start ml-1'}`}>
          {renderReactions(message.reactions, theme, handleReact)}
        </div>
      )}
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
            <div className="text-gray-900 dark:text-white text-xs flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
              <span>Uploading...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Image */}
      {isImage && (
        <div className="rounded-lg overflow-hidden border border-black/5 max-w-full">
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
                <AlertCircle className="w-3 h-3 text-red-500" />
                <span>Upload failed. {msg.error || 'Please try again.'}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Video */}
      {isVideo && (
        <div className="rounded-lg overflow-hidden border border-black/5 max-w-full">
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
        <div className="p-3 rounded-lg bg-black/5 border border-black/10 max-w-full">
          <div className="flex items-center gap-3 mb-2">
            <Mic className="w-4 h-4" />
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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-black/5 border border-black/10 max-w-full">
          <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
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
                className="text-[10px] text-blue-500 hover:underline inline-flex items-center gap-1"
                download={fileName}
              >
                <Download className="w-3 h-3" />
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

// Helper function to get file icon component
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  
  const iconMap = {
    pdf: <File className="w-4 h-4" />,
    doc: <File className="w-4 h-4" />,
    docx: <File className="w-4 h-4" />,
    xls: <File className="w-4 h-4" />,
    xlsx: <File className="w-4 h-4" />,
    ppt: <File className="w-4 h-4" />,
    pptx: <File className="w-4 h-4" />,
    txt: <File className="w-4 h-4" />,
    zip: <File className="w-4 h-4" />,
    rar: <File className="w-4 h-4" />,
    '7z': <File className="w-4 h-4" />,
    jpg: <ImageIcon className="w-4 h-4" />,
    jpeg: <ImageIcon className="w-4 h-4" />,
    png: <ImageIcon className="w-4 h-4" />,
    gif: <ImageIcon className="w-4 h-4" />,
    mp4: <Film className="w-4 h-4" />,
    mov: <Film className="w-4 h-4" />,
    avi: <Film className="w-4 h-4" />,
    mkv: <Film className="w-4 h-4" />,
    mp3: <Mic className="w-4 h-4" />,
    wav: <Mic className="w-4 h-4" />,
  };
  
  return iconMap[ext] || <File className="w-4 h-4" />;
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
      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-transform hover:scale-110 active:scale-95 ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-600 text-gray-100' 
          : 'bg-white border-gray-200 text-gray-800 shadow-sm'
      }`}
    >
      <span className="text-sm">{emoji}</span>
      <span className="font-bold text-xs">{count}</span>
    </button>
  ));
};

const StatusIndicator = ({ message, onRetry }) => {
  if (message.failed) {
    return (
      <button 
        onClick={onRetry} 
        className="text-red-400 hover:text-red-600 transition-colors p-0.5"
        title="Retry sending"
        aria-label="Retry sending"
      >
        <AlertCircle className="w-3 h-3" />
      </button>
    );
  }
  
  if (message.isOptimistic || message.pending) {
    return (
      <div className="flex items-center gap-1 text-gray-400">
        <Clock className="w-3 h-3 animate-pulse" />
      </div>
    );
  }
  
  return (
    <Check 
      className="w-3 h-3 text-blue-200" 
      title="Sent"
      aria-label="Message sent"
    />
  );
};

MessageBubble.displayName = 'MessageBubble';
export default MessageBubble;