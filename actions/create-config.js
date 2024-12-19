import fs from "fs";

import log from "./../lib/log.js";
import createConfig from "../lib/create-config.js";
import create_config from "../lib/create-config.js";
import prompt from "prompts";

if(fs.existsSync('netivo.json')) {
    prompt({
        type: 'confirm',
        name: 'value',
        message: 'Project configuration file already exists, regenerate from current project?',
        initial: true
    }).then(val => {
        if(val.value) {
            createConfig().then(() => {
                log.log('Project configuration file regenerated.');
            }).catch(error => {
                log.log_error(error);
            });
        }
    }).catch(error => {
        log.log_error(error);
    })
} else {
    create_config().then(() => {
        log.log('Project configuration file created');
    }).catch(error => {
        log.log_error(error);
    })
}