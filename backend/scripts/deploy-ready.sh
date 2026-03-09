#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

export NODE_ENV=production
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=256}"
export npm_config_audit=false
export npm_config_fund=false
export npm_config_loglevel=warn
export npm_config_progress=false
export npm_config_maxsockets=3
export npm_config_ignore_scripts=true

echo "[DEPLOY] Installing npm dependencies (light mode)..."
npm install --omit=dev --no-audit --no-fund --ignore-scripts

FFMPEG_DIR="${HOME}/.local/marsai/ffmpeg"
FFMPEG_BIN_PATH="${FFMPEG_DIR}/ffmpeg"

download_file() {
  local url="$1"
  local target="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$target"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -qO "$target" "$url"
    return
  fi

  echo "[DEPLOY] ERROR: curl or wget is required to download ffmpeg."
  exit 1
}

install_ffmpeg_if_missing() {
  if [ -x "$FFMPEG_BIN_PATH" ]; then
    echo "[DEPLOY] ffmpeg already cached: $FFMPEG_BIN_PATH"
    return
  fi

  local arch
  local release_url
  local tmp_dir
  local extracted_dir

  arch="$(uname -m)"

  case "$arch" in
    x86_64|amd64)
      release_url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
      ;;
    aarch64|arm64)
      release_url="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-arm64-static.tar.xz"
      ;;
    *)
      echo "[DEPLOY] ERROR: unsupported architecture '$arch' for auto ffmpeg install."
      exit 1
      ;;
  esac

  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  echo "[DEPLOY] Downloading ffmpeg static binary..."
  download_file "$release_url" "$tmp_dir/ffmpeg.tar.xz"
  tar -xJf "$tmp_dir/ffmpeg.tar.xz" -C "$tmp_dir"

  extracted_dir="$(find "$tmp_dir" -maxdepth 1 -type d -name "ffmpeg-*-static" | head -n 1 || true)"
  if [ -z "$extracted_dir" ] || [ ! -f "$extracted_dir/ffmpeg" ]; then
    echo "[DEPLOY] ERROR: ffmpeg archive format not recognized."
    exit 1
  fi

  mkdir -p "$FFMPEG_DIR"
  cp "$extracted_dir/ffmpeg" "$FFMPEG_BIN_PATH"
  chmod +x "$FFMPEG_BIN_PATH"
  echo "[DEPLOY] ffmpeg installed: $FFMPEG_BIN_PATH"
}

persist_ffmpeg_env() {
  local env_file="$APP_DIR/.env"
  local escaped_path

  escaped_path="$(printf '%s\n' "$FFMPEG_BIN_PATH" | sed 's/[\/&]/\\&/g')"

  if [ -f "$env_file" ]; then
    if grep -q '^FFMPEG_BIN=' "$env_file"; then
      sed -i "s/^FFMPEG_BIN=.*/FFMPEG_BIN=$escaped_path/" "$env_file"
    else
      printf '\nFFMPEG_BIN=%s\n' "$FFMPEG_BIN_PATH" >> "$env_file"
    fi
  else
    printf 'FFMPEG_BIN=%s\n' "$FFMPEG_BIN_PATH" > "$env_file"
  fi

  echo "[DEPLOY] FFMPEG_BIN persisted in $env_file"
}

install_ffmpeg_if_missing
persist_ffmpeg_env

echo "[DEPLOY] Deploy ready complete."
