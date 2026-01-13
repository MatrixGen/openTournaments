import { useCallback, useEffect } from "react";
import chatAuthService from "../../services/chatAuthService";

export const useChatConnection = ({
  isAuthenticated,
  user,
  initializeChat,
  cleanupChat,
  dispatch,
  ACTION_TYPES,
  initializationRef,
  retryTimeoutRef,
}) => {
  useEffect(() => {
    const handleTokenExpired = () => {
      chatAuthService.clearChatTokens();
      dispatch({
        type: ACTION_TYPES.SET_ERROR,
        payload: "Chat session expired. Please refresh the page or re-login.",
      });
      cleanupChat();
    };

    window.addEventListener("chat-token-expired", handleTokenExpired);

    return () => {
      window.removeEventListener("chat-token-expired", handleTokenExpired);
    };
  }, [cleanupChat, dispatch, ACTION_TYPES.SET_ERROR]);

  useEffect(() => {
    if (isAuthenticated && user && !initializationRef.current) {
      initializeChat();
    } else if (!isAuthenticated) {
      cleanupChat();
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [
    cleanupChat,
    initializeChat,
    initializationRef,
    isAuthenticated,
    retryTimeoutRef,
    user,
  ]);

  const retryConnection = useCallback(() => {
    cleanupChat();
    initializationRef.current = false;
    initializeChat();
  }, [cleanupChat, initializeChat, initializationRef]);

  return { retryConnection };
};
