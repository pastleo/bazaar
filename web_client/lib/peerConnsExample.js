import * as peers from './peers.js'
import * as peerConns from './peerConns.js'

window.ps = peers;
window.pc = peerConns;

peerConns.setRtcConfig({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
const myName = peerConns.getMyName();

const phxPeerName = 'phx-wss://bazaar-ws-peer.pastleo.me/peer';

const msgTerm = 'message';

let peerTemplate, peersBox, messageLineTemplate, messagesBox;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('my-name').textContent = myName;
  document.getElementById('title').text = `[${myName}] unnamed web client`;

  document.getElementById('direct-connect-name').value = phxPeerName;
  document.getElementById('direct-connect').onclick = directConnect;
  document.getElementById('message-broadcast').onclick = broadcastMessage;

  peerTemplate = document.getElementById('peer-template').content.children[0];
  peersBox = document.getElementById('peers');
  messageLineTemplate = document.getElementById('message-line-template').content.children[0];
  messagesBox = document.getElementById('messages-box');

  peerConns.connect(phxPeerName);
});

peerConns.newConnectionReady.do((peerName, viaPeerName) => {
  const dom = document.importNode(peerTemplate, true);
  peersBox.appendChild(dom);
  dom.querySelector('.name').textContent = peerName;
  if (viaPeerName) {
    dom.querySelector('.via').textContent = viaPeerName || '';
    dom.querySelector('.via-container').classList.add('shown');
  }
  dom.querySelector('.query-peers').onclick = () => queryAndConnectFlow(peerName, dom);
  dom.querySelector('.ping').onclick = () => ping(peerName, dom);
  dom.querySelector('.disconnect').onclick = () => peerConns.close(peerName);
  peers.set(peerName, { dom });
});

peerConns.connectionClosed.do(peerName => {
  peers.get(peerName).dom.remove();
});

function directConnect() {
  peerConns.connect(document.getElementById('direct-connect-name').value)
}

async function queryAndConnectFlow(peerVia, dom) {
  const peers = await peerConns.queryPeers(peerVia);
  const select = dom.querySelector('.connect-select')
  select.classList.add('shown');
  const [peer, ] = await selectPromise(
    select,
    peers.filter(p => p !== myName).map(p => [p, p])
  );
  select.classList.remove('shown');
  peerConns.connect(peer, peerVia);
}

peerConns.requested.on('ping', (_, peerName) => {
  showPing(peers.get(peerName).dom.querySelector('.ping'), '*');
  return {};
});

async function ping(peerName, dom) {
  const time = await peerConns.ping(peerName);
  showPing(dom.querySelector('.ping'), `(${time})`);
}

function broadcastMessage() {
  const msg = document.getElementById('message-input').value;
  peerConns.broadcast(msgTerm, { msg })
  addMessage(myName, msg);
}
peerConns.sent.on(msgTerm, ({ msg }, from) => {
  addMessage(from, msg);
});

function selectPromise(selectDOM, options) {
  while(selectDOM.options.length > 1) {
    selectDOM.remove(selectDOM.options.length - 1);
  }
  const optionMap = {};
  options.forEach(([value, text]) => {
    const optionDOM = document.createElement('option');
    optionDOM.value = value;
    optionDOM.text = text;
    optionMap[value] = [value, text];
    selectDOM.add(optionDOM);
  });
  return new Promise(resolve => {
    selectDOM.onchange = () => {
      if (optionMap[selectDOM.value]) {
        resolve(optionMap[selectDOM.value]);
      }
    };
  });
}

function showPing(pingDOM, text) {
  clearTimeout(pingDOM.showingPing);
  pingDOM.textContent = `ping ${text}`;
  pingDOM.showingPing = setTimeout(() => {
    pingDOM.textContent = 'ping';
  }, 1500);
}

function addMessage(from, msg) {
  const dom = document.importNode(messageLineTemplate, true);
  messagesBox.appendChild(dom);
  dom.querySelector('.peer-name').textContent = from;
  dom.querySelector('.message-content').textContent = msg;
}
