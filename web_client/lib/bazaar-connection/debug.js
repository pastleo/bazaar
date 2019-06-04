import 'https://unpkg.com/debug@4.1.1/dist/debug.js';

localStorage.debug = '';

export const websocket = debug('bazaar:websocket');

export const connection = debug('bazaar:connection');

export const rtc = debug('bazaar:rtc');
