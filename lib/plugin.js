const EventEmitter = require('events');


class Plugin extends EventEmitter {

  constructor() {
    super();

    process.on('message', this.message.bind(this));
    this.unitid = process.argv[2];
    this.mode = 0;
    this.channels = [];
    this.system = {};
    this.params = {};
    this.start();

  }

  debug(data, level = 0) {
    /* if (this.params.debug && this.params.loglevel >= level) {
      process.send({ type: 'debug', txt: data });
    } 
    if (level === 100) {
      process.send({ type: 'debug', txt: data });
    } */
    process.send({ type: 'debug', txt: data });
  }

  message(msg) {
    if (msg.type === 'get' && msg.hasOwnProperty('system')) {
      this.system = msg.system;
      this.updateMode();
    }
    if (msg.type === 'get' && msg.hasOwnProperty('params')) {
      this.params = msg.params;
      this.updateMode();
    }
    if (msg.type === 'get' && msg.hasOwnProperty('config')) {
      this.channels = msg.config;
      this.updateMode();
    }

    if (msg.type === 'act') {
      msg.data.forEach(i => this.emit('device_action', i))
    }
    if (msg.type === 'command') {
      this.emit('command', msg.command);
    }
    if (msg.type === 'debug') {
      this.params.debug = msg.mode === 'on';
      this.emit('debug', msg.mode);
    }
  }

  updateMode() {
    this.mode++;
    if (this.mode === 3) {
      this.mode = 4;
      this.emit('start');
    }
  }

  info() {
    this.debug('start', 100);
    this.debug('version: 0.0.21', 100);
  }

  send(tablename) {
    process.send({ type: 'get', tablename: `${tablename}/${this.unitid}` });
  }

  setDeviceValue(data) {
    process.send({ type: 'data', data });
  }

  start() {
    this.info();
    this.send('system');
    this.send('params');
    this.send('config');
  }

}

module.exports = Plugin;
