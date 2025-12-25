// SupportChannels.jsx
import React from 'react';

export default function SupportChannels({ channels, onAction }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {channels.map((channel, index) => (
        <div key={index} className="bg-neutral-800/50 backdrop-blur-sm border border-neutral-700 rounded-xl p-4 sm:p-6 hover:border-neutral-600 transition-all duration-200">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${
            channel.variant === 'primary' ? 'bg-blue-500/20' : 'bg-green-500/20'
          } flex items-center justify-center mb-3 sm:mb-4`}>
            {channel.icon}
          </div>
          <h3 className="text-gray-900 dark:text-white font-semibold text-base sm:text-lg mb-1 sm:mb-2">{channel.title}</h3>
          <p className="text-gray-400 text-sm sm:text-base mb-3 sm:mb-4 leading-relaxed">{channel.description}</p>
          <button 
            onClick={() => onAction(channel.actionType)}
            className={`w-full py-2 sm:py-3 px-4 rounded-lg font-medium transition-colors text-sm sm:text-base ${
              channel.variant === 'primary' 
                ? 'bg-blue-500 hover:bg-blue-600 text-gray-900 dark:text-white' 
                : 'bg-neutral-700 hover:bg-neutral-600 text-gray-900 dark:text-white'
            }`}
          >
            {channel.action}
          </button>
        </div>
      ))}
    </div>
  );
}