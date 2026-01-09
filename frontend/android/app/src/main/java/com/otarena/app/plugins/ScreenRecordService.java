package com.otarena.app.plugins;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
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

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import java.io.IOException;

public class ScreenRecordService extends Service {

    public static final String EXTRA_RESULT_CODE = "resultCode";
    public static final String EXTRA_DATA = "data";
    public static final String EXTRA_FILE_NAME = "fileName";

    private static final String CHANNEL_ID = "screen_record_channel";
    private static final int NOTIFICATION_ID = 1;

    private MediaProjection mediaProjection;
    private MediaRecorder mediaRecorder;
    private VirtualDisplay virtualDisplay;

    @Override
public int onStartCommand(Intent intent, int flags, int startId) {
    createNotificationChannel();

    // Start foreground IMMEDIATELY
    Notification notification = createNotification();
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
    
    // FIX: Use the new type-safe way to get Parcelable for Android 13+
    Intent data;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        data = intent.getParcelableExtra(EXTRA_DATA, Intent.class);
    } else {
        data = intent.getParcelableExtra(EXTRA_DATA);
    }

    if (resultCode == Activity.RESULT_OK && data != null) {
        String fileName = intent.getStringExtra(EXTRA_FILE_NAME);
        startRecording(resultCode, data, fileName != null ? fileName : "record.mp4");
    } else {
        Log.e("ScreenRecordService", "No projection data provided! ResultCode: " + resultCode);
        stopSelf();
    }

    return START_NOT_STICKY;
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

            // NOTE: 1280x720 might fail on some screens. Consider using DisplayMetrics to get real screen size.
            mediaRecorder.setVideoSize(1280, 720);

            // FIX: File Output
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (Scoped Storage)
                ContentValues values = new ContentValues();
                values.put(MediaStore.Video.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
                values.put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/OTArena");

                Uri uri = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
                ParcelFileDescriptor pfd = getContentResolver().openFileDescriptor(uri, "rw");
                if (pfd != null) {
                    mediaRecorder.setOutputFile(pfd.getFileDescriptor());
                }
            } else {
                // Android 9 and below
                String path = android.os.Environment.getExternalStoragePublicDirectory(
                        android.os.Environment.DIRECTORY_MOVIES).getAbsolutePath() + "/OTArena";
                java.io.File dir = new java.io.File(path);
                if (!dir.exists()) dir.mkdirs();
                mediaRecorder.setOutputFile(new java.io.File(dir, fileName).getAbsolutePath());
            }

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

        } catch (Exception e) {
            e.printStackTrace();
            stopSelf(); // Stop service if setup fails
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            if (mediaRecorder != null) {
                mediaRecorder.stop();
                mediaRecorder.release();
            }
            if (virtualDisplay != null) virtualDisplay.release();
            if (mediaProjection != null) mediaProjection.stop();
        } catch (Exception ignored) {}
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Screen recording")
                .setContentText("Recording in progress...")
                .setSmallIcon(android.R.drawable.presence_video_online)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Screen Recording", NotificationManager.IMPORTANCE_LOW
            );
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
}