/**
 * fakeServer.js
 *
 * Запуск с параметром port
 *    node fkeServer 8899
 *  Сервер слушает входящие http запросы на порту xxxx
 *
 *  Возвращает json, сформированный из query, status 200
 *  Если query пусто, отправляет 404
 */

const http = require('http');
const url = require('url');

const port = process.argv[2];
if (!port) {
  console.log('Порт не определен!');
  process.exit();
}

http
  .createServer(onRequest)
  .listen(port)
  .on('error', e => {
    let msg = e.code == 'EADDRINUSE' ? 'Address in use' : `${e.code} Stopped.`;
    console.log(`HTTP server port: ${port} error ${e.errno}. ${msg}`);
    process.exit(1);
  });

console.log('Listening localhost:' + port);

function onRequest(request, response) {
  console.log('=> HTTP GET ' + request.url);

  const qobj = url.parse(request.url, true).query;

  if (qobj) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(qobj));
  } else {
    response.writeHead(404);
  }
 
  response.on('error', e => {
    console.log('<= ERROR:' + e.code);
  });
}
