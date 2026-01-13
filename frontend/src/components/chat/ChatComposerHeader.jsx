import { memo } from "react";
import { Globe, Lock, Loader2, Users } from "lucide-react";

const ChatComposerHeader = memo(
  ({
    showChannelInfo,
    chatData,
    channelConfig,
    onlineUsersCount,
    typingUsersCount,
    isConnected,
  }) => {
    const Icon = channelConfig.icon;

    return (
      <>
        {!isConnected && (
          <div className="flex items-center justify-center space-x-2 py-3 px-4">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
            <span className="text-sm text-yellow-500">
              Connecting to chat...
            </span>
          </div>
        )}

        {showChannelInfo && chatData?.id && (
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${channelConfig.bg}`}>
                  <Icon className={`w-4 h-4 ${channelConfig.color}`} />
                </div>
                <div>
                  <h3 className="text-sm font-medium">{chatData.name}</h3>
                  <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>
                        {chatData.memberCount ||
                          chatData.participants?.length ||
                          0}{" "}
                        members
                      </span>
                    </span>
                    {onlineUsersCount > 0 && (
                      <span className="flex items-center space-x-1 text-green-500">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>{onlineUsersCount} online</span>
                      </span>
                    )}
                    {typingUsersCount > 0 && (
                      <span className="text-blue-500">
                        {typingUsersCount} typing...
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {chatData.isPrivate ? (
                  <Lock className="w-4 h-4 text-purple-500" />
                ) : (
                  <Globe className="w-4 h-4 text-green-500" />
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }
);

ChatComposerHeader.displayName = "ChatComposerHeader";

export default ChatComposerHeader;
