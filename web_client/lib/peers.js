const peers = {};

export function allNames() {
  return Object.keys(peers);
}

export function all() {
  return {...peers};
}

export function set(name, properties) {
  peers[name] = {
    ...peers[name],
    ...properties
  };
}

export function get(name) {
  return {...peers[name]}
}

export function del(name) {
  delete peers[name];
}


