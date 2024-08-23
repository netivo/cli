#!/usr/bin/env node

import * as spawn from "cross-spawn";
import * as path from "node:path";
import { existsSync } from "fs";

const __dirname = import.meta.dirname;

const fromRoot = ( actionName ) => path.join( path.dirname( __dirname ), 'actions', `${ actionName }.js` );
const hasActionFile = ( actionName ) => existsSync( fromRoot( actionName ) );


const [actionName, ...args] = process.argv.slice(2);

let action = null;

if(typeof actionName !== "undefined") {
    action = actionName;
} else {
    action = 'create-project';
}

console.log(action, actionName);

if(hasActionFile(action)) {
    spawn.sync('node', [fromRoot(actionName), ...args], {stdio: 'inherit'});
} else {
    console.log('There is no such action to execute. Possible actions are: create-project, add-metabox, enable-woocommerce');
}
