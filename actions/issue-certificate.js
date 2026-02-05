#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import * as spawn from 'cross-spawn';
import { fileURLToPath } from 'url';
import log from '../lib/log.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--domain=')) args.domain = arg.split('=')[1];
    if (arg.startsWith('--out=')) args.outDir = arg.split('=')[1];
    if (arg.startsWith('--email=')) args.email = arg.split('=')[1];
  }
  return args;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}


async function askForMissing(args) {
  const q = [];
  if (!args.domain) {
    q.push({ type: 'text', name: 'domain', message: 'Podaj domenę dla certyfikatu (np. example.com):', validate: v => v ? true : 'Wymagane' });
  }
  if (!args.outDir) {
    q.push({ type: 'text', name: 'outDir', message: 'Podaj lokalny katalog docelowy na pliki certyfikatu:', validate: v => v ? true : 'Wymagane' });
  }
  if (!args.email) {
    q.push({ type: 'text', name: 'email', message: 'Podaj e-mail do rejestracji w Let\'s Encrypt:', validate: v => v && v.includes('@') ? true : 'Podaj poprawny e-mail' });
  }
  if (q.length === 0) return args;
  const ans = await prompts(q);
  return { ...args, ...ans };
}

(async function run() {
  try {
    const args = await askForMissing(parseArgs(process.argv));

    if (!args.domain || !args.outDir) {
      log.log_error('Brak wymaganych danych: domena i katalog docelowy.');
      process.exit(1);
    }

    ensureDir(args.outDir);

    const localAuthPath = path.join(__dirname, 'certbot-auth.js');
    const localCleanupPath = path.join(__dirname, 'certbot-cleanup.js');
    try {
      fs.chmodSync(localAuthPath, 0o755);
      fs.chmodSync(localCleanupPath, 0o755);
    } catch (_) { /* ignore */ }

    log.log('Uruchamiam certbot lokalnie z walidacją DNS przez SSH...');

    const configDir = path.resolve(args.outDir, 'config');
    const workDir = path.resolve(args.outDir, 'work');
    const logsDir = path.resolve(args.outDir, 'logs');
    
    ensureDir(configDir);
    ensureDir(workDir);
    ensureDir(logsDir);

    const email = args.email;
    const certbotArgs = [
      'certonly',
      '--manual',
      '--preferred-challenges', 'dns',
      '-d', args.domain,
      '--agree-tos',
      '-m', email,
      '--manual-public-ip-logging-ok',
      '--no-eff-email',
      '--non-interactive',
      '--manual-auth-hook', localAuthPath,
      '--config-dir', configDir,
      '--work-dir', workDir,
      '--logs-dir', logsDir
    ];

    log.log(`Komenda: certbot ${certbotArgs.join(' ')}`);

    const result = spawn.sync('certbot', certbotArgs, { stdio: 'inherit' });

    if (result.status !== 0) {
      throw new Error(`Certbot zakończył się błędem (kod ${result.status})`);
    }

    log.log('Certyfikat został pomyślnie wygenerowany lokalnie.');
    log.log(`Pliki znajdują się w: ${path.join(configDir, 'live', args.domain)}`);

    log.log('Zakończono powodzeniem.');
  } catch (err) {
    log.log_error(err.message || String(err));
    process.exit(1);
  }
})();
