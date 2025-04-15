import { Socket } from 'net';

import FIXParserClientBase from './FIXParserClientBase.js';
import FrameDecoder from '../util/FrameDecoder.js';
import Message from '../message/Message.js';

export default class FIXParserClientSocket extends FIXParserClientBase {
  connect() {
    this.socket = new Socket();
    this.socket.setEncoding('ascii');
    this.socket.pipe(new FrameDecoder()).on('data', (data) => {
      const messages = this.fixParser.parse(data.toString());
      let i = 0;
      for (i; i < messages.length; i++) {
        this.processMessage(messages[i]);
        this.eventEmitter.emit('message', messages[i]);
      }
    });

    this.socket.on('close', () => {
      this.eventEmitter.emit('close');
      this.stopHeartbeat();
    });

    this.socket.on('error', (error) => {
      this.eventEmitter.emit('error', error);
      this.stopHeartbeat();
    });

    this.socket.on('timeout', () => {
      this.eventEmitter.emit('timeout');
      this.socket.end();
      this.stopHeartbeat();
    });

    this.socket.connect(this.port, this.host, () => {
      console.log('Connected', this.socket.readyState);
      if (this.socket.readyState === 'open') {
        this.eventEmitter.emit('open');
        this.startHeartbeat();
      }
    });
  }

  close() {
    this.socket.close();
  }

  send(message) {
    if (this.socket.readyState === 'open') {
      if (message instanceof Message) {
        this.fixParser.setNextTargetMsgSeqNum(this.fixParser.getNextTargetMsgSeqNum() + 1);
        this.socket.write(message.encode());
      } else {
        console.error('FIXParserClientSocket: could not send message, message of wrong type');
      }
    } else {
      console.error('FIXParserClientSocket: could not send message, socket not open', message);
    }
  }
}
