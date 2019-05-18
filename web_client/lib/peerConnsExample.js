import * as peers from './peers.js'
import * as peerConns from './peerConns.js'

import { randomStr } from './utils.js'

window.ps = peers;
window.pc = peerConns;

peerConns.setRtcConfig({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
const myId = peerConns.getMyId();

const phxPeerIdLocalStorageKey = 'phxPeerId';
const defaultPhxPeerId = 'phx-wss://bazaar-ws-peer.pastleo.me/peer';

const msgTerm = 'message';
const stressTerm = 'stress';

//peerConns.setDebug(true);

let peerTemplate, peersBox, messageLineTemplate, messagesBox;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('my-id').textContent = myId;
  document.getElementById('title').text = `[${myId}] unnamed web client`;

  document.getElementById('direct-connect-name').value = defaultPhxPeerId;
  document.getElementById('direct-connect').onclick = directConnect;
  document.getElementById('message-broadcast').onclick = broadcastMessage;

  peerTemplate = document.getElementById('peer-template').content.children[0];
  peersBox = document.getElementById('peers');
  messageLineTemplate = document.getElementById('message-line-template').content.children[0];
  messagesBox = document.getElementById('messages-box');

  const phxPeerId = localStorage.getItem(phxPeerIdLocalStorageKey) || defaultPhxPeerId;
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
  const phxPeerId = document.getElementById('direct-connect-name').value;
  peerConns.connect(phxPeerId)
  localStorage.setItem(phxPeerIdLocalStorageKey, phxPeerId);
}

async function queryAndConnectFlow(peerVia, dom) {
  const peers = await peerConns.queryPeers(peerVia);
  const connectCtl = dom.querySelector('.connect-ctl');
  const select = dom.querySelector('.connect-select');
  connectCtl.classList.add('shown');
  const [peer, ] = await selectPromise(
    select,
    peers.filter(p => p !== myId).map(p => [p, p])
  );
  connectCtl.classList.remove('shown');
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

async function stressTestStart(peerId, dom) {
  const stressBtn = dom.querySelector('.stress-test');
  const stressCtl = dom.querySelector('.stress-ctl');
  const stressShow = dom.querySelector('.stress-show');
  stressCtl.classList.add('shown');
  await clickPromise(dom.querySelector('.stress-test-start'));
  stressCtl.classList.remove('shown');
  stressShow.classList.add('shown');
  stressBtn.textContent = 'stress test stop';

  let
    stressTesting = true,
    stressTestingSent = 0,
    stressTestingRecieved = 0,
    concurrent = dom.querySelector('.concurrent').value,
    concurrentCurr = 0,
    dataLength = dom.querySelector('.data-length').value,
    lastStressTestingRecieved = 0,
    startTime = Date.now();

  dom.querySelector('.stress-test').onclick = () => {
    stressTesting = false;
    stressBtn.textContent = 'stress test start';
    stressBtn.onclick = () => stressTestStart(peerId, dom);
  }

  const stressTest = async () => {
    if (!stressTesting) { return; }
    if (concurrentCurr < concurrent) {
      setTimeout(stressTest);
    }
    try {
      concurrentCurr++;
      const randStr = randomStr();
      const data = randStr.repeat(Math.floor(dataLength / randStr.length));
      stressTestingSent++;
      const { data: dataPong } = await peerConns.request(peerId, stressTerm, { data });
      if (data === dataPong) {
        stressTestingRecieved++;
      }
    } finally {}
    setTimeout(stressTest);
  }
  const showStress = () => {
    stressShow.textContent =
      `${stressTesting ? 'stress testing...' : 'stress test result:'} ${stressTestingRecieved} recieved / ${stressTestingSent} sent, ${stressTestingRecieved / stressTestingSent * 100}% recieved, ${stressTestingRecieved - lastStressTestingRecieved} requests in last second, ${stressTestingRecieved / (Date.now() - startTime) * 1000} requests per second in average`;
    lastStressTestingRecieved = stressTestingRecieved;

    if (stressTesting) {
      setTimeout(showStress, 1000);
    }
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

function clickPromise(dom) {
  return new Promise(resolve => {
    dom.addEventListener('click', () => resolve(), {once: true});
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
