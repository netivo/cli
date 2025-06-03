import glog from "fancy-log";
import chalk from "chalk";

let file_log = (log) => {
    console.log('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log);
};
let file_log_error = (log) => {
    console.error(chalk.red('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log));
};
let file_log_warning = (log) => {
    console.warn(chalk.yellow('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log));
};

export default {
    log: file_log,
    log_error: file_log_error,
    log_warning: file_log_warning
};