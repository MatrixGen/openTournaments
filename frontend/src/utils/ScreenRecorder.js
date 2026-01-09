import { registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// The bridge to your Java code
const NativeRecorder = registerPlugin('ScreenRecorder');

export const screenRecorderUtil = {
  /**
   * Starts screen recording with permission checks
   * @param {string} fileName - Name of the file to save
   */
  async start(fileName = 'recording.mp4') {
    try {
      // 1. Check/Request Notification permissions (Required for Android 13+)
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') {
        const request = await LocalNotifications.requestPermissions();
        if (request.display !== 'granted') {
          throw new Error('Notification permission is required for screen recording.');
        }
      }

      // 2. Call the native plugin
      await NativeRecorder.startRecording({ fileName });
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  },

  /**
   * Stops the active recording service
   */
  async stop() {
    try {
      await NativeRecorder.stopRecording();
      return true;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }
};