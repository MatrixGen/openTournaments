import { registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Register the native plugin once
const NativeRecorder = registerPlugin('ScreenRecorder');

export const screenRecorderUtil = {
  /**
   * Check overlay permission for screen recording
   * @returns {Promise<boolean>} Whether overlay permission is granted
   */
  async checkOverlayPermission() {
    try {
      const { granted } = await NativeRecorder.checkOverlayPermission();
      if (!granted) {
        await NativeRecorder.requestOverlayPermission();
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking overlay permission:', error);
      return false;
    }
  },

  /**
   * Starts screen recording with permission checks
   * @param {string} fileName - Name of the file to save
   * @returns {Promise<boolean>}
   */
  async start(fileName = 'recording.mp4') {
    try {
      // 1. Check Overlay Permission first
      const hasOverlay = await this.checkOverlayPermission();
      if (!hasOverlay) {
        throw new Error('Please enable "Appear on top" permission and try again.');
      }

      // 2. Check Notification permissions (Required for Android 13+)
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') {
        const request = await LocalNotifications.requestPermissions();
        if (request.display !== 'granted') {
          throw new Error('Notification permission is required for screen recording.');
        }
      }

      // 3. Call the native plugin to start recording
      await NativeRecorder.startRecording({ fileName });
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  },

  /**
   * Stops the active recording service
   * @returns {Promise<boolean>}
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