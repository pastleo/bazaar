import uuid from 'uuid';
import wss from './wss.js';
import debug from './debug.js';

// testing shared utils:
import { randomStr } from '../web_client/lib/utils.js';
console.log('testing shared utils: randomStr() =', randomStr());

/**
 * @type {Map<WebSocket, string>} wsToIdMap
 */
const wsToIdMap = new Map();
/**
 * @type {Map<string, WebSocket>} idToWsMap
 */
const idToWsMap = new Map();

wss.on('connection', ws => {
  const id = uuid();
  wsToIdMap.set(ws, id);
  idToWsMap.set(id, ws);

  debug.websocket('connection', id);

  ws.on('message', message => {
    const messageJson = JSON.parse(message);
    debug.websocket('message', messageJson);

    const { type, from, to, payload } = messageJson;

    if (to === 'broadcast') {
      return wss.clients.forEach(client => {
        if (client !== ws) {
          client.send(message);
        }
      });
    }

    const client = idToWsMap.get(to);
    if (wss.clients.has(client)) {
      return client.send(message);
    }

    debug.websocket('This messsage do nothing.');
  });

  ws.on('close', () => {
    wsToIdMap.delete(ws);
    idToWsMap.delete(id);
  });

  ws.send(JSON.stringify({
    type: 'initial-information',
    payload: {
      id,
      peers: [...wsToIdMap.values()].filter(
        peerId => peerId !== id
      ),
    },
  }));
});
