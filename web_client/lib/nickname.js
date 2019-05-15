import { getDefaultScene } from './game.js'

import * as peers from './peers.js'
import * as peerConns from './peerConns.js'

const nickNameTerm = 'nickname';
const localStorageKey = 'nickname';
const myName = peerConns.getMyName();
let nickName;

export function init() {
  document.getElementById('change-nickname').onclick = promptMyNickName;
  nickName = localStorage.getItem(localStorageKey);
  setNameOnUI(getMyNickName());

  peerConns.newConnectionReady.do((peerName, viaPeerName) => {
    if (nickName) {
      peerConns.getConnection(peerName).send(nickNameTerm, { nickName });
    }
  });

  peerConns.sent.on(nickNameTerm, ({ nickName }, from) => {
    getDefaultScene().setPeerNickName(from, nickName);
    peers.set(from, { nickName });
  });
}

export function getMyNickName() {
  return nickName || myName;
}
export function getPeerNickName(name) {
  return peers.get(name).nickName || name
}

export function promptMyNickName() {
  const newNickName = prompt('your new nick name?');
  if (newNickName) {
    localStorage.setItem(localStorageKey, newNickName);
    nickName = newNickName;
    setNameOnUI(nickName);
    peerConns.broadcast(nickNameTerm, { nickName })
  }
}

function setNameOnUI(name) {
  document.title = `[${name}] bazaar web client`;
  document.getElementById('change-nickname').textContent = `${name} | change`;
  getDefaultScene().setMyNickName(name);
}

