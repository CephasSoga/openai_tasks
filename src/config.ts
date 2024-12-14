import fs from "fs";
import toml from "toml";


// Read and parse the config.toml file
const configFile = fs.readFileSync('./config.toml', 'utf-8');
const config = toml.parse(configFile);

export default config;