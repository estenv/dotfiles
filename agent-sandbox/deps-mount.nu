#!/usr/bin/env nu

let repos_root = ($env.HOME | path join 'repos') | path expand
let agent_deps_root = ($env.HOME | path join 'agent-deps') | path expand
let container_repos_root = '/repos'

let excludes = [
    '.git'
    'node_modules'
    '.venv'
    'venv'
    '.tox'
    '.nox'
    '.direnv'
    '.mypy_cache'
    '.pytest_cache'
    '.ruff_cache'
    '.next'
    '.nuxt'
    '.turbo'
    'dist'
    'build'
    'coverage'
    'target'
    'vendor'
]

let fd_excludes = $excludes | each {|e| ['--exclude' $e] } | flatten

def rel_path [root: string, path: string] {
    if $path == $root { '' } else {
        $path | str replace ($root + '/') ''
    }
}

def mirror_parent [root: string, mirror_root: string, path: string] {
    let rel = (rel_path $root $path)
    if ($rel | is-empty) { $mirror_root } else {
        $mirror_root | path join $rel
    }
}

def project_dirs [root: string, pattern: string] {
    ^fd --hidden --absolute-path --type file $pattern $root ...$fd_excludes
    | lines
    | where {|p| $p != '' }
    | each {|p| $p | path dirname }
    | uniq
    | sort
}

def create_mount [project_dir: string, dep_name: string] {
    let src_parent = (mirror_parent $repos_root $agent_deps_root $project_dir)
    let dst_parent = (mirror_parent $repos_root $container_repos_root $project_dir)
    let src = $src_parent | path join $dep_name
    let dst = $dst_parent | path join $dep_name

    mkdir $src_parent
    mkdir $src
    ['-v' $'($src):($dst)']
}

let node_mounts = (
    project_dirs $repos_root '^package\.json$'
    | each {|project_dir| create_mount $project_dir 'node_modules' }
    | flatten
)

let python_mounts = (
    project_dirs $repos_root '^(pyproject\.toml|requirements\.txt|requirements-dev\.txt|uv\.lock)$'
    | each {|project_dir| create_mount $project_dir '.venv' }
    | flatten
)

[$node_mounts $python_mounts] | flatten | to json
