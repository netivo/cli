import fs from "fs";
import Engine from "php-parser";
import log from "./log.js";
import path from "node:path";
import {replaceInFileSync} from "replace-in-file";
import _ from 'lodash';

const __dirname = import.meta.dirname;

let read_modules = (options) => {
    if(fs.existsSync('config/modules.config.php')) {
        let phpContent = fs.readFileSync('config/modules.config.php');

        options.view_path = 'src/views';
        options.modules = {
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
                product_types: [],
                product_tabs: []
            }
        };

        let parser = new Engine({
            parser: {
                extractDoc: false,
                php7: true
            },
            ast: {
                withPositions: false,
            }
        });
        let parsed = parser.parseCode(phpContent);
        parsed.children.forEach(child => {
            if(child.kind === 'return') {
                if(child.expr.kind === 'array') {
                    child.expr.items.forEach(item => {
                        if(item.key.value === 'modules') {
                            if(item.value.kind === 'array') {
                                item.value.items.forEach(item2 => {
                                    if(item2.key.value === 'admin') {
                                        if(item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                if(item3.key.value === 'metabox') {
                                                    item3.value.items.forEach(item4 => {
                                                        options.modules.admin.metabox.push(item4.value.what.name + '::class');
                                                    })
                                                }
                                                else if(item3.key.value === 'pages') {
                                                    item3.value.items.forEach(item4 => {
                                                        options.modules.admin.pages.push(parse_page_config(item4));
                                                    })
                                                }
                                                else if(item3.key.value === 'bulk') {
                                                    item3.value.items.forEach(item4 => {
                                                        options.modules.admin.bulk.push(item4.value.what.name + '::class');
                                                    })
                                                }
                                                else if(item3.key.value === 'gutenberg') {
                                                    item3.value.items.forEach(item4 => {
                                                        options.modules.admin.gutenberg.push(item4.value.what.name + '::class');
                                                    })
                                                }
                                            });
                                        }
                                    }
                                    else if(item2.key.value === 'database') {
                                        if(item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                options.modules.database.push(item3.value.what.name + '::class');
                                            });
                                        }
                                    }
                                    else if(item2.key.value === 'customizer') {
                                        if(item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                options.modules.customizer.push(item3.value.what.name + '::class');
                                            });
                                        }
                                    }
                                    else if(item2.key.value === 'endpoint') {
                                        if(item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                options.modules.endpoint.push(item3.value.what.name + '::class');
                                            });
                                        }
                                    }
                                    else if(item2.key.value === 'gutenberg') {
                                        if(item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                options.modules.gutenberg.push(item3.value.what.name + '::class');
                                            });
                                        }
                                    }
                                    else if(item2.key.value === 'rest') {
                                        if(item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                options.modules.rest.push(item3.value.what.name + '::class');
                                            });
                                        }
                                    }
                                    else if(item2.key.value === 'widget') {
                                        if(item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                options.modules.widget.push(item3.value.what.name + '::class');
                                            });
                                        }
                                    }
                                    else if(item2.key.value === 'woocommerce') {
                                        if(item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                if(item3.key.value === 'product_types') {
                                                    item3.value.items.forEach(item4 => {
                                                        options.modules.woocommerce.product_types.push(item4.value.what.name + '::class');
                                                    })
                                                }
                                                else if(item3.key.value === 'product_tabs') {
                                                    item3.value.items.forEach(item4 => {
                                                        options.modules.woocommerce.product_tabs.push(item4.value.what.name + '::class');
                                                    })
                                                }
                                            });
                                        }
                                    }
                                    else if(item2.key.value === 'views_path') {
                                        options.view_path = parse_bin(item2.value);
                                    }
                                })
                            }
                        }
                    });

                }
            }
        });
    }
}

let save_modules = (options) => {
    if(!fs.existsSync('config')) fs.mkdirSync('config');
    if(fs.existsSync('config/modules.config.php')) fs.copyFileSync('config/modules.config.php', 'config/modules.config.php.bak');
    fs.copyFileSync(path.join( path.dirname( __dirname ), 'templates', 'config', 'modules.config.php'), 'config/modules.config.php');

    let config_content = convert_to_php(options.modules, 1);

    let search = [/\${PROJECT_NAME}/g, /\${DATE}/g, /\${CONFIG_MODULES}/g];
    let rep = [options.namespace, (new Date()).toUTCString(), config_content];
    try {
        let result = replaceInFileSync({
            files: 'config/modules.config.php',
            from: search,
            to: rep
        });
        return true;
    } catch (error){
        log.log_error('--- Error during creating configuration file: '+error);
        return false;
    }
};

