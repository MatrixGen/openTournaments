package com.otarena.app.plugins;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.channels.FileChannel;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(
        name = "ScreenRecorder",
        requestCodes = { 1234, 5678 }
)
public class ScreenRecorderPlugin extends Plugin {

    private static final String TAG = "ScreenRecorderPlugin";
    private static final int SCREEN_CAPTURE_REQUEST_CODE = 1234;
    private static final int OVERLAY_PERMISSION_REQUEST_CODE = 5678;

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        boolean canDraw = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            canDraw = Settings.canDrawOverlays(getContext());
        }
        JSObject ret = new JSObject();
        ret.put("granted", canDraw);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                startActivityForResult(call, intent, OVERLAY_PERMISSION_REQUEST_CODE);
            } else {
                call.resolve();
            }
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void startRecording(PluginCall call) {
        saveCall(call);

        try {
            android.media.projection.MediaProjectionManager projectionManager =
                    (android.media.projection.MediaProjectionManager)
                            getContext().getSystemService(Activity.MEDIA_PROJECTION_SERVICE);

            Intent captureIntent = projectionManager.createScreenCaptureIntent();
            startActivityForResult(call, captureIntent, SCREEN_CAPTURE_REQUEST_CODE);
        } catch (Exception e) {
            Log.e(TAG, "Error starting screen capture intent", e);
            call.reject("Failed to start screen recording: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopRecording(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), ScreenRecordService.class);
            intent.setAction(ScreenRecordService.ACTION_STOP_RECORDING);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }

            Log.d(TAG, "Screen recording stop requested");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording", e);
            call.reject("Failed to stop screen recording: " + e.getMessage());
        }
    }

    @PluginMethod
    public void listRecordings(PluginCall call) {
        try {
            File recordsDir = getRecordsDirectory();
            JSArray recordings = new JSArray();

            if (recordsDir.exists() && recordsDir.isDirectory()) {
                File[] files = recordsDir.listFiles((dir, name) ->
                        name.endsWith(".mp4") || name.equals("recordings_metadata.json")
                );

                // Try to read metadata first
                File metaFile = new File(recordsDir, "recordings_metadata.json");
                if (metaFile.exists()) {
                    try {
                        String content = new java.util.Scanner(metaFile).useDelimiter("\\A").next();
                        JSONArray metadataArray = new JSONArray(content);

                        for (int i = 0; i < metadataArray.length(); i++) {
                            JSONObject meta = metadataArray.getJSONObject(i);
                            File videoFile = new File(meta.getString("path"));

                            if (videoFile.exists()) {
                                JSObject recording = new JSObject();
                                recording.put("path", videoFile.getAbsolutePath());
                                recording.put("name", videoFile.getName());
                                recording.put("size", videoFile.length());
                                recording.put("created", meta.optLong("created", videoFile.lastModified()));
                                recording.put("duration", meta.optLong("duration", 0));

                                recordings.put(recording);
                            }
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error reading metadata", e);
                    }
                }

                // Fallback to scanning directory
                if (recordings.length() == 0) {
                    for (File file : files) {
                        if (file.getName().endsWith(".mp4")) {
                            JSObject recording = new JSObject();
                            recording.put("path", file.getAbsolutePath());
                            recording.put("name", file.getName());
                            recording.put("size", file.length());
                            recording.put("created", file.lastModified());
                            recording.put("duration", 0);

                            recordings.put(recording);
                        }
                    }
                }
            }

            JSObject result = new JSObject();
            result.put("recordings", recordings);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error listing recordings", e);
            call.reject("Failed to list recordings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteRecording(PluginCall call) {
        try {
            String filePath = call.getString("path");
            if (filePath == null) {
                call.reject("File path is required");
                return;
            }

            File file = new File(filePath);
            if (file.exists()) {
                boolean deleted = file.delete();

                if (deleted) {
                    // Remove from metadata
                    removeFromMetadata(filePath);
                    call.resolve();
                } else {
                    call.reject("Failed to delete file");
                }
            } else {
                call.reject("File not found");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error deleting recording", e);
            call.reject("Failed to delete recording: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getRecordingInfo(PluginCall call) {
        try {
            String filePath = call.getString("path");
            if (filePath == null) {
                call.reject("File path is required");
                return;
            }

            File file = new File(filePath);
            if (file.exists()) {
                JSObject info = new JSObject();
                info.put("path", file.getAbsolutePath());
                info.put("name", file.getName());
                info.put("size", file.length());
                info.put("created", file.lastModified());
                info.put("exists", true);

                // Try to get more info from metadata
                File metaFile = new File(getRecordsDirectory(), "recordings_metadata.json");
                if (metaFile.exists()) {
                    String content = new java.util.Scanner(metaFile).useDelimiter("\\A").next();
                    JSONArray metadataArray = new JSONArray(content);

                    for (int i = 0; i < metadataArray.length(); i++) {
                        JSONObject meta = metadataArray.getJSONObject(i);
                        if (meta.getString("path").equals(filePath)) {
                            info.put("duration", meta.optLong("duration", 0));
                            break;
                        }
                    }
                }

                call.resolve(info);
            } else {
                call.reject("File not found");
            }

        } catch (Exception e) {
            Log.e(TAG, "Error getting recording info", e);
            call.reject("Failed to get recording info: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cleanupOldRecordings(PluginCall call) {
        try {
            int days = call.getInt("days", 7);
            File recordsDir = getRecordsDirectory();
            List<String> deletedFiles = new ArrayList<>();

            if (recordsDir.exists() && recordsDir.isDirectory()) {
                File[] files = recordsDir.listFiles((dir, name) -> name.endsWith(".mp4"));
                long cutoffTime = System.currentTimeMillis() - (days * 24 * 60 * 60 * 1000L);

                for (File file : files) {
                    if (file.lastModified() < cutoffTime) {
                        if (file.delete()) {
                            deletedFiles.add(file.getName());
                        }
                    }
                }

                // Clean up metadata
                cleanupMetadataFile();
            }

            JSObject result = new JSObject();
            result.put("deletedCount", deletedFiles.size());
            result.put("deletedFiles", new JSArray(deletedFiles.toArray()));
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error cleaning up old recordings", e);
            call.reject("Failed to cleanup recordings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void exportToPublicStorage(PluginCall call) {
        try {
            String sourcePath = call.getString("path");
            if (sourcePath == null) {
                call.reject("Source path is required");
                return;
            }

            File sourceFile = new File(sourcePath);
            if (!sourceFile.exists()) {
                call.reject("Source file not found");
                return;
            }

            // Create destination in public Movies folder
            File publicDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES);
            File otarenaDir = new File(publicDir, "OTArena");
            if (!otarenaDir.exists()) {
                otarenaDir.mkdirs();
            }

            File destFile = new File(otarenaDir, sourceFile.getName());

            // Copy file
            try (FileChannel source = new FileInputStream(sourceFile).getChannel();
                 FileChannel destination = new FileOutputStream(destFile).getChannel()) {
                destination.transferFrom(source, 0, source.size());
            }

            // Scan file to make it visible in gallery
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                Intent mediaScanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                mediaScanIntent.setData(Uri.fromFile(destFile));
                getContext().sendBroadcast(mediaScanIntent);
            }

            JSObject result = new JSObject();
            result.put("publicPath", destFile.getAbsolutePath());
            result.put("uri", Uri.fromFile(destFile).toString());
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error exporting to public storage", e);
            call.reject("Failed to export recording: " + e.getMessage());
        }
    }

    private File getRecordsDirectory() {
        return new File(getContext().getExternalFilesDir(Environment.DIRECTORY_MOVIES), "OTArena_Recordings");
    }

    private void removeFromMetadata(String filePath) {
        try {
            File metaFile = new File(getRecordsDirectory(), "recordings_metadata.json");
            if (metaFile.exists()) {
                String content = new java.util.Scanner(metaFile).useDelimiter("\\A").next();
                JSONArray metadataArray = new JSONArray(content);
                JSONArray newArray = new JSONArray();

                for (int i = 0; i < metadataArray.length(); i++) {
                    JSONObject meta = metadataArray.getJSONObject(i);
                    if (!meta.getString("path").equals(filePath)) {
                        newArray.put(meta);
                    }
                }

                FileOutputStream fos = new FileOutputStream(metaFile);
                fos.write(newArray.toString(2).getBytes());
                fos.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error removing from metadata", e);
        }
    }

    private void cleanupMetadataFile() {
        try {
            File metaFile = new File(getRecordsDirectory(), "recordings_metadata.json");
            if (metaFile.exists()) {
                String content = new java.util.Scanner(metaFile).useDelimiter("\\A").next();
                JSONArray metadataArray = new JSONArray(content);
                JSONArray newArray = new JSONArray();

                for (int i = 0; i < metadataArray.length(); i++) {
                    JSONObject meta = metadataArray.getJSONObject(i);
                    File file = new File(meta.getString("path"));
                    if (file.exists()) {
                        newArray.put(meta);
                    }
                }

                FileOutputStream fos = new FileOutputStream(metaFile);
                fos.write(newArray.toString(2).getBytes());
                fos.close();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error cleaning up metadata", e);
        }
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);

        PluginCall savedCall = getSavedCall();
        if (savedCall == null) {
            return;
        }

        if (requestCode == SCREEN_CAPTURE_REQUEST_CODE) {
            handleScreenCaptureResult(resultCode, data, savedCall);
        } else if (requestCode == OVERLAY_PERMISSION_REQUEST_CODE) {
            handleOverlayPermissionResult(savedCall);
        }
    }

    private void handleScreenCaptureResult(int resultCode, Intent data, PluginCall savedCall) {
        if (resultCode == Activity.RESULT_OK && data != null) {
            String fileName = savedCall.getString("fileName", generateFileName());
            int autoCleanupDays = savedCall.getInt("autoCleanupDays", 7);

            try {
                Intent serviceIntent = new Intent(getContext(), ScreenRecordService.class);
                serviceIntent.putExtra(ScreenRecordService.EXTRA_RESULT_CODE, resultCode);
                serviceIntent.putExtra(ScreenRecordService.EXTRA_DATA, data);
                serviceIntent.putExtra(ScreenRecordService.EXTRA_FILE_NAME, fileName);
                serviceIntent.putExtra(ScreenRecordService.EXTRA_AUTO_CLEANUP_DAYS, autoCleanupDays);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    getContext().startForegroundService(serviceIntent);
                } else {
                    getContext().startService(serviceIntent);
                }

                Log.d(TAG, "Screen recording service starting...");
                savedCall.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Failed to start service", e);
                savedCall.reject("Failed to start screen recording service: " + e.getMessage());
            }
        } else {
            savedCall.reject("User denied screen capture permission");
        }
    }

    private String generateFileName() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault());
        return "recording_" + sdf.format(new Date()) + ".mp4";
    }

    private void handleOverlayPermissionResult(PluginCall savedCall) {
        boolean hasOverlayPermission = true;
        hasOverlayPermission = Settings.canDrawOverlays(getContext());

        if (hasOverlayPermission) {
            savedCall.resolve();
        } else {
            savedCall.reject("User did not grant overlay permission");
        }
    }
}