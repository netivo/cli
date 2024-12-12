
import fs from "fs";
import updateConfig from "./update-config.js";

let checkConfig = () => {
    return new Promise((resolve, reject) => {
        if(!fs.existsSync('netivo.json')){
            reject('Project configuration file not exists!');
        }
        let config = fs.readFileSync('netivo.json');
        config = JSON.parse(config);
        if(fs.existsSync('config/modules.config.php')){
            let stat = fs.statSync('config/modules.config.php');
            if(stat.mtimeMs > config.timestamp) {
                updateConfig(config).then(() => {
                    resolve();
                }).catch(error => {
                    reject(error);
                })
            } else {
                resolve();
            }
        } else {
            config.modules = {
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
            config.timestamp = new Date().getTime();

            let json_string = JSON.stringify(config, null, 2);
            fs.writeFileSync('netivo.json', json_string);
            resolve();
        }
    });
};

export default checkConfig;