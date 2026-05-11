#!/usr/bin/env node

import SSH from 'simple-ssh';
import {readFileSync, existsSync, writeFileSync, createReadStream} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';
import ospath from 'ospath';
import {dev as getSshData} from '../lib/get-data.js';

const config_file = ospath.home() + '/.netivo';
let global_config = {};
if (existsSync(config_file)) {
    try {
        global_config = JSON.parse(readFileSync(config_file, 'utf8'));
    } catch (e) {
        console.error('Error parsing config file:', e);
    }
}

let [siteName, backupArg] = process.argv.slice(2);

if (!siteName || !backupArg) {
    console.log('Błąd: nie podano nazwy strony lub pliku backupowego');
    process.exit(1);
}

const config = {
    name: '',
    title: '',
    private_key: '',
    dev_domain: '',
    host: '',
    user: '',
    port: ''
};

if (global_config.hasOwnProperty('private_key') && global_config.private_key !== '') {
    config.private_key = global_config.private_key;
}
if (global_config.hasOwnProperty('host') && global_config.host !== '') {
    config.host = global_config.host;
}
if (global_config.hasOwnProperty('dev_domain') && global_config.dev_domain !== '') {
    config.dev_domain = global_config.dev_domain;
}
if (global_config.hasOwnProperty('user') && global_config.user !== '') {
    config.user = global_config.user;
}
if (global_config.hasOwnProperty('port') && global_config.port !== '') {
    config.port = global_config.port;
}

if (!global_config.sites) {
    global_config.sites = {};
}

async function run() {
    let siteConfig = {};

    if (global_config.sites && global_config.sites[siteName]) {
        const siteData = global_config.sites[siteName];
        if (typeof siteData === 'string') {
            if (existsSync(siteData)) {
                try {
                    siteConfig = JSON.parse(readFileSync(siteData, 'utf8'));
                } catch (e) {
                    console.error(`Błąd podczas parsowania pliku config strony: ${siteData}`);
                    process.exit(1);
                }
            } else {
                console.error(`Plik konfiguracji dla strony ${siteName} nie istnieje: ${siteData}`);
                process.exit(1);
            }
        } else {
            siteConfig = siteData;
        }
    }

    const finalConfig = await getSshData(config);
    siteName = finalConfig.siteName;

    if (!siteName) {
        console.error('Błąd: Nie podano nazwy strony.');
        process.exit(1);
    }

    // Sprawdzenie czy coś się zmieniło i zapisanie jeśli tak
    let changed = false;
    if (!global_config.sites[siteName] || typeof global_config.sites[siteName] === 'string') {
        global_config.sites[siteName] = {};
        changed = true;
    }

    const fieldsToSave = ['host', 'user', 'port', 'private_key', 'dev_domain'];
    for (const field of fieldsToSave) {
        if (global_config.sites[siteName][field] !== finalConfig[field]) {
            global_config.sites[siteName][field] = finalConfig[field];
            changed = true;
        }
    }

    if (changed) {
        writeFileSync(config_file, JSON.stringify(global_config, null, 2));
        console.log(`Zaktualizowano konfigurację dla strony ${siteName} w ${config_file}`);
    }

    const requiredFields = ['host', 'user', 'private_key'];
    for (const field of requiredFields) {
        if (!finalConfig[field]) {
            console.error(`Błąd: Brak wymaganego pola '${field}'.`);
            process.exit(1);
        }
    }

    const ssh = new SSH({
        host: finalConfig.host,
        user: finalConfig.user,
        port: finalConfig.port,
        key: readFileSync(finalConfig.private_key)
    });

    const generateRandomString = (length) => {
        return Math.random().toString(36).substring(2, 2 + length);
    };

    const generatePassword = (length) => {
        const charset = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#&*^_';
        let retVal = '';
        for (let i = 0, n = charset.length; i < length; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    };

    const cleanName = finalConfig.siteName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 7);
    const shuffle = (str) => str.split('').sort(() => 0.5 - Math.random()).join('');

    finalConfig.db_name = ('w' + shuffle(cleanName) + generateRandomString(2)).substring(0, 10);
    finalConfig.db_user = finalConfig.db_name.split('').reverse().join('').substring(0, 10);
    finalConfig.db_password = generatePassword(16);
    finalConfig.db_prefix = ('w' + shuffle(cleanName) + generateRandomString(2)).substring(0, 10);

    console.log('--- Import site data generated:');
    console.log('Full domain: ' + finalConfig.siteName + '.' + finalConfig.dev_domain);
    console.log('DB Name:     ' + finalConfig.db_name);
    console.log('DB User:     ' + finalConfig.db_user);
    console.log('DB Password: ' + finalConfig.db_password);
    console.log('DB Prefix:   ' + finalConfig.db_prefix);

    const wpImportScriptPath = fileURLToPath(new URL('../wp-import.sh', import.meta.url));
    const wpImportContent = readFileSync(wpImportScriptPath, 'utf8');
    const backupFileName = path.basename(finalConfig.backup_path);

    const remoteDir = 'public_html/' + siteName + (finalConfig.dev_domain ? '.' + finalConfig.dev_domain : '');
    const remoteScriptPath = `${remoteDir}/wp-import.sh`;
    const remoteBackupPath = `${remoteDir}/${backupFileName}`;

    console.log('Uploading wp-import.sh and backup file...');

    ssh.exec(`if [ ! -d ${remoteDir} ]; then mkdir -p ${remoteDir}; fi && cat > ${remoteScriptPath} && chmod +x ${remoteScriptPath}`, {
        in: wpImportContent,
        out: () => console.log('wp-import.sh uploaded.'),
        err: (err) => console.error('Upload error (script):', err)
    });

    // Upload backup file
    // Using cat for binary files can be tricky with simple-ssh if not careful,
    // but let's try with Buffer.
    const backupContent = readFileSync(finalConfig.backup_path);
    ssh.exec(`cat > ${remoteBackupPath}`, {
        in: backupContent,
        out: () => console.log(`${backupFileName} uploaded.`),
        err: (err) => console.error('Upload error (backup):', err)
    });

    const escapeShellArg = (arg) => {
        return `'${String(arg).replace(/'/g, '\'\\\'\'')}'`;
    };

    const importArgs = [
        finalConfig.dev_domain,
        finalConfig.siteName,
        finalConfig.db_name,
        finalConfig.db_user,
        finalConfig.db_password,
        finalConfig.db_prefix,
        backupFileName
    ].map(escapeShellArg);

    console.log('Running wp-import.sh on server...');
    ssh.exec(`cd ${remoteDir} && ./wp-import.sh`, {
        args: importArgs,
        out: function (stdout) {
            console.log(stdout);
        },
        err: function (stderr) {
            console.error('ERROR: ' + stderr);
        }
    });

    console.log('Cleaning up server...');
    ssh.exec(`cd ${remoteDir} && rm wp-import.sh ${backupFileName}`, {
        out: () => console.log('Cleanup completed.')
    }).start();
}

run().catch(err => {
    console.error(err);
});
