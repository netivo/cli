#!/usr/bin/env node

import ospath from 'ospath';

import { existsSync, readFileSync, writeFileSync } from 'fs';

const [...args] = process.argv.slice( 2);

let config_file = ospath.home() + '/.netivo';

let config = {};

if(existsSync(config_file)) {
  config = readFileSync(config_file);
  config = JSON.parse(config);
}

args.forEach(arg => {
  let data = arg.split('=');
  if(data[0].startsWith('--')) {
    config[data[0].replace('--', '')] = data[1];
  }
});

writeFileSync(config_file, JSON.stringify(config, null, 2));