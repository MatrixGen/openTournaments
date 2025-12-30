// ChannelList.jsx - Brand Color Scheme Version
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../common/ConfirmDialog';
import Banner from '../common/Banner';

export default function ChannelList({
  channels,
  loading,
  selectedChannel,
  onSelectChannel,
  onJoinChannel,
  onLeaveChannel,
  onDeleteChannel,
  currentUserId,
  themeClasses
}) {
  const [expandedChannel, setExpandedChannel] = useState(null);
  const [channelToDelete, setChannelToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [banner, setBanner] = useState(null);
  const navigate = useNavigate();

  // Brand color scheme based on your icon
  const brandColors = {
    primary: {
      light: 'bg-purple-600',
      dark: 'bg-purple-500',
      hover: {
        light: 'hover:bg-purple-700',
        dark: 'dark:hover:bg-purple-600'
      },
      text: 'text-white'
    },
    secondary: {
      light: 'bg-indigo-100 dark:bg-indigo-900/30',
      dark: 'dark:bg-indigo-900/20',
      hover: {
        light: 'hover:bg-indigo-200',
        dark: 'dark:hover:bg-indigo-800/40'
      },
      text: 'text-indigo-700 dark:text-indigo-300'
    },
    accent: {
      purple: 'bg-purple-500',
      indigo: 'bg-indigo-500',
      violet: 'bg-violet-500'
    },
    badges: {
      direct: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
      group: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
      private: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
      joined: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    }
  };

  const navigateToChat = (channelId, e) => {
    e?.stopPropagation();
    navigate(`/channels/${channelId}/chat`);
  };

  const handleDeleteClick = (channelId, e) => {
    e?.stopPropagation();
    setChannelToDelete(channelId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (channelToDelete) {
      onDeleteChannel(channelToDelete);
      setBanner({
        type: 'success',
        title: 'Channel Deleted',
        message: 'The channel has been successfully deleted.',
        autoDismiss: true,
        duration: 3000
      });
    }
    setDeleteConfirmOpen(false);
    setChannelToDelete(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setChannelToDelete(null);
  };

  const showBanner = (type, title, message) => {
    setBanner({ type, title, message, autoDismiss: true, duration: 4000 });
  };

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className={`${themeClasses.card} rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse`}>
            <div className="h-5 bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-800/10 dark:to-indigo-800/10 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className={`${themeClasses.card} rounded-2xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8 text-center bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-gray-900/50 dark:to-indigo-900/10`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">No channels found</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Get started by creating your first channel
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Banner for notifications */}
      {banner && (
        <div className="mb-4">
          <Banner
            type={banner.type}
            title={banner.title}
            message={banner.message}
            autoDismiss={banner.autoDismiss}
            duration={banner.duration}
            onAutoDismiss={() => setBanner(null)}
            onClose={() => setBanner(null)}
            compact
          />
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Channel"
        message="Are you sure you want to delete this channel? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmClassName="bg-purple-600 hover:bg-purple-700 text-white"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <div className="space-y-3">
        {channels.map(channel => {
          const isSelected = selectedChannel?.id === channel.id;
          const isExpanded = expandedChannel === channel.id;
          const isOwner = channel.ownerId === currentUserId;
          const isAdmin = channel.admins?.includes(currentUserId);
          const canManage = isOwner || isAdmin;

          // Channel type styling
          const getChannelStyle = (type) => {
            switch(type) {
              case 'direct':
                return {
                  bg: 'bg-gradient-to-r from-indigo-500 to-purple-500',
                  hover: 'hover:from-indigo-600 hover:to-purple-600',
                  badge: brandColors.badges.direct
                };
              case 'group':
                return {
                  bg: 'bg-gradient-to-r from-purple-500 to-violet-500',
                  hover: 'hover:from-purple-600 hover:to-violet-600',
                  badge: brandColors.badges.group
                };
              default:
                return {
                  bg: 'bg-gradient-to-r from-purple-600 to-indigo-600',
                  hover: 'hover:from-purple-700 hover:to-indigo-700',
                  badge: brandColors.badges.private
                };
            }
          };

          const channelStyle = getChannelStyle(channel.type);

          return (
            <div
              key={channel.id}
              className={`
                ${themeClasses.card} rounded-xl border border-gray-200 dark:border-gray-700 
                transition-all duration-300 
                ${isSelected 
                  ? 'ring-2 ring-purple-500 dark:ring-purple-400 shadow-lg' 
                  : 'hover:border-purple-200 dark:hover:border-purple-800 hover:shadow-md'
                }
                bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800
              `}
            >
              {/* Channel Header - Mobile Optimized */}
              <div 
                className="p-4 active:bg-gradient-to-br active:from-purple-50/50 active:to-indigo-50/50 dark:active:from-purple-900/10 dark:active:to-indigo-900/10"
                onClick={() => onSelectChannel(channel)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectChannel(channel)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base truncate text-gray-800 dark:text-gray-200">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`${channelStyle.badge} px-2 py-0.5 text-xs rounded-full font-medium`}>
                          {channel.type === 'direct' ? 'DM' : channel.type === 'group' ? 'Group' : 'Channel'}
                        </span>
                        {channel.isPrivate && (
                          <span className={`${brandColors.badges.private} px-2 py-0.5 text-xs rounded-full font-medium`}>
                            Private
                          </span>
                        )}
                        {channel.isMember && (
                          <span className={`${brandColors.badges.joined} px-2 py-0.5 text-xs rounded-full font-medium`}>
                            Joined
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {channel.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {channel.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.67 3.623l-.01.007a5 5 0 01-7.14-.007" />
                        </svg>
                        {channel.memberCount || 0} members
                      </span>
                      <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(channel.updatedAt || channel.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-2 mt-2 sm:mt-0">
                    {/* Primary Action Button */}
                    {channel.isMember ? (
                      <button
                        onClick={(e) => navigateToChat(channel.id, e)}
                        className={`
                          flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-medium 
                          flex items-center justify-center gap-2 transition-all duration-300
                          ${channelStyle.bg} ${channelStyle.hover} text-white
                          hover:shadow-lg hover:scale-105 active:scale-95
                        `}
                        style={{ minHeight: '40px' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="hidden sm:inline">Chat</span>
                        <span className="sm:hidden">Open</span>
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onJoinChannel(channel.id);
                          showBanner('success', 'Channel Joined', `You've joined ${channel.name}`);
                        }}
                        className={`
                          ${brandColors.primary.light} ${brandColors.primary.hover.light} 
                          ${brandColors.primary.dark} ${brandColors.primary.hover.dark}
                          ${brandColors.primary.text}
                          flex-1 sm:flex-none px-4 py-2 text-sm rounded-lg font-medium 
                          transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95
                        `}
                        style={{ minHeight: '40px' }}
                      >
                        Join
                      </button>
                    )}
                    
                    {/* Expand Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedChannel(isExpanded ? null : channel.id);
                      }}
                      className={`
                        p-2 rounded-lg transition-all duration-300
                        ${isExpanded 
                          ? 'bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-600 dark:text-purple-400' 
                          : 'hover:bg-gradient-to-br hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 text-gray-500 dark:text-gray-400'
                        }
                        hover:scale-105 active:scale-95
                      `}
                      aria-label={isExpanded ? "Collapse options" : "Expand options"}
                    >
                      <svg 
                        className={`w-5 h-5 transform transition-transform duration-300 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Expanded Actions - Mobile Friendly */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700 pt-4 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-800/50">
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* View Details */}
                    <button
                      onClick={() => onSelectChannel(channel)}
                      className={`
                        ${brandColors.secondary.light} ${brandColors.secondary.dark}
                        ${brandColors.secondary.hover.light} ${brandColors.secondary.hover.dark}
                        ${brandColors.secondary.text}
                        px-4 py-2.5 text-sm rounded-lg flex items-center justify-center gap-2
                        transition-all duration-300 hover:shadow-md
                      `}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                    
                    {/* Chat Button (if not already shown) */}
                    {channel.isMember && (
                      <button
                        onClick={(e) => navigateToChat(channel.id, e)}
                        className={`
                          px-4 py-2.5 text-sm rounded-lg flex items-center justify-center gap-2
                          transition-all duration-300 hover:shadow-md hover:scale-105 active:scale-95
                          ${channelStyle.bg} ${channelStyle.hover} text-white
                        `}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Open Chat
                      </button>
                    )}
                    
                    {/* Leave Button (for joined channels) */}
                    {channel.isMember && !isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeaveChannel(channel.id);
                          showBanner('info', 'Channel Left', `You've left ${channel.name}`);
                        }}
                        className={`
                          ${brandColors.secondary.light} ${brandColors.secondary.dark}
                          ${brandColors.secondary.hover.light} ${brandColors.secondary.hover.dark}
                          ${brandColors.secondary.text}
                          px-4 py-2.5 text-sm rounded-lg flex items-center justify-center gap-2
                          transition-all duration-300 hover:shadow-md
                        `}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Leave
                      </button>
                    )}
                    
                    {/* Management Actions */}
                    {canManage && (
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <button
                          onClick={() => {
                            onSelectChannel(channel);
                            // Trigger edit mode in parent
                          }}
                          className={`
                            ${brandColors.secondary.light} ${brandColors.secondary.dark}
                            ${brandColors.secondary.hover.light} ${brandColors.secondary.hover.dark}
                            ${brandColors.secondary.text}
                            flex-1 px-4 py-2.5 text-sm rounded-lg flex items-center justify-center gap-2
                            transition-all duration-300 hover:shadow-md
                          `}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>
                        
                        <button
                          onClick={(e) => handleDeleteClick(channel.id, e)}
                          className="
                            bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600
                            text-white flex-1 px-4 py-2.5 text-sm rounded-lg 
                            flex items-center justify-center gap-2
                            transition-all duration-300 hover:shadow-md
                          "
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}