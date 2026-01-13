import { useEffect } from "react";
import chatWebSocketService from "../../services/chatWebSocketService";

export const useChatMessages = ({ currentChannelId, handleWebSocketMessage }) => {
  useEffect(() => {
    if (!chatWebSocketService.socket?.connected) return;

    const unsubscribeGlobalEvents = chatWebSocketService.subscribeToChannelEvents(
      "global",
      handleWebSocketMessage
    );

    let unsubscribeChannelEvents = () => {};
    let unsubscribeMessages = () => {};

    if (currentChannelId) {
      unsubscribeChannelEvents = chatWebSocketService.subscribeToChannelEvents(
        currentChannelId,
        handleWebSocketMessage
      );

      unsubscribeMessages = chatWebSocketService.subscribeToMessages(
        currentChannelId,
        handleWebSocketMessage
      );

      chatWebSocketService.joinChannel(currentChannelId);
    }

    return () => {
      unsubscribeGlobalEvents();
      unsubscribeChannelEvents();
      unsubscribeMessages();
    };
  }, [currentChannelId, handleWebSocketMessage]);
};
