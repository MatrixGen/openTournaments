import chatService from "../../services/chatService";

export const normalizeMessage = (message) => {
  const id = message.id ? message.id : message.tempId;

  const sender =
    message.sender ||
    message.user || {
      id: message.user_id || message.userId,
      username: "Unknown User",
    };

  const parentMessage = message.parentMessage
    ? {
        ...message.parentMessage,
        sender:
          message.parentMessage.sender ||
          message.parentMessage.user || {
            id: message.parentMessage.user_id || message.parentMessage.userId,
            username: message.parentMessage.user?.username || "Unknown User",
          },
      }
    : null;

  const isOptimistic =
    message.isOptimistic === true &&
    !(message.isConfirmed === true || (message.id && !message.tempId));

  return {
    id,
    tempId: message.tempId || id,
    content: message.content,
    created_at: message.createdAt || message.created_at || new Date().toISOString(),
    channel_id: message.channel_id || message.channelId,
    sender,
    isOptimistic: isOptimistic,
    isConfirmed: message.isConfirmed || false,
    failed: message.failed || false,
    replyTo: message.replyTo,
    parentMessage,
    reactions: message.reactions || [],
    mediaUrl: message.mediaUrl,
    attachments: message.attachments || [],
    verificationAttempts: message.verificationAttempts || 0,
    lastVerificationAttempt: message.lastVerificationAttempt,
    ...message,
  };
};

export const verifyMessageOnServer = async (
  channelId,
  tempId,
  originalContent,
  originalSender,
  originalTimestamp
) => {
  try {
    console.log("🔍 Verifying message on server:", { tempId, channelId });

    const response = await chatService.getChannelMessages(channelId, {
      limit: 50,
      sort: "desc",
    });

    const messages = response?.data?.messages || response?.messages || response || [];

    const foundMessage = messages.find((msg) => {
      if (msg.tempId === tempId) {
        console.log("✅ Found by tempId match");
        return true;
      }

      const serverTimestamp = msg.created_at || msg.createdAt;
      const timeDiff = Math.abs(
        new Date(serverTimestamp).getTime() -
          new Date(originalTimestamp).getTime()
      );

      const contentMatch =
        msg.content &&
        originalContent &&
        msg.content.trim() === originalContent.trim();

      const senderMatch =
        (msg.sender?.id || msg.user_id || msg.userId) ===
        (originalSender?.id || originalSender);

      if (contentMatch && senderMatch && timeDiff < 10000) {
        console.log("✅ Found by content/sender/time match");
        return true;
      }

      return false;
    });

    return {
      exists: !!foundMessage,
      message: foundMessage ? normalizeMessage(foundMessage) : null,
    };
  } catch (error) {
    console.error("❌ Verification failed:", error);
    return {
      exists: false,
      error: error.message,
    };
  }
};

export const createTempId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const getSender = (chatUser, user) => {
  return (
    chatUser?.user || {
      id: user?.id,
      username: user?.username || "You",
    }
  );
};
