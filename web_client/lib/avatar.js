import { getDefaultScene } from './game.js'

import * as peers from './peers.js'
import * as peerConns from './peerConns.js'

const avatarTerm = 'avatar';
const localStorageKey = 'avatar';
const acceptedImageHosts = [
  'i.imgur.com'
];
const myName = peerConns.getMyName();
let avatarParams;

export async function init() {
  document.getElementById('change-avatar').onclick = promptMyAvatar;
  const existingAvatarParams = localStorage.getItem(localStorageKey);
  if (existingAvatarParams) {
    try { await setMyAvatar(JSON.parse(existingAvatarParams)) } catch (e) { console.error(e.message); }
  }

  peerConns.newConnectionReady.do((peerName, viaPeerName) => {
    if (avatarParams) {
      peerConns.getConnection(peerName).send(avatarTerm, { avatarParams });
    }
  });

  peerConns.sent.on(avatarTerm, ({ avatarParams }, from) => {
    validateImageURL(avatarParams.url);
    getDefaultScene().setPeerAvatar(from, avatarParams);
  });
}

const defaultParams = {
  frameWidth: 64,
  frameHeight: 128,
  idle: { start: 0, end: 4},
  run: { start: 5, end: 9},
  jump: { start: 10, end: 14}
};

async function promptMyAvatar() {
  const url = prompt('imgur image URL:', 'https://i.imgur.com/JcehBNb.png');
  if (!url) { return; }
  const paramsPrompted = prompt('Avator params:', JSON.stringify(defaultParams));

  try {
    const newAvatarParams = {
      ...(paramsPrompted ? JSON.parse(paramsPrompted) : defaultParams), url,
    };
    await setMyAvatar(newAvatarParams);
    peerConns.broadcast(avatarTerm, { avatarParams })
    localStorage.setItem(localStorageKey, JSON.stringify(avatarParams));
  } catch (e) {
    alert(e.message);
  }
}

async function setMyAvatar(params) {
  validateImageURL(params.url);
  await getDefaultScene().setMyAvatar(params);
  avatarParams = params;
}

function validateImageURL(url) {
  if (acceptedImageHosts.indexOf((new URL(url)).host) === -1) {
    throw new Error(`${url} not accepted, images from ${acceptedImageHosts.join(', ')} are accepted`);
  }
}
