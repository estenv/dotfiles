#!/usr/bin/env nu

def main [...cmd: string] {
    let image_name = 'agent-sandbox-runner'
    let network_name = 'agent-sandbox-internal'
    let repos_root = $env.HOME | path join 'repos' | path expand
    let state_root = $env.HOME | path join '.agent-sessions' | path expand
    let proxy_url = 'http://agent-egress-proxy:3128'

    let host_cwd = pwd | path expand
    let rel_path = try {
        $host_cwd | path relative-to $repos_root
    } catch {
        print "CWD must be in repos"
        exit 1
    }

    let container_cwd = $'/repos/($host_cwd | path relative-to $repos_root)'

    let home_dir = $state_root | path join 'home'
    let cache_yarn = $state_root | path join 'cache' 'yarn'
    let cache_npm = $state_root | path join 'cache' 'npm'
    let cache_pip = $state_root | path join 'cache' 'pip'
    let cache_nuget = $state_root | path join 'cache' 'nuget'
    let cache_dotnet = $state_root | path join 'cache' 'dotnet'
    let cache_uv = $state_root | path join 'cache' 'uv'

    mkdir $home_dir $cache_yarn $cache_npm $cache_pip $cache_nuget $cache_dotnet $cache_uv

    let effective_cmd = if ($cmd | is-empty) { ['pi'] } else { $cmd }

    let ro_mounts = (^nu ./git-ro-mounts.nu | from json)

    let uid = (do -i { ^id -u } | complete).stdout | str trim
    let gid = (do -i { ^id -g } | complete).stdout | str trim

    let docker_args = (
    [
      run --rm -it
      --user $'($uid):($gid)'
      --network $network_name
      --security-opt 'no-new-privileges:true'
      --cap-drop ALL
      --pids-limit '512'
      --memory 8g
      --cpus '6'
      -e HOME=/home/agent
      -e $'HTTP_PROXY=($proxy_url)'
      -e $'HTTPS_PROXY=($proxy_url)'
      -e $'ALL_PROXY=($proxy_url)'
      -e $'http_proxy=($proxy_url)'
      -e $'https_proxy=($proxy_url)'
      -e $'all_proxy=($proxy_url)'
      -e 'NO_PROXY=localhost,127.0.0.1,::1,agent-egress-proxy'
      -e 'no_proxy=localhost,127.0.0.1,::1,agent-egress-proxy'
      -e YARN_CACHE_FOLDER=/cache/yarn
      -e npm_config_cache=/cache/npm
      -e PIP_CACHE_DIR=/cache/pip
      -e NUGET_PACKAGES=/cache/nuget
      -e DOTNET_CLI_HOME=/cache/dotnet
      -e UV_CACHE_DIR=/cache/uv
      -e DOTNET_CLI_TELEMETRY_OPTOUT=1
      -e DOTNET_NOLOGO=1
      -v $'($repos_root):/repos:rw'
    ]
    ++ $ro_mounts
    ++ [
      -v $'($home_dir):/home/agent:rw'
      -v $'($cache_yarn):/cache/yarn:rw'
      -v $'($cache_npm):/cache/npm:rw'
      -v $'($cache_pip):/cache/pip:rw'
      -v $'($cache_nuget):/cache/nuget:rw'
      -v $'($cache_dotnet):/cache/dotnet:rw'
      -v $'($cache_uv):/cache/uv:rw'
      -w $container_cwd
      $image_name
    ]
    ++ $effective_cmd
  )
    ^docker ...$docker_args
}
