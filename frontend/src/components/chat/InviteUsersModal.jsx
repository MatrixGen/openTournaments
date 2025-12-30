// InviteUsersModal.jsx
import { useState, useEffect, useCallback } from 'react';
import ChatService from '../../services/chatService';

export default function InviteUsersModal({
  channel,
  onSubmit,
  onCancel,
  themeClasses
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  // Debounced search
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      setError(null);

      try {
        const response = await ChatService.searchUsers(searchQuery.trim(), {
          limit: 10,
          excludeChannel: channel.id // Assuming backend supports this
        });
        const users = response.data.users || response;
        
        // Filter out already selected users
        const filteredUsers = users.filter(user => 
          !selectedUsers.some(selected => selected.id === user.id)
        );
        
        setSearchResults(filteredUsers);
      } catch (err) {
        console.error('Search error:', err);
        setError('Failed to search users');
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, channel.id, selectedUsers]);

  const handleSelectUser = (user) => {
    if (!selectedUsers.some(u => u.id === user.id)) {
      setSelectedUsers(prev => [...prev, user]);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(selectedUsers.map(user => user.id));
    } catch (err) {
      setError(err.message || 'Failed to invite users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${themeClasses.card} rounded-xl border w-full max-w-md max-h-[90vh] overflow-hidden`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Invite Users to {channel.name}</h2>
            <button
              onClick={onCancel}
              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-900/20 border border-red-700 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Selected Users ({selectedUsers.length})</h3>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className={`${themeClasses.badge.joined} px-3 py-1.5 rounded-full text-sm flex items-center gap-2`}
                  >
                    <span>{user.username}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      className="text-xs hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by username or email..."
              className={`${themeClasses.input} w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={loading}
            />
            {searching && (
              <div className="absolute right-3 top-3.5">
                <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-6 max-h-60 overflow-y-auto">
              <h3 className="text-sm font-medium mb-2">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleSelectUser(user)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        {user.email && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-blue-500 hover:text-blue-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchQuery.trim().length >= 2 && searchResults.length === 0 && !searching && (
            <div className="mb-6 text-center py-4 text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className={`${themeClasses.button.secondary} px-4 py-2 rounded-lg font-medium`}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className={`${themeClasses.button.primary} px-4 py-2 rounded-lg font-medium flex items-center gap-2`}
              disabled={loading || selectedUsers.length === 0}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Invites ({selectedUsers.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}