const SCRIPT_DIR = path self .

export def --wrapped main [action?: string, ...rest: string] {
    match $action {
        'build' => { ^docker build -t agent-sandbox-runner $SCRIPT_DIR }
        'run' => { ag_run ...$rest }
        'proxy' => { ensure_proxy_running }
        'logs' => { ^docker logs -f agent-egress-proxy }
        _ => { ag_help }
    }
}

def latest_pi_version [] {
    ^npm view @mariozechner/pi-coding-agent dist-tags.latest | str trim
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

def ag_build [] {
    let image_name = 'agent-sandbox-runner'
    ^docker build --build-arg $"PI_VERSION=(latest_pi_version)" -t $image_name $SCRIPT_DIR
}

def ag_help [] {
    print "Usage:"
    print "  ag build - build agent container image"
    print "  ag run [cmd ...] - execute command in agent container in CWD, cmd defaults to pi"
    print "  ag proxy - start proxy"
    print "  ag logs - tail proxy logs"
}
