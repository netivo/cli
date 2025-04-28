
import parser from "../lib/config-parser.js";

let options = {};

parser.read_assets(options);

console.log(options);