import { createServer } from 'net';

import FIXParserServerBase from './FIXParserServerBase.js';
import FrameDecoder from '../util/FrameDecoder.js';
import Message from '../message/Message.js';

export default class FIXParserServerSocket extends FIXParserServerBase {
  createServer() {
    this.server = createServer((socket) => {
      this.socket = socket;
      this.socket.pipe(new FrameDecoder()).on('data', (data) => {
        const message = this.fixParser.parse(data.toString())[0];
        this.processMessage(message);
        this.eventEmitter.emit('message', message);
      });

      this.socket.on('open', () => {
        this.eventEmitter.emit('open');
      });

      this.socket.on('close', () => {
        this.eventEmitter.emit('close');
      });
    });

    this.server.listen(this.port, this.host);
  }

  send(message) {
    if (this.socket.readyState === 'open') {
      if (message instanceof Message) {
        this.fixParser.setNextTargetMsgSeqNum(this.fixParser.getNextTargetMsgSeqNum() + 1);
        this.socket.write(message.encode());
      } else {
        console.error(`[${Date.now()}] FIXParserServerSocket: could not send message: message of wrong type`);
      }
    } else {
      console.error(`[${Date.now()}] FIXParserServerSocket: could not send message, socket not open`);
    }
  }
}
