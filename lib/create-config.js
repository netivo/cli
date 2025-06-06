
import prompt from "prompts";
import fs from "fs";

import cp from "./config-parser.js";

let options = {
    project_name: '',
    namespace: '',
    timestamp: null,
    text_domain: '',
    modules: {
        view_path: 'src/views',
        admin: {
            metabox: [],
            pages: [],
            gutenberg: [],
            bulk: []
        },
        database: [],
        endpoint: [],
        gutenberg: [],
        rest: [],
        widget: [],
        customizer: [],
        woocommerce: {
            product_type: [],
            product_tabs: []
        }
    }
};

let create_config = () => {
    return new Promise((resolve, reject) => {
        prompt([{type: 'text', name: 'name', message: 'What is the project name?'},{type: 'text', name: 'namespace', message: 'What is the project namespace?'},{type: 'text', name: 'textDomain', message: 'What is the project text domain?'}]).then(val => {
            options.project_name = val.name;
            options.namespace = val.namespace;
            options.text_domain = val.textDomain;
            cp.read_modules(options);

            options.timestamp = new Date().getTime();

            let json_string = JSON.stringify(options, null, 2);
            fs.writeFileSync('netivo.json', json_string);
            resolve(options);
        }).catch(error => {
            reject(error);
        });
    });
}

export default create_config;