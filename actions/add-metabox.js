#!/usr/bin/env node

// import engine from "php-parser";
// import fs from "fs";
// import * as path from "node:path";
// import unparse from "php-unparser";

import _ from "lodash";
import prompt from "prompts";
import fs from "fs";

import * as get_data from "./../lib/get-data.js";
import log from "./../lib/log.js";
import createConfig from "../lib/create-config.js";
import checkConfig from "../lib/check-config.js";

let options = {
    name: '',
    path: '',
    title: '',
    screen: '',
    template: '',
    context: '',
    priority: '',
    viewName: '',
}

let parse_options = opt => {

};

let add_metabox = () => {
    get_data.metabox().then(parse_options).catch(error => {
        log.log_error(error);
    });
}

if(!fs.existsSync('netivo.json')) {
    prompt({
        type: 'confirm',
        name: 'value',
        message: 'There is no project config, would you like to create one?',
        initial: true
    }).then(val => {
        if(val.value) {
            createConfig().then(() => {
                add_metabox();
            });
        }
    }).catch(error => {
        log.log_error(error);
    })
} else {
    checkConfig().then(() => {
        add_metabox();
    }).catch(error => {
        log.log_error(error);
    })
}





//

// let options = {
//     indent: true,
//     dontUseWhitespaces: false,
//     shortArray: true,
//     bracketsNewLine: true,
//     forceNamespaceBrackets: false,
//     collapseEmptyLines: true
// };
// console.log(unparse(parsed, options));