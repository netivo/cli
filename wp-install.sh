#!/bin/bash

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

# Check if wp is now available
if ! type wp > /dev/null 2>&1; then
    echo "ERROR: 'wp' command not found. Please ensure WP-CLI is installed and accessible."
    exit 1
fi

# Check if all required arguments are provided
if [ "$#" -ne 7 ]; then
    echo "Usage: $0 <domain> <subdomain> <db_name> <db_user> <db_password> <db_prefix> <site_name>"
    exit 1
fi

DOMAIN=$1
SUBDOMAIN=$2
DB_NAME=$3
DB_USER=$4
DB_PASSWORD=$5
DB_PREFIX=$6
SITE_NAME=$7

# Full domain for installation (e.g., subdomain.domain)
FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"

echo "Starting WordPress installation for ${FULL_DOMAIN}..."

# 1. Create Subdomain
# uapi SubDomain addsubdomain domain=heban rootdomain=sm2.netivo.pl dir=public_html/$DOMAIN
uapi SubDomain addsubdomain domain="${SUBDOMAIN}" rootdomain="${DOMAIN}" dir="public_html/${FULL_DOMAIN}"

# 2. Create Database and User
uapi Mysql create_database name="netivodev_${DB_NAME}"
uapi Mysql create_user name="netivodev_${DB_USER}" password="${DB_PASSWORD}"
uapi Mysql set_privileges_on_database user="netivodev_${DB_USER}" database="netivodev_${DB_NAME}" privileges="ALL PRIVILEGES"

# 3. Prepare Directory
# The original script used /public_html which is unusual. 
# We'll use a relative path for the directory and try to cd into it.
RELATIVE_DIR="public_html/${FULL_DOMAIN}"
# If it needs to be absolute from root, we can use /${RELATIVE_DIR}
# but usually it's better to stay in user space. 
# Following the original script's potential intent:
# TARGET_DIR="/${RELATIVE_DIR}"

if [ ! -d "$RELATIVE_DIR" ]; then
    mkdir -p "$RELATIVE_DIR"
fi
cd "$RELATIVE_DIR" || { echo "Failed to enter directory ${RELATIVE_DIR}"; exit 1; }

# 4. WP-CLI Installation
wp core download --locale=pl_PL
wp config create --dbname="netivodev_${DB_NAME}" --dbuser="netivodev_${DB_USER}" --dbpass="${DB_PASSWORD}" --dbprefix="${DB_PREFIX}_"
wp core install --url="${FULL_DOMAIN}" --title="${SITE_NAME}" --admin_user=Wordpress --admin_password=1Q@W3e4r --admin_email=wordpress@netivo.pl --locale=pl_PL --skip-email

# 5. Update Options
wp option update siteurl "https://${FULL_DOMAIN}"
wp option update home "https://${FULL_DOMAIN}"

# 6. Create Users
wp user create Michal michal.swiatek@netivo.pl --send-email --role=administrator
wp user create Krystian krystian.wojcik@netivo.pl --send-email --role=administrator
wp user create Adrian adrian.bochenek@netivo.pl --send-email --role=administrator
wp user create Mikolaj mikolaj.stankiewicz@netivo.pl --send-email --role=administrator

# 7. Cleanup
wp user delete 1 --yes
wp plugin delete $(wp plugin list --status=inactive --field=name)
wp theme delete $(wp theme list --status=inactive --field=name)

echo "WordPress installation for ${FULL_DOMAIN} completed successfully!"
