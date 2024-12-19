import _ from 'lodash';

let create_class = (class_data) => {
    let class_content = generate_header(class_data);

    class_content += generate_namespace_and_uses(class_data);

    class_content += generate_security();

    if(class_data.hasOwnProperty('attributes')) {
        if(_.isArray(class_data.attributes)) {
            let att = _.map(class_data.attributes, (val) => {
                return '#[' + val.name + '( \'' + val.value + '\' )]';
            }).join('\n');
            class_content += att + '\n';
        } else if(_.isObject(class_data.attributes)) {
            class_content += '#[' + class_data.attributes.name + '( ' + class_data.attributes.value + ' )]\n';
        }
    }
    class_content += 'class ' + class_data.name;
    if(class_data.hasOwnProperty('parent')) class_content += ' extends ' + class_data.parent;
    class_content += ' {\n';

    if(class_data.hasOwnProperty('properties')) {
        if(_.isArray(class_data.properties)){
            let properties = _.map(class_data.properties, val => {
                return generate_property(val);
            });
            class_content += properties.join('\n');
        }
        else if(_.isObject(class_data.properties)) {
            class_content += generate_property(class_data.properties) + '\n';
        }
    }

    class_content += '\n';

    if(class_data.hasOwnProperty('methods')) {
        if(_.isArray(class_data.methods)){
            let methods = _.map(class_data.methods, val => {
                return generate_method(val);
            });
            class_content += methods.join('\n');
        }
        else if(_.isObject(class_data.methods)) {
            class_content += generate_method(class_data.methods) + '\n';
        }
    }

    class_content += '}';
    return class_content;
}

let generate_header = (data) => {
    let header_content = '<?php\n/**\n';
    header_content += ' * Created by Netivo for ' + data.project_name + '\n';
    header_content += ' * Creator: Netivo\n';
    header_content += ' * Creation date: ' + (new Date()).toUTCString() + '\n */\n\n';

    return header_content;
}

let generate_namespace_and_uses = (data) => {
    let namespace = '';
    if(!_.isEmpty(data.namespace)) {
        namespace = 'namespace ' + data.namespace + ';\n\n';
    }
    if(!_.isEmpty(data.use)) {
        namespace += _.map(data.use, u => {
            return 'use ' + u + ';\n';
        }).join('\n');
        namespace += '\n\n';
    }
    return namespace;
}

let generate_security = () => {
    return 'if ( ! defined( \'ABSPATH\' ) ) {\n' +
        '\theader( \'HTTP/1.0 404 Forbidden\' );\n' +
        '\texit;\n' +
        '}\n\n';
}

let generate_property = (property) => {
    let access = (property.access !== undefined) ? property.access : 'public';
    let type = (property.type !== undefined) ? property.type : '';

    let property_content = '';
    if(type !== '' || property.docblock !== undefined) {
        property_content = '\t/**\n';
        if (property.docblock !== undefined) {
            property_content += '\t * ' + property.docblock + '\n';
            if(type !== '') property_content += '\t *\n';
        }
        if(type !== '') {
            property_content += '\t * @var ' + type + '\n';
        }
        property_content += '\t */\n';
    }
    property_content += '\t' + access + ((type !== '') ? ' '+type : '') + ' $' + _.camelCase(property.name);
    if(property.value !== undefined) {
        if(_.isString(property.value)) {
            property_content += ' = \'' + property.value + '\'';
        }
        else if(_.isArray(property.value)) {
            let arr = _.map(property.value, val => {
                return '\'' + val + '\'';
            }).join(', ');
            property_content += ' = [ ' + arr + ' ]'
        }
    }
    property_content += ';\n';

    return property_content;
};

let generate_method = method => {
    let access = (method.access !== undefined) ? method.access : 'public';
    let type = (method.type !== undefined) ? method.type : '';

    let method_content = '';

    if(type !== '' || method.docblock !== undefined || method.params !== undefined) {
        method_content = '\t/**\n';
        if (method.docblock !== undefined) {
            method_content += '\t * ' + method.docblock + '\n';
            if(type !== '') method_content += '\t *\n';
        }
        if(method.params !== 'undefined') {
            if(_.isArray(method.params)) {
                method_content += _.map(method.params, param => {
                    let par_content = '\t * @param ';
                    if(param.type !== undefined) {
                        par_content += param.type + ' ';
                    }
                    par_content += '$' + param.name
                    if(param.description !== undefined) {
                        par_content += ' ' + param.description;
                    }
                    return par_content;
                }).join('\n');
                method_content += '\n\t *\n'
            } else if(_.isObject(method.params)) {
                let method_content = '\t * @param ';
                if(method.params.type !== undefined) {
                    method_content += method.params.type + ' ';
                }
                method_content += '$' + method.params.name
                if(method.params.description !== undefined) {
                    method_content += ' ' + method.params.description;
                }
                method_content += '\n\t *\n';
            }
        }
        if(type !== '') {
            method_content += '\t * @return ' + type + '\n';
        }
        method_content += '\t */\n';
    }

    method_content += '\t' + access + ' function ' + method.name + '( ';
    if(method.params !== 'undefined') {
        if(_.isArray(method.params)) {
            method_content += _.map(method.params, param => {
                let par_content = '';
                if(param.type !== undefined) {
                    par_content += param.type + ' ';
                }
                par_content += '$' + param.name
                if(param.default !== undefined) {
                    par_content += ' = ';
                    if(param.default === null){
                        par_content += 'null';
                    } else if(_.isNumber(param.default)) {
                        par_content += param.default;
                    } else {
                        par_content += '\'' + param.default + '\'';
                    }
                }
                return par_content;
            }).join(', ');
        } else if(_.isObject(method.params)) {
            if(method.params.type !== undefined) {
                method_content += method.params.type + ' ';
            }
            method_content += '$' + method.params.name
            if(method.params.default !== undefined) {
                method_content += ' = ';
                if(method.params.default === null){
                    method_content += 'null';
                } else if(_.isNumber(method.params.default)) {
                    method_content += method.params.default;
                } else {
                    method_content += '\'' + method.params.default + '\'';
                }
            }
        }
    }
    method_content += ' )';
    if(type !== '') method_content += ': ' + type;
    method_content += ' {\n';

    if(method.body !== undefined) {
        method_content += '\t\t' + method.body + '\n';
    }
    method_content += '\t}\n';

    return method_content;
}

export default create_class;