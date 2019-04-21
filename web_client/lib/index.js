import * as peers from './peers.js'
import * as peerConns from './peerConns.js'
import game, { getDefaultScene, onCreate as gameOnCreate } from '../game/index.js'

window.ps = peers;
window.pc = peerConns;
window.game = game;

const msgTerm = 'message';
const nickNameTerm = 'nickname';

peerConns.setRtcConfig({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]});
const myName = peerConns.getMyName();
let nickName;

const phxPeerName = 'phx-wss://unnamed.pastleo.me/peer';
let nextFindNewPeersTimeout;
let messageLineTemplate, messagesBox

document.addEventListener('DOMContentLoaded', async () => {
  messageLineTemplate = document.getElementById('message-line-template').content.children[0];
  messagesBox = document.getElementById('messages-box');

  document.getElementById('change-nickname').onclick = setMyNickName;
  document.getElementById('message-broadcast').onclick = broadcastMessage;
  document.getElementById('message-input').addEventListener('keypress', ({ keyCode }) => {
    if (keyCode === 13) broadcastMessage()
    return true;
  });
});

gameOnCreate(async () => {
  await peerConns.connect(phxPeerName);
  setNameOnUI(myName);

  findNewPeers();
});

async function findNewPeers() {
  const peersToConnect = (await peerConns.queryPeers(phxPeerName)).filter(p => p !== myName && !peerConns.isConnected(p));
  for(const peer of peersToConnect) {
    await peerConns.connect(peer, phxPeerName);
  }
}

peerConns.newConnectionReady.do((peerName, viaPeerName) => {
  if (peerName !== phxPeerName) {
    getDefaultScene().addPeer(peerName);
    setTimeout(() => {
      if (nickName) {
        peerConns.getConnection(peerName).send(nickNameTerm, { nickName });
      }
      getDefaultScene().player.sendMovement(peerName);
    }, 500);
  }
});

peerConns.connectionClosed.do(peerName => {
  getDefaultScene().rmPeer(peerName);
});

function broadcastMessage() {
  const msg = document.getElementById('message-input').value;
  if (msg) {
    peerConns.broadcast(msgTerm, { msg })
    addMessage(myName, msg);
    document.getElementById('message-input').value = '';
  }
}
peerConns.sent.on(msgTerm, ({ msg }, from) => {
  addMessage(from, msg);
});

function addMessage(from, msg) {
  const dom = document.importNode(messageLineTemplate, true);
  messagesBox.appendChild(dom);
  if (messagesBox.children.length > 10) {
    messagesBox.children[0].remove();
  }
  dom.querySelector('.peer-name').textContent = from === myName ? nickName || myName : peers.get(from).nickName || from;
  dom.querySelector('.message-content').textContent = msg;
}

function setMyNickName() {
  const newNickName = prompt('your new nick name?');
  if (newNickName) {
    nickName = newNickName;
    setNameOnUI(nickName);
    peerConns.broadcast(nickNameTerm, { nickName })
  }
}
peerConns.sent.on(nickNameTerm, ({ nickName }, from) => {
  getDefaultScene().setPeerNickName(from, nickName);
  peers.set(from, { nickName });
});

function setNameOnUI(name) {
  document.title = `[${name}] bazaar web client`;
  document.getElementById('change-nickname').textContent = `${name} | change`;
  getDefaultScene().setMyNickName(name);
}

