const peers = {};

export function allIds() {
  return Object.keys(peers);
}

export function all() {
  return {...peers};
}

export function set(id, properties) {
  peers[id] = {
    ...peers[id],
    ...properties
  };
}

export function get(id) {
  return {...peers[id]}
}

export function del(id) {
  delete peers[id];
}


