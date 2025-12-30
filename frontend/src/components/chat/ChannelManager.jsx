// ChannelManager.jsx - Optimized Mobile-First Version
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import ChatService from '../../services/chatService';
import ChannelList from './ChannelList';
import ChannelForm from './ChannelForm';
import ChannelDetails from './ChannelDetails';
import InviteUsersModal from './InviteUsersModal';
import MemberManagement from './MemberManagement';
import { useChat } from '../../contexts/ChatContext';
import Banner from '../common/Banner';
import ConfirmDialog from '../common/ConfirmDialog';

function ChannelManager() {
  const { chatUser } = useChat();
  const { theme } = useTheme();
  const currentUserId = chatUser?.user?.id;

  // State
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, channelId: null });

// System-aware theme classes (no explicit theme checking needed)
const themeClasses = useMemo(() => ({
  container: 
    'bg-gradient-to-br from-gray-50 to-indigo-50/20 text-gray-900 ' +
    'dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 dark:text-gray-100',
  
  card: 
    'bg-gradient-to-br from-white to-purple-50/20 border-gray-200 ' +
    'dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800/90 dark:border-gray-700',
  
  input: 
    'bg-white/80 border-gray-300 text-gray-900 placeholder-gray-500 ' +
    'focus:border-purple-400 focus:ring-2 focus:ring-purple-200 ' +
    'dark:bg-gray-700/50 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 ' +
    'dark:focus:border-purple-500 dark:focus:ring-2 dark:focus:ring-purple-500/30',
  
  button: {
    primary: 
      'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 ' +
      'text-white shadow-lg hover:shadow-purple-400/25 ' +
      'dark:from-purple-600 dark:to-indigo-600 dark:hover:from-purple-700 dark:hover:to-indigo-700 ' +
      'dark:hover:shadow-purple-500/25',
    
    secondary: 
      'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 ' +
      'text-gray-800 ' +
      'dark:from-gray-700 dark:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 ' +
      'dark:text-gray-200',
    
    danger: 
      'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 ' +
      'text-white ' +
      'dark:from-red-700 dark:to-pink-700 dark:hover:from-red-800 dark:hover:to-pink-800',
  },
  
  badge: {
    public: 
      'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 ' +
      'dark:from-emerald-900/40 dark:to-teal-900/40 dark:text-emerald-300',
    
    private: 
      'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 ' +
      'dark:from-purple-900/40 dark:to-violet-900/40 dark:text-purple-300',
    
    joined: 
      'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-800 ' +
      'dark:from-indigo-900/40 dark:to-blue-900/40 dark:text-indigo-300',
    
    direct: 
      'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-800 ' +
      'dark:from-indigo-900/50 dark:to-purple-900/50 dark:text-indigo-300',
    
    group: 
      'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 ' +
      'dark:from-purple-900/50 dark:to-violet-900/50 dark:text-purple-300',
  }
}), []); 

  // Show banner notification
  const showBanner = (type, title, message, duration = 4000) => {
    setBanner({ type, title, message, duration, autoDismiss: true });
  };

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let params = {};
      switch (filter) {
        case 'joined':
          params.joined = true;
          break;
        case 'public':
          params.isPrivate = false;
          break;
        case 'private':
          params.isPrivate = true;
          break;
      }
      
      const response = await ChatService.getChannels(params);
      let channelsData = response.data?.channels || response.channels || response;
      
      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        channelsData = channelsData.filter(channel =>
          channel.name?.toLowerCase().includes(query) ||
          channel.description?.toLowerCase().includes(query)
        );
      }
      
      // Apply sorting
      channelsData.sort((a, b) => {
        switch (sortBy) {
          case 'name':
            return (a.name || '').localeCompare(b.name || '');
          case 'members':
            return (b.memberCount || 0) - (a.memberCount || 0);
          case 'recent':
          default:
            return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
        }
      });
      
      setChannels(channelsData);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to load channels' };
      setError(errorData.message);
      showBanner('error', 'Load Error', errorData.message);
    } finally {
      setLoading(false);
    }
  }, [filter, searchQuery, sortBy]);

  // Initial load
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        fetchChannels();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filter, sortBy]);

  // Handle channel creation
  const handleCreateChannel = async (channelData) => {
    try {
      const dataToSend = {
        ...channelData,
        participantIds: Array.isArray(channelData.participantIds) ? channelData.participantIds : []
      };
      
      const response = await ChatService.createChannel(dataToSend);
      const newChannel = response.data?.channel || response.channel || response;
      
      setChannels(prev => [newChannel, ...prev]);
      setSelectedChannel(newChannel);
      setShowCreateForm(false);
      
      showBanner('success', 'Channel Created', `"${newChannel.name}" has been created successfully!`);
      
    } catch (err) {
      console.error('Failed to create channel:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to create channel' };
      showBanner('error', 'Creation Failed', errorData.message);
      throw errorData;
    }
  };

  // Handle channel update
  const handleUpdateChannel = async (channelId, updates) => {
    try {
      const response = await ChatService.updateChannel(channelId, updates);
      const updatedChannel = response.data || response;
      
      setChannels(prev => prev.map(channel =>
        channel.id === channelId ? { ...channel, ...updatedChannel } : channel
      ));
      
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(prev => ({ ...prev, ...updatedChannel }));
      }
      
      showBanner('success', 'Channel Updated', `"${updatedChannel.name}" has been updated!`);
      return updatedChannel;
    } catch (err) {
      console.error('Failed to update channel:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to update channel' };
      showBanner('error', 'Update Failed', errorData.message);
      throw errorData;
    }
  };

  // Handle channel deletion
  const handleDeleteChannel = async (channelId) => {
    try {
      await ChatService.deleteChannel(channelId);
      
      const deletedChannel = channels.find(c => c.id === channelId);
      setChannels(prev => prev.filter(channel => channel.id !== channelId));
      
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
      }
      
      showBanner('info', 'Channel Deleted', `"${deletedChannel?.name || 'Channel'}" has been deleted.`);
      
    } catch (err) {
      console.error('Failed to delete channel:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to delete channel' };
      showBanner('error', 'Deletion Failed', errorData.message);
    } finally {
      setDeleteConfirm({ open: false, channelId: null });
    }
  };

  // Handle join/leave channel
  const handleToggleChannelMembership = async (channelId, isJoining) => {
    try {
      const channel = channels.find(c => c.id === channelId);
      
      if (isJoining) {
        await ChatService.joinChannel(channelId);
        showBanner('success', 'Channel Joined', `You've joined "${channel?.name}"!`);
      } else {
        await ChatService.leaveChannel(channelId);
        showBanner('info', 'Channel Left', `You've left "${channel?.name}".`);
      }
      
      // Update channels
      setChannels(prev => prev.map(channel => {
        if (channel.id === channelId) {
          return {
            ...channel,
            isMember: isJoining,
            memberCount: (channel.memberCount || 0) + (isJoining ? 1 : -1)
          };
        }
        return channel;
      }));
      
      // Update selected channel
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(prev => ({
          ...prev,
          isMember: isJoining,
          memberCount: (prev.memberCount || 0) + (isJoining ? 1 : -1)
        }));
      }
      
    } catch (err) {
      console.error('Failed to toggle membership:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to update membership' };
      showBanner('error', 'Action Failed', errorData.message);
    }
  };

  // Handle inviting users
  const handleInviteUsers = async (channelId, userIds) => {
    try {
      await ChatService.inviteUsers?.(channelId, userIds);
      setShowInviteModal(false);
      showBanner('success', 'Invites Sent', 'Users have been invited successfully!');
    } catch (err) {
      console.error('Failed to invite users:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to invite users' };
      showBanner('error', 'Invite Failed', errorData.message);
      throw errorData;
    }
  };

  // Handle member management
  const handleUpdateMemberRole = async (channelId, userId, role) => {
    try {
      await ChatService.updateMemberRole?.(channelId, userId, role);
      showBanner('success', 'Role Updated', 'Member role has been updated.');
    } catch (err) {
      console.error('Failed to update member role:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to update role' };
      showBanner('error', 'Update Failed', errorData.message);
      throw errorData;
    }
  };

  // Handle member removal
  const handleRemoveMember = async (channelId, userId) => {
    try {
      await ChatService.removeMember?.(channelId, userId);
      
      setChannels(prev => prev.map(channel => {
        if (channel.id === channelId) {
          return {
            ...channel,
            memberCount: Math.max((channel.memberCount || 1) - 1, 0)
          };
        }
        return channel;
      }));
      
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(prev => ({
          ...prev,
          memberCount: Math.max((prev.memberCount || 1) - 1, 0)
        }));
      }
      
      showBanner('info', 'Member Removed', 'Member has been removed from the channel.');
    } catch (err) {
      console.error('Failed to remove member:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to remove member' };
      showBanner('error', 'Removal Failed', errorData.message);
      throw errorData;
    }
  };

  return (
    <div className={`min-h-screen ${themeClasses.container} p-4 md:p-6 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto">
        {/* Banner Notifications */}
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

        {/* Confirm Dialog for Deletion */}
        <ConfirmDialog
          isOpen={deleteConfirm.open}
          title="Delete Channel"
          message="Are you sure you want to delete this channel? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmClassName="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
          onConfirm={() => handleDeleteChannel(deleteConfirm.channelId)}
          onCancel={() => setDeleteConfirm({ open: false, channelId: null })}
        />

        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Channel Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                Create, manage, and organize your chat channels
              </p>
            </div>
            
            {/* Create Button - Mobile Only */}
            <button
              onClick={() => setShowCreateForm(true)}
              className="md:hidden px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg hover:shadow-purple-500/25 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Channel</span>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Channel List & Controls */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Controls Bar */}
            <div className={`${themeClasses.card} rounded-xl border p-4 shadow-sm`}>
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search channels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${themeClasses.input} w-full pl-10 pr-4 py-2.5 rounded-lg border focus:outline-none text-sm md:text-base`}
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Filters */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { value: 'all', label: 'All', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
                      { value: 'joined', label: 'My', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                      { value: 'public', label: 'Public', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
                      { value: 'private', label: 'Private', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setFilter(item.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all duration-200 ${
                          filter === item.value
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                        </svg>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* Sort & Create */}
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={`${themeClasses.input} px-3 py-2.5 rounded-lg border focus:outline-none text-sm flex-1 min-w-[140px]`}
                    >
                      <option value="recent">Recent</option>
                      <option value="name">Name A-Z</option>
                      <option value="members">Most Members</option>
                    </select>
                    
                    {/* Create Button - Desktop Only */}
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className={`${themeClasses.button.primary} px-4 py-2.5 rounded-lg font-medium hidden md:flex items-center gap-2 transition-all duration-200 hover:scale-105 active:scale-95`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Channel
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Channel List */}
            <ChannelList
              channels={channels}
              loading={loading}
              selectedChannel={selectedChannel}
              onSelectChannel={setSelectedChannel}
              onJoinChannel={(channelId) => handleToggleChannelMembership(channelId, true)}
              onLeaveChannel={(channelId) => handleToggleChannelMembership(channelId, false)}
              onDeleteChannel={(channelId) => setDeleteConfirm({ open: true, channelId })}
              currentUserId={currentUserId}
              themeClasses={themeClasses}
            />
          </div>

          {/* Right Column - Channel Details & Actions */}
          <div className="lg:col-span-1">
            {selectedChannel ? (
              <ChannelDetails
                channel={selectedChannel}
                currentUserId={currentUserId}
                onUpdateChannel={handleUpdateChannel}
                onDeleteChannel={(channelId) => setDeleteConfirm({ open: true, channelId })}
                onToggleMembership={handleToggleChannelMembership}
                onInviteUsers={() => setShowInviteModal(true)}
                onManageMembers={() => setShowMembersModal(true)}
                themeClasses={themeClasses}
              />
            ) : (
              <div className={`${themeClasses.card} rounded-xl border p-6 text-center h-full flex flex-col items-center justify-center`}>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">Select a Channel</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                  Choose a channel from the list to view details and manage settings
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className={`${themeClasses.button.primary} px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:scale-105 active:scale-95`}
                >
                  Create Your First Channel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`${themeClasses.card} rounded-2xl border w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl`}>
              <ChannelForm
                onSubmit={handleCreateChannel}
                onCancel={() => setShowCreateForm(false)}
                themeClasses={themeClasses}
              />
            </div>
          </div>
        )}

        {showInviteModal && selectedChannel && (
          <InviteUsersModal
            channel={selectedChannel}
            onSubmit={(userIds) => handleInviteUsers(selectedChannel.id, userIds)}
            onCancel={() => setShowInviteModal(false)}
            themeClasses={themeClasses}
          />
        )}

        {showMembersModal && selectedChannel && (
          <MemberManagement
            channel={selectedChannel}
            currentUserId={currentUserId}
            onUpdateRole={handleUpdateMemberRole}
            onRemoveMember={handleRemoveMember}
            onClose={() => setShowMembersModal(false)}
            themeClasses={themeClasses}
          />
        )}
      </div>
    </div>
  );
}

export default ChannelManager;