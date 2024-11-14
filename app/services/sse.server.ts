import { EventEmitter } from "events";

export const emitter = new EventEmitter();

export function sendEvent(message: string) {
  emitter.emit("message", message);
}
