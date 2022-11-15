process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
/*
 * http client V5
 */

const util = require('util');

// const plugin = require('ih-plugin-api')();
const app = require('./app');

(async () => {
  let plugin;
  try {
    const opt = getOptFromArgs();
    const pluginapi = opt && opt.pluginapi ? opt.pluginapi : 'ih-plugin-api';
    plugin = require(pluginapi+'/index.js')();
    
    plugin.log('HTTP client has started.', 0);

    plugin.channels.data = await plugin.channels.get();
    plugin.log('Received channels...');

    plugin.params.data = await plugin.params.get();
    plugin.log('Received params...');

    app(plugin);
  } catch (err) {
    plugin.exit(8, `Error: ${util.inspect(err)}`);
  }
})();


function getOptFromArgs() {
  let opt;
  try {
    opt = JSON.parse(process.argv[2]); //
  } catch (e) {
    opt = {};
  }
  return opt;
}



