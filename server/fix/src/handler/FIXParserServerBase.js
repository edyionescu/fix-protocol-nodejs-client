import { EventEmitter } from 'events';

import * as Messages from './../constants/ConstantsMessage.js';
import * as Fields from './../constants/ConstantsField.js';

export default class FIXParserServerBase extends EventEmitter {
  constructor(eventEmitter, parser, host, port) {
    super();
    this.eventEmitter = eventEmitter;
    this.fixParser = parser;
    this.host = host;
    this.port = port;
    this.server = null;
    this.socket = null;
    this.sender = null;
    this.target = null;
    this.heartBeatInterval = null;
    this.heartBeatIntervalId = null;
    this.createServer();
  }

  processMessage(message) {
    if (message.messageType === Messages.SequenceReset) {
      const newSeqNo = (this.fixParser.getField(Fields.NewSeqNo) || {}).value;
      if (newSeqNo) {
        console.log(`[${Date.now()}] FIXServer new sequence number ${newSeqNo}`);
        this.fixParser.setNextTargetMsgSeqNum(newSeqNo);
      }
    }
    console.log(`[${Date.now()}] FIXServer received message ${message.description}`);
  }
}
