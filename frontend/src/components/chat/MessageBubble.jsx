import { memo, useState, useCallback, useMemo, useRef } from 'react';
import MessageActions from './MessageActions';
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
  Download,
  X
} from 'lucide-react';



const MessageBubble = memo(({
  message,
  isFirstInGroup = true,
  isLastInGroup = true,
  onReply,
  isHighlighted = false,
  showTimestamp = true,
  onRetry,
}) => {
  const bubbleRef = useRef(null);

  const { onReactToMessage, onEditMessage, onDeleteMessage, chatUser } = useChat();
  const [showActions, setShowActions] = useState(false);
  const [showReactionsList, setShowReactionsList] = useState(false);

  // Check if this message belongs to the logged-in user
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
  const handleReact = useCallback((emoji) => {
    if (message.id) {
      onReactToMessage(message.id, emoji);
      setShowReactionsList(false);
    }
  }, [message.id, onReactToMessage]);

  const handleEdit = useCallback((content) => {
    if (message.id) onEditMessage(message.id, content);
  }, [message.id, onEditMessage]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Delete message?')) onDeleteMessage(message.id);
  }, [message.id, onDeleteMessage]);

  // Tail logic: Only the first message in a group gets the "speech bubble" corner
  const roundingClasses = isMe
    ? `${isFirstInGroup ? 'rounded-2xl rounded-tr-none' : 'rounded-2xl'}`
    : `${isFirstInGroup ? 'rounded-2xl rounded-tl-none' : 'rounded-2xl'}`;

  // Get bubble alignment classes
  const alignmentClasses = isMe 
    ? 'ml-auto items-end' 
    : 'mr-auto items-start';

  // Bubble background colors
  const bubbleBg = isMe
    ? 'bg-blue-500 text-white dark:bg-blue-600'
    : 'bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700';

  // Optimized reactions rendering - group by emoji
  const groupedReactions = useMemo(() => {
    if (!message.reactions?.length) return [];
    
    const groups = {};
    message.reactions.forEach(reaction => {
      if (!groups[reaction.emoji]) {
        groups[reaction.emoji] = {
          emoji: reaction.emoji,
          count: 1,
          users: [reaction.user?.name || reaction.user?.username || 'User']
        };
      } else {
        groups[reaction.emoji].count++;
        if (reaction.user?.name || reaction.user?.username) {
          groups[reaction.emoji].users.push(reaction.user.name || reaction.user.username);
        }
      }
    });
    
    return Object.values(groups);
  }, [message.reactions]);

  return (
    <div
      className={`relative flex flex-col group w-full ${alignmentClasses} ${isLastInGroup ? 'mb-4' : 'mb-2'} max-w-[85%]`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      ref={bubbleRef}
    >
     

      {/* Actions Trigger - Floats outside the bubble */}
      {showActions && !message.failed && !message.isOptimistic && (
        <div className={`absolute z-20 top-0 ${isMe ? 'right-full -mr-8' : 'left-full -ml-8'}`}>
          <MessageActions
            message={message}
            isCurrentUser={isMe}
            onReact={handleReact}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onReply={onReply}
            bubbleRef={bubbleRef}
          />
        </div>
      )}

      {/* Reply Context */}
      {message.parentMessage && (
        <div className={`mb-1 p-2 rounded bg-gray-100 dark:bg-gray-700/50 border-l-4 border-blue-300 text-xs opacity-90 truncate max-w-full ${isMe ? 'self-end' : 'self-start'}`}>
          <span className="font-bold block mb-0.5 text-gray-900 dark:text-gray-100">
            {message.parentMessage.sender?.name || message.parentMessage.sender?.username || 'User'}
          </span>
          <span className="text-gray-600 dark:text-gray-300">
            {message.parentMessage.content?.slice(0, 100) || 'Media'}
          </span>
        </div>
      )}

      {/* Main Bubble Container */}
      <div 
        className={`relative ${bubbleBg} ${roundingClasses} px-3 py-2 shadow-sm transition-all duration-200 min-w-[60px] ${
          isHighlighted ? 'ring-2 ring-yellow-400 scale-[1.02]' : ''
        }`}
      >
        {/* WhatsApp-style Reactions Overlay */}
        {groupedReactions.length > 0 && (
          <div 
            className={`absolute -bottom-2 z-10 flex items-center space-x-1 px-2 py-1 rounded-full shadow-lg transition-all duration-200 ${
              isMe 
                ? 'right-3 bg-blue-50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700' 
                : 'left-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}
            onMouseEnter={() => setShowReactionsList(true)}
            onMouseLeave={() => setShowReactionsList(false)}
          >
            <div className="flex items-center space-x-1">
              {groupedReactions.slice(0, 2).map((reaction, idx) => (
                <div key={reaction.emoji} className="flex items-center">
                  <span className="text-sm">{reaction.emoji}</span>
                  {reaction.count > 1 && idx === 0 && (
                    <span className="text-xs ml-0.5 font-medium text-gray-700 dark:text-gray-300">
                      {reaction.count}
                    </span>
                  )}
                </div>
              ))}
              {groupedReactions.length > 2 && (
                <span className="text-xs ml-1 text-gray-500 dark:text-gray-400">
                  +{groupedReactions.length - 2}
                </span>
              )}
            </div>
            
            {/* Reactions Popup (like WhatsApp) */}
            {showReactionsList && (
              <div className={`absolute bottom-full mb-2 ${isMe ? 'right-0' : 'left-0'} min-w-[200px]`}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Reactions</h4>
                    <button
                      onClick={() => setShowReactionsList(false)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {groupedReactions.map((reaction) => (
                      <div 
                        key={reaction.emoji} 
                        className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{reaction.emoji}</span>
                          <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {reaction.users.slice(0, 2).join(', ')}
                              {reaction.users.length > 2 && ` +${reaction.users.length - 2} more`}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          {reaction.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media Content */}
        {renderMedia(message, isMe, onRetry)}

        {/* Message Text */}
        {message.content && (
          <div className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${
            isMe ? 'text-white' : 'text-gray-900 dark:text-gray-100'
          }`}>
            {message.content}
          </div>
        )}

        {/* Metadata Row (Time, Edited, Status) */}
        <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'} ${
          isMe ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
        }`}>
          {message.isEdited && (
            <span className="text-[10px] italic">edited</span>
          )}
          {showTimestamp && (
            <span className="text-[10px] select-none">
              {formatTime(message.createdAt || message.created_at)}
            </span>
          )}
          {isMe && <StatusIndicator message={message} onRetry={onRetry} isMe={isMe} />}
        </div>
      </div>
    </div>
  );
});

// --- HELPER RENDERS ---

const renderMedia = (msg, isMe, onRetry) => {
  const media = msg.mediaUrl || msg.attachments?.[0];
  if (!media) return null;
  
  const url = typeof media === 'string' ? media : media.url;
  if (!url) return null;
  
  const mediaType = 
    msg.type || 
    media.type || 
    media.mimeType ||
    (url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 
     url.match(/\.(mp4|webm|mov|avi|mkv)$/i) ? 'video' :
     url.match(/\.(mp3|wav|ogg|flac)$/i) ? 'audio' : 'file');
  
  const fileName = media.fileName || msg.fileName || 'Attachment';
  const fileSize = media.fileSize || msg.fileSize;
  const isBlobUrl = url.startsWith('blob:');
  const isImage = mediaType === 'image' || url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  const isVideo = mediaType === 'video' || url.match(/\.(mp4|webm|mov|avi|mkv)$/i);
  const isAudio = mediaType === 'audio' || url.match(/\.(mp3|wav|ogg|flac)$/i);
  
  return (
    <div className="mb-2">
      {/* Image */}
      {isImage && (
        <div className="rounded-lg overflow-hidden border border-black/10 dark:border-gray-700 max-w-full">
          <img 
            src={url} 
            alt={msg.content || 'Shared image'} 
            className="max-w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => !isBlobUrl && window.open(url, '_blank')}
            loading="lazy"
            onError={(e) => {
              if (isBlobUrl) {
                e.target.src = '/placeholder-image.png';
                e.target.onclick = null; 
              }
            }}
          />
          {msg.failed && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-2 rounded-b-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400" />
                <span>Upload failed. {msg.error || 'Please try again.'}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Video */}
      {isVideo && (
        <div className="rounded-lg overflow-hidden border border-black/10 dark:border-gray-700 max-w-full">
          <video
            src={url}
            className="max-w-full max-h-80 rounded-lg"
            controls
            playsInline
            preload="metadata"
            onError={(e) => {
              if (isBlobUrl) {
                e.target.parentElement.innerHTML = `
                  <div class="p-4 bg-gray-100 dark:bg-gray-800 text-center rounded-lg">
                    <p class="text-sm text-gray-600 dark:text-gray-300">Video preview not available</p>
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
        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-w-full">
          <div className="flex items-center gap-3 mb-2">
            <Mic className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{fileName}</p>
              {fileSize && (
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
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
                    <p class="text-xs text-gray-600 dark:text-gray-300">Audio not available</p>
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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-w-full">
          <div className={`w-8 h-8 rounded flex items-center justify-center text-white flex-shrink-0 ${
            isMe ? 'bg-blue-400' : 'bg-blue-500'
          }`}>
            {getFileIcon(fileName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate text-gray-900 dark:text-white">{fileName}</p>
            {fileSize && (
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {(fileSize / 1024).toFixed(1)} KB
              </p>
            )}
            {isBlobUrl ? (
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Processing upload...</p>
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
          {msg.failed && onRetry && (
            <button
              onClick={() => onRetry(msg)}
              className="p-1 text-red-500 hover:text-red-700"
              title="Retry upload"
            >
              <AlertCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      
      {/* File info caption */}
      {msg.content && (
        <div className={`mt-1 text-xs ${isMe ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'}`}>
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

const StatusIndicator = ({ message, onRetry, isMe }) => {
  if (message.failed) {
    return (
      <button 
        onClick={() => onRetry && onRetry(message)} 
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
      <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
        <Clock className="w-3 h-3 animate-pulse" />
      </div>
    );
  }
  
  return (
    <Check 
      className={`w-3 h-3 ${isMe ? 'text-blue-200' : 'text-gray-400'}`}
      title="Sent"
      aria-label="Message sent"
    />
  );
};

MessageBubble.displayName = 'MessageBubble';
export default MessageBubble;