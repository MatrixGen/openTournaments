package com.otarena.app.plugins;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.otarena.app.plugins.ScreenRecordService; // Add this import

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
        com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
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
            getContext().stopService(intent);
            Log.d(TAG, "Screen recording stopped");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error stopping recording", e);
            call.reject("Failed to stop screen recording: " + e.getMessage());
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
            String fileName = savedCall.getString("fileName", "recorded_game.mp4");

            try {
                Intent serviceIntent = new Intent(getContext(), ScreenRecordService.class);
                serviceIntent.putExtra(ScreenRecordService.EXTRA_RESULT_CODE, resultCode);
                serviceIntent.putExtra(ScreenRecordService.EXTRA_DATA, data);
                serviceIntent.putExtra(ScreenRecordService.EXTRA_FILE_NAME, fileName);

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

    private void handleOverlayPermissionResult(PluginCall savedCall) {
        boolean hasOverlayPermission = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            hasOverlayPermission = Settings.canDrawOverlays(getContext());
        }
        
        if (hasOverlayPermission) {
            savedCall.resolve();
        } else {
            savedCall.reject("User did not grant overlay permission");
        }
    }
}