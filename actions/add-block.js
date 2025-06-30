#!/usr/bin/env node
import _ from "lodash";
import prompt from "prompts";
import fs from "fs";

import * as get_data from "./../lib/get-data.js";
import log from "./../lib/log.js";
import createConfig from "../lib/create-config.js";
import checkConfig from "../lib/check-config.js";
import parser from "./../lib/config-parser.js";
import createClass from "./../lib/create-class.js";
import createPhpFile from "./../lib/create-php-file.js";
import path from "node:path";
import {replaceInFileSync} from "replace-in-file";
import create_php_file from "./../lib/create-php-file.js";
import * as spawn from "cross-spawn";

const __dirname = import.meta.dirname;

let options = {
    id: '',
    className: '',
    name: '',
    category: '',
    description: '',
    blockDir: '',
    style: '',
    script: '',
    dynamic: false
}

let project_config = null;

let parse_options = opt => {
    options.id = opt.id;
    options.className = opt.className;
    options.name = opt.name;
    options.category = opt.category;
    options.description = opt.description;
    options.dynamic = opt.dynamic;

    options.blockDir = opt.blockDir;

    options.classPath = 'src/Theme/Gutenberg/';
    options.namespace  = 'Netivo\\' + project_config.namespace + '\\Theme\\Gutenberg';
    options.blockJSPath = 'sources/gutenberg/' + opt.blockDir + '/admin/';
    options.blockPath = 'sources/gutenberg/' + opt.blockDir + '/';

    options.style = opt.style;
    if(opt.style !== false) {
        options.stylePath = 'sources/gutenberg/' + opt.blockDir + '/front/style/';
    }
    options.script = opt.script;
    if(opt.script !== false) {
        options.scriptPath = 'sources/gutenberg/' + opt.blockDir + '/front/script/';
    }
    let classData = generate_class_data();
    create_class_file(classData);

    create_block_files();

    modify_config_file();


    spawn.sync('npm', ['run', 'build', 'block', options.blockDir], {stdio: 'inherit'})
};

let generate_class_data = () => {
    let classData = {
        project_name: project_config.project_name,
        namespace: options.namespace,
        use: [
            'Netivo\\Core\\Gutenberg'
        ],
        name: options.className,
        parent: 'Gutenberg',
        attributes: [
            {
                name: '\\Netivo\\Attributes\\Block',
                value: 'dist/gutenberg/' + options.blockDir
            }
        ],
        properties: [],
        methods: []
    }
    if(options.dynamic !== false) {
        classData.properties.push({
            name: 'callback',
            type: 'string',
            access: 'protected',
            value: 'render'
        });
        classData.methods.push({
            name: 'render',
            access: 'public',
            type: 'void',
            body: 'include get_stylesheet_directory().\'dist/gutenberg/' + options.blockDir + '/render.php\';',
            docblock: 'Render block contents'
        })
    }
    return classData;
}

let create_class_file = (class_data) => {
    if(!fs.existsSync(options.classPath)) {
        fs.mkdirSync(options.classPath, { recursive: true });
    }

    let class_content = createClass(class_data);
    let file_name = options.classPath + '/' + options.className + '.php';

    fs.writeFileSync(file_name, class_content);
}

let create_block_files = () => {
    create_main_block_js();
    create_block_json();
    if(options.style !== false) {
        if(!fs.existsSync(options.stylePath)) {
            fs.mkdirSync(options.stylePath, { recursive: true });
        }
        let file_name = options.stylePath + '/index.scss';

        fs.writeFileSync(file_name, '/**\n * Block css\n*/');
    }
    if(options.script !== false) {
        if(!fs.existsSync(options.scriptPath)) {
            fs.mkdirSync(options.scriptPath, { recursive: true });
        }
        let file_name = options.scriptPath + '/index.js';

        fs.writeFileSync(file_name, '');
    }
    if(options.dynamic !== false) {
        if(!fs.existsSync(options.blockPath)) {
            fs.mkdirSync(options.blockPath, { recursive: true });
        }
        let file_name = options.blockPath + '/render.php';

        let content = create_php_file({project_name: project_config.project_name});

        fs.writeFileSync(file_name, content);
    }
}

let create_main_block_js = () => {


    let content = '';
    content += 'import { registerBlockType } from \'@wordpress/blocks\'\n\n';
    content += 'import Edit from \'./edit\'\n';
    if(!options.dynamic) {
      content += 'import Save from \'./save\'\n';
    }
    content += '\n\n';
    content += 'registerBlockType(\''+options.id+'\', {\n';
    content += '\tedit: Edit,\n';
    if(options.dynamic) {
        content += '\tsave: () => { return null; }\n';
    } else {
        content += '\tsave: Save\n';
    }
    content += '});';

    if(!fs.existsSync(options.blockJSPath)) {
        fs.mkdirSync(options.blockJSPath, { recursive: true });
    }
    let file_name = options.blockJSPath + '/index.js';

    fs.writeFileSync(file_name, content);

    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates', 'block', 'edit.js'), options.blockJSPath + '/edit.js');

    if(!options.dynamic) {
      fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates', 'block', 'save.js'), options.blockJSPath + '/save.js');
    }

}

let create_block_json = () => {
    let blockOptions = {
        "$schema": "https://schemas.wp.org/trunk/block.json",
        "apiVersion": 3,
        "name": options.id,
        "title": options.name,
        "category": options.category,
        "icon": "block-default",
        "description": options.description,
        "keywords": [ ],
        "attributes": {},
        "textdomain": project_config.text_domain,
    }
    if(!fs.existsSync(options.blockPath)) {
        fs.mkdirSync(options.blockPath, { recursive: true });
    }
    let file_name = options.blockPath + '/block.json';

    let json_string = JSON.stringify(blockOptions, null, 2);
    fs.writeFileSync(file_name, json_string);
}

let modify_config_file = () =>{
    project_config.modules.gutenberg.push('\\' + options.namespace + '\\' + options.className + '::class');

    parser.save_modules(project_config);
    project_config.timestamp = new Date().getTime();

    let json_string = JSON.stringify(project_config, null, 2);
    fs.writeFileSync('netivo.json', json_string);
}

let add_block = () => {
    get_data.block().then(parse_options).catch(error => {
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
                add_block();
            });
        }
    }).catch(error => {
        log.log_error(error);
    })
} else {
    checkConfig().then(config => {
        project_config = config;
        add_block();
    }).catch(error => {
        log.log_error(error);
    })
}