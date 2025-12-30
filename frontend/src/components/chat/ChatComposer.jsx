// ChatComposer.jsx - Flexible for both tournament and channel chats
import { memo, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  Paperclip,
  Smile,
  Mic,
  SendHorizontal,
  X,
  Edit2,
  Reply,
  Image as ImageIcon,
  Film,
  File,
  Loader2,
  Trash2,
  Users,
  Lock,
  Globe,
  Hash,
  MessageCircle,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const ChatComposer = memo(
  ({
    draftMessage = "",
    setDraftMessage = () => {},
    editingMessage = null,
    replyToMessage = null,
    onSend = () => {},
    onCancelEdit = () => {},
    onCancelReply = () => {},
    onToggleEmojiPicker = () => {},
    maxMediaSize = 10 * 1024 * 1024, // 10MB default
    allowedMediaTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "video/quicktime",
      "audio/mpeg",
      "audio/wav",
      "application/pdf",
      "text/plain",
    ],
    tournament = null,
    channel = null,
    showChannelInfo = true,
    //showMemberStatus = true,
    maxMessageLength = 2000,
    enableVoiceMessages = false,
    enableFileAttachments = true,
    enableEmojiPicker = true,
    customPlaceholder = null,
    onFileUploadError = null,
    onTypingStatusChange = null,
  }) => {
    const { theme } = useTheme();
    const {
      currentChannel: contextChannel,
      isConnected,
      startTyping,
      stopTyping,
      onSendMedia,
      sendMessage,
      chatUser,
      typingUsers = [],
      onlineUsers = [],
      // isTyping: isUserTyping = false,
    } = useChat();

    const { user: authUser } = useAuth();

    const [files, setFiles] = useState([]);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isTypingActive, setIsTypingActive] = useState(false);
    const [showFilePreview, setShowFilePreview] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);
    const typingTimerRef = useRef(null);
    const containerRef = useRef(null);

    // Determine which chat data to use
    const chatData = useMemo(() => {
      const data = {
        type: "channel",
        data: channel || contextChannel,
        id: channel?.id || contextChannel?.id,
        name: channel?.name || contextChannel?.name,
        isPrivate: channel?.isPrivate || contextChannel?.isPrivate || false,
        isMember: channel?.isMember || contextChannel?.isMember || false,
        userRole: channel?.userRole || contextChannel?.userRole || null,
        members: channel?.members || contextChannel?.members || [],
        memberCount: channel?.memberCount || contextChannel?.memberCount || 0,
        channelType: channel?.type || contextChannel?.type || "general",
      };

      if (tournament) {
        return {
          type: "tournament",
          data: tournament,
          id: tournament.id,
          name: tournament.name,
          chat_channel_id: tournament.chat_channel_id,
          participants: tournament.participants || [],
          chat_enabled: tournament.chat_enabled !== false,
        };
      }

      return data;
    }, [tournament, channel, contextChannel]);

    // Determine if user has permission to send messages
    const hasSendPermission = useMemo(() => {
      if (chatData.type === "tournament") {
        // For tournament chats, user must be a participant
        const participants = chatData.data?.participants || [];
        return participants.some(
          (p) =>
            p.user?.id === authUser?.id ||
            p.user_id === authUser?.id ||
            p.id === authUser?.id
        );
      } else {
        // For channel chats, user must be a member (or channel must be public and read-only is disabled)
        const isPublic = !chatData.isPrivate;
        const isMember = chatData.isMember;
        const isReadOnly = chatData.userRole === "readonly";

        // Public channels allow posting unless user has readonly role
        if (isPublic && !isReadOnly) return true;

        // Private channels require membership
        return isMember && !isReadOnly;
      }
    }, [chatData, authUser?.id]);

    // Determine if user is muted
    const isUserMuted = useMemo(() => {
      if (chatData.type === "tournament") {
        // Tournament-specific mute logic (if any)
        return false;
      } else {
        // Channel-specific mute logic
        return chatData.userRole === "muted" || false;
      }
    }, [chatData]);

    // Determine if chat is available
    const isChatAvailable = useMemo(() => {
      if (chatData.type === "tournament") {
        return chatData.data?.chat_channel_id && chatData.chat_enabled;
      } else {
        return chatData.id && isConnected;
      }
    }, [chatData, isConnected]);

    // Theme classes
    const themeClasses = {
      container:
        theme === "dark"
          ? "bg-gray-900/95 border-gray-800 backdrop-blur-sm"
          : "bg-white/95 border-gray-200 backdrop-blur-sm",
      input:
        theme === "dark"
          ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-transparent"
          : "bg-white/90 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-transparent",
      preview:
        theme === "dark"
          ? "bg-gray-800/60 border-gray-700"
          : "bg-gray-50 border-gray-200",
      buttonDisabled:
        theme === "dark"
          ? "bg-gray-700/50 text-gray-500"
          : "bg-gray-200 text-gray-400",
      error:
        theme === "dark"
          ? "bg-red-900/20 border-red-700 text-red-200"
          : "bg-red-50 border-red-200 text-red-600",
      success:
        theme === "dark"
          ? "bg-green-900/20 border-green-700 text-green-200"
          : "bg-green-50 border-green-200 text-green-600",
      info:
        theme === "dark"
          ? "bg-blue-900/20 border-blue-700 text-blue-200"
          : "bg-blue-50 border-blue-200 text-blue-600",
    };

    // Channel type configuration
    const channelConfig = useMemo(() => {
      const configs = {
        direct: {
          icon: Users,
          color: "text-purple-500",
          bg: "bg-purple-500/10",
          label: "Direct Message",
        },
        group: {
          icon: Users,
          color: "text-green-500",
          bg: "bg-green-500/10",
          label: "Group",
        },
        channel: {
          icon: Hash,
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          label: "Channel",
        },
        tournament: {
          icon: MessageCircle,
          color: "text-yellow-500",
          bg: "bg-yellow-500/10",
          label: "Tournament Chat",
        },
      };

      return configs[chatData.channelType] || configs.channel;
    }, [chatData.channelType]);

    // Get placeholder text
    const placeholderText = useMemo(() => {
      if (customPlaceholder) return customPlaceholder;

      if (editingMessage) {
        return "Edit your message...";
      }

      if (chatData.type === "tournament") {
        return `Message ${chatData.name} participants...`;
      } else if (chatData.channelType === "direct") {
        return "Type a private message...";
      } else if (chatData.isPrivate) {
        return `Message ${chatData.name} members...`;
      } else {
        return `Message in ${chatData.name}...`;
      }
    }, [customPlaceholder, editingMessage, chatData]);

    // Clean up timers
    useEffect(() => {
      return () => {
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      };
    }, []);

    // Auto-resize textarea
    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.min(textarea.scrollHeight, 120);
        textarea.style.height = `${newHeight}px`;
      }
    }, [draftMessage]);

    // Handle file selection with validation
    const handleFileSelect = useCallback(
      (event) => {
        const selectedFiles = Array.from(event.target.files);
        const validFiles = [];
        const errors = [];

        selectedFiles.forEach((file) => {
          if (!allowedMediaTypes.includes(file.type)) {
            errors.push(`Unsupported file type: ${file.type}`);
          } else if (file.size > maxMediaSize) {
            errors.push(
              `File too large: ${file.name} (max ${(
                maxMediaSize /
                (1024 * 1024)
              ).toFixed(0)}MB)`
            );
          } else {
            validFiles.push(file);
          }
        });

        if (errors.length > 0) {
          setUploadError(errors.join(", "));
          if (onFileUploadError) onFileUploadError(errors);
          setTimeout(() => setUploadError(null), 5000);
        }

        if (validFiles.length > 0) {
          setFiles((prev) => [...prev, ...validFiles]);
          setShowFilePreview(true);
        }

        event.target.value = "";
      },
      [allowedMediaTypes, maxMediaSize, onFileUploadError]
    );

    // Handle file removal
    const handleRemoveFile = useCallback((index) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Get file info
    const getFileInfo = useCallback((file) => {
      if (file.type.startsWith("image/"))
        return { type: "image", Icon: ImageIcon, color: "bg-green-500" };
      if (file.type.startsWith("video/"))
        return { type: "video", Icon: Film, color: "bg-purple-500" };
      if (file.type.startsWith("audio/"))
        return { type: "audio", Icon: Mic, color: "bg-yellow-500" };
      return { type: "file", Icon: File, color: "bg-blue-500" };
    }, []);

    // Handle sending message
    const handleSend = useCallback(async () => {
      if ((!draftMessage.trim() && files.length === 0) || !chatData.id) {
        return;
      }

      if (!hasSendPermission) {
        setUploadError(
          "You don't have permission to send messages in this chat"
        );
        setTimeout(() => setUploadError(null), 5000);
        return;
      }

      if (isUserMuted) {
        setUploadError("You are muted and cannot send messages");
        setTimeout(() => setUploadError(null), 5000);
        return;
      }

      try {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);

        const channelId =
          chatData.type === "tournament"
            ? chatData.data.chat_channel_id
            : chatData.id;

        if (files.length > 0) {
          await onSendMedia?.(channelId, files[0], draftMessage.trim(), {
            type: getFileInfo(files[0]).type,
            replyTo: replyToMessage?.id,
            fileName: files[0].name,
            fileSize: files[0].size,
            mimeType: files[0].type,
            originalName: files[0].name,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setUploadProgress(percentCompleted);
              }
            },
          });
        } else if (editingMessage?.id) {
          await onSend?.(draftMessage.trim(), null, {
            replyTo: replyToMessage?.id,
            editingMessageId: editingMessage.id,
          });
        } else {
          await sendMessage(channelId, draftMessage.trim(), {
            replyTo: replyToMessage?.id,
            sender: chatUser?.user,
          });
        }

        // Clear state
        setDraftMessage("");
        setFiles([]);
        setUploadProgress(0);
        setIsTypingActive(false);
        setShowFilePreview(false);
        stopTyping?.();

        // Reset textarea
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }

        if (typingTimerRef.current) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = null;
        }
      } catch (error) {
        console.error("Failed to send:", error);
        setUploadError(
          error.message || "Failed to send message. Please try again."
        );
        setUploadProgress(0);
      } finally {
        setIsUploading(false);
      }
    }, [
      draftMessage,
      files,
      replyToMessage?.id,
      editingMessage?.id,
      chatData,
      hasSendPermission,
      isUserMuted,
      onSendMedia,
      onSend,
      chatUser,
      sendMessage,
      stopTyping,
      setDraftMessage,
      getFileInfo,
    ]);

    // Handle keyboard events
    const handleKeyDown = useCallback(
      (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSend();
        } else if (e.key === "Escape") {
          if (editingMessage) {
            e.preventDefault();
            onCancelEdit?.();
          } else if (replyToMessage) {
            e.preventDefault();
            onCancelReply?.();
          }
        }
      },
      [handleSend, editingMessage, onCancelEdit, replyToMessage, onCancelReply]
    );

    // Handle input changes with typing indicators
    const handleInputChange = useCallback(
      (e) => {
        const value = e.target.value;
        if (value.length > maxMessageLength) return;

        setDraftMessage(value);
        setIsTypingActive(value.trim().length > 0);

        if (onTypingStatusChange) {
          onTypingStatusChange(value.trim().length > 0);
        }

        // Typing indicator logic
        if (value.trim() && chatData.id) {
          if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current);
          }

          startTyping?.();

          typingTimerRef.current = setTimeout(() => {
            stopTyping?.();
            typingTimerRef.current = null;
          }, 2000);
        } else {
          if (typingTimerRef.current) {
            clearTimeout(typingTimerRef.current);
            typingTimerRef.current = null;
          }
          stopTyping?.();
        }
      },
      [
        chatData.id,
        maxMessageLength,
        setDraftMessage,
        startTyping,
        stopTyping,
        onTypingStatusChange,
      ]
    );

    // Handle cancel edit
    const handleCancelEdit = useCallback(() => {
      setDraftMessage("");
      setIsTypingActive(false);
      onCancelEdit?.();
      stopTyping?.();
    }, [setDraftMessage, onCancelEdit, stopTyping]);

    // Handle cancel reply
    const handleCancelReply = useCallback(() => {
      onCancelReply?.();
    }, [onCancelReply]);

    // Trigger file input
    const triggerFileInput = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    // Toggle recording
    const toggleRecording = useCallback(() => {
      if (!enableVoiceMessages) {
        alert("Voice messages are not enabled");
        return;
      }

      if (!isRecording) {
        // Start recording logic would go here
        alert("Voice messages are not yet implemented");
        return;
      }
      setIsRecording(!isRecording);
    }, [isRecording, enableVoiceMessages]);

    // Clear all files
    const clearAllFiles = useCallback(() => {
      setFiles([]);
      setShowFilePreview(false);
    }, []);

    // Check if send is disabled
    const isSendDisabled = useMemo(() => {
      return (
        (!draftMessage.trim() && files.length === 0) ||
        uploadProgress ||
        isUploading ||
        !chatData.id ||
        !hasSendPermission ||
        isUserMuted ||
        !isConnected ||
        !isChatAvailable
      );
    }, [
      draftMessage,
      files.length,
      uploadProgress,
      isUploading,
      chatData.id,
      hasSendPermission,
      isUserMuted,
      isConnected,
      isChatAvailable,
    ]);

    // Calculate remaining characters
    const remainingChars = maxMessageLength - draftMessage.length;
    const isCharLimitWarning = remainingChars < 100;
    const isCharLimitExceeded = remainingChars < 0;

    // Render connection status
    const renderConnectionStatus = () => {
      if (!isConnected) {
        return (
          <div className="flex items-center justify-center space-x-2 py-3 px-4">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
            <span className="text-sm text-yellow-500">
              Connecting to chat...
            </span>
          </div>
        );
      }
      return null;
    };

    // Render chat not available
    const renderChatNotAvailable = () => {
      return (
        <div className="text-center py-4 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
            <Lock className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {chatData.type === "tournament"
              ? "Chat is not available for this tournament"
              : "You don't have access to this chat"}
          </p>
          {chatData.type === "tournament" && tournament?.id && (
            <button
              onClick={() =>
                (window.location.href = `/tournaments/${tournament.id}`)
              }
              className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
            >
              View Tournament
            </button>
          )}
        </div>
      );
    };

    // Render permission denied
    const renderPermissionDenied = () => {
      return (
        <div className="text-center py-4 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            {isUserMuted
              ? "You are muted and cannot send messages"
              : "You don't have permission to send messages here"}
          </p>
          {chatData.type === "tournament" && !hasSendPermission && (
            <button
              onClick={() =>
                (window.location.href = `/tournaments/${tournament.id}`)
              }
              className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
            >
              Join Tournament
            </button>
          )}
        </div>
      );
    };

    // Render channel info
    const renderChannelInfo = () => {
      if (!showChannelInfo || !chatData.id) return null;

      const Icon = channelConfig.icon;
      const onlineCount = onlineUsers.length;
      const typingCount = typingUsers.length;

      return (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`p-1.5 rounded-lg ${channelConfig.bg}`}>
                <Icon className={`w-4 h-4 ${channelConfig.color}`} />
              </div>
              <div>
                <h3 className="text-sm font-medium">{chatData.name}</h3>
                <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>
                      {chatData.memberCount ||
                        chatData.participants?.length ||
                        0}{" "}
                      members
                    </span>
                  </span>
                  {onlineCount > 0 && (
                    <span className="flex items-center space-x-1 text-green-500">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span>{onlineCount} online</span>
                    </span>
                  )}
                  {typingCount > 0 && (
                    <span className="text-blue-500">
                      {typingCount} typing...
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {chatData.isPrivate ? (
                <Lock className="w-4 h-4 text-purple-500" />
              ) : (
                <Globe className="w-4 h-4 text-green-500" />
              )}
            </div>
          </div>
        </div>
      );
    };

    if (!isChatAvailable) {
      return (
        <div className={`border-t ${themeClasses.container}`}>
          {renderChatNotAvailable()}
        </div>
      );
    }

    if (!hasSendPermission || isUserMuted) {
      return (
        <div className={`border-t ${themeClasses.container}`}>
          {renderChannelInfo()}
          {renderPermissionDenied()}
        </div>
      );
    }

    return (
      <div ref={containerRef} className={`border-t ${themeClasses.container}`}>
        {renderConnectionStatus()}

        {showChannelInfo && renderChannelInfo()}

        {/* Error message */}
        {uploadError && (
          <div
            className={`mx-4 mt-4 p-3 rounded-lg border ${themeClasses.error}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{uploadError}</span>
              </div>
              <button
                onClick={() => setUploadError(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Reply/Edit preview */}
        {(replyToMessage || editingMessage) && (
          <div
            className={`mx-4 mt-4 p-3 rounded-lg border ${themeClasses.preview}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={
                    editingMessage ? "text-yellow-500" : "text-blue-500"
                  }
                >
                  {editingMessage ? (
                    <Edit2 className="w-4 h-4" />
                  ) : (
                    <Reply className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium">
                    {editingMessage ? "Editing: " : "Replying to: "}
                  </span>
                  <span className="text-sm truncate max-w-[200px]">
                    {editingMessage?.content?.substring(0, 100) ||
                      replyToMessage?.content?.substring(0, 100) ||
                      "Message"}
                  </span>
                </div>
              </div>
              <button
                onClick={editingMessage ? handleCancelEdit : handleCancelReply}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                type="button"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* File previews */}
        {showFilePreview && files.length > 0 && (
          <div className="mx-4 mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {files.length} file{files.length > 1 ? "s" : ""} attached
              </span>
              <div className="flex items-center space-x-2">
                {files.length > 1 && (
                  <button
                    onClick={() => setShowFilePreview(!showFilePreview)}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    type="button"
                  >
                    {showFilePreview ? "Hide" : "Show"}
                  </button>
                )}
                <button
                  onClick={clearAllFiles}
                  className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center space-x-1"
                  type="button"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear all</span>
                </button>
              </div>
            </div>
            {showFilePreview &&
              files.map((file, index) => {
                const { type, Icon, color } = getFileInfo(file);
                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border flex items-center justify-between ${themeClasses.preview}`}
                  >
                    <div className="flex items-center space-x-3">
                      {type === "image" ? (
                        <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 border">
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-12 h-12 rounded ${color} flex items-center justify-center text-white flex-shrink-0`}
                        >
                          <Icon className="w-6 h-6" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {file.name}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{(file.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{type.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                      type="button"
                      aria-label="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        {/* Main input area */}
        <div className="p-4">
          <div className="flex items-center gap-2 relative min-h-[44px]">
            {" "}
            {/* Changed items-end to items-center */}
            {/* Action buttons - Hidden when typing */}
            <div
              className={`
        flex items-center gap-1 flex-shrink-0 transition-all duration-300 ease-in-out self-stretch
        ${
          isTypingActive
            ? "opacity-0 scale-95 w-0 overflow-hidden"
            : "opacity-100 scale-100 w-auto"
        }
      `}
            >
              {enableFileAttachments && (
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={uploadProgress || isUploading || editingMessage}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={allowedMediaTypes.join(",")}
                onChange={handleFileSelect}
                className="hidden"
              />

              {enableEmojiPicker && (
                <button
                  type="button"
                  onClick={onToggleEmojiPicker}
                  disabled={uploadProgress || isUploading || editingMessage}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
              )}

              {enableVoiceMessages && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={uploadProgress || isUploading || editingMessage}
                  className={`p-2 rounded-full transition-colors ${
                    isRecording
                      ? "bg-red-100 text-red-500 dark:bg-red-900"
                      : "hover:bg-gray-200 dark:hover:bg-gray-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isRecording ? "Stop recording" : "Voice message"}
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
            {/* Text input with vertical centering */}
            <div className="flex-1 flex items-center relative">
              <textarea
                ref={textareaRef}
                value={draftMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsTypingActive(true)}
                onBlur={() => {
                  if (!draftMessage.trim()) setIsTypingActive(false);
                }}
                placeholder={placeholderText}
                className={`w-full resize-none ${themeClasses.input} rounded-2xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-32 transition-all duration-200 flex items-center`}
                disabled={uploadProgress || isUploading}
                rows={1}
                style={{
                  lineHeight: "24px",
                  minHeight: "44px",
                  paddingTop: "10px",
                  paddingBottom: "10px",
                }}
              />

              {/* Character counter */}
              {draftMessage.length > 0 && (
                <div className="absolute bottom-2 right-3">
                  <span
                    className={`text-[10px] font-medium ${
                      isCharLimitExceeded
                        ? "text-red-500"
                        : isCharLimitWarning
                        ? "text-yellow-500"
                        : "text-gray-400"
                    }`}
                  >
                    {remainingChars}
                  </span>
                </div>
              )}
            </div>
            {/* Send button - Centered vertically */}
            <div className="flex-shrink-0 flex items-center self-stretch">
              <button
                type="button"
                onClick={handleSend}
                disabled={isSendDisabled}
                className={`flex items-center justify-center w-11 h-11 rounded-full transition-all ${
                  !isSendDisabled
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
                    : themeClasses.buttonDisabled + " cursor-not-allowed"
                }`}
                title={isSendDisabled ? "Cannot send message" : "Send message"}
              >
                {uploadProgress || isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <SendHorizontal className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Upload progress - Stays below the input row */}
          {isUploading && uploadProgress > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {files.length > 0 ? `Uploading...` : "Sending..."}
                </span>
                <span className="text-xs text-blue-500 font-medium">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Typing indicator - Stays below the input row */}
          {typingUsers.length > 0 && (
            <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                <div
                  className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
              <span>
                {typingUsers.length === 1
                  ? `${typingUsers[0]} is typing...`
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatComposer.displayName = "ChatComposer";
export default ChatComposer;
