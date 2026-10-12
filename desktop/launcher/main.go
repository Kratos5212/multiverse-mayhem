// Multiverse Mayhem launcher for Windows.
//
// Every time it starts it reads latest.json from the public releases repository, downloads
// any newer game build (checking every file's SHA-256) into %LOCALAPPDATA%\MultiverseMayhem,
// and opens the game in its own window (Microsoft Edge in app mode, which every Windows 10
// and 11 PC has). A newer launcher is downloaded too and takes over from the next start.
// A full copy of the game is built in, so it also plays offline.
package main

import (
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Where releases are published. MM_UPDATE_ROOT overrides it for testing.
var root = "https://raw.githubusercontent.com/Kratos5212/multiverse-mayhem-releases/main/"

// A fixed local address keeps your saved characters (browser storage) between launches.
const addr = "127.0.0.1:47137"

// Set at build time by scripts/release.js.
var launcherVersion = "0"

//go:embed all:www
var bundled embed.FS

//go:embed launcher.html
var launcherPage []byte

type file struct {
	P string `json:"p"`
	H string `json:"h"`
	S int64  `json:"s"`
}

type manifest struct {
	Build int `json:"build"`
	Game  struct {
		Base  string `json:"base"`
		Files []file `json:"files"`
	} `json:"game"`
	Windows struct {
		Version int    `json:"version"`
		Exe     string `json:"exe"`
		Sha256  string `json:"sha256"`
	} `json:"windows"`
}

type status struct {
	State string `json:"state"` // checking, downloading, ready
	Done  int    `json:"done"`
	Total int    `json:"total"`
	Build int    `json:"build"`
	Msg   string `json:"msg"`
}

var (
	mu      sync.Mutex
	st      = status{State: "checking", Msg: "Checking for updates…"}
	gameDir string // the downloaded build being served, or "" for the built-in one
	appDir  string
	client  = &http.Client{Timeout: 30 * time.Second}
)

func setStatus(f func(*status)) { mu.Lock(); f(&st); mu.Unlock() }

func main() {
	if r := os.Getenv("MM_UPDATE_ROOT"); r != "" {
		root = strings.TrimSuffix(r, "/") + "/"
	}
	base, err := os.UserCacheDir() // %LOCALAPPDATA%
	if err != nil {
		base = os.TempDir()
	}
	appDir = filepath.Join(base, "MultiverseMayhem")
	_ = os.MkdirAll(filepath.Join(appDir, "game"), 0o755)
	if exe, err := os.Executable(); err == nil {
		_ = os.Remove(exe + ".old") // left behind by a launcher update
	}
	gameDir = installedGame()

	ln, err := net.Listen("tcp", addr)
	if err != nil {
		// Already running: just open another window onto it.
		openWindow("http://" + addr + "/")
		return
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/__launcher/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/__launcher/status" {
			mu.Lock()
			s := st
			mu.Unlock()
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Cache-Control", "no-store")
			_ = json.NewEncoder(w).Encode(s)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(launcherPage)
	})
	mux.HandleFunc("/", serveGame)
	go func() { _ = http.Serve(ln, mux) }()
	go update()

	if !openWindow("http://" + addr + "/__launcher/") {
		select {} // opened in the default browser: keep serving
	}
}

// serveGame serves the newest game we have: the downloaded build, or the built-in copy.
func serveGame(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-cache") // the same paths change between builds
	mu.Lock()
	dir := gameDir
	mu.Unlock()
	if dir != "" {
		http.FileServer(http.Dir(dir)).ServeHTTP(w, r)
		return
	}
	sub, _ := fs.Sub(bundled, "www")
	http.FileServer(http.FS(sub)).ServeHTTP(w, r)
}

func bundledBuild() int {
	data, err := bundled.ReadFile("www/version.json")
	if err != nil {
		return 0
	}
	var v struct{ Build int }
	_ = json.Unmarshal(data, &v)
	return v.Build
}

// installedGame returns the downloaded build's folder if it is newer than the built-in copy.
func installedGame() string {
	data, err := os.ReadFile(filepath.Join(appDir, "game", "current"))
	if err != nil {
		return ""
	}
	n, err := strconv.Atoi(strings.TrimSpace(string(data)))
	if err != nil || n <= bundledBuild() {
		return ""
	}
	dir := filepath.Join(appDir, "game", strconv.Itoa(n))
	if _, err := os.Stat(filepath.Join(dir, "index.html")); err != nil {
		return ""
	}
	return dir
}

func currentBuild() int {
	if gameDir != "" {
		n, _ := strconv.Atoi(filepath.Base(gameDir))
		return n
	}
	return bundledBuild()
}

