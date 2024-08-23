#!/usr/bin/env node


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
    }
};

import fs from "fs";
import * as yaml from "js-yaml";
import {parse, stringify} from "envfile";
import * as path from "node:path";
import glog from "fancy-log";
import {replaceInFileSync} from 'replace-in-file';

import * as get_data from "./../lib/get-data.js";

import * as spawn from "cross-spawn";

const __dirname = import.meta.dirname;

let create_project = (opt) => {
    file_log('--- Creating project')
    options = opt;
    if(fs.existsSync(options.name)) {
        let files = fs.readdirSync(options.name);
        if(files.length > 0) {
            file_log('Directory already exists and is not empty!');
            process.exit();
        }
    } else {
        fs.mkdirSync(options.name);
    }
    file_log('--- Created project directory');
    create_structure();
    create_files();
    run_commands();
    file_log('--- Project created');
};

let create_structure = () => {
    file_log('--- Creating project structure');

    fs.mkdirSync(options.name + '/config');
    fs.mkdirSync(options.name + '/sources');
    fs.mkdirSync(options.name + '/proxy');
    fs.mkdirSync(options.name + '/proxy/conf');
    fs.mkdirSync(options.name + '/proxy/certs');
    fs.mkdirSync(options.name + '/sources/javascript');
    fs.mkdirSync(options.name + '/sources/sass');
    fs.mkdirSync(options.name + '/sources/gutenberg');

    file_log('--- Done');
}

let create_files = () => {
    create_package_json();
    create_style_css();
    create_docker();
    create_composer_json();
    create_php_structure();
}

let create_package_json = () => {
    file_log('--- Creating package.json');
    let structure = {
        "name": options.name,
        "version": "1.0.0",
        "description": options.description,
        "main": "./sources/js/index.js",
        "scripts": {
            "develop": "netivo-scripts develop",
            "build": "netivo-scripts build"
        },
        "gutenberg": "dist/admin/gutenberg",
        "author": "Netivo <biuro@netivo.pl> (http://netivo.pl)",
        "license": "ISC",
        "dependencies": {
            "@netivo/base-scripts": "git+ssh://git@github.com:netivo/base-scripts.git",
            "@netivo/scripts": "git+ssh://git@github.com:netivo/scripts.git",
        }
    }
    let json_string = JSON.stringify(structure, null, 2);
    fs.writeFileSync(options.name+'/package.json', json_string);
    file_log('--- Done');
}

let create_style_css = () => {
    file_log('--- Creating style.css');
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
    file_log('--- Done');
}
let create_docker = () => {
    file_log('--- Creating docker config');
    let docker_compose = {
        version: "3.8",
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
                image: "wordpress:php8.2-apache",
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
        file_log_error('--- Error creating the proxy config file');
    }

    file_log('--- Done');
}

let create_composer_json = () => {
    file_log('--- Creating composer.json');
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
                "type": "vcs",
                "url":  "git@github.com:netivo/wp-core.git"
            }
        ],
        "require": {
            "netivo/wp-core": "dev-master",
            "php": ">=8.2.0"
        }
    }
    structure.autoload['psr-4'][full_namespace] = 'src/Theme';
    let json_string = JSON.stringify(structure, null, 2);
    fs.writeFileSync(options.name+'/composer.json', json_string);
    file_log('--- Done');
}

let create_php_structure = () => {
    file_log('--- Creating Wordpress files');
    fs.mkdirSync(options.name + '/src');
    fs.mkdirSync(options.name + '/src/Theme');
    fs.mkdirSync(options.name + '/src/Theme/Admin');

    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','index.php'), options.name + '/index.php');
    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','header.php'), options.name + '/header.php');
    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','footer.php'), options.name + '/footer.php');
    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','functions.php'), options.name + '/functions.php');
    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','class_main.php'), options.name + '/src/Theme/Main.php');
    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates','class_panel.php'), options.name + '/src/Theme/Admin/Panel.php');

    file_log('--- Done copying files');

    let search = [/\${PROJECT_NAME}/g, /\${DATE}/g, /\${NAMESPACE}/g];
    let rep = [options.wordpress.themeName, (new Date()).toUTCString(), 'Netivo\\'+options.namespace+'\\Theme'];

    try {
        let result = replaceInFileSync({
            files: options.name + '/**/*.php',
            from: search,
            to: rep
        });
        file_log('--- Done replacing values');
    } catch (error){
        file_log_error('--- Error during replacing values: '+error);
    }

}

let run_commands = () => {
    file_log('--- Running npm install');
    spawn.sync('npm', ['install'], {stdio: 'inherit', cwd: options.name})
    file_log('--- Done');
    file_log('--- Running composer install');
    spawn.sync('composer', ['install'], {stdio: 'inherit', cwd: options.name})
    file_log('--- Done');
    file_log('--- Generating ssl certificates');
    spawn.sync('mkcert', ['-cert-file', options.wordpress.host+'.crt', '-key-file', options.wordpress.host+'.key', options.wordpress.host], {stdio: 'inherit', cwd: options.name+'/proxy/certs'});
    file_log('--- Done');
}

let file_log = (log) => {
    glog('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log);
};
let file_log_error = (log) => {
    glog.error('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log);
};

get_data.project().then(create_project).catch(error => {
    file_log(error);
});