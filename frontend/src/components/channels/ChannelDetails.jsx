// ChannelDetails.jsx - Optimized Mobile-First Version
import { useState } from 'react';
import ConfirmDialog from '../common/ConfirmDialog';

export default function ChannelDetails({
  channel,
  currentUserId,
  onUpdateChannel,
  onDeleteChannel,
  onToggleMembership,
  onInviteUsers,
  onManageMembers,
  themeClasses
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(channel);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = channel.ownerId === currentUserId;
  const isAdmin = channel.admins?.includes(currentUserId);
  const canManage = isOwner || isAdmin;

  const handleSave = async () => {
    setLoading(true);
    try {
      await onUpdateChannel(channel.id, {
        name: editForm.name?.trim(),
        description: editForm.description?.trim() || null
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm(channel);
  };

  // Get channel type badge styling
  const getTypeBadge = () => {
    if (channel.type === 'direct') {
      return {
        text: 'Direct Message',
        class: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
      };
    } else if (channel.type === 'group') {
      return {
        text: 'Group Chat',
        class: 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'
      };
    } else {
      return {
        text: channel.isPrivate ? 'Private' : 'Public',
        class: channel.isPrivate 
          ? 'bg-gradient-to-r from-purple-600 to-violet-600 text-white'
          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
      };
    }
  };

  const typeBadge = getTypeBadge();

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Squad"
        message="Are you sure you want to delete this squad? All messages and data will be permanently lost."
        confirmText="Delete Squad"
        cancelText="Cancel"
        confirmClassName="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
        onConfirm={() => {
          onDeleteChannel(channel.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className={`${themeClasses.card} rounded-xl border p-4 sm:p-6 transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {isEditing ? (
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className={`
                      ${themeClasses.input} w-full px-4 py-2.5 rounded-xl border
                      text-lg sm:text-xl font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/50
                    `}
                    maxLength={50}
                  />
                </div>
              ) : (
                <h2 className="text-lg sm:text-xl font-bold truncate bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {channel.name}
                </h2>
              )}
              <span className={`${typeBadge.class} px-3 py-1 text-xs font-medium rounded-full shadow-sm`}>
                {typeBadge.text}
              </span>
            </div>

            {isEditing ? (
              <div className="mt-3">
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  className={`
                    ${themeClasses.input} w-full px-4 py-3 rounded-xl border
                    focus:outline-none focus:ring-2 focus:ring-purple-500/50
                    resize-none text-sm
                  `}
                  placeholder="Add a squad description..."
                  rows="2"
                  maxLength={200}
                />
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {editForm.description?.length || 0}/200
                </div>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base line-clamp-3">
                {channel.description || 'No description provided'}
              </p>
            )}
          </div>
          
          {/* Edit Button */}
          {canManage && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="ml-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              aria-label="Edit squad"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
        </div>

        {/* Edit Action Buttons */}
        {isEditing && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={loading || !editForm.name?.trim()}
                className={`
                  flex-1 px-4 py-2.5 rounded-lg font-medium transition-all duration-200
                  ${!editForm.name?.trim() || loading 
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : `${themeClasses.button.primary} hover:scale-[1.02] active:scale-[0.98]`
                  }
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : 'Save Changes'}
              </button>
              <button
                onClick={handleCancelEdit}
                className={`
                  ${themeClasses.button.secondary} flex-1 px-4 py-2.5 rounded-lg font-medium
                  transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                `}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className={`${themeClasses.card} p-4 rounded-xl border`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.67 3.623l-.01.007a5 5 0 01-7.14-.007" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {channel.memberCount || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Members</div>
              </div>
            </div>
          </div>
          
          <div className={`${themeClasses.card} p-4 rounded-xl border`}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <div className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  {channel.maxMembers === 0 || !channel.maxMembers ? '∞' : channel.maxMembers}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Max Members</div>
              </div>
            </div>
          </div>
        </div>

        {/* Channel Info */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Created {new Date(channel.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          
          {channel.owner && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Owned by </span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {channel.owner.username || 'Unknown'}
              </span>
            </div>
          )}
          
          {channel.updatedAt && channel.updatedAt !== channel.createdAt && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Last updated {new Date(channel.updatedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </div>
          )}
        </div>

        {/* Tags */}
        {channel.tags?.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {channel.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Join/Leave Button */}
          <button
            onClick={() => onToggleMembership(channel.id, !channel.isMember)}
            className={`
              w-full px-4 py-3.5 rounded-xl font-medium flex items-center justify-center gap-3
              transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
              ${channel.isMember 
                ? `${themeClasses.button.secondary} hover:shadow-md` 
                : `${themeClasses.button.primary} hover:shadow-lg`
              }
            `}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              channel.isMember 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300' 
                : 'bg-white/20 text-white'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {channel.isMember ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                )}
              </svg>
            </div>
            <span className="font-medium">
              {channel.isMember ? 'Leave Squad' : 'Join Squad'}
            </span>
          </button>

          {/* Management Actions */}
          {canManage && (
            <>
              <button
                onClick={onInviteUsers}
                className={`
                  w-full ${themeClasses.button.secondary} px-4 py-3.5 rounded-xl font-medium
                  flex items-center justify-center gap-3 transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98] hover:shadow-md
                `}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <span>Invite Users</span>
              </button>

              <button
                onClick={onManageMembers}
                className={`
                  w-full ${themeClasses.button.secondary} px-4 py-3.5 rounded-xl font-medium
                  flex items-center justify-center gap-3 transition-all duration-200
                  hover:scale-[1.02] active:scale-[0.98] hover:shadow-md
                `}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.67 3.623l-.01.007a5 5 0 01-7.14-.007" />
                  </svg>
                </div>
                <span>Manage </span>
              </button>
            </>
          )}

          {/* Delete Button (Owner only) */}
          {isOwner && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className={`
                w-full ${themeClasses.button.danger} px-4 py-3.5 rounded-xl font-medium
                flex items-center justify-center gap-3 transition-all duration-200
                hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg
              `}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/40 dark:to-pink-900/40 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <span>Delete Squad</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
