#!/usr/bin/env node


import createClass from "../lib/create-class.js";

let options = {
    name: '',
    description: '',
    namespace: '',
    wordpress: {
        host: '',
        themeName: '',
        textDomain: '',
    },
    mysql: {
        name: '',
        user: '',
        password: '',
        rootPassword: ''
    },
    woocommerce: false
};

import fs from "fs";
import * as yaml from "js-yaml";
import {parse, stringify} from "envfile";
import * as path from "node:path";
import {replaceInFileSync} from 'replace-in-file';
import _ from "lodash";

import * as get_data from "./../lib/get-data.js";
import log from "./../lib/log.js";

import * as spawn from "cross-spawn";
import create_php_file from "../lib/create-php-file.js";
const __dirname = import.meta.dirname;

let create_project = (opt) => {
    log.log('--- Creating project')
    options = opt;
    if(fs.existsSync(options.name)) {
        let files = fs.readdirSync(options.name);
        if(files.length > 0) {
            log.log('Directory already exists and is not empty!');
            process.exit();
        }
    } else {
        fs.mkdirSync(options.name);
    }
    log.log('--- Created project directory');
    create_structure();
    create_files();
    run_commands();
    log.log('--- Project created');
};

let create_structure = () => {
    log.log('--- Creating project structure');

    fs.mkdirSync(options.name + '/config');
    fs.mkdirSync(options.name + '/sources');
    fs.mkdirSync(options.name + '/proxy');
    fs.mkdirSync(options.name + '/proxy/conf');
    fs.mkdirSync(options.name + '/proxy/certs');
    fs.mkdirSync(options.name + '/sources/javascript');
    fs.mkdirSync(options.name + '/sources/sass');
    fs.mkdirSync(options.name + '/sources/gutenberg');

    log.log('--- Done');
}

let create_files = () => {
    create_package_json();
    create_style_css();
    create_docker();
    create_composer_json();
    create_php_structure();
    create_config_file();
}

let create_package_json = () => {
    log.log('--- Creating package.json');
    let structure = {
        "name": options.name,
        "version": "1.0.0",
        "description": options.description,
        "main": "./sources/js/index.js",
        "scripts": {
            "develop": "netivo-scripts develop",
            "build": "netivo-scripts build"
        },
        "gutenberg": "dist/gutenberg",
        "author": "Netivo <biuro@netivo.pl> (http://netivo.pl)",
        "license": "ISC",
        "dependencies": {
            "@netivo/base-scripts": "git+dev://git@github.com:netivo/base-scripts.git",
            "@netivo/scripts": "git+dev://git@github.com:netivo/scripts.git",
        }
    }
    let json_string = JSON.stringify(structure, null, 2);
    fs.writeFileSync(options.name+'/package.json', json_string);
    log.log('--- Done');
}

let create_style_css = () => {
    log.log('--- Creating style.css');
    let style_css =
        "/**\n" +
        " * Theme Name: "+options.wordpress.themeName+"\n" +
        " * Author: Netivo\n" +
        " * Author URI: http://netivo.pl/\n" +
        " * Description: "+options.description+"\n" +
        " * Version: 1.0\n" +
        " * Text Domain: "+options.wordpress.textDomain+"\n" +
        " */";

    fs.writeFileSync(options.name+'/style.css', style_css);
    log.log('--- Done');
}
let create_docker = () => {
    log.log('--- Creating docker config');
    let docker_compose = {
        services: {
            proxy: {
                image: "nginx:1.19.10-alpine",
                ports: ["80:80", "443:443"],
                container_name: "${PROJECT_NAME}_proxy",
                extra_hosts: ["${WORDPRESS_HOST}:127.0.0.1"],
                volumes: [
                    "./proxy/conf/nginx.conf:/etc/nginx/nginx.conf",
                    "./proxy/certs:/etc/nginx/certs"
                ],
                depends_on: ['wordpress'],
            },
            database: {
                image: "mysql:5.7",
                command: [
                    "--character-set-server=utf8",
                    "--collation-server=utf8_polish_ci"
                ],
                environment: {
                    MYSQL_DATABASE: "${MYSQL_DB}",
                    MYSQL_USER: "${MYSQL_USER}",
                    MYSQL_PASSWORD: "${MYSQL_PASSWORD}",
                    MYSQL_ROOT_PASSWORD: "${MYSQL_ROOT_PASSWORD}"
                },
                ports: ["3306:3306"],
                container_name: "${PROJECT_NAME}_db"
            },
            wordpress: {
                depends_on: ['database'],
                image: "wordpress:php8.3-apache",
                container_name: "${PROJECT_NAME}_wp",
                extra_hosts: ["${WORDPRESS_HOST}:127.0.0.1"],
                ports: ["8080:80"],
                volumes: [
                    ".:/var/www/html/wp-content/themes/test"
                ],
                environment: {
                    WORDPRESS_DB_HOST: "database:3306",
                    WORDPRESS_DB_USER: "${MYSQL_USER}",
                    WORDPRESS_DB_PASSWORD: "${MYSQL_PASSWORD}",
                    WORDPRESS_DB_NAME: "${MYSQL_DB}",
                    WORDPRESS_DEBUG: 1
                }
            },
            phpmyadmin: {
                depends_on: ['database'],
                image: "phpmyadmin/phpmyadmin",
                extra_hosts: ["${WORDPRESS_HOST}:127.0.0.1"],
                ports: ["8081:80"],
                environment: {
                    PMA_HOST: "database",
                    PMA_PORT: 3306,
                    PMA_ARBITRARY: 1
                },
                container_name: "${PROJECT_NAME}_phpmyadmin"
            }
        }
    }
    let data = yaml.dump(docker_compose);
    fs.writeFileSync(options.name+'/docker-compose.yml', data);

    let env_data = {
        PROJECT_NAME: options.name,
        WORDPRESS_HOST:options.wordpress.host,
        MYSQL_DB:options.mysql.name,
        MYSQL_USER:options.mysql.user,
        MYSQL_PASSWORD:options.mysql.password,
        MYSQL_ROOT_PASSWORD:options.mysql.rootPassword,
    }

    let env_string = stringify(env_data);
    fs.writeFileSync(options.name+'/.env', env_string);

    fs.copyFileSync(path.join(path.dirname(__dirname), 'templates', 'nginx.conf'), options.name + '/proxy/conf/nginx.conf');

    try {
        let result = replaceInFileSync({
            files: options.name + '/proxy/conf/nginx.conf',
            from: [/\${WORDPRESS_HOST}/g],
            to: [options.wordpress.host]
        });
    } catch (error) {
        log.log_error('--- Error creating the proxy config file');
    }

    log.log('--- Done');
}

