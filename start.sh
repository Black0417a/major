#!/usr/bin/env bash
set -euo pipefail

APP_NAME="server.js"
PID_FILE="server.pid"
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/server.log"
ERROR_LOG="$LOG_DIR/server-error.log"

mkdir -p "$LOG_DIR"

timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

log() {
  echo "[$(timestamp)] $1" | tee -a "$LOG_DIR/start.log"
}

is_running() {
  if [ -f "$PID_FILE" ]; then
    local pid
    pid="$(cat "$PID_FILE")"
    if ps -p "$pid" > /dev/null 2>&1; then
      return 0
    fi
  fi
  return 1
}

start() {
  if is_running; then
    log "服务已在运行 (PID: $(cat "$PID_FILE"))"
    return 0
  fi

  log "启动 MajorTI 服务..."
  nohup node "$APP_NAME" >> "$LOG_FILE" 2>> "$ERROR_LOG" &
  echo $! > "$PID_FILE"

  sleep 1
  local url
  url="$(grep -oE 'http://localhost:[0-9]+' "$LOG_FILE" | tail -n 1 || true)"
  if [ -n "$url" ]; then
    log "服务已启动: $url"
  else
    log "服务已启动，端口信息请查看日志"
  fi
  log "日志文件: $LOG_FILE"
  log "错误日志: $ERROR_LOG"
}

stop() {
  if ! is_running; then
    log "服务未在运行"
    rm -f "$PID_FILE"
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  log "停止服务 (PID: $pid)..."
  kill "$pid" || true

  for _ in {1..10}; do
    if ! ps -p "$pid" > /dev/null 2>&1; then
      rm -f "$PID_FILE"
      log "服务已停止"
      return 0
    fi
    sleep 1
  done

  kill -9 "$pid" 2>/dev/null || true
  rm -f "$PID_FILE"
  log "服务已强制停止"
}

restart() {
  stop
  start
}

status() {
  if is_running; then
    log "服务正在运行 (PID: $(cat "$PID_FILE"))"
  else
    log "服务未在运行"
  fi
}

logs() {
  if [ -f "$LOG_FILE" ]; then
    tail -f "$LOG_FILE"
  else
    log "日志文件不存在"
  fi
}

help() {
  echo "用法: $0 {start|stop|restart|status|logs}"
}

case "${1:-}" in
  start) start ;;
  stop) stop ;;
  restart) restart ;;
  status) status ;;
  logs) logs ;;
  *) help ;;
esac
