import * as peers from './peers.js'
import * as peerConns from './peerConns.js'

import { getMyNickName, getPeerNickName } from './nickname.js'

const msgTerm = 'message';
const myName = peerConns.getMyName();
let messageLineTemplate, messagesBox

export function init() {
  messageLineTemplate = document.getElementById('message-line-template').content.children[0];
  messagesBox = document.getElementById('messages-box');
  document.getElementById('message-broadcast').onclick = broadcastMessage;
  document.getElementById('message-input').addEventListener('keypress', ({ keyCode }) => {
    if (keyCode === 13) broadcastMessage()
    return true;
  });

  peerConns.sent.on(msgTerm, ({ msg }, from) => {
    addMessage(from, msg);
  });
}

function broadcastMessage() {
  const msg = document.getElementById('message-input').value;
  if (msg) {
    peerConns.broadcast(msgTerm, { msg })
    addMessage(myName, msg);
    document.getElementById('message-input').value = '';
  }
}

function addMessage(from, msg) {
  const dom = document.importNode(messageLineTemplate, true);
  messagesBox.appendChild(dom);
  if (messagesBox.children.length > 10) {
    messagesBox.children[0].remove();
  }
  dom.querySelector('.peer-name').textContent = from === myName ? getMyNickName() : getPeerNickName(from);
  dom.querySelector('.message-content').textContent = msg;
}