let create_composer_json = () => {
    log.log('--- Creating composer.json');
    let full_namespace = "Netivo\\"+options.namespace+"\\Theme\\";
    let structure = {
        "name": "netivo/"+options.name,
        "type": "project",
        "autoload": {
            "psr-4": {
            }
        },
        "authors": [
            {
                "name": "Netivo",
                "email": "biuro@netivo.pl"
            }
        ],
        "repositories": [
            {
                "type": "composer",
                "url":  "https://packagist.netivo.pl"
            }
        ],
        "require": {
            "netivo/wp-core": "dev-master",
            "php": ">=8.2.0"
        }
    }
    structure.autoload['psr-4'][full_namespace] = 'src/Theme';

    if(options.woocommerce) {
        structure['require']["netivo/woocommerce"] = "dev-master";
    }

    let json_string = JSON.stringify(structure, null, 2);
    fs.writeFileSync(options.name+'/composer.json', json_string);
    log.log('--- Done');
}

let create_php_structure = () => {
    log.log('--- Creating Wordpress files');
    fs.mkdirSync(options.name + '/src');
    fs.mkdirSync(options.name + '/src/Theme');
    fs.mkdirSync(options.name + '/src/Theme/Admin');
    fs.mkdirSync(options.name + '/src/views');

    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','index.php'), options.name + '/index.php');
    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','header.php'), options.name + '/header.php');
    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','footer.php'), options.name + '/footer.php');
    // fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','functions.php'), options.name + '/functions.php');

    log.log('--- Done copying files');

    let search = [/\${PROJECT_NAME}/g, /\${DATE}/g, /\${NAMESPACE}/g, /\${NAMESPACE_THEME}/g];
    let rep = [options.wordpress.themeName, (new Date()).toUTCString(), 'Netivo\\'+options.namespace+'\\Theme', options.namespace];

    try {
        let result = replaceInFileSync({
            files: options.name + '/**/*.php',
            from: search,
            to: rep
        });
        log.log('--- Done replacing values');
    } catch (error){
        log.log_error('--- Error during replacing values: '+error);
    }

    create_php_classes();

    create_functions_php();
}

let create_php_classes = () => {
    create_main_theme_class();
    create_admin_panel_class();
    if(options.woocommerce) {
        create_woocommerce_class();
        create_woocommerce_admin_class();
    }
}

let create_main_theme_class = () => {
    let classData = {
        project_name: options.wordpress.themeName,
        namespace: 'Netivo\\'+options.namespace+'\\Theme',
        use: [
            '\\Netivo\\Core\\Theme as CoreTheme'
        ],
        name: 'Main',
        parent: 'CoreTheme',
        methods: [
            {
                name: 'init',
                access: 'protected',
                type: 'void',
                docblock: 'Main function run on theme initialisation.',
            }
        ]
    };

    let classContent = createClass(classData);

    fs.writeFileSync(options.name + '/src/Theme/Main.php', classContent);
}

