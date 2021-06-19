/*
 * http client V5
 */

const util = require('util');

const plugin = require('ih-plugin-api')();
const app = require('./app');

init();

async function init() {
  plugin.log('HTTP client has started.', 0);

  try {
    // Получить каналы 
    plugin.channels = await plugin.channels.get();
    plugin.log('Received channels...');

    // Получить параметры
    plugin.params = await plugin.params.get();
    plugin.log('Received params...');

    app(plugin);
  } catch (err) {
    plugin.exit(8, `Error: ${util.inspect(err)}`);
  }
};
