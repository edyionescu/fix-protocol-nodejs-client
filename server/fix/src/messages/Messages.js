import { MESSAGES } from './../../spec/SpecMessages.js';
import { MessageContents } from './../messagecontents/MessageContents.js';

export class Messages {
  constructor() {
    this.messages = MESSAGES;
    this.messageContents = new MessageContents();
    this.cacheMap = new Map();
    this.messages.forEach((message) => {
      this.cacheMap.set(message.MsgType, message);
    });
  }

  processMessage(message, field) {
    const messageType = this.cacheMap.get(field.value);
    if (messageType) {
      message.setDescription(messageType.Name);
      message.setMessageType(messageType.MsgType);
      this.messageContents.processMessageContents(message, messageType.ComponentID);
    }
  }
}
