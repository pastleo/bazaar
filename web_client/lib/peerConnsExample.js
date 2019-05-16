import * as peers from './peers.js'
import * as peerConns from './peerConns.js'

import { randomStr } from './utils.js'

window.ps = peers;
window.pc = peerConns;

peerConns.setRtcConfig({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
const myId = peerConns.getMyId();

const phxPeerId = 'phx-wss://bazaar-ws-peer.pastleo.me/peer';

const msgTerm = 'message';
const stressTerm = 'stress';

//peerConns.setDebug(true);

let peerTemplate, peersBox, messageLineTemplate, messagesBox;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('my-name').textContent = myId;
  document.getElementById('title').text = `[${myId}] unnamed web client`;

  document.getElementById('direct-connect-name').value = phxPeerId;
  document.getElementById('direct-connect').onclick = directConnect;
  document.getElementById('message-broadcast').onclick = broadcastMessage;

  peerTemplate = document.getElementById('peer-template').content.children[0];
  peersBox = document.getElementById('peers');
  messageLineTemplate = document.getElementById('message-line-template').content.children[0];
  messagesBox = document.getElementById('messages-box');

  peerConns.connect(phxPeerId);
});

peerConns.newConnectionReady.do((peerId, viaPeerId) => {
  const dom = document.importNode(peerTemplate, true);
  peersBox.appendChild(dom);
  dom.querySelector('.name').textContent = peerId;
  if (viaPeerId) {
    dom.querySelector('.via').textContent = viaPeerId || '';
    dom.querySelector('.via-container').classList.add('shown');
  }
  dom.querySelector('.query-peers').onclick = () => queryAndConnectFlow(peerId, dom);
  dom.querySelector('.ping').onclick = () => ping(peerId, dom);
  dom.querySelector('.stress-test').onclick = () => stressTestStart(peerId, dom);
  dom.querySelector('.disconnect').onclick = () => peerConns.close(peerId);
  peers.set(peerId, { dom });
});

peerConns.connectionClosed.do(peerId => {
  peers.get(peerId).dom.remove();
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
    peers.filter(p => p !== myId).map(p => [p, p])
  );
  select.classList.remove('shown');
  peerConns.connect(peer, peerVia);
}

peerConns.requested.on('ping', (_, peerId) => {
  showPing(peers.get(peerId).dom.querySelector('.ping'), '*');
  return {};
});

async function ping(peerId, dom) {
  const time = await peerConns.ping(peerId);
  showPing(dom.querySelector('.ping'), `(${time})`);
}

function stressTestStart(peerId, dom) {
  let
    stressTesting = true,
    stressTestingSent = 0,
    stressTestingRecieved = 0,
    concurrent = prompt('concurrent?'),
    concurrentCurr = 0,
    dataRepeat = prompt('dataRepeat?'),
    lastStressTestingRecieved = 0;

  dom.querySelector('.stress-test').onclick = () => {
    stressTesting = false;
    dom.querySelector('.stress-test').textContent = 'stress test start';
    dom.querySelector('.stress-test').onclick = () => stressTestStart(peerId, dom);
  }

  const stressTest = async () => {
    if (!stressTesting) { return; }
    if (concurrentCurr < concurrent) {
      setTimeout(stressTest);
    }
    try {
      concurrentCurr++;
      const data = randomStr().repeat(dataRepeat);
      stressTestingSent++;
      const { data: dataPong } = await peerConns.request(peerId, stressTerm, { data });
      if (data === dataPong) {
        stressTestingRecieved++;
      }
    } finally {}
    setTimeout(stressTest);
  }
  const showStress = () => {
    if (!stressTesting) { return; }
    dom.querySelector('.stress-test').textContent =
      `stress testing... (${stressTestingRecieved} / ${stressTestingSent}, ${stressTestingRecieved / stressTestingSent * 100}, ${stressTestingRecieved - lastStressTestingRecieved}/s)`;
    lastStressTestingRecieved = stressTestingRecieved;

    setTimeout(showStress, 1000);
  }

  stressTest(peerId, dom);
  showStress(dom);
}
peerConns.requested.on(stressTerm, ({ data }) => ({ data }));

function broadcastMessage() {
  const msg = document.getElementById('message-input').value;
  peerConns.broadcast(msgTerm, { msg })
  addMessage(myId, msg);
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
