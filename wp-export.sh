#!/bin/bash

DEFAULT_EXCLUDES=(
    "wp-content/uploads"
    "wp-content/uploads-webpc"
    "*.log"
    "*_log"
    "cache"
    ".git"
    "wp-files-export.sh"
)

# Enable alias expansion for non-interactive shell
shopt -s expand_aliases

# Source bashrc/profile to load aliases (where wp might be defined)
[ -f ~/.bash_profile ] && . ~/.bash_profile
[ -f ~/.bashrc ] && . ~/.bashrc
[ -f /etc/profile ] && . /etc/profile

# Fallback: if wp is not in PATH and not an alias, try to find it
if ! type wp > /dev/null 2>&1; then
    # Try common paths
    if [ -f /usr/local/bin/wp ]; then
        alias wp='/usr/local/bin/wp'
    elif [ -f ~/bin/wp ]; then
        alias wp='~/bin/wp'
    elif [ -f /usr/bin/wp ]; then
        alias wp='/usr/bin/wp'
    fi
fi

if ! type wp > /dev/null 2>&1; then
    echo "ERROR: 'wp' command not found. Please ensure WP-CLI is installed and accessible."
    exit 1
fi

wp db export backup_db.sql --add-drop-table --single-transaction=true --disable-keys=true --quick=true

for exclude in "${DEFAULT_EXCLUDES[@]}"; do
    exclude_params+=" --exclude='$exclude'"
done

tar -czf ./backup-netivo.tar.gz $exclude_params .

rm backup_db.sql
rm wp-export.sh