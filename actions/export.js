#!/usr/bin/env node

import SSH from 'simple-ssh';
import {readFileSync, existsSync, mkdirSync, writeFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';
import ospath from 'ospath';
import {Client} from 'ssh2';
import {migration as getSshData} from '../lib/get-data.js';

let siteName = process.argv[2];
let domain = process.argv[3];

if (!siteName || !domain) {
    console.log('Błąd: Podaj nazwę konfiguracji strony oraz jej domenę.')
    process.exit(1)
}

const config_file = ospath.home() + '/.netivo';
let global_config = {};
if (existsSync(config_file)) {
    try {
        global_config = JSON.parse(readFileSync(config_file, 'utf8'));
    } catch (e) {
        console.error(`Błąd podczas parsowania pliku config: ${config_file}`);
        process.exit(1);
    }
}

if (!global_config.sites) {
    global_config.sites = {};
}

async function run() {
    let siteConfig = {};
    if (global_config.sites[siteName]) {
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

        // Sprawdzenie czy w configu są wymagane dane
        const requiredFields = ['host', 'user', 'private_key'];
        for (const field of requiredFields) {
            if (!siteConfig[field]) {
                console.error(`Błąd: Brak danych dla pola '${field}' w konfiguracji strony '${siteName}'.`);
                process.exit(1);
            }
        }
    } else {
        console.error(`Błąd: Strona '${siteName}' lub jej domena '${domain}' nie została znaleziona w konfiguracji.`);
        process.exit(1);
    }

    const localBackupPath = path.join(global_config.local_backup_path || process.cwd(), domain);

    if (!existsSync(localBackupPath)) {
        mkdirSync(localBackupPath, {recursive: true});
    }

    const ssh = new SSH({
        host: siteConfig.host,
        user: siteConfig.user,
        port: siteConfig.port,
        key: readFileSync(siteConfig.private_key)
    });

    console.log(siteConfig.host, siteConfig.user, siteConfig.port, siteConfig.private_key);

    const wpExportPath = fileURLToPath(new URL('../wp-export.sh', import.meta.url));
    const wpExportContent = readFileSync(wpExportPath, 'utf8');

    const remoteDir = 'public_html/' + domain;
    const remoteScriptPath = `${remoteDir}/wp-export.sh`;
    const remoteArchiveName = 'backup-netivo.tar.gz';
    const remoteArchivePath = `${remoteDir}/${remoteArchiveName}`;

    console.log(`Łączenie z ${siteConfig.host}...`);
    console.log(`Uruchamianie skryptu: ${remoteScriptPath}`);

    ssh.exec(`if [ ! -d ${remoteDir} ]; then mkdir -p ${remoteDir}; fi && if [ ! -f ${remoteScriptPath} ]; then echo "UPLOADING"; cat > ${remoteScriptPath} && chmod +x ${remoteScriptPath}; else echo "EXISTS"; cat > /dev/null; fi`, {
        in: wpExportContent,
        out: function (stdout) {
            if (stdout.trim() === 'UPLOADING') {
                console.log(remoteScriptPath + ' uploaded to server.');
            } else if (stdout.trim() === 'EXISTS') {
                console.log(remoteScriptPath + ' already exists on server.');
            }
        },
        err: function (stderr) {
            console.error('ERROR: ' + stderr);
        }
    });

    ssh.exec(`cd ${remoteDir} && ./wp-export.sh`, {
        cwd: remoteDir,
        out: function (stdout) {
            console.log(stdout);
        },
        err: function (stderr) {
            console.error('ERROR: ' + stderr);
        },
        exit: function (code) {
            if (code !== 0) {
                console.error(`Skrypt eksportu zakończył się kodem błędu: ${code}`);
                process.exit(code);
            }
            console.log('Eksport na serwerze zakończony pomyślnie.');
            downloadBackup(siteConfig, remoteArchivePath, localBackupPath);
        }
    }).start();
}

function downloadBackup(siteConfig, remoteArchivePath, localBackupPath) {
    const conn = new Client();
    conn.on('ready', () => {
        conn.sftp((err, sftp) => {
            if (err) {
                console.error('SFTP error:', err);
                process.exit(1);
            }

            const timestamp = new Date().toISOString().split('.')[0];
            const fileName = `${siteName}-${timestamp}.tar.gz`;
            const localFile = path.join(localBackupPath, fileName);

            console.log(`Pobieranie backupu do: ${localFile}`);

            sftp.fastGet(remoteArchivePath, localFile, (err) => {
                if (err) {
                    console.error('Błąd podczas pobierania pliku:', err);
                    conn.end();
                    process.exit(1);
                }

                console.log('Pobieranie zakończone.');

                console.log('Usuwanie archiwum z serwera...');
                sftp.unlink(remoteArchivePath, (err) => {
                    if (err) {
                        console.error('Błąd podczas usuwania pliku z serwera:', err);
                    } else {
                        console.log('Archiwum usunięte z serwera.');
                    }
                    conn.end();
                    console.log('Gotowe!');
                });
            });
        });
    }).on('error', (err) => {
        console.error('SSH Connection Error:', err);
        process.exit(1);
    }).connect({
        host: siteConfig.host,
        port: siteConfig.port || 22,
        username: siteConfig.user,
        privateKey: readFileSync(siteConfig.private_key)
    });
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
