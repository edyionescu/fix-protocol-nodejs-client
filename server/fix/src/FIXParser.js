import { EventEmitter } from 'events';

import { timestamp } from './util/util.js';
import FIXParserBase from './FIXParserBase.js';
import FIXParserClientSocket from './handler/FIXParserClientSocket.js';
import FIXParserClientWebsocket from './handler/FIXParserClientWebsocket.js';
import Field from './../src/fields/Field.js';
import Message from './message/Message.js';
import * as Messages from './../src/constants/ConstantsMessage.js';
import * as Fields from './../src/constants/ConstantsField.js';
import * as Side from './../src/constants/ConstantsSide.js';
import * as OrderTypes from './../src/constants/ConstantsOrderTypes.js';
import * as AccountTypes from './../src/constants/ConstantsAccountTypes.js';
import * as PositionTypes from './../src/constants/ConstantsPositionTypes.js';
import * as HandlInst from './../src/constants/ConstantsHandlInst.js';
import * as TimeInForce from './../src/constants/ConstantsTimeInForce.js';
import * as EncryptMethod from './../src/constants/ConstantsEncryptMethod.js';
import * as Binance_MessageHandlingTypes from './../src/constants/ConstantsMessageHandlingTypes.js';

const PROTOCOL_TCP = 'tcp';
const PROTOCOL_WEBSOCKET = 'websocket';

export default class FIXParser extends EventEmitter {
  constructor(fixVersion = 'FIX.5.0SP2') {
    super();
    this.fixParserBase = new FIXParserBase();
    this.clientHandler = null;
    this.host = null;
    this.port = null;
    this.sender = null;
    this.target = null;
    this.messageSequence = 1;
    this.heartBeatInterval = null;
    this.heartBeatIntervalId = null;
    this.fixVersion = fixVersion;
  }

  connect({
    host = 'localhost',
    port = '9878',
    protocol = PROTOCOL_TCP,
    sender = 'SENDER',
    target = 'TARGET',
    heartbeatIntervalMs = 30000,
    fixVersion = this.fixVersion,
  } = {}) {
    switch (protocol) {
      case PROTOCOL_TCP:
        this.clientHandler = new FIXParserClientSocket(this, this);
        break;
      case PROTOCOL_WEBSOCKET:
        this.clientHandler = new FIXParserClientWebsocket(this, this);
        break;
      default:
        console.error('FIXParser: could not connect, no protocol specified');
    }
    this.clientHandler.host = host;
    this.clientHandler.port = port;
    this.clientHandler.sender = sender;
    this.clientHandler.target = target;
    this.clientHandler.heartBeatInterval = heartbeatIntervalMs;
    this.clientHandler.fixVersion = fixVersion;
    this.clientHandler.connect();
  }

  getNextTargetMsgSeqNum() {
    return this.messageSequence;
  }

  setNextTargetMsgSeqNum(nextMsgSeqNum) {
    this.messageSequence = nextMsgSeqNum;
    return this.messageSequence;
  }

  getTimestamp(dateObject = new Date()) {
    return timestamp(dateObject);
  }

  createMessage(...fields) {
    return new Message(this.fixVersion, ...fields);
  }

  parse(data) {
    return this.fixParserBase.parse(data);
  }

  send(message) {
    this.clientHandler.send(message);
  }
}

export { Field };
export { Fields };
export { Message };
export { Messages };
export { Side };
export { OrderTypes };
export { AccountTypes };
export { PositionTypes };
export { HandlInst };
export { TimeInForce };
export { EncryptMethod };
export { Binance_MessageHandlingTypes };

/**
 * Export global to the window object.
 */
global.FIXParser = FIXParser;
