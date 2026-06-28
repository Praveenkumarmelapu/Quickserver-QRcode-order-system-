import { EventEmitter } from 'events';

const globalForSse = global as unknown as { sseEmitter: EventEmitter };

export const sseEmitter = globalForSse.sseEmitter || new EventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForSse.sseEmitter = sseEmitter;
}
export function broadcastLiveEvent(type: string, data: any) {
  sseEmitter.emit('live-update', { type, data });
}
