import glog from "fancy-log";

let file_log = (log) => {
    glog('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log);
};
let file_log_error = (log) => {
    glog.error('[' + (new Date()).toISOString().slice(0, 19).replace(/-/g, "/").replace("T", " ") + '] ' + log);
};

export default {
    log: file_log,
    log_error: file_log_error
};