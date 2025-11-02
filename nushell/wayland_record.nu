let recordings_dir = ($env.HOME + "/recordings")
^mkdir -p $recordings_dir

# Check if wf-recorder is running
let is_running = (^pgrep wf-recorder | str length | $in > 0)

if $is_running {
    # Stop wf-recorder
    ^pkill -f wf-recorder
    # Find the most recent recording
    let $latest_file = (ls $recordings_dir | where name =~ recording.*\.webm$ | sort-by modified -r | get 0.name)
    if ($latest_file | is-not-empty) {
        echo "Launching dragon for $latest_file"
        ^dragon-drop $latest_file
    } else {
        echo "Error: No recent recording found"
    }
} else {
    # Start new recording
    let timestamp = (^date +%Y-%m-%d_%H-%M-%S)
    let filename = ($recordings_dir + $"/recording_($timestamp).webm")
    let geometry = (^slurp | str trim)
    if ($geometry | is-empty) {
        echo "Error: slurp failed to provide valid geometry"
        return
    }
    ^wf-recorder -g $geometry -c libvpx-vp9 -p b=2M -r 24 -f $filename &
}
