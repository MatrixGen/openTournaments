package com.otarena.app.plugins;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import com.otarena.app.plugins.ScreenRecordService; // Import the service directly

@CapacitorPlugin(
    name = "ScreenRecorder",
    requestCodes = { 1234 } // CRITICAL FIX: Tells Capacitor to send result 1234 here
)
public class ScreenRecorderPlugin extends Plugin {

    private static final String TAG = "ScreenRecorderPlugin";
    private static final int SCREEN_CAPTURE_REQUEST_CODE = 1234;

    @PluginMethod
    public void startRecording(PluginCall call) {
        saveCall(call); // Use Capacitor's built-in call saving

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

        // Retrieve the saved call
        PluginCall savedCall = getSavedCall();
        if (requestCode != SCREEN_CAPTURE_REQUEST_CODE || savedCall == null) {
            return;
        }

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
}