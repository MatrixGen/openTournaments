import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatService from '../../services/chatService';
import ChannelList from '../../components/channels/ChannelList';
import InviteUsersModal from '../../components/channels/InviteUsersModal';
import MemberManagement from '../../components/channels/MemberManagement';
import SquadFiltersDrawer from '../../components/channels/SquadFiltersDrawer';
import { useChat } from '../../contexts/ChatContext';
import Banner from '../../components/common/Banner';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { Filter } from 'lucide-react';

const normalizeChannelsResponse = (resp) => {
  const channels =
    resp?.data?.data?.channels ||
    resp?.data?.channels ||
    resp?.channels ||
    (Array.isArray(resp) ? resp : []);

  const pagination =
    resp?.data?.data?.pagination ||
    resp?.data?.pagination ||
    resp?.pagination ||
    null;

  return {
    channels: Array.isArray(channels) ? channels : [],
    pagination,
  };
};

const getLatestMessageTime = (channel) => {
  const value = channel?.latestMessage?.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
};

const getUpdatedTime = (channel) => {
  const value = channel?.updatedAt || channel?.createdAt;
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const sortByPriority = (a, b) => {
  const unreadA = Boolean(a?.hasUnread);
  const unreadB = Boolean(b?.hasUnread);
  if (unreadA !== unreadB) return unreadA ? -1 : 1;

  const notifyA = a?.notificationCount || 0;
  const notifyB = b?.notificationCount || 0;
  if (notifyA !== notifyB) return notifyB - notifyA;

  const latestA = getLatestMessageTime(a);
  const latestB = getLatestMessageTime(b);
  if (latestA && !latestB) return -1;
  if (!latestA && latestB) return 1;
  if (latestA && latestB && latestA !== latestB) return latestB - latestA;

  return getUpdatedTime(b) - getUpdatedTime(a);
};

const sortChannels = (list, sortBy) => {
  const channels = [...list];

  if (sortBy === 'name') {
    return channels.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  if (sortBy === 'members') {
    return channels.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
  }

  return channels.sort(sortByPriority);
};

function ChannelManager() {
  const { chatUser } = useChat();
  const currentUserId = chatUser?.user?.id;
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, channelId: null });
  const [showFilters, setShowFilters] = useState(false);

  const filterButtonRef = useRef(null);

  const uiClasses = {
    page: 'bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-gray-100',
    card: 'bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700',
    input:
      'bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent',
    button: {
      primary: 'bg-primary-500 hover:bg-primary-600 text-white',
      secondary: 'bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-neutral-600',
    },
  };
  const themeClasses = {
    card: uiClasses.card,
    input: uiClasses.input,
    button: {
      primary: uiClasses.button.primary,
      secondary: uiClasses.button.secondary,
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    },
    badge: {
      joined: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
      public: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300',
    },
  };

  const showBanner = (type, title, message, duration = 4000) => {
    setBanner({ type, title, message, duration, autoDismiss: true });
  };

  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ChatService.getChannels({});
      const { channels: incoming } = normalizeChannelsResponse(response);
      setChannels(incoming);
    } catch (err) {
      console.error('Failed to fetch squads:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to load squads' };
      setError(errorData.message);
      showBanner('error', 'Load Error', errorData.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const filteredChannels = useMemo(() => {
    let list = channels;

    if (filter === 'joined') {
      list = list.filter((channel) => channel.isMember);
    } else if (filter === 'public') {
      list = list.filter((channel) => channel.isPrivate === false);
    } else if (filter === 'private') {
      list = list.filter((channel) => channel.isPrivate === true);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (channel) =>
          channel.name?.toLowerCase().includes(query) ||
          channel.description?.toLowerCase().includes(query)
      );
    }

    return sortChannels(list, sortBy);
  }, [channels, filter, searchQuery, sortBy]);

  const handleDeleteChannel = async (channelId) => {
    try {
      await ChatService.deleteChannel(channelId);

      const deletedChannel = channels.find((channel) => channel.id === channelId);
      setChannels((prev) => prev.filter((channel) => channel.id !== channelId));

      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null);
      }

      showBanner('info', 'Squad Deleted', `"${deletedChannel?.name || 'Squad'}" has been deleted.`);
    } catch (err) {
      console.error('Failed to delete squad:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to delete squad' };
      showBanner('error', 'Deletion Failed', errorData.message);
    } finally {
      setDeleteConfirm({ open: false, channelId: null });
    }
  };

  const handleToggleChannelMembership = async (channelId, isJoining) => {
    try {
      const channel = channels.find((item) => item.id === channelId);

      if (isJoining) {
        await ChatService.joinChannel(channelId);
        showBanner('success', 'Squad Joined', `You've joined "${channel?.name}"!`);
      } else {
        await ChatService.leaveChannel(channelId);
        showBanner('info', 'Squad Left', `You've left "${channel?.name}".`);
      }

      setChannels((prev) =>
        prev.map((item) => {
          if (item.id === channelId) {
            return {
              ...item,
              isMember: isJoining,
              memberCount: (item.memberCount || 0) + (isJoining ? 1 : -1),
            };
          }
          return item;
        })
      );

      if (selectedChannel?.id === channelId) {
        setSelectedChannel((prev) => ({
          ...prev,
          isMember: isJoining,
          memberCount: (prev.memberCount || 0) + (isJoining ? 1 : -1),
        }));
      }
    } catch (err) {
      console.error('Failed to toggle squad membership:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to update squad membership' };
      showBanner('error', 'Action Failed', errorData.message);
    }
  };

  const handleInviteUsers = async (channelId, userIds) => {
    try {
      await ChatService.inviteUsers?.(channelId, userIds);
      setActiveModal(null);
      showBanner('success', 'Invites Sent', 'Users have been invited successfully!');
    } catch (err) {
      console.error('Failed to invite users:', err);
      const errorData = ChatService.handleError?.(err) || {
        message: 'Failed to invite users to the squad',
      };
      showBanner('error', 'Invite Failed', errorData.message);
      throw errorData;
    }
  };

  const handleUpdateMemberRole = async (channelId, userId, role) => {
    try {
      await ChatService.updateMemberRole?.(channelId, userId, role);
      showBanner('success', 'Role Updated', 'Squad member role has been updated.');
    } catch (err) {
      console.error('Failed to update squad member role:', err);
      const errorData = ChatService.handleError?.(err) || {
        message: 'Failed to update squad member role',
      };
      showBanner('error', 'Update Failed', errorData.message);
      throw errorData;
    }
  };

  const handleRemoveMember = async (channelId, userId) => {
    try {
      await ChatService.removeMember?.(channelId, userId);

      setChannels((prev) =>
        prev.map((item) => {
          if (item.id === channelId) {
            return {
              ...item,
              memberCount: Math.max((item.memberCount || 1) - 1, 0),
            };
          }
          return item;
        })
      );

      if (selectedChannel?.id === channelId) {
        setSelectedChannel((prev) => ({
          ...prev,
          memberCount: Math.max((prev.memberCount || 1) - 1, 0),
        }));
      }

      showBanner('info', 'Member Removed', 'Member has been removed from the squad.');
    } catch (err) {
      console.error('Failed to remove squad member:', err);
      const errorData = ChatService.handleError?.(err) || { message: 'Failed to remove squad member' };
      showBanner('error', 'Removal Failed', errorData.message);
      throw errorData;
    }
  };

  return (
    <div className={`min-h-screen ${uiClasses.page} p-4 md:p-6`}>
      <SquadFiltersDrawer
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filter={filter}
        setFilter={setFilter}
        anchorRef={filterButtonRef}
      />

      <div className="max-w-7xl mx-auto">
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

        {error && (
          <div className="mb-4">
            <Banner
              type="error"
              title="Failed to load squads"
              message={error}
              onClose={() => setError(null)}
              action={{ text: 'Retry', onClick: fetchChannels }}
              compact
            />
          </div>
        )}

        <ConfirmDialog
          isOpen={deleteConfirm.open}
          title="Delete Squad"
          message="Are you sure you want to delete this squad? This action cannot be undone."
          confirmText="Delete Squad"
          cancelText="Cancel"
          confirmClassName="bg-red-600 hover:bg-red-700 text-white"
          onConfirm={() => handleDeleteChannel(deleteConfirm.channelId)}
          onCancel={() => setDeleteConfirm({ open: false, channelId: null })}
        />

        <div className={`${uiClasses.card} rounded-xl p-4 mb-4`}>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search squads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`${uiClasses.input} w-full rounded-lg px-3 py-2`}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                ref={filterButtonRef}
                onClick={() => setShowFilters(true)}
                className="p-2 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                aria-label="Open squad filters"
              >
                <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`${uiClasses.input} rounded-lg px-3 py-2 min-w-[140px]`}
              >
                <option value="recent">Recent</option>
                <option value="name">Name A-Z</option>
                <option value="members">Most Members</option>
              </select>
              <button
                onClick={() => navigate('/squads/create')}
                className={`${uiClasses.button.primary} px-3 py-2 rounded-lg text-sm font-medium hidden md:inline-flex`}
              >
                Create Squad
              </button>
              <button
                onClick={() => navigate('/squads/create')}
                className={`${uiClasses.button.primary} px-3 py-2 rounded-lg text-sm font-medium md:hidden`}
              >
                New Squad
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 md:space-y-6">
          <ChannelList
            channels={filteredChannels}
            loading={loading}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
            onJoinChannel={(channelId) => handleToggleChannelMembership(channelId, true)}
            onLeaveChannel={(channelId) => handleToggleChannelMembership(channelId, false)}
            onDeleteChannel={(channelId) => setDeleteConfirm({ open: true, channelId })}
            onManageMembers={(channel) => {
              setSelectedChannel(channel);
              setActiveModal('members');
            }}
            onInviteUsers={(channel) => {
              setSelectedChannel(channel);
              setActiveModal('invite');
            }}
            currentUserId={currentUserId}
          />
        </div>

        {activeModal === 'invite' && selectedChannel && (
          <InviteUsersModal
            channel={selectedChannel}
            onSubmit={(userIds) => handleInviteUsers(selectedChannel.id, userIds)}
            onCancel={() => setActiveModal(null)}
            themeClasses={themeClasses}
          />
        )}

        {activeModal === 'members' && selectedChannel && (
          <MemberManagement
            channel={selectedChannel}
            currentUserId={currentUserId}
            onUpdateRole={handleUpdateMemberRole}
            onRemoveMember={handleRemoveMember}
            onClose={() => setActiveModal(null)}
            themeClasses={themeClasses}
          />
        )}
      </div>
    </div>
  );
}

export default ChannelManager;
