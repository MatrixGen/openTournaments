import { registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

// Register the native plugin once
const NativeRecorder = registerPlugin('ScreenRecorder');

export const screenRecorderUtil = {
  /**
   * Check overlay permission for screen recording
   */
  async checkOverlayPermission() {
    try {
      const { granted } = await NativeRecorder.checkOverlayPermission();
      return granted;
    } catch (error) {
      console.error('Error checking overlay permission:', error);
      return false;
    }
  },

  /**
   * Request overlay permission
   */
  async requestOverlayPermission() {
    try {
      await NativeRecorder.requestOverlayPermission();
      return true;
    } catch (error) {
      console.error('Error requesting overlay permission:', error);
      return false;
    }
  },

  /**
   * Starts screen recording with permission checks
   */
  async start(options) {
    try {
      // 1. Check Overlay Permission first
      const hasOverlay = await this.checkOverlayPermission();
      if (!hasOverlay) {
        const requested = await this.requestOverlayPermission();
        if (!requested) {
          throw new Error('Please enable "Appear on top" permission and try again.');
        }
      }

      // 2. Check Notification permissions
      if (Capacitor.getPlatform() === 'android') {
        const perms = await LocalNotifications.checkPermissions();
        if (perms.display !== 'granted') {
          const request = await LocalNotifications.requestPermissions();
          if (request.display !== 'granted') {
            throw new Error('Notification permission is required for screen recording.');
          }
        }
      }

      // 3. Call the native plugin to start recording
      const params = {};
      if (options && options.fileName) params.fileName = options.fileName;
      if (options && options.autoCleanupDays) params.autoCleanupDays = options.autoCleanupDays;
      
      await NativeRecorder.startRecording(params);
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
  },

  /**
   * List all recordings
   */
  async listRecordings() {
    try {
      const result = await NativeRecorder.listRecordings();
      return result.recordings || [];
    } catch (error) {
      console.error('Failed to list recordings:', error);
      throw error;
    }
  },

  /**
   * Delete a recording
   */
  async deleteRecording(path) {
    try {
      await NativeRecorder.deleteRecording({ path });
    } catch (error) {
      console.error('Failed to delete recording:', error);
      throw error;
    }
  },

  /**
   * Get recording information
   */
  async getRecordingInfo(path) {
    try {
      return await NativeRecorder.getRecordingInfo({ path });
    } catch (error) {
      console.error('Failed to get recording info:', error);
      throw error;
    }
  },

  /**
   * Cleanup old recordings
   */
  async cleanupOldRecordings(days) {
    if (days === undefined) days = 7;
    try {
      return await NativeRecorder.cleanupOldRecordings({ days });
    } catch (error) {
      console.error('Failed to cleanup recordings:', error);
      throw error;
    }
  },

  /**
   * Export recording to public storage (visible in gallery)
   */
  async exportToPublicStorage(path) {
    try {
      return await NativeRecorder.exportToPublicStorage({ path });
    } catch (error) {
      console.error('Failed to export recording:', error);
      throw error;
    }
  },

  /**
   * Read recording as base64 (for preview or upload)
   */
  async readRecordingAsBase64(path) {
    try {
      // Since Filesystem API might not access app-private storage directly,
      // we need to use a different approach
      
      if (Capacitor.getPlatform() === 'web') {
        throw new Error('Not supported on web');
      }
      
      // For Android, we need to use the native plugin or FileSystem
      // This is a simplified approach - you might need to adjust based on your needs
      const result = await Filesystem.readFile({
        path: path,
        directory: Directory.ExternalStorage
      });
      
      return result.data;
    } catch (error) {
      console.error('Failed to read recording:', error);
      throw error;
    }
  },

  /**
   * Upload recording to server
   */
  async uploadRecording(path, uploadUrl) {
    try {
      // First, get the file as base64 or blob
      const base64Data = await this.readRecordingAsBase64(path);
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'video/mp4' });
      
      // Create form data
      const formData = new FormData();
      const fileName = path.split('/').pop() || 'recording.mp4';
      formData.append('video', blob, fileName);
      
      // Upload
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error('Upload failed: ' + response.statusText);
      }
      
    } catch (error) {
      console.error('Failed to upload recording:', error);
      throw error;
    }
  }
};