#!/bin/bash
# ============================================================
#  Gerenciador do servidor MMORPG
#  Uso: ./servidor.sh {start|stop|status|restart}
#  - O servidor roda DESANEXADO do terminal (nohup), então
#    sobrevive quando o terminal do Acode fecha sozinho.
#  - start derruba instâncias antigas -> sempre sobe limpo
#    na porta 8080 (sem acumular na 8081).
# ============================================================
cd "$(dirname "$0")" || exit 1
LOG="servidor_console.log"
NODE=$(command -v node || echo node)

comecou() {
    pgrep -f 'node server.js' >/dev/null
}

portas() {
    grep -iE ':1F90|:1F91' /proc/net/tcp /proc/net/tcp6 2>/dev/null \
        | awk -F'[ :]+' '{print "  porta listen:", strtonum("0x"$3), "("$3")"}' 2>/dev/null \
        || echo "  (sem listener em 8080/8081)"
}

status() {
    if comecou; then
        echo "STATUS: servidor ATIVO"
        pgrep -af 'node server.js'
    else
        echo "STATUS: nenhum servidor rodando"
    fi
    echo "---"
    echo "Teste HTTP:"
    wget -qO- --timeout=2 http://127.0.0.1:8080/ 2>/dev/null | head -c 0 && echo "  8080 OK" || echo "  8080 sem resposta"
    wget -qO- --timeout=2 http://127.0.0.1:8081/ 2>/dev/null | head -c 0 && echo "  8081 OK" || echo "  8081 sem resposta"
}

start() {
    # derruba instâncias antigas para sempre subir na 8080
    if comecou; then
        echo "Derrubando instâncias antigas..."
        pkill -f 'node server.js' 2>/dev/null
        sleep 2
    fi
    echo "Iniciando servidor (desanexado do terminal)..."
    nohup "$NODE" server.js >> "$LOG" 2>&1 &
    disown
    sleep 3
    if comecou; then
        echo "Servidor subiu:"
        pgrep -af 'node server.js'
        tail -3 "$LOG"
    else
        echo "ERRO: servidor não subiu. Veja o $LOG:"
        tail -10 "$LOG"
    fi
}

stop() {
    if comecou; then
        pkill -f 'node server.js' 2>/dev/null
        sleep 1
        echo "Instâncias derrubadas."
    else
        echo "Nenhum servidor rodando."
    fi
}

case "${1:-status}" in
    start)   start ;;
    stop)    stop ;;
    status)  status ;;
    restart) stop; start ;;
    *)       echo "Uso: $0 {start|stop|status|restart}"; exit 1 ;;
esac