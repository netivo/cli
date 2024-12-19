import fs from "fs";

import cp from "./config-parser.js";

let update_config = (config) => {
    return new Promise((resolve, reject) => {

        cp.read_modules(config);

        config.timestamp = new Date().getTime();

        let json_string = JSON.stringify(config, null, 2);
        fs.writeFileSync('netivo.json', json_string);
        resolve(config);
    });
}

export default update_config;