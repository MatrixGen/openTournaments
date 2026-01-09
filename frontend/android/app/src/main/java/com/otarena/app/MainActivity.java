package com.otarena.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
// 1. Import your plugin class
import com.otarena.app.plugins.ScreenRecorderPlugin; 

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 2. Register the plugin BEFORE calling super.onCreate
        registerPlugin(ScreenRecorderPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}