#!/usr/bin/env nu

let repos_root = $env.REPOS_ROOT? | default ($env.HOME | path join 'repos') | path expand
mut mounts = []

let repos = (
  ^fd --hidden --no-ignore --absolute-path --type file --type directory '^\.git$' $repos_root -0
  | split row (char -i 0)
  | where {|p| $p != '' }
  | each {|p| $p | path dirname }
  | uniq
  | sort
)

for repo in $repos {
    let git_marker = $repo | path join '.git'

    if ($git_marker | path type) == 'dir' {
        let config = $git_marker | path join 'config'
        let hooks = $git_marker | path join 'hooks'

        if ($config | path exists) {
            $mounts = (
                $mounts
                | append ['-v' $'($config):/repos/($repo | str replace ($repos_root + "/") "")/.git/config:ro']
            )
        }

        if ($hooks | path exists) {
            $mounts = (
                $mounts
                | append ['-v' $'($hooks):/repos/($repo | str replace ($repos_root + "/") "")/.git/hooks:ro']
            )
        }
    } else {
        let gitfile = (
            open $git_marker
            | lines
            | first
            | str trim
        )

        if not ($gitfile | str starts-with 'gitdir: ') {
            continue
        }

        let raw_gitdir = $gitfile | str replace 'gitdir: ' ''
        let worktree_gitdir = if ($raw_gitdir | str starts-with '/') {
            $raw_gitdir
        } else {
            $repo | path join $raw_gitdir
        } | path expand

        let common_gitdir = (
            $worktree_gitdir
            | path dirname
            | path dirname
            | path dirname
        )

        let worktree_gitdir_rel = $worktree_gitdir | str replace ($repos_root + '/') ''
        let common_gitdir_rel = $common_gitdir | str replace ($repos_root + '/') ''

        let config = $worktree_gitdir | path join 'config'
        let config_worktree = $worktree_gitdir | path join 'config.worktree'
        let hooks = $common_gitdir | path join 'hooks'

        if ($config | path exists) {
            $mounts = (
                $mounts
                | append ['-v' $'($config):/repos/($worktree_gitdir_rel)/config:ro']
            )
        }

        if ($config_worktree | path exists) {
            $mounts = (
                $mounts
                | append ['-v' $'($config_worktree):/repos/($worktree_gitdir_rel)/config.worktree:ro']
            )
        }

        if ($hooks | path exists) {
            $mounts = (
                $mounts
                | append ['-v' $'($hooks):/repos/($common_gitdir_rel)/hooks:ro']
            )
        }
    }

    let repo_rel = if $repo == $repos_root { '' } else {
        $repo | str replace ($repos_root + '/') ''
    }
    let gitmodules = $repo | path join '.gitmodules'

    if ($gitmodules | path exists) {
        let dst = if ($repo_rel | is-empty) {
            '/repos/.gitmodules'
        } else {
            $'/repos/($repo_rel)/.gitmodules'
        }
        $mounts = ($mounts | append ['-v' $'($gitmodules):($dst):ro'])
    }
}

$mounts | to json