let create_admin_panel_class = () => {
    let classData = {
        project_name: options.wordpress.themeName,
        namespace: 'Netivo\\'+options.namespace+'\\Theme\\Admin',
        use: [
            '\\Netivo\\Core\\Admin\\Panel as CorePanel'
        ],
        name: 'Panel',
        parent: 'CorePanel',
        methods: [
            {
                name: 'set_vars',
                access: 'protected',
                type: 'void',
                docblock: 'Method run before admin panel initializes to setup variables',
            },
            {
                name: 'init',
                access: 'protected',
                type: 'void',
                docblock: 'Method run on admin panel initialisation',
            },
            {
                name: 'custom_header',
                access: 'protected',
                type: 'void',
                params: [
                    {
                        name: 'page'
                    }
                ],
                docblock: 'Method to define admin scripts and styles',
            }
        ]
    };

    let classContent = createClass(classData);

    fs.writeFileSync(options.name + '/src/Theme/Admin/Panel.php', classContent);
}

let create_woocommerce_class = () => {
    let classData = {
        project_name: options.wordpress.themeName,
        namespace: 'Netivo\\'+options.namespace+'\\Theme',
        use: [
            '\\Netivo\\WooCommerce\\WooCommerce as CoreWooCommerce',
            '\\Netivo\\'+options.namespace+'\\Theme\\Admin\\WooCommerce as AdminWooCommerce'
        ],
        name: 'WooCommerce',
        parent: 'CoreWooCommerce',
        methods: [
            {
                name: 'init_child',
                access: 'protected',
                type: 'void',
                docblock: 'Woocommerce child initialisation.'
            },
            {
                name: 'init_child_admin',
                access: 'protected',
                type: 'void',
                body: 'new AdminWooCommerce();'
            },
            {
                name: 'init_vars',
                access: 'protected',
                type: 'void'
            }
        ]
    };

    let classContent = createClass(classData);

    fs.writeFileSync(options.name + '/src/Theme/WooCommerce.php', classContent);
}
let create_woocommerce_admin_class = () => {
    let classData = {
        project_name: options.wordpress.themeName,
        namespace: 'Netivo\\'+options.namespace+'\\Theme\\Admin',
        name: 'WooCommerce',
        methods: [
            {
                name: '__construct',
                access: 'public',
            },
        ]
    };

    let classContent = createClass(classData);

    fs.writeFileSync(options.name + '/src/Theme/Admin/WooCommerce.php', classContent);
}

let create_functions_php = () => {
    let body = '';
    body += 'require_once "vendor/autoload.php";\n\n';
    body += '\\Netivo\\' + options.namespace + '\\Theme\\Main::$admin_panel = \\Netivo\\' + options.namespace + '\\Theme\\Admin\\Panel::class;\n';
    if(options.woocommerce) {
        body += '\\Netivo\\' + options.namespace + '\\Theme\\Main::$woocommerce_panel = \\Netivo\\' + options.namespace + '\\Theme\\WooCommerce::class;\n';
    }
    body += '\\Netivo\\' + options.namespace + '\\Theme\\Main::get_instance();\n\n';
    body += 'if( ! function_exists( \'' + options.namespace + '\' ) ) {\n' +
        '\tfunction ' + options.namespace + '(){\n' +
        '\t\treturn \\Netivo\\' + options.namespace + '\\Theme\\Main::get_instance();\n' +
        '\t}\n' +
        '}';

    let data = {
        project_name: options.wordpress.themeName,
        body: body
    }

    let file_content = create_php_file(data);
    fs.writeFileSync(options.name + '/functions.php', file_content);
}

let create_config_file = () => {
    log.log('--- Creating netivo.json');
    let structure = {
        "project_name": options.wordpress.themeName,
        "namespace": options.namespace,
        "view_path": 'src/views',
        "text_domain": options.wordpress.textDomain,
        timestamp: null,
        modules: {
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
    }
    let json_string = JSON.stringify(structure, null, 2);
    fs.writeFileSync(options.name+'/netivo.json', json_string);
    log.log('--- Done');
}

let run_commands = () => {
    log.log('--- Running npm install');
    spawn.sync('npm', ['install'], {stdio: 'inherit', cwd: options.name})
    log.log('--- Done');
    log.log('--- Running composer install');
    spawn.sync('composer', ['install'], {stdio: 'inherit', cwd: options.name})
    log.log('--- Done');
    log.log('--- Generating ssl certificates');
    spawn.sync('mkcert', ['-cert-file', options.wordpress.host+'.crt', '-key-file', options.wordpress.host+'.key', options.wordpress.host], {stdio: 'inherit', cwd: options.name+'/proxy/certs'});
    log.log('--- Done');
}


get_data.project().then(create_project).catch(error => {
    log.log(error);
});