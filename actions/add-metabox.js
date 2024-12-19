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
import path from "node:path";
import {replaceInFileSync} from "replace-in-file";

const __dirname = import.meta.dirname;

let options = {
    name: '',
    path: '',
    namespace: '',
    title: '',
    screen: '',
    template: '',
    context: '',
    priority: '',
    viewName: '',
}

let project_config = null;

let parse_options = opt => {
    options.name = opt.name;
    options.title = opt.title;
    options.screen = opt.screen;
    options.template = opt.template;
    options.context = opt.context;
    options.priority = opt.priority;
    options.viewName = opt.viewName;

    options.path = 'src/Theme/Admin/MetaBox/';
    options.namespace  = 'Netivo\\' + project_config.namespace + '\\Theme\\Admin\\MetaBox';
    if(opt.path !== '') {
        options.path += opt.path;
        let parts = opt.path.split('/');
        options.namespace += '\\' + parts.join('\\');
    }

    let classData = generate_class_data();
    create_class_file(classData);
    create_view_file();
    modify_config_file();

};

let generate_class_data = () => {
    let classData = {
        project_name: project_config.project_name,
        namespace: options.namespace,
        use: [
            'Netivo\\Core\\Admin\\MetaBox'
        ],
        name: options.name,
        parent: 'MetaBox',
        attributes: [
            {
                name: '\\Netivo\\Attributes\\View',
                value: options.viewName
            }
        ],
        properties: [
            {
                name: 'id',
                type: 'string',
                access: 'protected',
                value: _.kebabCase(options.name),
            },
            {
                name: 'title',
                type: 'string',
                access: 'protected',
                value: options.title
            },
            {
                name: 'screen',
                type: 'string|array',
                access: 'protected',
                value: options.screen
            },
            {
                name: 'context',
                type: 'string',
                access: 'protected',
                value: options.context
            },
            {
                name: 'priority',
                type: 'string',
                access: 'protected',
                value: options.priority
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
                        description: 'ID of the saved post',
                    }
                ],
                body: 'return $post_id;',
                docblock: 'Method where the saving process is done. Use it in metabox to save the data.'
            }
        ]
    }
    if(!_.isEmpty(options.template)){
        classData.properties.push({
            name: 'template',
            type: 'string|array',
            access: 'protected',
            value: options.template
        });
    }
    return classData;
}

let create_class_file = (class_data) => {
    if(!fs.existsSync(options.path)) {
        fs.mkdirSync(options.path, { recursive: true });
    }

    let class_content = createClass(class_data);
    let file_name = options.path + '/' + options.name + '.php';



    fs.writeFileSync(file_name, class_content);
}


let create_view_file = () => {
    let lpath = project_config.view_path + '/admin/metabox';
    let vn = options.viewName.split('/');
    let file_path = lpath + '/' + options.viewName + '.phtml';
    if(vn.length > 1) {
        lpath += '/' + _.join(_.dropRight(vn), '/');
    }
    if(!fs.existsSync(lpath)) {
        fs.mkdirSync(lpath, { recursive: true });
    }

    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates', 'metabox_view_template.phtml'), file_path);

    let search = [/\${PROJECT_NAME}/g, /\${DATE}/g];
    let rep = [project_config.project_name, (new Date()).toUTCString()];
    try {
        replaceInFileSync({
            files: file_path,
            from: search,
            to: rep
        });
    } catch (error){
        throw new Error('--- Error during creating class file: ' + error);
    }

}


let modify_config_file = () =>{
    project_config.modules.admin.metabox.push('\\' + options.namespace + '\\' + options.name + '::class');

    parser.save_modules(project_config);
    project_config.timestamp = new Date().getTime();

    let json_string = JSON.stringify(project_config, null, 2);
    fs.writeFileSync('netivo.json', json_string);
}

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