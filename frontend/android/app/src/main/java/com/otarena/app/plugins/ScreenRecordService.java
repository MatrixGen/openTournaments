package com.otarena.app.plugins;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.MediaRecorder;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.provider.MediaStore;
import android.util.Log;
import android.os.ParcelFileDescriptor;
import android.os.Environment;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class ScreenRecordService extends Service {

    public static final String EXTRA_RESULT_CODE = "resultCode";
    public static final String EXTRA_DATA = "data";
    public static final String EXTRA_FILE_NAME = "fileName";
    public static final String EXTRA_AUTO_CLEANUP_DAYS = "autoCleanupDays";
    public static final String ACTION_STOP_RECORDING = "com.otarena.app.plugins.STOP_RECORDING";

    private static final String CHANNEL_ID = "screen_record_channel";
    private static final int NOTIFICATION_ID = 1;
    private static final int REQUEST_CODE_STOP = 1001;
    private static final String PREFS_NAME = "ScreenRecordPrefs";
    private static final String KEY_LAST_FILE_PATH = "lastFilePath";

    private MediaProjection mediaProjection;
    private MediaRecorder mediaRecorder;
    private VirtualDisplay virtualDisplay;
    private boolean isRecording = false;
    private String currentFilePath;
    private int autoCleanupDays = 7; // Default 7 days

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP_RECORDING.equals(intent.getAction())) {
            stopRecordingAndExit();
            return START_NOT_STICKY;
        }

        createNotificationChannel();

        // Start foreground IMMEDIATELY
        Notification notification = createRecordingNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        int resultCode = intent.getIntExtra(EXTRA_RESULT_CODE, -1);
        autoCleanupDays = intent.getIntExtra(EXTRA_AUTO_CLEANUP_DAYS, 7);

        // FIX: Use the new type-safe way to get Parcelable for Android 13+
        Intent data;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            data = intent.getParcelableExtra(EXTRA_DATA, Intent.class);
        } else {
            data = intent.getParcelableExtra(EXTRA_DATA);
        }

        if (resultCode == Activity.RESULT_OK && data != null) {
            String fileName = intent.getStringExtra(EXTRA_FILE_NAME);
            startRecording(resultCode, data, fileName != null ? fileName : generateFileName());
        } else {
            Log.e("ScreenRecordService", "No projection data provided! ResultCode: " + resultCode);
            stopSelf();
        }

        return START_NOT_STICKY;
    }

    private String generateFileName() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault());
        return "recording_" + sdf.format(new Date()) + ".mp4";
    }

    private void startRecording(int resultCode, Intent data, String fileName) {
        try {
            MediaProjectionManager projectionManager =
                    (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);

            mediaProjection = projectionManager.getMediaProjection(resultCode, data);

            // Configure MediaRecorder
            mediaRecorder = new MediaRecorder();
            // Optional: Add Audio if you want sound
            // mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
            mediaRecorder.setVideoSource(MediaRecorder.VideoSource.SURFACE);
            mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4);
            mediaRecorder.setVideoEncoder(MediaRecorder.VideoEncoder.H264);
            mediaRecorder.setVideoEncodingBitRate(8 * 1000 * 1000);
            mediaRecorder.setVideoFrameRate(30);

            // Use screen dimensions or fixed size
            mediaRecorder.setVideoSize(1280, 720);

            // Save to app's private storage
            File recordsDir = getRecordsDirectory();
            if (!recordsDir.exists()) {
                recordsDir.mkdirs();
            }

            File outputFile = new File(recordsDir, fileName);
            currentFilePath = outputFile.getAbsolutePath();

            mediaRecorder.setOutputFile(currentFilePath);
            mediaRecorder.prepare();

            virtualDisplay = mediaProjection.createVirtualDisplay(
                    "ScreenRecorder",
                    1280, 720,
                    getResources().getDisplayMetrics().densityDpi,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    mediaRecorder.getSurface(),
                    null, null
            );

            mediaRecorder.start();
            isRecording = true;

            // Save file info
            saveFileInfo(outputFile);

            // Update notification with stop action
            updateNotificationWithControls();

        } catch (Exception e) {
            e.printStackTrace();
            stopSelf(); // Stop service if setup fails
        }
    }

    private File getRecordsDirectory() {
        // Use app's private storage
        return new File(getExternalFilesDir(Environment.DIRECTORY_MOVIES), "OTArena_Recordings");
    }

    private void saveFileInfo(File file) {
        try {
            // Save to SharedPreferences for quick access
            SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(KEY_LAST_FILE_PATH, file.getAbsolutePath());

            // Also save to a JSON file for better metadata
            JSONObject fileInfo = new JSONObject();
            fileInfo.put("path", file.getAbsolutePath());
            fileInfo.put("name", file.getName());
            fileInfo.put("size", file.length());
            fileInfo.put("created", System.currentTimeMillis());
            fileInfo.put("duration", 0); // Will be updated when recording stops

            // Save to a metadata file
            saveToMetadataFile(fileInfo);

            editor.apply();

        } catch (Exception e) {
            Log.e("ScreenRecordService", "Error saving file info", e);
        }
    }

    private void saveToMetadataFile(JSONObject fileInfo) throws JSONException, IOException {
        File metaFile = new File(getRecordsDirectory(), "recordings_metadata.json");
        JSONArray recordingsArray;

        if (metaFile.exists()) {
            String content = new java.util.Scanner(metaFile).useDelimiter("\\A").next();
            recordingsArray = new JSONArray(content);
        } else {
            recordingsArray = new JSONArray();
        }

        recordingsArray.put(fileInfo);

        FileOutputStream fos = new FileOutputStream(metaFile);
        fos.write(recordingsArray.toString(2).getBytes());
        fos.close();
    }

    private void stopRecordingAndExit() {
        try {
            if (mediaRecorder != null && isRecording) {
                mediaRecorder.stop();
                mediaRecorder.release();
                mediaRecorder = null;

                // Update metadata with duration (you can calculate this based on start time)
                updateRecordingMetadata();
            }
            if (virtualDisplay != null) {
                virtualDisplay.release();
                virtualDisplay = null;
            }
            if (mediaProjection != null) {
                mediaProjection.stop();
                mediaProjection = null;
            }
            isRecording = false;

            // Perform auto-cleanup
            performAutoCleanup();

        } catch (Exception e) {
            Log.e("ScreenRecordService", "Error stopping recording: " + e.getMessage());
        } finally {
            // Stop foreground and remove notification
            stopForeground(true);
            stopSelf();
        }
    }

    private void updateRecordingMetadata() {
        try {
            File metaFile = new File(getRecordsDirectory(), "recordings_metadata.json");
            if (metaFile.exists()) {
                String content = new java.util.Scanner(metaFile).useDelimiter("\\A").next();
                JSONArray recordingsArray = new JSONArray(content);

                if (recordingsArray.length() > 0) {
                    JSONObject lastRecording = recordingsArray.getJSONObject(recordingsArray.length() - 1);
                    // Here you can update with actual duration if you track it
                    // lastRecording.put("duration", recordingDuration);

                    FileOutputStream fos = new FileOutputStream(metaFile);
                    fos.write(recordingsArray.toString(2).getBytes());
                    fos.close();
                }
            }
        } catch (Exception e) {
            Log.e("ScreenRecordService", "Error updating metadata", e);
        }
    }

    private void performAutoCleanup() {
        if (autoCleanupDays <= 0) return;

        try {
            File recordsDir = getRecordsDirectory();
            File[] files = recordsDir.listFiles();
            if (files == null) return;

            long cutoffTime = System.currentTimeMillis() - (autoCleanupDays * 24 * 60 * 60 * 1000L);

            for (File file : files) {
                if (file.isFile() && file.getName().endsWith(".mp4")) {
                    if (file.lastModified() < cutoffTime) {
                        file.delete();
                        Log.d("ScreenRecordService", "Auto-deleted old file: " + file.getName());
                    }
                }
            }

            // Clean up metadata file
            cleanupMetadataFile();

        } catch (Exception e) {
            Log.e("ScreenRecordService", "Error in auto-cleanup", e);
        }
    }

    private void cleanupMetadataFile() {
        try {
            File metaFile = new File(getRecordsDirectory(), "recordings_metadata.json");
            if (metaFile.exists()) {
                String content = new java.util.Scanner(metaFile).useDelimiter("\\A").next();
                JSONArray recordingsArray = new JSONArray(content);
                JSONArray newArray = new JSONArray();

                for (int i = 0; i < recordingsArray.length(); i++) {
                    JSONObject recording = recordingsArray.getJSONObject(i);
                    File file = new File(recording.getString("path"));
                    if (file.exists()) {
                        newArray.put(recording);
                    }
                }

                FileOutputStream fos = new FileOutputStream(metaFile);
                fos.write(newArray.toString(2).getBytes());
                fos.close();
            }
        } catch (Exception e) {
            Log.e("ScreenRecordService", "Error cleaning up metadata", e);
        }
    }

    // Notification methods (same as before with improvements)
    private Notification createRecordingNotification() {
        Intent stopIntent = new Intent(this, ScreenRecordService.class);
        stopIntent.setAction(ACTION_STOP_RECORDING);

        PendingIntent stopPendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            stopPendingIntent = PendingIntent.getService(
                    this,
                    REQUEST_CODE_STOP,
                    stopIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        } else {
            stopPendingIntent = PendingIntent.getService(
                    this,
                    REQUEST_CODE_STOP,
                    stopIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT
            );
        }

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Screen recording")
                .setContentText("Recording in progress...")
                .setSmallIcon(android.R.drawable.presence_video_online)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .addAction(
                        android.R.drawable.ic_media_pause,
                        "Stop Recording",
                        stopPendingIntent
                )
                .setStyle(new NotificationCompat.BigTextStyle()
                        .bigText("Screen recording is in progress. Tap 'Stop Recording' to stop and save the video.")
                        .setBigContentTitle("Screen Recording Active")
                        .setSummaryText("Recording screen activity"))
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build();
    }

    private void updateNotificationWithControls() {
        if (isRecording) {
            Notification notification = createRecordingNotification();
            NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            notificationManager.notify(NOTIFICATION_ID, notification);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (isRecording) {
            stopRecordingAndExit();
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Screen Recording",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Screen recording notifications");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
}