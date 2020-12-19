import BazaarConnection from '../index.js';

const websocket1 = new WebSocket('ws://localhost:9527');

const connection = new BazaarConnection({
  websocket: websocket1,
});

connection.on('open', peerId => {
  console.log('open', peerId);
});

connection.on('message', (peerId, action) => {
  console.log(`(${peerId} > me)`, action);
});

window.connection = connection;
