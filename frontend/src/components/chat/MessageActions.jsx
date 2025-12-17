import { memo, useContext } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useChat } from '../../contexts/ChatContext';

const MessageActions = memo(({
  message,
  isCurrentUser = false,
  onReply, // Keep as prop for UI-specific reply action
}) => {
  const { theme } = useTheme();
  const { onReactToMessage, onEditMessage, onDeleteMessage } = useChat();

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Handle reaction with context
  const handleReact = (emoji) => {
    if (message.id) {
      onReactToMessage(message.id, emoji).catch(error => {
        console.error('Failed to react:', error);
      });
    }
  };

  // Handle edit with context
  const handleEdit = () => {
    if (!message.id || !isCurrentUser) return;
    
    const newContent = prompt('Edit message:', message.content);
    if (newContent !== null && newContent.trim() !== message.content) {
      onEditMessage(message.id, newContent.trim()).catch(error => {
        console.error('Failed to edit:', error);
        alert('Failed to edit message. Please try again.');
      });
    }
  };

  // Handle delete with context
  const handleDelete = () => {
    if (!message.id || !isCurrentUser) return;
    
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDeleteMessage(message.id).catch(error => {
        console.error('Failed to delete:', error);
        alert('Failed to delete message. Please try again.');
      });
    }
  };

  return (
    <div className={`absolute ${
      isCurrentUser ? 'right-full mr-2' : 'left-full ml-2'
    } top-0 flex items-center space-x-1 p-1 rounded-lg z-20 ${
      theme === 'dark' 
        ? 'bg-gray-800 shadow-lg border border-gray-700' 
        : 'bg-white shadow-lg border border-gray-200'
    }`}>
      {/* Quick reactions */}
      <div className="flex items-center space-x-1">
        {commonEmojis.map(emoji => (
          <button
            key={emoji}
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            onClick={() => handleReact(emoji)}
            title={`React with ${emoji}`}
            type="button"
          >
            <span className="text-sm">{emoji}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

      {/* Action buttons */}
      <div className="flex items-center space-x-1">
        {/* Reply button */}
        {onReply && (
          <button
            className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            onClick={() => onReply(message)}
            title="Reply"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        )}

        {/* Edit and Delete buttons (current user only) */}
        {isCurrentUser && message.id && !message.isOptimistic && (
          <>
            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              onClick={handleEdit}
              title="Edit"
              type="button"
              disabled={message.isOptimistic}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <button
              className="w-7 h-7 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-red-500"
              onClick={handleDelete}
              title="Delete"
              type="button"
              disabled={message.isOptimistic}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
});

MessageActions.displayName = 'MessageActions';
export default MessageActions;