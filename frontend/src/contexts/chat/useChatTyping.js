import { useCallback } from "react";
import chatWebSocketService from "../../services/chatWebSocketService";

export const useChatTyping = ({ currentChannelId, typingTimeoutRef }) => {
  const stopTyping = useCallback(() => {
    if (!currentChannelId || !chatWebSocketService.socket?.connected) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    chatWebSocketService.stopTyping(currentChannelId);
  }, [currentChannelId, typingTimeoutRef]);

  const startTyping = useCallback(() => {
    if (!currentChannelId || !chatWebSocketService.socket?.connected) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    chatWebSocketService.startTyping(currentChannelId);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [currentChannelId, stopTyping, typingTimeoutRef]);

  return { startTyping, stopTyping };
};
