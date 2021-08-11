/**
 *
 */

const util = require('util');
const request = require('request');

const STORE = {
  sessions: {}
};

module.exports = async function(plugin) {
  start();

  function start() {
    STORE.tasks = prepareTasks(plugin.channels.data);
    STORE.actions = prepareActions(STORE.tasks);
    STORE.tasks.forEach(worker);
  }

  function createFunction(value) {
    try {
      return new Function('data', `return ${value}`);
    } catch (e) {
      return e.message;
    }
  }

  function prepareChildren(value) {
    switch (value.parseType) {
      case 'json':
        return {
          ...value,
          parse: createFunction(value.json)
        };
      case 'text':
        return {
          ...value,
          parse: value.regexp !== '' ? new RegExp(value.regexp, value.flag) : null
        };
      case 'search':
        return {
          ...value,
          parse: value.regexp !== '' ? new RegExp(value.regexptest, value.flag) : null
        };
      default:
        return value;
    }
  }

  function prepareParent(value) {
    const headers = value.headers.split(/\r?\n/).reduce((l, n) => {
      const temp = n.split(':');
      if (temp.length == 2) {
        return {
          ...l,
          [temp[0].replace(/\s/g, '')]: temp[1]
        };
      }
      return l;
    }, {});

    if (value.reqAuthHeaders) {
      const reqAuthHeaders = value.reqAuthHeaders.split(/\r?\n/).reduce((l, n) => {
        const temp = n.split(':');
        if (temp.length == 2) {
          return {
            ...l,
            [temp[0].replace(/\s/g, '')]: temp[1]
          };
        }
        return l;
      }, {});

      const body = !(value.type === 'get' || value.type === 'head') ? value.body : null;
      const reqAuthBody = !(value.reqAuthType === 'get' || value.reqAuthType === 'head') ? value.reqAuthBody : null;

      return { ...value, headers, reqAuthHeaders, body, reqAuthBody };
    }
    const body = !(value.type === 'get' || value.type === 'head') ? value.body : null;
    return { ...value, headers, body };
  }

  function prepareTasks(data) {
    const parent = [];
    const children = {};

    data.forEach(i => {
      if (i.parentid === undefined || i.parentid === false) {
        parent.push(prepareParent(i));
      } else {
        if (children[i.parentid] === undefined) {
          children[i.parentid] = [];
        }
        children[i.parentid].push(prepareChildren(i));
      }
    });

    return parent.map(i => ({ ...i, values: children[i.id] || [] }));
  }

  function prepareActions(data) {
    const actions = {};

    data.forEach((r, key) => {
      r.values.forEach(c => {
        if (c.w) {
          if (!actions[c.dn]) actions[c.dn] = {};

          // a.task = key;
          actions[c.dn][c.act] = prepareParent({ ...c, task: key });
        }
      });
    });
    return actions;
  }

  function reqA({ id, reqAuth, reqAuthEverytime, reqAuthUrl, reqAuthType, reqAuthHeaders, reqAuthBody }) {
    return new Promise(resolve => {
      if (reqAuth && (reqAuthEverytime || STORE.sessions[id] === undefined)) {
        STORE.sessions[id] = {};
        STORE.sessions[id].jar = request.jar();
        request(
          {
            uri: reqAuthUrl,
            method: reqAuthType,
            headers: reqAuthHeaders,
            body: reqAuthBody,
            followRedirect: false,
            jar: STORE.sessions[id].jar
          },
          (error, response, body) => {
            if (error === null) {
              plugin.log(
                `${reqAuthType.toUpperCase()} ${reqAuthUrl}\n---- HEADERS START ----\n${JSON.stringify(
                  response.headers,
                  null,
                  2
                )}\n---- HEADERS END ----\n---- BODY START ----\n${body}---- BODY END ----\n\n`,
                2
              );
            }
            resolve();
          }
        );
      } else {
        resolve();
      }
    });
  }

  function req({ id, url, type, headers, body, statusCode, headerCL, reqAuth }) {
    return new Promise((resolve, reject) => {
      if (headerCL && !(type === 'get' || type === 'head')) {
        headers['Content-Length'] = body.length;
      }
      const jar = STORE.sessions[id] ? STORE.sessions[id].jar : null;
      request({ uri: url, method: type, headers, body, jar }, (error, response, body) => {
        if (error === null && (statusCode ? response.statusCode === statusCode : true)) {
          plugin.log(
            `${type.toUpperCase()} ${url}\n---- HEADERS START ----\n${JSON.stringify(
              response.headers,
              null,
              2
            )}\n---- HEADERS END ----\n---- BODY START ----\n${body}---- BODY END ----\n\n`,
            2
          );
          resolve(body);
        } else {
          if (reqAuth) {
            delete STORE.sessions[id];
          }
          const error_text = error
            ? error.message
            : `Response status code no match, ${statusCode} != ${response.statusCode}`;
          plugin.log(`${type.toUpperCase()} ${url}  error: ${error_text}`, 1);
          reject(error || Error(`Response status code no match, ${statusCode} != ${response.statusCode}`));
        }
      });
    });
  }

  function parser(text, values, url) {
    return values
      .filter(i => i.dn !== null && i.r)
      .map(value => {
        switch (value.parseType) {
          case 'json':
            return parserJSON(text, value, url);
          case 'text':
            return parserREGEXP(text, value, url);
          case 'search':
            return parserREGEXPTEST(text, value, url);
          default:
            return {};
        }
      });
    //  .filter(i => i.dn !== null);
  }

  function parserJSON(text, item, url) {
    try {
      if (typeof item.parse !== 'function') {
        return { dn: item.dn, err: item.parse };
      }
      const data = JSON.parse(text);
      const value = item.number ? Number(item.parse(data)) : item.parse(data);
      if (item.number && isNaN(value)) {
        return { dn: item.dn, err: 'Value is NaN!' };
      }
      return { dn: item.dn, value };
    } catch (e) {
      return { dn: item.dn, err: e.message };
    }
  }

  function parserREGEXP(text, item, url) {
    try {
      if (item.parse === null) {
        const value = item.number ? Number(text) : text;
        if (item.number && isNaN(value)) {
          return { dn: item.dn, err: 'Value is NaN!' };
        }
        return { dn: item.dn, value };
      }
      const regex = item.parse;
      const values = regex.exec(text);
      plugin.log(`${url} --> values: ${JSON.stringify(values.slice(-2))}`, 1);
      const value = item.number ? Number(values[item.rescount]) : values[item.rescount];
      regex.exec('');
      if (item.number && isNaN(value)) {
        return { dn: item.dn, err: 'Value is NaN!' };
      }
      return { dn: item.dn, value };
    } catch (e) {
      return { dn: item.dn, err: e.message };
    }
  }

  function parserREGEXPTEST(text, item, url) {
    try {
      const regex = item.parse;
      const test = regex.test(text);
      regex.test('');
      plugin.log(`${url} --> value: ${test}`, 1);
      if (test) {
        return { dn: item.dn, value: item.number ? Number(item.valueTrue) : item.valueTrue };
      }
      if (item.valueFalse !== 'null') {
        return { dn: item.dn, value: item.number ? Number(item.valueFalse) : item.valueFalse };
      }
      return { dn: null };
    } catch (e) {
      return { dn: item.dn, err: e.message };
    }
  }

  function task() {
    reqA(this)
      .then(() =>
        req(this)
          .then(res => parser(res, this.values, this.url))
          .then(values => {
            if (values.length) {
              plugin.sendData(values);
            }
          })
      )
      .catch(e => plugin.sendData(this.values.filter(item => item.r).map(item => ({ dn: item.dn, err: e.message }))));
  }

  function worker(item) {
    if (!item.interval) return;
    const _task = task.bind(item);
    setInterval(_task, item.interval * 1000);
    _task();
  }

  /*
  function deviceAction(device) {
   
    if (STORE.actions[device.dn] && STORE.actions[device.dn][device.prop]) {
      const action = STORE.actions[device.dn][device.prop];
      if (device.prop === 'set') {
        plugin.log(action.url.replace(/\${value}/gim, device.val));
      } else {
        plugin.log(action.url);
      }
      req(
        device.prop === 'set'
          ? Object.assign({}, action, {
              url: action.url.replace(/\${value}/gim, device.val),
              body: action.body ? action.body.replace(/\${value}/gim, device.val) : action.body
            })
          : action
      )
        .then(res => {
          if (action.updatestate) {
            task.bind(STORE.tasks[action.task]).call();
          } else if (device.prop === 'set') {
            plugin.sendData([{ dn: device.dn, value: device.val }]);
          } 
          // else {
          //  plugin.sendData([{ dn: device.dn, value: device.prop === 'on' ? 1 : 0 }]);
          // }
        })
        .catch(e => plugin.sendData([{ dn: device.dn, err: e.message }]));
    }
  }
  */

  function deviceAction(device) {
    if (STORE.actions[device.dn] && STORE.actions[device.dn][device.prop]) {
      const action = STORE.actions[device.dn][device.prop];
      if (!action.url) {
        plugin.log('Empty action url!');
        return;
      }

      const url = action.url.indexOf('${value}') > 0 ? action.url.replace(/\${value}/gim, device.val) : action.url;
      plugin.log(url);
      let body;
      if (action.body) {
        body = action.body.indexOf('${value}') > 0 ? action.body.replace(/\${value}/gim, device.val) : action.body;
      }

      req(Object.assign({}, action, { url, body }))
        .then(res => {
          if (action.updatestate) {
            task.bind(STORE.tasks[action.task]).call();
          } else if (device.prop === 'set') {
            plugin.sendData([{ dn: device.dn, value: device.val }]);
          }
        })
        .catch(e => plugin.sendData([{ dn: device.dn, err: e.message }]));
    }
  }

  plugin.onAct(message => {
    plugin.log('Action request: ' + util.inspect(message));
    if (!message.data) return;

    message.data.forEach(item => deviceAction(item));
  });

  plugin.on('command', command => {
    const url = command;
    const type = 'get';
    request({ uri: url, method: type }, (error, response, body) => {
      if (error === null) {
        plugin.log(
          `COMMAND ${type.toUpperCase()} ${url}\n---- HEADERS START ----\n${JSON.stringify(
            response.headers,
            null,
            2
          )}\n---- HEADERS END ----\n---- BODY START ----\n${body}---- BODY END ----\n\n`,
          100
        );
      } else {
        const error_text = error
          ? error.message
          : `Response status code no match, ${response.statusCode} != ${response.statusCode}`;
        plugin.log(`${type.toUpperCase()} ${url}  error: ${error_text}`, 100);
      }
    });
  });
};
