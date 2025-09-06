const WebSocket = require('ws');

// Simple Chaturbate tip listener.
// This is a placeholder implementation using the public tip JSON API.
// Chaturbate doesn't provide an official public websocket; this example
// assumes a websocket endpoint that pushes tip events in the form
// {"type":"tip","amount":<number>}.
// The details may need adjustment according to actual API behaviour.

function connectChaturbate(room, onTip) {
  if(!room) throw new Error('Room name required');
  const url = `wss://events2-mc.chaturbate.com/${room}`;
  const ws = new WebSocket(url);

  ws.on('open', () => console.log(`[Chaturbate] connected to ${room}`));
  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg.toString());
      if(data && data.type === 'tip') {
        onTip(Number(data.amount) || 0);
      }
    } catch(e) {
      console.warn('[Chaturbate] parse error', e);
    }
  });
  ws.on('close', () => console.log('[Chaturbate] connection closed'));
  ws.on('error', err => console.error('[Chaturbate] error', err));
  return ws;
}

module.exports = { connectChaturbate };
