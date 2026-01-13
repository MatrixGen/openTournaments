// ChatComposer.jsx - Flexible for both tournament and channel chats
import { memo, useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  X,
  Edit2,
  Reply,
  Image as ImageIcon,
  Film,
  File,
  Mic,
  Users,
  Hash,
  MessageCircle,
  AlertCircle,
} from "lucide-react";
import ChatComposerHeader from "./ChatComposerHeader";
import ChatComposerStateNotice from "./ChatComposerStateNotice";
import ChatComposerFilePreview from "./ChatComposerFilePreview";
import ChatComposerInput from "./ChatComposerInput";

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

    const containerClassName =
      "bg-white/95 border-gray-200 backdrop-blur-sm dark:bg-gray-900/95 dark:border-gray-800";
    const inputClassName =
      "bg-white/90 border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800/80 dark:border-gray-700 dark:text-white dark:placeholder-gray-400";
    const previewClassName =
      "bg-gray-50 border-gray-200 dark:bg-gray-800/60 dark:border-gray-700";
    const buttonDisabledClassName =
      "bg-gray-200 text-gray-400 dark:bg-gray-700/50 dark:text-gray-500";
    const errorClassName =
      "bg-red-50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-700 dark:text-red-200";

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

    const normalizeSelectedFile = useCallback(async (file) => {
      const isBlobLike =
        file &&
        typeof file === "object" &&
        typeof file.size === "number" &&
        typeof file.type === "string" &&
        typeof file.slice === "function";

      console.log("SELECTED FILE:", file);
      console.log("ctor:", file?.constructor?.name);
      console.log("typeof File:", typeof File);
      console.log("typeof Blob:", typeof Blob);
      console.log("isBlobLike:", isBlobLike);
      console.log("keys:", Object.keys(file || {}));
      console.log("name/type/size:", file?.name, file?.type, file?.size);

      if (isBlobLike) {
        if (typeof file.name === "string" && file.name.length > 0) {
          return file;
        }
        return new File([file], "upload", {
          type: file.type || "application/octet-stream",
        });
      }

      if (file && typeof file.arrayBuffer === "function") {
        const buffer = await file.arrayBuffer();
        const type = file.type || "application/octet-stream";
        return new File([buffer], file.name || "upload", { type });
      }

      const uri = file?.webPath || file?.path || file?.uri;
      if (typeof uri === "string") {
        const response = await fetch(uri);
        if (!response.ok) {
          throw new Error(`Failed to fetch file from uri: ${uri}`);
        }
        const blob = await response.blob();
        const nameFromUri = uri.split("/").pop()?.split("?")[0] || "upload";
        const type = blob.type || file?.type || "application/octet-stream";
        return new File([blob], file?.name || nameFromUri, { type });
      }

      throw new Error("Invalid media file object (not File/Blob-like).");
    }, []);

    // Handle file selection with validation
    const handleFileSelect = useCallback(
      async (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        const validFiles = [];
        const errors = [];

        for (const rawFile of selectedFiles) {
          let file;
          try {
            file = await normalizeSelectedFile(rawFile);
          } catch (error) {
            errors.push(error.message || "Invalid media file selected");
            continue;
          }

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
        }

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
      [allowedMediaTypes, maxMediaSize, normalizeSelectedFile, onFileUploadError]
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

    const handleInputFocus = useCallback(() => {
      setIsTypingActive(true);
    }, []);

    const handleInputBlur = useCallback(() => {
      if (!draftMessage.trim()) {
        setIsTypingActive(false);
      }
    }, [draftMessage]);

    if (!isChatAvailable) {
      return (
        <div className={`border-t ${containerClassName}`}>
          <ChatComposerStateNotice
            variant="unavailable"
            chatDataType={chatData.type}
            tournamentId={tournament?.id}
          />
        </div>
      );
    }

    if (!hasSendPermission || isUserMuted) {
      return (
        <div className={`border-t ${containerClassName}`}>
          <ChatComposerHeader
            showChannelInfo={showChannelInfo}
            chatData={chatData}
            channelConfig={channelConfig}
            onlineUsersCount={onlineUsers.length}
            typingUsersCount={typingUsers.length}
            isConnected={isConnected}
          />
          <ChatComposerStateNotice
            variant="permission"
            chatDataType={chatData.type}
            tournamentId={tournament?.id}
            isUserMuted={isUserMuted}
          />
        </div>
      );
    }

    return (
      <div ref={containerRef} className={`border-t ${containerClassName}`}>
        <ChatComposerHeader
          showChannelInfo={showChannelInfo}
          chatData={chatData}
          channelConfig={channelConfig}
          onlineUsersCount={onlineUsers.length}
          typingUsersCount={typingUsers.length}
          isConnected={isConnected}
        />

        {/* Error message */}
        {uploadError && (
          <div
            className={`mx-4 mt-4 p-3 rounded-lg border ${errorClassName}`}
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
            className={`mx-4 mt-4 p-3 rounded-lg border ${previewClassName}`}
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

        <ChatComposerFilePreview
          files={files}
          showFilePreview={showFilePreview}
          onTogglePreview={setShowFilePreview}
          onClearAll={clearAllFiles}
          onRemoveFile={handleRemoveFile}
          getFileInfo={getFileInfo}
          previewClassName={previewClassName}
        />

        <ChatComposerInput
          enableFileAttachments={enableFileAttachments}
          enableEmojiPicker={enableEmojiPicker}
          enableVoiceMessages={enableVoiceMessages}
          isRecording={isRecording}
          onToggleRecording={toggleRecording}
          onTriggerFileInput={triggerFileInput}
          fileInputRef={fileInputRef}
          allowedMediaTypes={allowedMediaTypes}
          onFileChange={handleFileSelect}
          onToggleEmojiPicker={onToggleEmojiPicker}
          uploadProgress={uploadProgress}
          isUploading={isUploading}
          editingMessage={editingMessage}
          isTypingActive={isTypingActive}
          draftMessage={draftMessage}
          textareaRef={textareaRef}
          onInputChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholderText={placeholderText}
          inputClassName={inputClassName}
          buttonDisabledClassName={buttonDisabledClassName}
          isCharLimitExceeded={isCharLimitExceeded}
          isCharLimitWarning={isCharLimitWarning}
          remainingChars={remainingChars}
          isSendDisabled={isSendDisabled}
          onSend={handleSend}
          typingUsers={typingUsers}
          filesCount={files.length}
        />
      </div>
    );
  }
);

ChatComposer.displayName = "ChatComposer";
export default ChatComposer;