func update() {
	defer setStatus(func(s *status) { s.State = "ready" })
	data, err := get(root + "latest.json?t=" + strconv.FormatInt(time.Now().Unix(), 10))
	if err != nil {
		setStatus(func(s *status) { s.Msg = "Offline: playing the version you have." })
		return
	}
	var m manifest
	if json.Unmarshal(data, &m) != nil {
		return
	}
	go selfUpdate(m)
	if m.Build <= currentBuild() {
		setStatus(func(s *status) { s.Msg = "Up to date."; s.Build = currentBuild() })
		return
	}
	if err := downloadGame(m); err != nil {
		setStatus(func(s *status) { s.Msg = "Update failed, playing the version you have." })
		return
	}
	setStatus(func(s *status) { s.Msg = fmt.Sprintf("Updated to version %d.", m.Build); s.Build = m.Build })
}

func downloadGame(m manifest) error {
	base, err := safe(m.Game.Base)
	if err != nil {
		return err
	}
	dir := filepath.Join(appDir, "game", strconv.Itoa(m.Build))
	setStatus(func(s *status) {
		s.State, s.Total, s.Done = "downloading", len(m.Game.Files), 0
		s.Msg = fmt.Sprintf("Downloading version %d…", m.Build)
	})
	for i, f := range m.Game.Files {
		p, err := safe(f.P)
		if err != nil {
			return err
		}
		out := filepath.Join(dir, filepath.FromSlash(p))
		if old, err := os.ReadFile(out); err != nil || hash(old) != f.H {
			data, err := get(root + base + p)
			if err != nil {
				return err
			}
			if hash(data) != f.H {
				return errors.New("bad file " + p)
			}
			_ = os.MkdirAll(filepath.Dir(out), 0o755)
			if err := os.WriteFile(out+".part", data, 0o644); err != nil {
				return err
			}
			if err := os.Rename(out+".part", out); err != nil {
				return err
			}
		}
		setStatus(func(s *status) { s.Done = i + 1 })
	}
	if err := os.WriteFile(filepath.Join(appDir, "game", "current"), []byte(strconv.Itoa(m.Build)), 0o644); err != nil {
		return err
	}
	mu.Lock()
	gameDir = dir
	mu.Unlock()
	// Remove older downloads.
	entries, _ := os.ReadDir(filepath.Join(appDir, "game"))
	for _, e := range entries {
		if e.IsDir() && e.Name() != strconv.Itoa(m.Build) {
			_ = os.RemoveAll(filepath.Join(appDir, "game", e.Name()))
		}
	}
	return nil
}

// selfUpdate swaps in a newer launcher. Windows lets a running program be renamed, so the
// old one steps aside and the new one starts next time.
func selfUpdate(m manifest) {
	cur, _ := strconv.Atoi(launcherVersion)
	if m.Windows.Version <= cur || m.Windows.Exe == "" {
		return
	}
	p, err := safe(m.Windows.Exe)
	if err != nil {
		return
	}
	data, err := get(root + p)
	if err != nil || (m.Windows.Sha256 != "" && hash(data) != m.Windows.Sha256) {
		return
	}
	exe, err := os.Executable()
	if err != nil {
		return
	}
	if os.WriteFile(exe+".new", data, 0o755) != nil {
		return
	}
	_ = os.Remove(exe + ".old")
	if os.Rename(exe, exe+".old") != nil {
		_ = os.Remove(exe + ".new")
		return
	}
	if os.Rename(exe+".new", exe) != nil {
		_ = os.Rename(exe+".old", exe)
	}
}

// openWindow opens the game in an Edge (or Chrome) app window and waits until it is closed.
// It returns false if it had to fall back to the default browser.
func openWindow(url string) bool {
	var candidates []string
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA"} {
		if d := os.Getenv(env); d != "" {
			candidates = append(candidates,
				filepath.Join(d, "Microsoft", "Edge", "Application", "msedge.exe"),
				filepath.Join(d, "Google", "Chrome", "Application", "chrome.exe"))
		}
	}
	for _, b := range candidates {
		if _, err := os.Stat(b); err != nil {
			continue
		}
		cmd := exec.Command(b, "--app="+url, "--user-data-dir="+filepath.Join(appDir, "window"),
			"--window-size=1280,800", "--no-first-run", "--no-default-browser-check",
			"--autoplay-policy=no-user-gesture-required", "--disable-features=Translate")
		if cmd.Start() == nil {
			_ = cmd.Wait()
			return true
		}
	}
	_ = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	return false
}

func get(url string) ([]byte, error) {
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d for %s", resp.StatusCode, url)
	}
	return io.ReadAll(io.LimitReader(resp.Body, 200<<20))
}

func hash(b []byte) string { h := sha256.Sum256(b); return hex.EncodeToString(h[:]) }

// safe keeps paths from the manifest inside our folders.
func safe(p string) (string, error) {
	if p == "" || strings.HasPrefix(p, "/") || strings.Contains(p, "..") || strings.ContainsAny(p, "\\:") {
		return "", errors.New("bad path " + p)
	}
	return p, nil
}
