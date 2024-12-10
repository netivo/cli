#!/usr/bin/env node

// import engine from "php-parser";
// import fs from "fs";
// import * as path from "node:path";
// import unparse from "php-unparser";

import * as get_data from "./../lib/get-data.js";
import glog from "fancy-log";

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


let file_log = (log) => {
    glog('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log);
};
let file_log_error = (log) => {
    glog.error('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log);
};

get_data.metabox().then(val => {
    console.log(val);
}).catch(error => {
    file_log(error);
});


// let phpContent = fs.readFileSync('config/modules.config.php');
//
// let parser = new engine({
//     parser: {
//         extractDoc: false,
//         php7: true
//     },
//     ast: {
//         withPositions: false,
//     }
// });
//
// let parsed = parser.parseCode(phpContent);
//
// console.log(parsed);
//
// parsed.children.forEach(child => {
//     if(child.kind === 'return') {
//         if(child.expr.kind === 'array') {
//             child.expr.items.forEach(item => {
//                 if(item.key.value === 'modules') {
//                     if(item.value.kind === 'array') {
//                         item.value.items.forEach(item2 => {
//                             if(item2.key.value === 'admin') {
//                                 if(item2.value.kind === 'array') {
//                                     item2.value.items.forEach(item3 => {
//                                         if(item3.key.value === 'metabox') {
//                                             console.log(item3.value.items);
//                                             // item3.value.items.push({
//                                             //     kind: "entry",
//                                             //     key: null,
//                                             //     value: {
//                                             //         "kind": "string",
//                                             //         "value": "hello world",
//                                             //         "isDoubleQuote": true
//                                             //         // kind: 'staticlookup',
//                                             //         // what: {
//                                             //         //     kind: "name",
//                                             //         //     name: "\\Netivo\\Elazienki\\Theme\\Admin\\MetaBox\\Test",
//                                             //         //     resolution: "fqn"
//                                             //         // },
//                                             //         // offset: {
//                                             //         //     kind: "identifier",
//                                             //         //     name: "class"
//                                             //         // }
//                                             //     }
//                                             // });
//                                         }
//                                     });
//                                 }
//                             }
//                         })
//                     }
//                 }
//             });
//
//         }
//     }
// });
// let options = {
//     indent: true,
//     dontUseWhitespaces: false,
//     shortArray: true,
//     bracketsNewLine: true,
//     forceNamespaceBrackets: false,
//     collapseEmptyLines: true
// };
// console.log(unparse(parsed, options));