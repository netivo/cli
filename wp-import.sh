#!/bin/bash
set -e

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

if [ "$#" -ne 7 ]; then
    echo "Usage: $0 <domain> <subdomain> <db_name> <db_user> <db_password> <db_prefix> <backup_file>"
    exit 1
fi

DOMAIN=$1
SUBDOMAIN=$2
DB_NAME=$3
DB_USER=$4
DB_PASSWORD=$5
DB_PREFIX=$6
BACKUP_FILE=$7

FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"
RELATIVE_DIR="public_html/${FULL_DOMAIN}"

echo "Starting WordPress import for ${FULL_DOMAIN}..."

# 1. Create Subdomain (ignore if exists)
echo "Ensuring subdomain ${SUBDOMAIN} exists..."
uapi SubDomain addsubdomain domain="${SUBDOMAIN}" rootdomain="${DOMAIN}" dir="${RELATIVE_DIR}" || echo "Subdomain might already exist, continuing..."

# 2. Create Database and User
echo "Creating database netivodev_${DB_NAME}..."
uapi Mysql create_database name="netivodev_${DB_NAME}" || echo "Database might already exist..."
uapi Mysql create_user name="netivodev_${DB_USER}" password="${DB_PASSWORD}" || echo "User might already exist..."
uapi Mysql set_privileges_on_database user="netivodev_${DB_USER}" database="netivodev_${DB_NAME}" privileges="ALL PRIVILEGES"

# 3. Prepare Directory and Unpack
if [ ! -d "$RELATIVE_DIR" ]; then
    mkdir -p "$RELATIVE_DIR"
fi

echo "Unpacking backup ${BACKUP_FILE} to ${RELATIVE_DIR}..."
tar -xzf "${BACKUP_FILE}" -C "$RELATIVE_DIR"

cd "$RELATIVE_DIR" || { echo "Failed to enter directory ${RELATIVE_DIR}"; exit 1; }

# 4. Update wp-config.php
echo "Updating wp-config.php..."
if [ -f wp-config.php ]; then
    wp config set DB_NAME "netivodev_${DB_NAME}"
    wp config set DB_USER "netivodev_${DB_USER}"
    wp config set DB_PASSWORD "${DB_PASSWORD}"
    # We keep existing table_prefix to match the imported database
else
    echo "wp-config.php not found, creating new one..."
    wp config create --dbname="netivodev_${DB_NAME}" --dbuser="netivodev_${DB_USER}" --dbpass="${DB_PASSWORD}" --dbprefix="${DB_PREFIX}_" --force
fi

# 5. Import Database
if [ -f backup_db.sql ]; then
    echo "Importing database..."
    wp db import backup_db.sql
    rm backup_db.sql
else
    echo "WARNING: backup_db.sql not found in backup archive."
fi

# 6. Search and Replace URL
OLD_URL=$(wp option get siteurl --skip-plugins --skip-themes 2>/dev/null || echo "")
if [ -n "$OLD_URL" ]; then
    echo "Replacing ${OLD_URL} with https://${FULL_DOMAIN}..."
    wp search-replace "${OLD_URL}" "https://${FULL_DOMAIN}" --all-tables
fi

# 7. Create Users (same as in wp-install.sh)
echo "Creating admin users..."
wp user create Michal michal.swiatek@netivo.pl --send-email --role=administrator || echo "User Michal already exists."
wp user create Krystian krystian.wojcik@netivo.pl --send-email --role=administrator || echo "User Krystian already exists."
wp user create Adrian adrian.bochenek@netivo.pl --send-email --role=administrator || echo "User Adrian already exists."
wp user create Mikolaj mikolaj.stankiewicz@netivo.pl --send-email --role=administrator || echo "User Mikolaj already exists."

# 8. Cleanup
echo "Cleaning up..."
wp plugin delete $(wp plugin list --status=inactive --field=name) || echo "No inactive plugins to delete."
wp theme delete $(wp theme list --status=inactive --field=name) || echo "No inactive themes to delete."

echo "WordPress import for ${FULL_DOMAIN} completed successfully!"

