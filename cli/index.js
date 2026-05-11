#!/usr/bin/env node

import * as spawn from "cross-spawn";
import * as path from "node:path";
import { existsSync } from "fs";
import { fileURLToPath } from "node:url";

const fromRoot = ( actionName ) => path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'actions', `${ actionName }.js` );
const hasActionFile = ( actionName ) => existsSync( fromRoot( actionName ) );


const [actionName, ...args] = process.argv.slice(2);

let action = actionName || 'create-project';

if(hasActionFile(action)) {
    spawn.sync('node', [fromRoot(action), ...args], {stdio: 'inherit'});
} else {
    console.log('There is no such action to execute. Possible actions are: create-project, create-dev, export, import, add-metabox, add-block, add-asset');
}
