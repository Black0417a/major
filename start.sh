#!/bin/bash

# MajorTI 服务器启动脚本 (Linux)

APP_NAME="server.js"
PID_FILE="server.pid"
LOG_DIR="logs"
LOG_FILE="$LOG_DIR/server.log"
ERROR_LOG="$LOG_DIR/server-error.log"

# 创建日志目录
mkdir -p "$LOG_DIR"

# 获取当前时间戳
timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# 记录日志
log() {
    echo "[$(timestamp)] $1" | tee -a "$LOG_DIR/start.log"
}

# 检查是否已运行
is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# 启动服务器
start() {
    if is_running; then
        log "服务器已在运行 (PID: $PID)"
        return 1
    fi

    log "启动 MajorTI 服务器..."
    
    nohup node "$APP_NAME" >> "$LOG_FILE" 2>> "$ERROR_LOG" &
    PID=$!
    echo $PID > "$PID_FILE"
    
    log "服务器已启动 (PID: $PID)"
    log "日志文件: $LOG_FILE"
    log "错误日志: $ERROR_LOG"
}

# 停止服务器
stop() {
    if ! is_running; then
        log "服务器未在运行"
        rm -f "$PID_FILE"
        return 0
    fi

    log "停止服务器 (PID: $PID)..."
    kill "$PID"
    
    # 等待进程结束
    for i in {1..10}; do
        if ! ps -p "$PID" > /dev/null 2>&1; then
            log "服务器已停止"
            rm -f "$PID_FILE"
            return 0
        fi
        sleep 1
    done

    # 强制终止
    log "强制终止服务器..."
    kill -9 "$PID" 2>/dev/null
    rm -f "$PID_FILE"
    log "服务器已强制停止"
}

# 重启服务器
restart() {
    log "重启服务器..."
    stop
    sleep 1
    start
}

# 查看状态
status() {
    if is_running; then
        log "服务器正在运行 (PID: $PID)"
    else
        log "服务器未在运行"
        rm -f "$PID_FILE"
    fi
}

# 查看日志
logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        log "日志文件不存在"
    fi
}

# 显示帮助
help() {
    echo "用法: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "命令:"
    echo "  start    - 启动服务器"
    echo "  stop     - 停止服务器"
    echo "  restart  - 重启服务器"
    echo "  status   - 查看运行状态"
    echo "  logs     - 查看实时日志"
}

# 主逻辑
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    *)
        help
        ;;
esac
