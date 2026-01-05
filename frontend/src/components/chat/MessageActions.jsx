import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../../contexts/ChatContext';
import {
  Reply,
  Edit,
  Trash2,
  MoreVertical,
  X,
  Smile,
  ChevronLeft
} from 'lucide-react';

const MessageActions = memo(({
  message,
  isCurrentUser = false,
  onReply,
  bubbleRef,
}) => {
  const { onReactToMessage, onEditMessage, onDeleteMessage } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [activeTab, setActiveTab] = useState('actions'); // 'actions' | 'reactions'
  const actionsRef = useRef(null);
  const touchStartRef = useRef(null);
  const touchStartTimeRef = useRef(0);

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);

  // Common emojis for quick reactions
  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥'];

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle long press for mobile
  useEffect(() => {
    if (!bubbleRef?.current || !isMobile) return;

    const bubble = bubbleRef.current;

    const handleTouchStart = (e) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      touchStartTimeRef.current = Date.now();
    };

    const handleTouchEnd = (e) => {
      if (!touchStartRef.current) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
      };
      
      const distance = Math.sqrt(
        Math.pow(touchEnd.x - touchStartRef.current.x, 2) +
        Math.pow(touchEnd.y - touchStartRef.current.y, 2)
      );
      
      const duration = Date.now() - touchStartTimeRef.current;
      
      // Long press (more than 500ms and minimal movement)
      if (duration > 500 && distance < 10) {
        e.preventDefault();
        toggleActions();
      }
      
      touchStartRef.current = null;
    };

    const handleContextMenu = (e) => {
      e.preventDefault();
      toggleActions();
    };

    bubble.addEventListener('touchstart', handleTouchStart, { passive: true });
    bubble.addEventListener('touchend', handleTouchEnd, { passive: true });
    bubble.addEventListener('contextmenu', handleContextMenu);

    return () => {
      bubble.removeEventListener('touchstart', handleTouchStart);
      bubble.removeEventListener('touchend', handleTouchEnd);
      bubble.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [bubbleRef, isMobile]);

  // Calculate position for desktop
  const calculatePosition = useCallback(() => {
    if (!bubbleRef?.current || !actionsRef?.current || isMobile) return;

    const bubbleRect = bubbleRef.current.getBoundingClientRect();
    const actionsRect = actionsRef.current.getBoundingClientRect();
    
    let top = bubbleRect.top - actionsRect.height - 10;
    let left = bubbleRect.left + (bubbleRect.width / 2) - (actionsRect.width / 2);

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (top < 20) {
      top = bubbleRect.bottom + 10;
    }

    if (top + actionsRect.height > viewportHeight - 20) {
      top = bubbleRect.top - actionsRect.height - 10;
    }

    if (left < 20) {
      left = 20;
    }
    if (left + actionsRect.width > viewportWidth - 20) {
      left = viewportWidth - actionsRect.width - 20;
    }

    setPosition({ top, left });
  }, [bubbleRef, isMobile]);

  useEffect(() => {
    if (isOpen && !isMobile) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition, isMobile]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        actionsRef.current && 
        !actionsRef.current.contains(event.target) &&
        bubbleRef?.current && 
        !bubbleRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setActiveTab('actions');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside, { passive: true });
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, bubbleRef]);

  // Handle reaction
  const handleReact = useCallback((emoji) => {
    if (message.id) {
      onReactToMessage(message.id, emoji).catch(error => {
        console.error('Failed to react:', error);
      });
      setIsOpen(false);
      setActiveTab('actions');
    }
  }, [message.id, onReactToMessage]);

  // Handle edit
  const handleEdit = useCallback(() => {
    if (!message.id || !isCurrentUser) return;
    
    const newContent = prompt('Edit message:', message.content);
    if (newContent !== null && newContent.trim() !== message.content) {
      onEditMessage(message.id, newContent.trim()).catch(error => {
        console.error('Failed to edit:', error);
        alert('Failed to edit message. Please try again.');
      });
    }
    setIsOpen(false);
    setActiveTab('actions');
  }, [message.id, message.content, isCurrentUser, onEditMessage]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!message.id || !isCurrentUser) return;
    
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDeleteMessage(message.id).catch(error => {
        console.error('Failed to delete:', error);
        alert('Failed to delete message. Please try again.');
      });
    }
    setIsOpen(false);
    setActiveTab('actions');
  }, [message.id, isCurrentUser, onDeleteMessage]);

  // Toggle actions menu
  const toggleActions = useCallback(() => {
    setIsOpen(prev => !prev);
    setActiveTab('actions');
  }, []);

  // Mobile Bottom Sheet
  const MobileBottomSheet = () => (
    <>
      {/* Overlay backdrop with swipe down to close */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={() => {
          setIsOpen(false);
          setActiveTab('actions');
        }}
        onTouchStart={(e) => {
          const touchY = e.touches[0].clientY;
          if (touchY < window.innerHeight / 3) {
            setIsOpen(false);
            setActiveTab('actions');
          }
        }}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={actionsRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        {/* Drag handle */}
        <div className="pt-3 pb-2 flex justify-center">
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {activeTab === 'reactions' && (
              <button
                onClick={() => setActiveTab('actions')}
                className="p-2 -ml-2"
                type="button"
                aria-label="Back to actions"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeTab === 'actions' ? 'Message Actions' : 'Add Reaction'}
            </h3>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setActiveTab('actions');
            }}
            className="p-2 -mr-2"
            type="button"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'actions' ? (
            <div className="p-4">
              {/* Quick Reactions Preview */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quick Reactions
                  </h4>
                  <button
                    onClick={() => setActiveTab('reactions')}
                    className="text-sm text-blue-600 dark:text-blue-400 font-medium"
                    type="button"
                  >
                    See all
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {commonEmojis.slice(0, 6).map(emoji => (
                    <button
                      key={emoji}
                      className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 rounded-full transition-all duration-150"
                      onClick={() => handleReact(emoji)}
                      type="button"
                      aria-label={`React with ${emoji}`}
                    >
                      <span className="text-2xl">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {onReply && (
                  <button
                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 rounded-xl transition-colors text-left"
                    onClick={() => {
                      onReply(message);
                      setIsOpen(false);
                    }}
                    type="button"
                  >
                    <div className="w-10 h-10 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 rounded-full">
                      <Reply className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="text-base font-medium text-gray-900 dark:text-white">
                        Reply
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Reply to this message
                      </div>
                    </div>
                  </button>
                )}

                {isCurrentUser && message.id && !message.isOptimistic && (
                  <>
                    <button
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-700 rounded-xl transition-colors text-left"
                      onClick={handleEdit}
                      type="button"
                    >
                      <div className="w-10 h-10 flex items-center justify-center bg-green-100 dark:bg-green-900/30 rounded-full">
                        <Edit className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-medium text-gray-900 dark:text-white">
                          Edit
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Edit this message
                        </div>
                      </div>
                    </button>

                    <button
                      className="w-full flex items-center gap-4 p-4 hover:bg-red-50 dark:hover:bg-red-900/20 active:bg-red-100 dark:active:bg-red-900/30 rounded-xl transition-colors text-left"
                      onClick={handleDelete}
                      type="button"
                    >
                      <div className="w-10 h-10 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-full">
                        <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-medium text-red-600 dark:text-red-400">
                          Delete
                        </div>
                        <div className="text-sm text-red-500 dark:text-red-300">
                          Permanently delete this message
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            // Reactions Tab
            <div className="p-4">
              <div className="grid grid-cols-6 gap-3">
                {commonEmojis.map(emoji => (
                  <button
                    key={emoji}
                    className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 rounded-xl transition-all duration-150"
                    onClick={() => handleReact(emoji)}
                    type="button"
                    aria-label={`React with ${emoji}`}
                  >
                    <span className="text-2xl">{emoji}</span>
                  </button>
                ))}
                <button
                  className="aspect-square flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 rounded-xl transition-all duration-150"
                  onClick={() => {
                    const emoji = prompt('Enter custom emoji:');
                    if (emoji) handleReact(emoji);
                  }}
                  type="button"
                  aria-label="Custom reaction"
                >
                  <Smile className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Safe area spacer for iOS */}
        <div className="h-4 bg-white dark:bg-gray-900" />
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );

  // Desktop Actions Menu (existing with small improvements)
  const DesktopActionsMenu = () => (
    <>
      <div 
        className="fixed inset-0 bg-black/10 z-40"
        onClick={() => setIsOpen(false)}
      />
      
      <div
        ref={actionsRef}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[280px]"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Message Actions
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            type="button"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Quick Reactions
          </h4>
          <div className="flex flex-wrap gap-2">
            {commonEmojis.map(emoji => (
              <button
                key={emoji}
                className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                onClick={() => handleReact(emoji)}
                title={`React with ${emoji}`}
                type="button"
              >
                <span className="text-lg">{emoji}</span>
              </button>
            ))}
            <button
              className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
              onClick={() => {
                const emoji = prompt('Enter custom emoji:');
                if (emoji) handleReact(emoji);
              }}
              title="Custom reaction"
              type="button"
            >
              <Smile className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        <div className="p-2">
          {onReply && (
            <button
              className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
              onClick={() => {
                onReply(message);
                setIsOpen(false);
              }}
              type="button"
            >
              <Reply className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Reply
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Reply to this message
                </div>
              </div>
            </button>
          )}

          {isCurrentUser && message.id && !message.isOptimistic && (
            <>
              <button
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                onClick={handleEdit}
                type="button"
              >
                <Edit className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Edit
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Edit this message
                  </div>
                </div>
              </button>

              <button
                className="w-full flex items-center gap-3 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left text-red-600 dark:text-red-400"
                onClick={handleDelete}
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Delete</div>
                  <div className="text-xs text-red-500 dark:text-red-300">
                    Permanently delete this message
                  </div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );

  // Show mobile-optimized button
  if (!isOpen) {
    return (
      <button
        onClick={toggleActions}
        className={`absolute top-1/2 transform -translate-y-1/2 z-10 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
          isMobile 
            ? 'p-2.5 opacity-100 active:scale-95' 
            : 'p-1.5 opacity-0 group-hover:opacity-100'
        }`}
        style={{
          left: isCurrentUser ? (isMobile ? '-44px' : '-40px') : 'auto',
          right: isCurrentUser ? 'auto' : (isMobile ? '-44px' : '-40px')
        }}
        title="Message actions"
        type="button"
        aria-label="Message actions"
      >
        <MoreVertical className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-gray-600 dark:text-gray-300`} />
      </button>
    );
  }

  return isMobile ? <MobileBottomSheet /> : <DesktopActionsMenu />;
});

MessageActions.displayName = 'MessageActions';
export default MessageActions;