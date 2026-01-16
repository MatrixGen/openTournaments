import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../common/ConfirmDialog';
import Banner from '../common/Banner';
import FilterPopoverDrawer from '../common/FilterPopoverDrawer';

const CARD_CLASS =
  'bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg';

const BADGE_CLASSES = {
  direct: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  group: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  channel: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300',
  private: 'bg-gray-100 text-gray-700 dark:bg-neutral-700 dark:text-gray-300',
  joined: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

const buttonBase =
  'px-3 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none';
const menuItemBase =
  'w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getPreviewText = (channel) => {
  if (channel?.latestMessage?.content) return channel.latestMessage.content;
  if (channel?.latestMessage?.text) return channel.latestMessage.text;
  return channel?.description || '';
};

const canManageChannel = (channel, currentUserId) =>
  channel.ownerId === currentUserId || channel.admins?.includes(currentUserId);

const getTypeBadge = (channel) => {
  if (channel.type === 'direct') return { label: 'DM', className: BADGE_CLASSES.direct };
  if (channel.type === 'group') return { label: 'Group', className: BADGE_CLASSES.group };
  return { label: 'Squad', className: BADGE_CLASSES.channel };
};

const getBadges = (channel) => {
  const badges = [getTypeBadge(channel)];
  if (channel.isPrivate) badges.push({ label: 'Private', className: BADGE_CLASSES.private });
  if (channel.isMember) badges.push({ label: 'Joined', className: BADGE_CLASSES.joined });
  return badges;
};

