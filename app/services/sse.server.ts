import { EventEmitter } from "events";

export const emitter = new EventEmitter();

export function sendEvent(message: string) {
  emitter.emit("message", message);
}

setInterval(() => {
  emitter.emit("keep-alive", `${Date.now()}`);
}, 1000 * 60); // 1 minute
