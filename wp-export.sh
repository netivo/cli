#!/bin/bash
set -e

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

tar_params=()
for exclude in "${DEFAULT_EXCLUDES[@]}"; do
    tar_params+=(--exclude="$exclude")
done

set +e
tar -czf ./backup-netivo.tar.gz "${tar_params[@]}" .
tar_exit_code=$?
set -e

if [ $tar_exit_code -ne 0 ] && [ $tar_exit_code -ne 1 ]; then
    echo "ERROR: tar command failed with exit code $tar_exit_code"
    exit 1
fi

if [ $tar_exit_code -eq 1 ]; then
    echo "WARNING: Some files changed during archiving (tar exit code 1), but backup created successfully."
fi


rm backup_db.sql
rm wp-export.sh