export default function ChannelList({
  channels,
  loading,
  selectedChannel,
  onSelectChannel,
  onJoinChannel,
  onLeaveChannel,
  onDeleteChannel,
  onEditChannel,
  onInviteUsers,
  onManageMembers,
  currentUserId,
}) {
  const [menuChannelId, setMenuChannelId] = useState(null);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [banner, setBanner] = useState(null);
  const navigate = useNavigate();
  const menuAnchorRef = useRef(null);

  const isDeleteOpen = pendingDeleteId !== null;

  const handleBannerClose = () => setBanner(null);

  const navigateToChat = useCallback(
    (channelId, e) => {
      e?.stopPropagation();
      navigate(`/squads/${channelId}/chat`);
    },
    [navigate]
  );

  const handleCardClick = (channel) => {
    onSelectChannel?.(channel);
    if (channel.isMember) {
      navigateToChat(channel.id);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await Promise.resolve(onDeleteChannel(pendingDeleteId));
      setBanner({
        type: 'success',
        title: 'Squad Deleted',
        message: 'The squad has been successfully deleted.',
        autoDismiss: true,
        duration: 3000,
      });
    } catch (error) {
      setBanner({
        type: 'error',
        title: 'Delete Failed',
        message: error?.message || 'Failed to delete squad.',
        autoDismiss: true,
        duration: 4000,
      });
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleJoin = (channel, e) => {
    e.stopPropagation();
    onJoinChannel(channel.id);
    setBanner({
      type: 'success',
      title: 'Squad Joined',
      message: `You've joined ${channel.name}`,
      autoDismiss: true,
      duration: 3000,
    });
  };

  const handleLeave = (channel, e) => {
    e.stopPropagation();
    onLeaveChannel(channel.id);
    setBanner({
      type: 'info',
      title: 'Squad Left',
      message: `You've left ${channel.name}`,
      autoDismiss: true,
      duration: 3000,
    });
  };

  const handleDeleteClick = (channelId, e) => {
    e.stopPropagation();
    setPendingDeleteId(channelId);
  };

  const skeletons = useMemo(() => [1, 2, 3], []);
  const menuChannel = useMemo(
    () => channels.find((channel) => channel.id === menuChannelId) || null,
    [channels, menuChannelId]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {skeletons.map((id) => (
          <div key={id} className={`${CARD_CLASS} p-4 animate-pulse`}>
            <div className="h-4 bg-gray-200 dark:bg-neutral-700 rounded w-3/4 mb-3" />
            <div className="h-3 bg-gray-200 dark:bg-neutral-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className={`${CARD_CLASS} p-6 text-center`}>
        <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
          No squads found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Get started by creating your first squad
        </p>
      </div>
    );
  }

  return (
    <>
      {banner && (
        <div className="mb-4">
          <Banner
            type={banner.type}
            title={banner.title}
            message={banner.message}
            autoDismiss={banner.autoDismiss}
            duration={banner.duration}
            onAutoDismiss={handleBannerClose}
            onClose={handleBannerClose}
            compact
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete Squad"
        message="Are you sure you want to delete this squad? This action cannot be undone."
        confirmText="Delete Squad"
        cancelText="Cancel"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDeleteId(null)}
      />

      <FilterPopoverDrawer
        isOpen={Boolean(menuChannel)}
        onClose={() => setMenuChannelId(null)}
        anchorRef={menuAnchorRef}
        title="Squad Actions"
        mobileOnly={false}
        width={220}
        maxWidthClass="max-w-[14rem]"
      >
        {menuChannel && (
          <div className="space-y-2">
            {menuChannel.isMember && (
              <button
                type="button"
                onClick={(e) => {
                  navigateToChat(menuChannel.id, e);
                  setMenuChannelId(null);
                }}
                className={menuItemBase}
              >
                Open Chat
              </button>
            )}
            {menuChannel.isMember && menuChannel.ownerId !== currentUserId && (
              <button
                type="button"
                onClick={(e) => {
                  handleLeave(menuChannel, e);
                  setMenuChannelId(null);
                }}
                className={menuItemBase}
              >
                Leave
              </button>
            )}
            {canManageChannel(menuChannel, currentUserId) && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onEditChannel?.(menuChannel);
                    setMenuChannelId(null);
                  }}
                  className={menuItemBase}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onManageMembers?.(menuChannel);
                    setMenuChannelId(null);
                  }}
                  className={menuItemBase}
                >
                  Manage Members
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onInviteUsers?.(menuChannel);
                    setMenuChannelId(null);
                  }}
                  className={menuItemBase}
                >
                  Invite Members
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    handleDeleteClick(menuChannel.id, e);
                    setMenuChannelId(null);
                  }}
                  className={menuItemBase}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </FilterPopoverDrawer>

      <div className="space-y-3">
        {channels.map((channel) => {
          const isSelected = selectedChannel?.id === channel.id;
          const badges = getBadges(channel);
          const preview = getPreviewText(channel);
          const hasUnread = Boolean(channel.hasUnread);
          const notificationCount = channel.notificationCount || 0;

          return (
            <div
              key={channel.id}
              className={`${CARD_CLASS} relative transition-shadow ${
                isSelected
                  ? 'ring-2 ring-primary-500/60'
                  : 'hover:shadow-md hover:border-primary-400 hover:ring-1 hover:ring-primary-500/40'
              } cursor-pointer`}
            >
              {canManageChannel(channel, currentUserId) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    menuAnchorRef.current = e.currentTarget;
                    setMenuChannelId(channel.id);
                  }}
                  className="absolute right-3 top-3 p-2 rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-neutral-800"
                  aria-label="Open squad actions"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
              )}
              <div
                className="p-4"
                onClick={() => handleCardClick(channel)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleCardClick(channel)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="font-semibold text-base truncate text-gray-800 dark:text-gray-200">
                        {channel.name}
                      </h3>
                      {hasUnread && (
                        <span className="h-2 w-2 rounded-full bg-primary-500" aria-hidden />
                      )}
                      {notificationCount > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          {notificationCount}
                        </span>
                      )}
                      {badges.map((badge) => (
                        <span
                          key={`${channel.id}-${badge.label}`}
                          className={`${badge.className} px-2 py-0.5 text-xs rounded-full font-medium`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    {preview && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                        {preview}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>{channel.memberCount || 0} members</span>
                      <span>{formatDate(channel.updatedAt || channel.createdAt)}</span>
                    </div>
                  </div>

                  {!channel.isMember && (
                    <div className="flex items-center justify-end gap-2 mt-2 sm:mt-0">
                      <button
                        onClick={(e) => handleJoin(channel, e)}
                        className={`${buttonBase} bg-primary-500 hover:bg-primary-600 text-white`}
                      >
                        Join
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