let read_assets = (options) => {
    if(fs.existsSync('config/assets.config.php')) {
        let phpContent = fs.readFileSync('config/assets.config.php');
        options.assets = {
            styles: [],
            scripts: []
        };
        let parser = new Engine({
            parser: {
                extractDoc: false,
                php7: true
            },
            ast: {
                withPositions: false,
            }
        });
        let parsed = parser.parseCode(phpContent);
        parsed.children.forEach(child => {
            if (child.kind === 'return') {
                if (child.expr.kind === 'array') {
                    child.expr.items.forEach(item => {
                        if (item.key.value === 'assets') {
                            if (item.value.kind === 'array') {
                                item.value.items.forEach(item2 => {
                                    if (item2.key.value === 'styles') {
                                        if (item2.value.kind === 'array') {
                                            item2.value.items.forEach(item3 => {
                                                let tmp = {};
                                                tmp.title = item3.key.value;
                                                item3.value.items.forEach(s => {
                                                    if(s.key.value === 'name') {
                                                        tmp.name = s.value;
                                                    }
                                                    else if(s.key.value === 'file') {
                                                        tmp.name = s.value;
                                                    }
                                                    else if(s.key.value === 'version') {
                                                        tmp.name = s.value;
                                                    }
                                                    else if(s.key.value === 'register') {
                                                        tmp.name = s.value;
                                                    }
                                                    else if(s.key.value === 'condition') {
                                                        console.log(s.value);
                                                    }
                                                    else if(s.key.value === 'dependencies') {

                                                    }
                                                });
                                                options.assets.styles.push(tmp);
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            }
        });
    }
}

let parse_page_config = (config) => {
    let page = {
        "class": '',
        "children": []
    };
    config.value.items.forEach(item => {
        if(item.key.value === 'class') {
            page.class = item.value.what.name + '::class';
        } if(item.key.value === 'children') {
            item.value.items.forEach(item2 => {
               page.children.push(parse_page_config(item2));
            });
        }
    });
    return page;
}

let parse_bin = (value) => {
    if(value.kind === 'string') return '\'' +value.value + '\'';
    // if(value.kind === 'call') {
    //     return value.what.name + '()';
    // }
    if(value.kind === 'bin') {
        let left = parse_bin(value.left);
        if(_.empty(left)) {
            return parse_bin(value.right);
        } else {
            return left + value.type + parse_bin(value.right);
        }
    }
    return '';
};

let convert_to_php = (data, indent) => {
    if(_.isNil(data)) return _.repeat('\t', indent) + '\'\'';
    if(_.isArray(data)) {
        if(data.length > 0) {
            let res = _.map(data, val => {
                if(_.isObject(val)) return _.repeat('\t', indent+1) + convert_to_php(val,indent+1);
                return convert_to_php(val,indent+1);
            });
            res = res.join(',\n');

            return '[\n' + res + '\n' + _.repeat('\t', indent) + ']';
        } else {
            return '[]';
        }
    }
    if(_.isObject(data)) {
        let res = _.map(data, (val, key) => {
            let new_indent = indent + 1;
            if(_.isString(val)) new_indent = 0;
            return _.repeat('\t', indent+1) + '\'' + key + '\' => ' + convert_to_php(val, new_indent);
        });
        res = res.join(',\n');

        return '[\n' + res + '\n' + _.repeat('\t', indent) + ']';
    }

    let itemIsString = _.isString(data);

    if (itemIsString && data.indexOf('\'') !== -1) {
        return _.repeat('\t', indent) + '\"' + data + '\"';
    }
    if(itemIsString && data.indexOf('::class') !== -1) {
        return _.repeat('\t', indent) + data;
    }

    if (itemIsString) {
        return _.repeat('\t', indent) + '\'' + data + '\'';
    }

    return _.repeat('\t', indent) + data.toString();
}

export default {
    read_modules: read_modules,
    read_assets: read_assets,
    save_modules: save_modules
};