alias vim = nvim
alias cdr = cd ~/repos/
alias cdd = cd ~/doc/
alias cdp = cd ~/proj/
alias cdb = cd ~/Dropbox/
alias cdl = cd ~/dl/
alias zzip = /usr/bin/zip
alias llama-start = docker compose -f ~/llama-docker/compose.yml up -d
alias llama-stop = docker compose -f ~/llama-docker/compose.yml stop
alias lg = lazygit
alias ldo = lazydocker

#alias sunset = job spawn { wlsunset -t 2000 -S 07:00 -s 21:00; disown }
alias sunset = bash -c "wlsunset -t 2000 -S 07:00 -s 21:00 &>/dev/null &"

def ai [
--file(-f): string
--clear(-c)
  ...args
] {
  let clear_arg = if $clear { ["--empty-session"] } else { [] }
  let file_arg = if ($file | is-not-empty) { ["-f", $file] } else { [] }
  aichat -r short -s short --save-session ...$file_arg ...$args | glow 
}

source ~/.config/zoxide.nu
#source ~/.cargo/env.nu
source ~/.config/secrets.nu
#source ~/.config/nushell/theme_mocha.nu
