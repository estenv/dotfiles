$env.config.buffer_editor = "nvim"
$env.config.show_banner = false

$env.PATH ++= ['~/.local/bin']
$env.PATH ++= ['~/.cache/.bun/bin']
zoxide init nushell | save -f ~/.config/zoxide.nu

mkdir ($nu.data-dir | path join "vendor/autoload")
starship init nu | save -f ($nu.data-dir | path join "vendor/autoload/starship.nu")
