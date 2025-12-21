import { memo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const ChatHeader = memo(({
  isConnected,
  typingUsers = [],
  onlineUsers = [],
  messageCount = 0,
  tournamentName = 'Tournament Chat'
}) => {
  const { theme } = useTheme();
  
  const themeClasses = {
    header: theme === 'dark'
      ? 'bg-gray-900 border-gray-800 text-white'
      : 'bg-white border-gray-100 text-gray-900',
    textMuted: theme === 'dark' ? 'text-gray-400' : 'text-gray-500',
  };

  const getTypingText = () => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return `${typingUsers[0].username } is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  const typingText = getTypingText();

  return (
    <div className={`flex-shrink-0 px-4 py-3 border-b ${themeClasses.header}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <div>
            <h3 className="font-semibold text-sm md:text-base truncate max-w-[200px] md:max-w-[300px]">
              {tournamentName}
            </h3>
            <p className={`text-xs ${themeClasses.textMuted}`}>
              {isConnected ? (
                <>
                  {messageCount} messages • {onlineUsers.length} online
                </>
              ) : (
                'Connecting...'
              )}
            </p>
          </div>
        </div>
        
        {/* Online users */}
        {isConnected && onlineUsers.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 3).map((user, index) => (
                <div
                  key={user.id}
                  className={`w-6 h-6 rounded-full border-2 ${
                    theme === 'dark' ? 'border-gray-900' : 'border-white'
                  } flex items-center justify-center text-xs font-medium bg-blue-500 text-white`}
                  style={{ zIndex: 3 - index }}
                  title={user.name || `User ${user.id}`}
                >
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 3 && (
                <div className={`w-6 h-6 rounded-full border-2 ${
                  theme === 'dark' ? 'border-gray-900' : 'border-white'
                } flex items-center justify-center text-xs font-medium bg-gray-300 dark:bg-gray-600`}>
                  +{onlineUsers.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Typing indicator */}
      {typingText && (
        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 animate-pulse">
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span>{typingText}</span>
        </div>
      )}
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';
export default ChatHeader;