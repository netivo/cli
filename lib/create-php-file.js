import _ from 'lodash';

let create_php_file = (class_data) => {
    let class_content = generate_header(class_data);

    class_content += generate_security();

    if(class_data.hasOwnProperty('body')){
        class_content += class_data.body;
    }

    return class_content;
}

let generate_header = (data) => {
    let header_content = '<?php\n/**\n';
    header_content += ' * Created by Netivo for ' + data.project_name + '\n';
    header_content += ' * Creator: Netivo\n';
    header_content += ' * Creation date: ' + (new Date()).toUTCString() + '\n */\n\n';

    return header_content;
}

let generate_security = () => {
    return 'if ( ! defined( \'ABSPATH\' ) ) {\n' +
        '\theader( \'HTTP/1.0 404 Forbidden\' );\n' +
        '\texit;\n' +
        '}\n\n';
}


export default create_php_file;