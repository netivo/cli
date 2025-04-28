import prompt from "prompts";
import _ from "lodash";

export function project() {
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


    return new Promise((resolve, reject) => {
        let questions = [
            {
                type: 'text',
                name: 'project_name',
                message: 'What is project name?',
                validate: value => {
                    let reg = /^[a-zA-Z_\-]*$/;
                    return reg.test(value);
                }
            },
            {
                type: 'text',
                name: 'description',
                message: 'What is the project description?'
            },
            {
                type: 'text',
                name: 'namespace',
                message: 'What is the project main namespace?'
            },
            {
                type: 'text',
                name: 'wordpress_host',
                message: 'What is the project local development host (eg. test.local)',
                validate: value => {
                    let reg = /^[a-z\-.]*$/;
                    return reg.test(value);
                }
            },
            {
                type: 'text',
                name: 'wordpress_theme_name',
                message: 'What is the WP Theme name?'
            },
            {
                type: 'text',
                name: 'wordpress_text_domain',
                message: 'What is the WP theme text domain?',
                validate: value => {
                    let reg = /^[a-zA-Z_\-]*$/;
                    return reg.test(value);
                }
            },
            {
                type: 'text',
                name: 'mysql_name',
                message: 'What is the mysql DB name?'
            },
            {
                type: 'text',
                name: 'mysql_user',
                message: 'What is the mysql DB user?'
            },
            {
                type: 'text',
                name: 'mysql_password',
                message: 'What is the mysql DB user password?'
            },
            {
                type: 'text',
                name: 'mysql_root_password',
                message: 'What is the mysql root password?'
            },
            {
                type: 'toggle',
                name: 'woocommerce',
                message: 'Include WooCommerce?',
                initial: false,
                active: 'yes',
                inactive: 'no'
            },
        ];
        prompt(questions).then(val => {
            options.name = val.project_name;
            options.description = val.description;
            options.namespace = val.namespace;
            options.wordpress.host = val.wordpress_host;
            options.wordpress.themeName = val.wordpress_theme_name;
            options.wordpress.textDomain = val.wordpress_text_domain;
            options.mysql.name = val.mysql_name;
            options.mysql.user = val.mysql_user;
            options.mysql.password = val.mysql_password;
            options.mysql.rootPassword = val.mysql_root_password;
            options.woocommerce = val.woocommerce;
            resolve(options);
        }).catch(error => {
            reject(error);
        });
    });
}

export function metabox() {
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
    return new Promise((resolve, reject) => {
        let questions = [
            {
                type: 'text',
                name: 'name',
                message: 'What is the name of the metabox (if hierarchical use / as separator)'
            },
            {
                type: 'text',
                name: 'title',
                message: 'What is the MetaBox title?'
            },
            {
                type: 'list',
                name: 'screen',
                message: 'In what screens the metabox is displayed? (few values split by colon)',
                separator: ','
            },
            {
                type: prev => prev.includes('page') ? 'list' : null,
                name: 'template',
                message: 'Is the metabox displayed on specific templates? Leave blank if not, put home-page if on front-page, if few values split them with colon.',
                separator: ','
            },
            {
                type: 'select',
                name: 'context',
                message: 'Select where to display the metabox',
                choices: [
                    {title: 'Main content', value: 'advanced'},
                    {title: 'Sidebar', value:'side'}
                ],
                initial: 0
            },
            {
                type: 'select',
                name: 'priority',
                message: 'Select display priority of the metabox',
                choices: [
                    {title: 'Default', value: 'default'},
                    {title: 'Hight', value:'high'}
                ],
                initial: 0
            },
            {
                type: 'text',
                name: 'view',
                message: 'Provide the view name (without extension)',
                initial: (prev, values) => {
                    let n = values.name.split('/');
                    let n2 = [];
                    n.forEach(e => {
                        n2.push(_.kebabCase(e));
                    });
                    return n2.join('/');
                }
            }
        ];
        prompt(questions).then(val  => {
            let n = val.name.split('/');

            options.name = _.upperFirst(_.camelCase(_.last(n)));
            options.path = _.map(_.dropRight(n), el => { return _.upperFirst(_.camelCase(el)); }).join('/');
            options.title = val.title;
            options.screen = val.screen;
            options.template = [];
            if(!_.isEmpty(val.template)) {
                val.template.forEach(el => {
                    if (el !== '') {
                        options.template.push(el);
                    }
                });
            }
            options.context = val.context;
            options.priority = val.priority;
            options.viewName = val.view;
            resolve(options);
        }).catch(error => {
            reject(error);
        });
    });
}

export function block() {
    let options = {
        id: '',
        handle: '',
        className: '',
        name: '',
        category: '',
        description: '',
        blockDir: '',
        style: '',
        script: '',
        dynamic: false
    }
    return new Promise((resolve, reject) => {
        let questions = [
            {
                type: 'text',
                name: 'id',
                message: 'What is the id of the block (provider/block-name)'
            },
            {
                type: 'text',
                name: 'name',
                message: 'What is the name/title of the block?'
            },
            {
                type: 'text',
                name: 'category',
                message: 'What is the category of the block?'
            },
            {
                type: 'text',
                name: 'description',
                message: 'What is the block description?'
            },
            {
                type: 'toggle',
                name: 'dynamic',
                message: 'Is the block dynamic (server side rendered)?',
                initial: false,
                active: 'yes',
                inactive: 'no'
            },
            {
                type: 'toggle',
                name: 'style',
                message: 'Create block stylesheet (loaded on front)?',
                initial: true,
                active: 'yes',
                inactive: 'no'
            },
            {
                type: 'toggle',
                name: 'script',
                message: 'Create block script (loaded on front)?',
                initial: true,
                active: 'yes',
                inactive: 'no'
            }
        ];
        prompt(questions).then(val  => {
            let n = val.id.split('/');

            options.id = val.id;
            options.className = _.upperFirst(_.camelCase(_.last(n)));
            options.handle = _.first(n) + '-' + _.last(n);
            options.name = val.name;
            options.category = val.category;
            options.description = val.description;
            options.blockDir = _.last(n);
            options.dynamic = val.dynamic;
            options.style = val.style;
            options.script = val.script;
            resolve(options);
        }).catch(error => {
            reject(error);
        });
    });
}