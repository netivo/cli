#!/usr/bin/env node


import SSH from 'simple-ssh';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import ospath                from 'ospath';
import { dev as getSshData } from '../lib/get-data.js';

const config_file = ospath.home() + '/.netivo';
let global_config = {};
if(existsSync(config_file)) {
  global_config = readFileSync(config_file);
  global_config = JSON.parse(global_config);
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

if(global_config.hasOwnProperty('private_key') && global_config.private_key !== '') {
  config.private_key = global_config.private_key;
}
if(global_config.hasOwnProperty('host') && global_config.host !== '') {
  config.host = global_config.host;
}
if(global_config.hasOwnProperty('dev_domain') && global_config.dev_domain !== '') {
  config.dev_domain = global_config.dev_domain;
}
if(global_config.hasOwnProperty('user') && global_config.user !== '') {
  config.user = global_config.user;
}
if(global_config.hasOwnProperty('port') && global_config.port !== '') {
  config.port = global_config.port;
}

getSshData(config).then(config => {
  const ssh = new SSH({
    host: config.host,
    user: config.user,
    port: config.port,
    key: readFileSync(config.private_key)
  });

  let save = false;

  if(!global_config.hasOwnProperty('private_key') || global_config.private_key === '') {
    global_config.private_key = config.private_key;
    save = true;
  }
  if(!global_config.hasOwnProperty('host') || global_config.host === '') {
    global_config.host = config.host;
    save = true;
  }
  if(!global_config.hasOwnProperty('user') || global_config.user === '') {
    global_config.user = config.user;
    save = true;
  }
  if(!global_config.hasOwnProperty('port') || global_config.port === '') {
    global_config.port = config.port;
    save = true;
  }
  if(!global_config.hasOwnProperty('dev_domain') || global_config.dev_domain === '') {
    global_config.dev_domain = config.dev_domain;
    save = true;
  }
  if(save) {
    writeFileSync(config_file, JSON.stringify(global_config, null, 2));
  }

  const generateRandomString = (length) => {
    return Math.random().toString(36).substring(2, 2 + length);
  };

  const generatePassword = (length) => {
    const charset = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#&*^_";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
      retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
  };

  config.full_domain = `${config.name}.${config.dev_domain}`;

  const cleanName = config.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 7);
  const shuffle = (str) => str.split('').sort(() => 0.5 - Math.random()).join('');

  config.db_name = ('w' + shuffle(cleanName) + generateRandomString(2)).substring(0, 10);
  config.db_user = config.db_name.split('').reverse().join('').substring(0, 10);
  config.db_password = generatePassword(16);
  config.db_prefix = ('w' + shuffle(cleanName) + generateRandomString(2)).substring(0, 10);

  console.log('--- Dev site data generated:');
  console.log('Full domain: ' + config.full_domain);
  console.log('DB Name:     ' + config.db_name);
  console.log('DB User:     ' + config.db_user);
  console.log('DB Password: ' + config.db_password);
  console.log('DB Prefix:   ' + config.db_prefix);


  const wpInstallPath = fileURLToPath(new URL('../wp-install.sh', import.meta.url));
  const wpInstallContent = readFileSync(wpInstallPath, 'utf8');

  ssh.exec(`if [ ! -f wp-install.sh ]; then echo "UPLOADING"; cat > wp-install.sh && chmod +x wp-install.sh; else echo "EXISTS"; cat > /dev/null; fi`, {
    in: wpInstallContent,
    out: function(stdout) {
      if (stdout.trim() === 'UPLOADING') {
        console.log('wp-install.sh uploaded to server.');
      } else if (stdout.trim() === 'EXISTS') {
        console.log('wp-install.sh already exists on server.');
      }
    }
  });

  const escapeShellArg = (arg) => {
    return `'${String(arg).replace(/'/g, "'\\''")}'`;
  };

  const installArgs = [
    config.dev_domain,
    config.name,
    config.db_name,
    config.db_user,
    config.db_password,
    config.db_prefix,
    config.title
  ].map(escapeShellArg);

  ssh.exec('./wp-install.sh', {
    args: installArgs,
    out: function(stdout) {
      console.log(stdout);
    },
    err: function(stderr) {
      console.error('ERROR: ' + stderr);
    }
  }).start();
});