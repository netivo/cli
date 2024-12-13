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
import parser from "./../lib/config-parser.js";
import createClass from "./../lib/create-class.js";

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

let project_config = null;

let parse_options = opt => {
    let classData = {
        name: 'Test',
        parent: 'MetaBox',
        attributes: [
            {
                name: '\\Netivo\\Attributes\\View',
                value: 'test'
            }
        ],
        properties: [
            {
                name: 'id',
                type: 'string',
                access: 'protected',
                value: 'nt_test',
                docblock: 'Id of the metabox is test'
            },
            {
                name: 'screen',
                type: 'string|array',
                access: 'protected',
                value: ['post', 'page']
            }
        ],
        methods: [
            {
                name: 'save',
                access: 'public',
                type: 'mixed',
                params: [
                    {
                        name: 'post_id',
                        type: 'int',
                        description: 'Is of the saved post'
                    }
                ],
                body: 'return $post_id;',
                docblock: 'Method where the saving process is done. Use it in metabox to save the data.'
            }
        ]
    }
    let class_content = createClass(classData);

    console.log(class_content)
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
            createConfig().then((config) => {
                project_config = config;
                add_metabox();
            });
        }
    }).catch(error => {
        log.log_error(error);
    })
} else {
    checkConfig().then(config => {
        project_config = config;
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