const $SCRIPT_DIR = path self .

export def --wrapped main [action?: string, ...rest: string] {
    match $action {
        'build' => { ^docker build -t agent-sandbox-runner (script_dir) }
        'run' => { ag_run ...$rest }
        'proxy' => { ensure_proxy_running }
        'logs' => { ^docker logs -f agent-egress-proxy }
        _ => { ag_help }
    }
}

def ensure_proxy_running [] {
    let running = (
        ^docker ps --filter 'name=^agent-egress-proxy$' --format json
        | from json
        | is-not-empty
    )

    if not $running {
        let compose_file = $SCRIPT_DIR | path join 'proxy-compose.yml'
        ^docker compose -f $compose_file up -d egress-proxy
    }
}

def ag_run [...cmd: string] {
    ensure_proxy_running
    ^nu ($SCRIPT_DIR | path join 'agent-run.nu') ...$cmd
}

def ag_help [] {
    print "Usage:"
    print "  ag build - build agent container image"
    print "  ag run [cmd ...] - execute command in agent container in CWD, cmd defaults to pi"
    print "  ag proxy - start proxy"
    print "  ag logs - tail proxy logs"
}
