import https from 'https';

function b64decode(str) {
  try { return Buffer.from(String(str) || '', 'base64').toString('utf8'); } catch (_) { return ''; }
}
export function getZoneFromDomain(domain) {
  const parts = String(domain).split('.');
  if (parts.length <= 2) return domain;

  if (domain.endsWith('.netivo.pl')) {
    if (parts.length >= 4) {
      return parts.slice(-3).join('.');
    }
    if (parts.length === 3) {
      if (parts[0] === 'www') return parts.slice(-2).join('.');
      return domain;
    }
  }

  const commonTlds = ['com.pl', 'net.pl', 'org.pl', 'edu.pl', 'gov.pl', 'info.pl', 'biz.pl'];
  const lastTwo = parts.slice(-2).join('.');

  if (commonTlds.includes(lastTwo)) {
    if (parts.length >= 3) {
      return parts.slice(-3).join('.');
    }
  }

  return parts.slice(-2).join('.');
}

export function toRelativeDname(domain, zone) {
  const fqdn = String(domain).replace(/\.$/, '');
  const z = String(zone).replace(/\.$/, '');
  if (fqdn === z) return '_acme-challenge';
  // remove ".zone" suffix
  let rel = fqdn.endsWith('.' + z) ? fqdn.slice(0, fqdn.length - (z.length + 1)) : fqdn;
  rel = rel.replace(/\.$/, '');
  return `_acme-challenge${rel ? '.' + rel : ''}`;
}

export async function fetchSerialViaHttps(zone, apiCfg) {
  return new Promise((resolve, reject) => {
    const host = apiCfg.host;
    const urlPath = `/execute/DNS/parse_zone?zone=${encodeURIComponent(zone)}`;
    const options = {
      hostname: host,
      port: 2083,
      path: urlPath,
      method: 'GET',
      headers: {
        'Authorization': `cpanel ${apiCfg.user}:${apiCfg.token}`,
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          console.log(body);

          const j = JSON.parse(body || '{}');
          // Try common locations first
          let serial = null;
          if (typeof j?.result?.data?.serial === 'number') serial = j.result.data.serial;
          if (serial == null && typeof j?.result?.data?.soa?.serial === 'number') serial = j.result.data.soa.serial;
          // Parse from data array (as in provided sample)
          const dataArr = j?.data || j?.result?.data || [];
          if (serial == null && Array.isArray(dataArr)) {
            for (const item of dataArr) {
              if (item?.type === 'record' && item?.record_type === 'SOA' && Array.isArray(item?.data_b64)) {
                const s = b64decode(item.data_b64[2] || '');
                const num = Number(s);
                if (Number.isFinite(num)) { serial = num; break; }
              }
              if (typeof item?.serial === 'number') { serial = item.serial; break; }
            }
          }
          if (serial == null) return reject(new Error('Brak serial w odpowiedzi API'));
          resolve(serial);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}
