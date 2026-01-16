// MemberManagement.jsx
import { useState, useEffect, useCallback } from 'react';
import ChatService from '../../services/chatService';

export default function MemberManagement({
  channel,
  currentUserId,
  onUpdateRole,
  onRemoveMember,
  onClose,
  themeClasses
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isOwner = channel.ownerId === currentUserId;
  const canManage = isOwner || channel.admins?.includes(currentUserId);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ChatService.getChannelMembers(channel.id, {
        limit: 100,
        includeDetails: true
      });
      setMembers(response?.data.members || response);
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError('Failed to load squad members');
    } finally {
      setLoading(false);
    }
  }, [channel.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      await onUpdateRole(channel.id, memberId, newRole);
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ));
      setEditingMember(null);
    } catch (err) {
      console.error('Failed to update role:', err);
      setError('Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await onRemoveMember(channel.id, memberId);
      setMembers(prev => prev.filter(member => member.id !== memberId));
    } catch (err) {
      console.error('Failed to remove member:', err);
      setError('Failed to remove member');
    }
  };

  const filteredMembers = members.filter(member => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      member.username?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query) ||
      member.role?.toLowerCase().includes(query)
    );
  });

  const roleOptions = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`${themeClasses.card} rounded-xl border p-8`}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <div className="mt-4 text-center">Loading members...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${themeClasses.card} rounded-xl border w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Manage Members</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {channel.name} • {members.length} squad members
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="mt-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search members..."
              className={`${themeClasses.input} w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-900/20 border border-red-700 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {filteredMembers.map(member => {
              const isCurrentUser = member.id === currentUserId;
              const canEditThisMember = canManage && !isCurrentUser && member.id !== channel.ownerId;
              const isEditing = editingMember === member.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      {member.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {member.username}
                        {member.id === channel.ownerId && (
                          <span className={`${themeClasses.badge.joined} px-2 py-0.5 text-xs rounded-full`}>
                            Owner
                          </span>
                        )}
                        {isCurrentUser && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">(You)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {member.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          className={`${themeClasses.input} px-3 py-1 rounded-lg border text-sm`}
                        >
                          {roleOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditingMember(null)}
                          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className={`${themeClasses.badge.public} px-3 py-1 text-sm rounded-full`}>
                          {member.role || 'member'}
                        </span>
                        
                        {canEditThisMember && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setEditingMember(member.id)}
                              className="p-1 text-gray-500 hover:text-blue-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-gray-500 hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No members found' : 'No members in this squad'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredMembers.length} of {members.length} members shown
            </div>
            <button
              onClick={onClose}
              className={`${themeClasses.button.secondary} px-4 py-2 rounded-lg font-medium`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
