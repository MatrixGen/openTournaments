// ChannelForm.jsx - Optimized Mobile-First Version
import { useState, useEffect, useRef } from "react";

export default function ChannelForm({
  onSubmit,
  onCancel,
  channel,
  themeClasses,
  availableUsers = [],
}) {
  const isEditing = !!channel;
  const formRef = useRef(null);
  const searchRef = useRef(null);

  const [formData, setFormData] = useState({
    name: channel?.name || "",
    description: channel?.description || "",
    type: channel?.type || "group",
    isPrivate: channel?.isPrivate || false,
    participantIds: channel?.participants?.map((p) => p.id) || [],
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState(
    channel?.members?.map((m) => ({
      id: m.id,
      username: m.username,
      email: m.email,
      profilePicture: m.profilePicture,
    })) || []
  );

  const [searchResults, setSearchResults] = useState([]);

  // Filter available users for search
  useEffect(() => {
    if (searchQuery.trim().length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const filtered = availableUsers
      .filter((user) => {
        const isAlreadySelected = selectedUsers.some((u) => u.id === user.id);
        const matchesSearch =
          user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase());

        return !isAlreadySelected && matchesSearch;
      })
      .slice(0, 5); // Limit to 5 results for mobile

    setSearchResults(filtered);
    setShowSearchResults(filtered.length > 0);
  }, [searchQuery, availableUsers, selectedUsers]);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Squad name is required";
    } else if (formData.name.length < 2) {
      newErrors.name = "Squad name must be at least 2 characters";
    } else if (formData.name.length > 50) {
      newErrors.name = "Squad name must be less than 50 characters";
    }

    if (formData.description && formData.description.length > 200) {
      newErrors.description = "Description must be less than 200 characters";
    }

    if (
      !formData.type ||
      !["direct", "group", "channel"].includes(formData.type)
    ) {
      newErrors.type = "Invalid squad type";
    }

    if (formData.type === "direct" && selectedUsers.length === 0) {
      newErrors.participants =
        "Please select at least one user for direct message";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      // Scroll to first error
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorElement = formRef.current?.querySelector(
        `[name="${firstErrorField}"]`
      );
      errorElement?.scrollIntoView({ behavior: "smooth", block: "center" });
      errorElement?.focus();

      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
        isPrivate: formData.type === "direct" ? true : formData.isPrivate,
        participantIds: selectedUsers.map((user) => user.id),
      };

      await onSubmit(submitData);
    } catch (error) {
      if (error.violations) {
        const apiErrors = {};
        error.violations.forEach((violation) => {
          apiErrors[violation.field] = violation.message;
        });
        setErrors(apiErrors);
      } else {
        setErrors({ general: error.message || "Failed to save squad" });
      }

      // Scroll to top on error
      formRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = (user) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
      setSearchQuery("");
      setShowSearchResults(false);
      setErrors((prev) => ({ ...prev, participants: undefined }));
    }
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  const handleTypeChange = (type) => {
    setFormData((prev) => ({
      ...prev,
      type,
      isPrivate: type === "direct" ? true : prev.isPrivate,
    }));
  };

  // Channel type options
  const channelTypes = [
    {
      id: "direct",
      label: "Direct",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.67 3.623l-.01.007a5 5 0 01-7.14-.007",
      description: "1:1 chat",
      color: "from-indigo-500 to-purple-500",
    },
    {
      id: "group",
      label: "Group",
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
      description: "Small team",
      color: "from-purple-500 to-violet-500",
    },
    {
      id: "channel",
      label: "Squad",
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      description: "Community",
      color: "from-purple-600 to-indigo-600",
    },
  ];

  return (
    <div ref={formRef} className={`${themeClasses.card} p-4 sm:p-6 max-h-[90vh] overflow-y-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            {isEditing ? "Edit Squad" : "Create Squad"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {isEditing
              ? "Update your squad settings"
              : "Set up your new squad"}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* General Error */}
      {errors.general && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-red-900/20 to-pink-900/20 border border-red-700/30 text-red-200 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errors.general}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Channel Type */}
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
            Squad Type *
          </label>

          {/* GRID: Strictly horizontal 3 columns */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {channelTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => handleTypeChange(type.id)}
                className={`
          relative p-2 sm:p-4 rounded-xl border-2 transition-all duration-200
          flex flex-col items-center justify-center gap-2
          ${
            formData.type === type.id
              ? `border-purple-500 bg-gradient-to-br ${type.color}/10 shadow-lg`
              : `${themeClasses.card} border-transparent hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md`
          }
          hover:scale-[1.02] active:scale-[0.98]
        `}
              >
                {/* Icon Container with your Gradient scheme */}
                <div
                  className={`
          w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center
          ${
            formData.type === type.id
              ? `bg-gradient-to-br ${type.color} text-white`
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
          }
        `}
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={type.icon}
                    />
                  </svg>
                </div>

                {/* Text area - Labels centered for horizontal symmetry */}
                <div className="text-center min-w-0">
                  <span
                    className={`block font-medium text-[11px] sm:text-sm md:text-base truncate ${
                      formData.type === type.id
                        ? "text-purple-600 dark:text-purple-400"
                        : ""
                    }`}
                  >
                    {type.label}
                  </span>
                  {/* Description: Hidden on tiny mobile screens to keep the row height tight */}
                  <span className="hidden sm:block text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight line-clamp-1">
                    {type.description}
                  </span>
                </div>

                {/* Selected Indicator - Small purple dot */}
                {formData.type === type.id && (
                  <div className="absolute top-1.5 right-1.5">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Error message with original Red styling */}
          {errors.type && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.type}
            </p>
          )}
        </div>
        {/* Channel Name */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Squad Name *
          </label>
          <div className="relative">
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className={`
                ${themeClasses.input} w-full px-4 py-3 rounded-xl border
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                ${errors.name ? "border-red-500 focus:border-red-500" : ""}
                text-sm sm:text-base
              `}
              placeholder={
                formData.type === "direct"
                  ? "e.g., John & Sarah"
                  : formData.type === "group"
                  ? "e.g., Project Team"
                  : "e.g., Announcements"
              }
              disabled={loading}
              maxLength={50}
            />
            <div className="absolute right-3 top-3 text-xs text-gray-400">
              {formData.name.length}/50
            </div>
          </div>
          {errors.name && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.name}
            </p>
          )}
          {formData.type === "direct" && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Name for your direct message group
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Description
          </label>
          <div className="relative">
            <textarea
              name="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className={`
                ${themeClasses.input} w-full px-4 py-3 rounded-xl border
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                ${
                  errors.description
                    ? "border-red-500 focus:border-red-500"
                    : ""
                }
                text-sm sm:text-base resize-none
              `}
              placeholder="What is this squad about? (Optional)"
              rows="3"
              disabled={loading || formData.type === "direct"}
              maxLength={200}
            />
            <div className="absolute right-3 bottom-3 text-xs text-gray-400">
              {formData.description.length}/200
            </div>
          </div>
          {errors.description && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.description}
            </p>
          )}
          {formData.type === "direct" && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Description not available for direct messages
            </p>
          )}
        </div>

        {/* Privacy Setting */}
        {formData.type !== "direct" && (
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Privacy Setting
            </label>

            {/* GRID: Strictly 2 columns with tight spacing */}
            <div className="grid grid-cols-2 gap-2">
              {/* Public Squad Button - Ultra Compact */}
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, isPrivate: false }))
                }
                className={`
        relative p-2 rounded-lg border-2 transition-all duration-200
        flex items-center justify-center gap-2
        ${
          !formData.isPrivate
            ? "border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20"
            : `${themeClasses.card} border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50`
        }
        active:scale-[0.97]
      `}
              >
                <div
                  className={`
        flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
        ${
          !formData.isPrivate
            ? "bg-green-500 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
        }
      `}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <span
                  className={`font-semibold text-xs sm:text-sm ${
                    !formData.isPrivate
                      ? "text-green-700 dark:text-green-300"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Public
                </span>
              </button>

              {/* Private Squad Button - Ultra Compact */}
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, isPrivate: true }))
                }
                className={`
        relative p-2 rounded-lg border-2 transition-all duration-200
        flex items-center justify-center gap-2
        ${
          formData.isPrivate
            ? "border-purple-500 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20"
            : `${themeClasses.card} border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50`
        }
        active:scale-[0.97]
      `}
              >
                <div
                  className={`
        flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
        ${
          formData.isPrivate
            ? "bg-purple-500 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-400"
        }
      `}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <span
                  className={`font-semibold text-xs sm:text-sm ${
                    formData.isPrivate
                      ? "text-purple-700 dark:text-purple-300"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  Private
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Participant Selection */}
        <div ref={searchRef}>
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Add Participants
            {formData.type === "direct" && (
              <span className="text-gray-500 dark:text-gray-400 text-xs font-normal ml-2">
                (Select 1 or more users)
              </span>
            )}
          </label>

          {/* Search Input */}
          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() =>
                searchQuery.length > 0 && setShowSearchResults(true)
              }
              placeholder="Search users by username..."
              className={`
                ${themeClasses.input} w-full pl-10 pr-4 py-3 rounded-xl border
                focus:outline-none focus:ring-2 focus:ring-purple-500/50
                text-sm sm:text-base
              `}
              disabled={loading}
            />
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-10 w-full sm:w-96 max-h-60 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg mt-1">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleAddUser(user)}
                  className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                    {user.profilePicture ? (
                      <img
                        src={user.profilePicture}
                        alt={user.username}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {user.username?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{user.username}</div>
                    {user.email && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                    )}
                  </div>
                  <svg
                    className="w-5 h-5 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Selected Users ({selectedUsers.length})
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUsers([])}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {selectedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="group bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-full px-3 py-1.5 flex items-center gap-2 border border-purple-100 dark:border-purple-800/50"
                  >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                      {user.profilePicture ? (
                        <img
                          src={user.profilePicture}
                          alt={user.username}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          {user.username?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-purple-700 dark:text-purple-300">
                      {user.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      className="w-5 h-5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Remove ${user.username}`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation for participants */}
          {errors.participants && (
            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {errors.participants}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-white/0 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800/0 pt-2 pb-2 -mx-4 px-4">
          {/* flex-row ensures horizontal alignment even on small screens */}
          <div className="flex flex-row gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={`
        ${themeClasses.button.secondary} px-3 py-2 rounded-lg font-medium text-sm
        transition-all duration-200 active:scale-[0.97]
        flex-1
      `}
              disabled={loading}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={`
        ${themeClasses.button.primary} px-3 py-2 rounded-lg font-medium text-sm
        transition-all duration-200 active:scale-[0.97]
        flex items-center justify-center gap-1.5
        ${
          (formData.type === "direct" && selectedUsers.length === 0) || loading
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-md"
        }
        flex-[2] {/* Submit is slightly wider for better balance with long text */}
      `}
              disabled={
                loading ||
                (formData.type === "direct" && selectedUsers.length === 0)
              }
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="truncate">
                    {isEditing ? "Update" : "Create"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
