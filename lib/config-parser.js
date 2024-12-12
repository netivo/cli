import fs from "fs";
import engine from "php-parser";

let read_modules = (options) => {
    if(fs.existsSync('config/modules.config.php')) {
        let phpContent = fs.readFileSync('config/modules.config.php');

        let parser = new engine({
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
                                })
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

export default {
    read_modules: read_modules
};