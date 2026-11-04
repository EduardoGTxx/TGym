package app.framegym.mobile;

import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="WorkoutNotification")
public class WorkoutNotificationPlugin extends Plugin {
    @PluginMethod public void sync(PluginCall call) {
        Intent intent = new Intent(getContext(), WorkoutNotificationService.class);
        if (!call.getBoolean("active", false)) {
            getContext().stopService(intent);
            WorkoutTimerAlarms.cancel(getContext());
            NotificationManagerCompat.from(getContext()).cancel(3100);
            NotificationManagerCompat.from(getContext()).cancel(3101);
            getContext().getSharedPreferences("tgym_workout_live",0).edit().remove("state").apply();
            call.resolve(); return;
        }
        intent.putExtra("state",call.getData().toString());
        NotificationManagerCompat.from(getContext()).cancel(3101);
        try {
            if(Build.VERSION.SDK_INT>=26) getContext().startForegroundService(intent);
            else getContext().startService(intent);
            JSObject result=new JSObject(); result.put("enabled",NotificationManagerCompat.from(getContext()).areNotificationsEnabled()); result.put("nativeTimers",true); call.resolve(result);
        } catch (RuntimeException error) {
            call.reject("Workout notification unavailable",error);
        }
    }

    @PluginMethod public void broadcastSpotifree(PluginCall call) {
        try {
            String type = call.getString("type", "");
            Intent intent = new Intent("com.spotifree.app.action.TGYM_REST");
            intent.setPackage("com.spotifree.app");
            intent.putExtra("type", type);
            if ("REST_START".equals(type)) {
                intent.putExtra("active", true);
                intent.putExtra("seconds", call.getInt("seconds", 0));
                Long endsAt = call.getLong("endsAt");
                if (endsAt != null) intent.putExtra("endsAt", endsAt);
                intent.putExtra("total", call.getInt("total", 0));
                intent.putExtra("exerciseName", call.getString("exerciseName", ""));
            } else if ("REST_END".equals(type)) {
                intent.putExtra("active", false);
            } else if ("WORKOUT_FINISH".equals(type)) {
                intent.putExtra("date", call.getString("date", ""));
                Long durationMs = call.getLong("durationMs");
                if (durationMs != null) intent.putExtra("durationMs", durationMs);
            }
            getContext().sendBroadcast(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Spotifree broadcast unavailable", error);
        }
    }
}
