const child = require('child_process');
const modulepath = './index.js';

const unitid = 'http'

const params = {
  debug: 'on',
  loglevel: 1,
}

const system = {

}

const config2 = [
  {
    id: '1',
    url: "https://frm.intrahouse.ru/",
    type: "get",
    interval: 10,
    statusCode: 200,
    headers: "Accept-Language: ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7\r\nUser-Agent: intraHouse (http-plugin)",
    headerCL: false,
    body: "username=admin&password=1234!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
  },
  {
    parentid: '1',
    dn: "LAMP1",
    parseType: "search",
    json: "data.value",
    regexp: "<div\\b[^>]*>(.*?)</div>",
    regexptest: "[a-z0-9]",
    valueTrue: '1',
    valueFalse: 'null',
    flag: "gm",
    rescount: 1,
    number: true,
    actions: [
      {
        act: "set",
        url: "http://localhost:2222/test=1&data=${value}",
        type: "post",
        statusCode: 200,
        headers: "Accept-Language: ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7\r\nUser-Agent: intraHouse (http-plugin)",
        body: "1",
        headerCL: false,
        updatestate: true,
      }
    ],
  }
];


const ps = child.fork(modulepath, [unitid]);

ps.on('message', data => {
  if (data.type === 'get' && data.tablename === `system/${unitid}`) {
    ps.send({ type: 'get', system });
  }

  if (data.type === 'get' && data.tablename === `params/${unitid}`) {
    ps.send({ type: 'get', params });
  }

  if (data.type === 'get' && data.tablename === `config/${unitid}`) {
    ps.send({ type: 'get', config: config2 });
  }

  if (data.type === 'data') {
    console.log('-------------data-------------', new Date().toLocaleString());
    console.log(data.data);
    console.log('');
  }

  if (data.type === 'channels') {
    console.log('-----------channels-----------', new Date().toLocaleString());
    console.log(data.data);
    console.log('');
  }

  if (data.type === 'debug') {
    console.log('-------------debug------------', new Date().toLocaleString());
    console.log(data.txt);
    console.log('');
  }
});

ps.on('close', code => {
  console.log('close');
});

ps.send({type: 'debug', mode: true });

setTimeout(() => {
  ps.send({ type: 'command', command: 'http://ya.ru' });
// ps.send({ type: 'act', data: [ { dn: 'LAMP1', prop: 'set', val: 50 } ] });
}, 1000)
