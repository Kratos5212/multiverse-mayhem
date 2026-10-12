package com.multiversemayhem.game;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Keeps the game up to date. Every time the app opens it reads latest.json from the public
 * releases repository. A newer game build is downloaded file by file, each file checked
 * against its SHA-256, and the app switches to it straight away (Capacitor serves the game
 * from that folder from then on). A newer app version is downloaded as an APK and handed
 * to Android's installer. With no connection, you simply play the version you have.
 */
public class LiveUpdater {
    static final String ROOT = "https://raw.githubusercontent.com/Kratos5212/multiverse-mayhem-releases/main/";
    private static final String PREF_BUILD = "mmLiveBuild";

    private final BridgeActivity act;

    LiveUpdater(BridgeActivity act) { this.act = act; }

    void checkInBackground() {
        new Thread(() -> {
            try { run(); } catch (Exception e) { /* offline or a bad download: keep playing what we have */ }
        }, "mm-updater").start();
    }

    private SharedPreferences prefs() {
        return act.getSharedPreferences(com.getcapacitor.plugin.WebView.WEBVIEW_PREFS_NAME, Activity.MODE_PRIVATE);
    }

    private void run() throws Exception {
        JSONObject m = new JSONObject(new String(get(ROOT + "latest.json?t=" + System.currentTimeMillis()), "UTF-8"));

        // A new app version replaces everything, game included.
        JSONObject an = m.optJSONObject("android");
        if (an != null && an.optInt("versionCode", 0) > installedVersionCode()) {
            installApk(an);
            return;
        }

        int build = m.getInt("build");
        if (build <= currentBuild()) return;
        toast("Updating Multiverse Mayhem…");
        JSONObject game = m.getJSONObject("game");
        String base = ROOT + safePath(game.getString("base"));
        JSONArray files = game.getJSONArray("files");
        File live = new File(act.getFilesDir(), "live");
        File dir = new File(live, String.valueOf(build));
        for (int i = 0; i < files.length(); i++) {
            JSONObject f = files.getJSONObject(i);
            String path = safePath(f.getString("p")), hash = f.getString("h");
            File out = new File(dir, path);
            if (out.exists() && hash.equals(sha256(out))) continue;
            byte[] data = get(base + path);
            if (!hash.equals(hex(MessageDigest.getInstance("SHA-256").digest(data)))) throw new Exception("Bad file " + path);
            out.getParentFile().mkdirs();
            File tmp = new File(out.getPath() + ".part");
            try (OutputStream os = new FileOutputStream(tmp)) { os.write(data); }
            if (!tmp.renameTo(out)) throw new Exception("Could not save " + path);
        }
        final String path = dir.getAbsolutePath();
        prefs().edit().putString(com.getcapacitor.plugin.WebView.CAP_SERVER_PATH, path).putInt(PREF_BUILD, build).apply();
        act.runOnUiThread(() -> {
            act.getBridge().setServerBasePath(path);
            Toast.makeText(act, "Updated to version " + build, Toast.LENGTH_SHORT).show();
        });
        // Drop older downloaded versions.
        File[] old = live.listFiles();
        if (old != null) for (File o : old) if (!o.getName().equals(String.valueOf(build))) deleteTree(o);
    }

    @SuppressWarnings("deprecation")
    private long installedVersionCode() {
        try {
            android.content.pm.PackageInfo pi = act.getPackageManager().getPackageInfo(act.getPackageName(), 0);
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? pi.getLongVersionCode() : pi.versionCode;
        } catch (Exception e) { return Long.MAX_VALUE; }   // unknown: never offer a reinstall
    }

    // The build being played: a downloaded one if Capacitor is serving it, else the one inside the APK.
    private int currentBuild() {
        int bundled = 0;
        try (InputStream in = act.getAssets().open("public/version.json")) {
            bundled = new JSONObject(new String(readAll(in), "UTF-8")).optInt("build", 0);
        } catch (Exception ignored) { }
        String served = prefs().getString(com.getcapacitor.plugin.WebView.CAP_SERVER_PATH, "");
        int live = (served != null && !served.isEmpty() && new File(served).exists()) ? prefs().getInt(PREF_BUILD, 0) : 0;
        return Math.max(bundled, live);
    }

    private void installApk(JSONObject an) throws Exception {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !act.getPackageManager().canRequestPackageInstalls()) {
            toast("A new version of the app is ready. Allow Multiverse Mayhem to install it.");
            act.runOnUiThread(() -> act.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + act.getPackageName()))));
            return;
        }
        toast("Downloading the new app version…");
        byte[] data = get(ROOT + safePath(an.getString("apk")));
        String want = an.optString("sha256", "");
        if (!want.isEmpty() && !want.equals(hex(MessageDigest.getInstance("SHA-256").digest(data)))) throw new Exception("Bad APK");
        File apk = new File(act.getCacheDir(), "update.apk");
        try (OutputStream os = new FileOutputStream(apk)) { os.write(data); }
        Uri uri = FileProvider.getUriForFile(act, act.getPackageName() + ".fileprovider", apk);
        Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        act.runOnUiThread(() -> act.startActivity(i));
    }

    // Paths from the manifest must stay inside the game folder.
    private static String safePath(String p) throws Exception {
        if (p.isEmpty() || p.startsWith("/") || p.contains("..") || p.contains("\\") || p.contains(":")) throw new Exception("Bad path " + p);
        return p;
    }

    private static byte[] get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(6000);
        c.setReadTimeout(20000);
        c.setUseCaches(false);
        try {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode() + " for " + url);
            try (InputStream in = c.getInputStream()) { return readAll(in); }
        } finally { c.disconnect(); }
    }

    private static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        byte[] buf = new byte[65536];
        int n;
        while ((n = in.read(buf)) > 0) b.write(buf, 0, n);
        return b.toByteArray();
    }

    private static String sha256(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(f)) {
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) md.update(buf, 0, n);
        }
        return hex(md.digest());
    }

    private static String hex(byte[] d) {
        StringBuilder s = new StringBuilder();
        for (byte b : d) s.append(String.format("%02x", b));
        return s.toString();
    }

    private static void deleteTree(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteTree(k);
        f.delete();
    }

    private void toast(String text) {
        act.runOnUiThread(() -> Toast.makeText(act, text, Toast.LENGTH_SHORT).show());
    }
}
