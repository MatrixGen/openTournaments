import { useState, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';

export default function ChatSidebar() {
  const { channels, currentChannel, setCurrentChannel, unreadCounts } = useChat();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`fixed right-0 top-0 h-full bg-neutral-800 shadow-lg transform transition-transform ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    } w-80 z-50`}>
      <div className="p-4 border-b border-neutral-700">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-semibold">Tournament Chat</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-2">
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setCurrentChannel(channel)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                currentChannel?.id === channel.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-700 hover:bg-neutral-600 text-gray-300'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium truncate">{channel.name}</span>
                {unreadCounts[channel.id] > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCounts[channel.id]}
                  </span>
                )}
              </div>
              <p className="text-sm truncate text-gray-400">{channel.description}</p>
            </button>
          ))}
        </div>

        {channels.length === 0 && (
          <p className="text-gray-400 text-center py-4">No chat channels available</p>
        )}
      </div>
    </div>
  );
}