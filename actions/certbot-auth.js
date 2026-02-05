#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import ospath from 'ospath';
import SSH from 'simple-ssh';

import { fetchSerialViaHttps, getZoneFromDomain, toRelativeDname } from './../lib/dns.js';

const configFile = path.join(ospath.home(), '.netivo');

function loadGlobalConfig() {
  if (fs.existsSync(configFile)) {
    try {
      return JSON.parse(fs.readFileSync(configFile, 'utf-8')) || {};
    } catch (_) {}
  }
  return {};
}

function escapeSh(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}
function getApiConfig(cfg) {
  return {
    host: process.env.CPANEL_API_HOST || cfg.cpanel_api_host || cfg.api_host || '',
    user: process.env.CPANEL_API_USER || cfg.cpanel_api_user || cfg.api_user || '',
    token: process.env.CPANEL_API_TOKEN || cfg.cpanel_api_token || cfg.api_token || ''
  };
}


async function run() {
  try {
    const domain = process.env.CERTBOT_DOMAIN;
    const validation = process.env.CERTBOT_VALIDATION;

    if (!domain || !validation) {
      console.error('Missing CERTBOT_DOMAIN or CERTBOT_VALIDATION');
      process.exit(1);
    }

    const cfg = loadGlobalConfig();
    const sshConfig = {
      host: cfg.host || '',
      port: cfg.port || 22,
      user: cfg.user || '',
      private_key: cfg.private_key || ''
    };

    if (!sshConfig.host || !sshConfig.user || !sshConfig.private_key) {
      console.error('SSH config incomplete in ~/.netivo');
      process.exit(1);
    }

    const zone = getZoneFromDomain(domain);
    console.log(`Wyznaczona strefa DNS: ${zone} dla domeny: ${domain}`);
    const dname = toRelativeDname(domain, zone);

    const ssh = new SSH({
      host: sshConfig.host,
      user: sshConfig.user,
      port: Number(sshConfig.port) || 22,
      key: fs.readFileSync(sshConfig.private_key)
    });

    const execWithCode = (command) => new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      ssh.exec(command, {
        out: (d) => { stdout += d; },
        err: (d) => { stderr += d; },
        exit: (code) => resolve({ code, stdout, stderr })
      }).start();
    });

    // 1) Pobierz serial przez HTTPS API
    const apiCfg = getApiConfig(cfg);
    if (!apiCfg.token) {
      console.error('Brak konfiguracji cPanel API (token) w ~/.netivo lub środowisku.');
      process.exit(1);
    }

    let serial = null;
    try {
      serial = await fetchSerialViaHttps(zone, apiCfg);
    } catch (e) {
      console.error('HTTPS API error:', e.message || String(e));
      process.exit(1);
    }

    // 2) Build add JSON string according to spec
    const addObj = {
      dname: dname,
      ttl: 300,
      record_type: 'TXT',
      data: [String(validation)]
    };
    const addStr = JSON.stringify(addObj);

    // 3) Call mass_edit_zone with proper parameters per spec
    let ok = false;
    const cmdDNS = `uapi --output=json DNS mass_edit_zone zone=${escapeSh(zone)} serial=${escapeSh(String(serial))} add=${escapeSh(addStr)}`;
    let res = await execWithCode(cmdDNS);
    if (res.code === 0) {
      try {
        const j = JSON.parse(res.stdout || '{}');
        ok = j?.status === 1 || j?.result?.status === 1;
      } catch (_) { ok = true; }
    }

    if (!ok) {
      const cmdZE = `uapi --output=json ZoneEdit mass_edit_zone domain=${escapeSh(zone)} serial=${escapeSh(String(serial))} add=${escapeSh(addStr)}`;
      res = await execWithCode(cmdZE);
      if (res.code === 0) {
        try {
          const j = JSON.parse(res.stdout || '{}');
          ok = j?.status === 1 || j?.result?.status === 1;
        } catch (_) { ok = true; }
      }
    }

    if (!ok) {
      console.error(res.stderr || 'Failed to add TXT record via mass_edit_zone');
      process.exit(1);
    }


    process.exit(0);
  } catch (e) {
    console.error(e.message || String(e));
    process.exit(1);
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
