import log from 'log-to-file';
import fs from 'fs';
import crypto from 'crypto';
import { rotator } from '../lib/logrotator.js';

import FIXParser, {
  Field,
  Fields,
  Messages,
  Side,
  OrderTypes,
  AccountTypes,
  PositionTypes,
  HandlInst,
  TimeInForce,
  EncryptMethod,
  Binance_MessageHandlingTypes,
} from './src/FIXParser.js';

const fixVersion = 'FIX.4.4';
const fixParser = new FIXParser(fixVersion);

const LOG_TO_FILE = true;
const LOG_FILE = './logs/fix.log';

rotator.register(LOG_FILE, {
  schedule: '5m',
  size: '10m',
  compress: true,
  format() {
    return new Date().toISOString().replace(/T|:/g, '-').replace(/\..+/, ''); // yyyy-MM-dd-HH-mm-ss
  },
});

export const LOG_TO_CONSOLE = true;

export const logToFile = (msg) => LOG_TO_FILE && log(msg, LOG_FILE);

export const clearLogFile = () => LOG_TO_FILE && fs.writeFileSync(LOG_FILE, '');

export const formatMessage = (str) => {
  return str.replace(/\x01/g, '|');
};

function buildBinanceRawData(LogonMsg, sender, target, msgSeqNum, sendingTime) {
  let rawData = '';

  // Load the Ed25519 private key
  const { BINANCE_PRIVATE_KEY } = process.env;

  if (!BINANCE_PRIVATE_KEY) {
    return rawData;
  }

  const privateKey = {
    key: BINANCE_PRIVATE_KEY,
    format: 'pem',
    type: 'pkcs8',
  };

  const signaturePayload = [LogonMsg, sender, target, msgSeqNum, sendingTime].join('\x01');
  // Sign the payload with the Ed25519 private key
  const signature = crypto.sign(null, Buffer.from(signaturePayload, 'ascii'), privateKey);
  rawData = signature.toString('base64');

  return rawData;
}

export const createLogonData = ({ sender, target, reset = 'Y', user, pass, heartbeat, title }) => {
  const msgSeqNum = 1;
  const sendingTime = fixParser.getTimestamp();
  const binanceRawData = buildBinanceRawData(Messages.Logon, sender, target, msgSeqNum, sendingTime);

  const logon = fixParser.createMessage(
    new Field(Fields.MsgType, Messages.Logon),
    new Field(Fields.MsgSeqNum, msgSeqNum),
    new Field(Fields.SenderCompID, sender),
    new Field(Fields.SendingTime, sendingTime),
    new Field(Fields.TargetCompID, target),
    ...(user.length ? [new Field(Fields.Username, user)] : []),
    ...(pass.length ? [new Field(Fields.Password, pass)] : []),
    ...(binanceRawData.length
      ? [
          new Field(Fields.RawDataLength, binanceRawData.length),
          new Field(Fields.RawData, binanceRawData),
          new Field(Fields.Binance_MessageHandling, Binance_MessageHandlingTypes.Sequential),
        ]
      : []),
    new Field(Fields.EncryptMethod, EncryptMethod.None),
    new Field(Fields.HeartBtInt, heartbeat),
    new Field(Fields.ResetSeqNumFlag, reset)
  );

  const result = { payload: logon.encode() };

  LOG_TO_CONSOLE &&
    console.log('\x1b[32m%s\x1b[0m', `[${title}] ↑ Sent Logon \n` + formatMessage(logon.encode()));
  logToFile(JSON.stringify({ title, type: 'logon_sent', message: formatMessage(logon.encode()) }));

  return result;
};

export const createLogoutData = ({ sender, target, title }, MsgSeqNum) => {
  const logout = fixParser.createMessage(
    new Field(Fields.MsgType, Messages.Logout),
    new Field(Fields.MsgSeqNum, MsgSeqNum),
    new Field(Fields.SenderCompID, sender),
    new Field(Fields.SendingTime, fixParser.getTimestamp()),
    new Field(Fields.TargetCompID, target)
  );

  const result = { payload: logout.encode() };

  LOG_TO_CONSOLE &&
    console.log('\x1b[32m%s\x1b[0m', `[${title}] ↑ Sent Logout \n` + formatMessage(logout.encode()));
  logToFile(JSON.stringify({ title, type: 'logout_sent', message: formatMessage(logout.encode()) }));

  return result;
};

export const createCollateralInquiryData = (json, MsgSeqNum) => {
  const {
    sender,
    target,
    title,
    payload: { collInquiryID, noPartyIDs, partyIDs },
  } = json;

  const collateralInquiry = fixParser.createMessage(
    new Field(Fields.MsgType, Messages.CollateralInquiry),
    new Field(Fields.MsgSeqNum, MsgSeqNum),
    new Field(Fields.SenderCompID, sender),
    new Field(Fields.SendingTime, fixParser.getTimestamp()),
    new Field(Fields.TargetCompID, target),
    new Field(Fields.NoPartyIDs, noPartyIDs),
    ...partyIDs.map((partyID) => new Field(Fields.PartyID, partyID)),
    new Field(Fields.CollInquiryID, collInquiryID)
  );

  const result = { ...json, payload: collateralInquiry.encode() };

  LOG_TO_CONSOLE &&
    console.log(
      '\x1b[32m%s\x1b[0m',
      `\n[${title}] ↑ Sent Collateral Inquiry \n` + formatMessage(collateralInquiry.encode())
    );
  logToFile(
    JSON.stringify({
      title,
      type: 'collateralinquiry_sent',
      message: formatMessage(collateralInquiry.encode()),
    })
  );

  return result;
};

export const createRequestForPositionsData = (json, MsgSeqNum) => {
  const {
    sender,
    target,
    title,
    payload: { posReqID, posReqType, account, accountType, noPartyIDs, partyIDs, clearingBusinessDate },
  } = json;

  const requestForPositions = fixParser.createMessage(
    new Field(Fields.MsgType, Messages.RequestForPositions),
    new Field(Fields.MsgSeqNum, MsgSeqNum),
    new Field(Fields.SenderCompID, sender),
    new Field(Fields.SendingTime, fixParser.getTimestamp()),
    new Field(Fields.TargetCompID, target),
    new Field(Fields.Account, account),
    new Field(Fields.TransactTime, fixParser.getTimestamp()),
    new Field(Fields.AccountType, AccountTypes[accountType]),
    new Field(Fields.PosReqID, posReqID),
    new Field(Fields.ClearingBusinessDate, clearingBusinessDate),
    new Field(Fields.NoPartyIDs, noPartyIDs),
    ...partyIDs.map((partyID) => new Field(Fields.PartyID, partyID)),
    new Field(Fields.PosReqType, PositionTypes[posReqType])
  );

  const result = { ...json, payload: requestForPositions.encode() };

  LOG_TO_CONSOLE &&
    console.log(
      '\x1b[32m%s\x1b[0m',
      `\n[${title}] ↑ Sent Request For Positions \n` + formatMessage(requestForPositions.encode())
    );
  logToFile(
    JSON.stringify({
      title,
      type: 'requestforpositions_sent',
      message: formatMessage(requestForPositions.encode()),
    })
  );

  return result;
};

export const createNewOrderSingleData = (json, MsgSeqNum) => {
  const {
    sender,
    target,
    title,
    payload: { clOrdID, orderQty, ordType, side, price, symbol, timeInForce },
  } = json;

  const order = fixParser.createMessage(
    new Field(Fields.MsgType, Messages.NewOrderSingle),
    new Field(Fields.MsgSeqNum, MsgSeqNum),
    new Field(Fields.SenderCompID, sender),
    new Field(Fields.SendingTime, fixParser.getTimestamp()),
    new Field(Fields.TargetCompID, target),
    new Field(Fields.ClOrdID, clOrdID),
    new Field(Fields.OrderQty, orderQty),
    new Field(Fields.OrdType, OrderTypes[ordType]),
    new Field(Fields.Side, Side[side]),
    ...(!process.env.BINANCE_PRIVATE_KEY
      ? [
          new Field(Fields.HandlInst, HandlInst.AutomatedExecutionNoIntervention),
          new Field(Fields.TransactTime, fixParser.getTimestamp()),
        ]
      : []),
    ...(ordType == 'Limit'
      ? [new Field(Fields.Price, price), new Field(Fields.TimeInForce, TimeInForce[timeInForce])]
      : []),
    new Field(Fields.Symbol, symbol)
  );

  const result = { ...json, payload: order.encode() };

  LOG_TO_CONSOLE &&
    console.log('\x1b[32m%s\x1b[0m', `\n[${title}] ↑ Sent Order \n` + formatMessage(order.encode()));
  logToFile(JSON.stringify({ title, type: 'order_sent', message: formatMessage(order.encode()) }));

  return result;
};

export const createOrderCancelRequestData = (json, MsgSeqNum) => {
  const {
    sender,
    target,
    title,
    payload: { clOrdID, origClOrdID, orderID, symbol },
  } = json;

  const orderCancelRequest = fixParser.createMessage(
    new Field(Fields.MsgType, Messages.OrderCancelRequest),
    new Field(Fields.MsgSeqNum, MsgSeqNum),
    new Field(Fields.SenderCompID, sender),
    new Field(Fields.SendingTime, fixParser.getTimestamp()),
    new Field(Fields.TargetCompID, target),
    new Field(Fields.ClOrdID, clOrdID),
    new Field(Fields.OrigClOrdID, origClOrdID),
    new Field(Fields.Symbol, symbol)
  );

  const result = { ...json, payload: orderCancelRequest.encode() };

  LOG_TO_CONSOLE &&
    console.log(
      '\x1b[32m%s\x1b[0m',
      `\n[${title}] ↑ Sent Order Cancel Request \n` + formatMessage(orderCancelRequest.encode())
    );
  logToFile(
    JSON.stringify({
      title,
      type: 'order_cancel_request_sent',
      message: formatMessage(orderCancelRequest.encode()),
    })
  );

  return result;
};

export const createMarketDataRequestData = (json, MsgSeqNum) => {
  const {
    sender,
    target,
    title,
    payload: {
      MDReqID,
      SubscriptionRequestType,
      MarketDepth,
      MDUpdateType,
      NoMDEntryTypes,
      MDEntryTypes,
      NoRelatedSym,
      Symbols,
    },
  } = json;

  const marketdatarequest = fixParser.createMessage(
    new Field(Fields.MsgType, Messages.MarketDataRequest),
    new Field(Fields.MsgSeqNum, MsgSeqNum),
    new Field(Fields.SenderCompID, sender),
    new Field(Fields.SendingTime, fixParser.getTimestamp()),
    new Field(Fields.TargetCompID, target),
    new Field(Fields.MDReqID, MDReqID),
    new Field(Fields.SubscriptionRequestType, SubscriptionRequestType),
    new Field(Fields.MarketDepth, MarketDepth),
    ...(!process.env.BINANCE_PRIVATE_KEY ? [new Field(Fields.MDUpdateType, MDUpdateType)] : []),
    new Field(Fields.NoMDEntryTypes, NoMDEntryTypes),
    ...MDEntryTypes.map((MDEntryType) => new Field(Fields.MDEntryType, MDEntryType)),
    new Field(Fields.NoRelatedSym, NoRelatedSym),
    ...Symbols.map((symbol) => new Field(Fields.Symbol, symbol))
  );

  const result = { ...json, payload: marketdatarequest.encode() };

  LOG_TO_CONSOLE &&
    console.log(
      '\x1b[32m%s\x1b[0m',
      `\n[${title}] ↑ Sent MarketDataRequest \n` + formatMessage(marketdatarequest.encode())
    );
  logToFile(
    JSON.stringify({
      title,
      type: 'marketdatarequest_sent',
      message: formatMessage(marketdatarequest.encode()),
    })
  );

  return result;
};

export const createHeartbeatData = ({ sender, target, title }, MsgSeqNum, TestReqID = null) => {
  const heartbeat = fixParser.createMessage.apply(
    fixParser,
    TestReqID !== null
      ? [
          new Field(Fields.MsgType, Messages.Heartbeat),
          new Field(Fields.SenderCompID, sender),
          new Field(Fields.SendingTime, fixParser.getTimestamp()),
          new Field(Fields.TargetCompID, target),
          new Field(Fields.MsgSeqNum, MsgSeqNum),
          new Field(Fields.TestReqID, TestReqID),
        ]
      : [
          new Field(Fields.MsgType, Messages.Heartbeat),
          new Field(Fields.SenderCompID, sender),
          new Field(Fields.SendingTime, fixParser.getTimestamp()),
          new Field(Fields.TargetCompID, target),
          new Field(Fields.MsgSeqNum, MsgSeqNum),
        ]
  );

  const result = {
    type: 'data',
    payload: heartbeat.encode(),
  };

  LOG_TO_CONSOLE &&
    console.log('\x1b[32m%s\x1b[0m', `[${title}] ↑ Sent Heartbeat \n` + formatMessage(heartbeat.encode()));
  logToFile(JSON.stringify({ title, type: 'heartbeat_sent', message: formatMessage(heartbeat.encode()) }));

  return result;
};

export const buildWsMessage = (serverMessage, title) => {
  const parsedServerMessage = fixParser.parse(serverMessage)[0];
  const { description, messageType, string } = parsedServerMessage;

  logReceivedServerMessage(title, description, string);

  let action = description.toLowerCase();

  let payload = {
    action,
    success: true,
  };

  if (action === 'logon' || action === 'logout') {
    payload = { ...payload, route: title.toLowerCase() };
  }

  let TestReqID = null;
  let processResult = {};

  switch (messageType) {
    case Messages.CollateralInquiryAck:
      (processResult = processCollateralInquiryAck(parsedServerMessage)),
        console.log({ CollateralInquiryAck: processResult });
      break;

    case Messages.TestRequest:
      (processResult = processTestRequest(parsedServerMessage)),
        (TestReqID = processResult.testReqID),
        console.log({ TestRequest: processResult });
      break;

    case Messages.CollateralReport:
      (processResult = processCollateralReport(parsedServerMessage)),
        console.log({ CollateralReport: processResult });
      break;

    case Messages.RequestForPositionsAck:
      (processResult = processRequestForPositionsAck(parsedServerMessage)),
        console.log({ RequestForPositionsAck: processResult });
      break;

    case Messages.PositionReport:
      (processResult = processPositionReport(parsedServerMessage)),
        console.log({ PositionReport: processResult });
      break;

    case Messages.ExecutionReport:
      (processResult = processExecutionReport(parsedServerMessage)),
        console.log({ ExecutionReport: processResult });
      break;

    case Messages.OrderCancelReject:
      (processResult = processOrderCancelReject(parsedServerMessage)),
        console.log({ OrderCancelReject: processResult });
      break;

    case Messages.MarketDataSnapshotFullRefresh:
    case Messages.MarketDataIncrementalRefresh:
      processResult = processMarket(parsedServerMessage);
      break;

    case Messages.Reject:
    case Messages.MarketDataRequestReject:
      (processResult = processReject(parsedServerMessage)), console.log({ Reject: processResult });
      break;

    default:
      break;
  }

  return {
    payload: JSON.stringify({ ...payload, ...processResult }),
    sendHeartbeat: messageType == Messages.TestRequest,
    TestReqID,
  };
};

const processTestRequest = (parsedServerMessage) => {
  const testReqID = getValue(parsedServerMessage.getField(Fields.TestReqID), 'value');

  return {
    testReqID,
  };
};

const processReject = (parsedServerMessage) => {
  const text = getValue(parsedServerMessage.getField(Fields.Text), 'value');
  const sessionRejectReasonField = parsedServerMessage.getField(Fields.SessionRejectReason);
  let sessionRejectReason = '';
  if (sessionRejectReasonField) {
    sessionRejectReason = getValue(
      parsedServerMessage.getEnum(sessionRejectReasonField.tag, sessionRejectReasonField.value),
      'Description'
    );
  }

  return {
    text,
    sessionRejectReason,
  };
};

const processPositionReport = (parsedServerMessage) => {
  const posMaintRptID = getValue(parsedServerMessage.getField(Fields.PosMaintRptID), 'value');
  const posReqID = getValue(parsedServerMessage.getField(Fields.PosReqID), 'value');

  const posReqResultField = parsedServerMessage.getField(Fields.PosReqResult);
  let posReqResult = '';
  if (posReqResultField) {
    posReqResult = getValue(
      parsedServerMessage.getEnum(posReqResultField.tag, posReqResultField.value),
      'Description'
    );
  }

  const clearingBusinessDate = getValue(parsedServerMessage.getField(Fields.ClearingBusinessDate), 'value');

  const noPartyIDs = getValue(parsedServerMessage.getField(Fields.NoPartyIDs), 'value');
  const partyIDs = getValues(parsedServerMessage.getFields(Fields.PartyID), 'value');
  let partyIDArr = [];
  for (let i = 0; i < noPartyIDs; i++) {
    partyIDArr.push({
      partyID: partyIDs[i],
    });
  }

  const symbol = getValue(parsedServerMessage.getField(Fields.Symbol), 'value');

  const noPositions = getValue(parsedServerMessage.getField(Fields.NoPositions), 'value');
  const posTypes = getValues(parsedServerMessage.getFields(Fields.PosType), 'enumeration', 'description');
  const posLongQtyEntries = getValues(parsedServerMessage.getFields(Fields.LongQty), 'value');
  const posShortQtyEntries = getValues(parsedServerMessage.getFields(Fields.ShortQty), 'value');
  let positionQtyType = [];
  for (let i = 0; i < noPositions; i++) {
    positionQtyType.push({
      posType: posTypes[i],
      longQty: posLongQtyEntries[i],
      shortQty: posShortQtyEntries[i],
    });
  }

  const account = getValue(parsedServerMessage.getField(Fields.Account), 'value');
  const accountTypeField = parsedServerMessage.getField(Fields.AccountType);
  let accountType = '';
  if (accountTypeField) {
    accountType = getValue(
      parsedServerMessage.getEnum(accountTypeField.tag, accountTypeField.value),
      'Description'
    );
  }

  const settlPrice = getValue(parsedServerMessage.getField(Fields.SettlPrice), 'value');
  const settlPriceTypeField = parsedServerMessage.getField(Fields.SettlPriceType);
  let settlPriceType = '';
  if (settlPriceTypeField) {
    settlPriceType = getValue(
      parsedServerMessage.getEnum(settlPriceTypeField.tag, settlPriceTypeField.value),
      'Description'
    );
  }

  const priorSettlPrice = getValue(parsedServerMessage.getField(Fields.PriorSettlPrice), 'value');

  const noPosAmt = getValue(parsedServerMessage.getField(Fields.NoPosAmt), 'value');
  const posAmtTypes = getValues(
    parsedServerMessage.getFields(Fields.PosAmtType),
    'enumeration',
    'description'
  );
  let posAmtType = [];

  const posAmtEntries = getValues(parsedServerMessage.getFields(Fields.PosAmt), 'value');
  let posAmt = [];

  for (let i = 0; i < noPosAmt; i++) {
    posAmtType.push({
      posAmtType: posAmtTypes[i],
    });
    posAmt.push({
      posAmt: posAmtEntries[i],
    });
  }

  const ozUsedMargin = getValue(parsedServerMessage.getField(Fields.OZUsedMargin), 'value');
  const ozUnrealizedProfitOrLoss = getValue(
    parsedServerMessage.getField(Fields.OZUnrealizedProfitOrLoss),
    'value'
  );
  const ozAccountCurrency = getValue(parsedServerMessage.getField(Fields.OZAccountCurrency), 'value');

  return {
    posMaintRptID,
    posReqID,
    posReqResult,
    clearingBusinessDate,
    noPartyIDs,
    partyIDArr,
    symbol,
    noPositions,
    positionQtyType,
    ozUsedMargin,
    ozUnrealizedProfitOrLoss,
    ozAccountCurrency,
    account,
    accountType,
    settlPrice,
    settlPriceType,
    priorSettlPrice,
    noPosAmt,
    posAmtType,
    posAmt,
  };
};

const processCollateralInquiryAck = (parsedServerMessage) => {
  const collInquiryID = getValue(parsedServerMessage.getField(Fields.CollInquiryID), 'value');
  const totNumReports = getValue(parsedServerMessage.getField(Fields.TotNumReports), 'value');

  const collInquiryStatusField = parsedServerMessage.getField(Fields.CollInquiryStatus);
  let collInquiryStatus = '';
  if (collInquiryStatusField) {
    collInquiryStatus = getValue(
      parsedServerMessage.getEnum(collInquiryStatusField.tag, collInquiryStatusField.value),
      'Description'
    );
  }

  const collInquiryResultField = parsedServerMessage.getField(Fields.CollInquiryResult);
  let collInquiryResult = '';
  if (collInquiryResultField) {
    collInquiryResult = getValue(
      parsedServerMessage.getEnum(collInquiryResultField.tag, collInquiryResultField.value),
      'Description'
    );
  }

  const text = getValue(parsedServerMessage.getField(Fields.Text), 'value');

  return {
    collInquiryID,
    totNumReports,
    collInquiryResult,
    collInquiryStatus,
    text,
  };
};

const processCollateralReport = (parsedServerMessage) => {
  const collRptID = getValue(parsedServerMessage.getField(Fields.CollRptID), 'value');
  const collInquiryID = getValue(parsedServerMessage.getField(Fields.CollInquiryID), 'value');

  const collStatusField = parsedServerMessage.getField(Fields.CollStatus);
  let collStatus = '';
  if (collStatusField) {
    collStatus = getValue(
      parsedServerMessage.getEnum(collStatusField.tag, collStatusField.value),
      'Description'
    );
  }

  const noPartyIDs = getValue(parsedServerMessage.getField(Fields.NoPartyIDs), 'value');
  const partyIDs = getValues(parsedServerMessage.getFields(Fields.PartyID), 'value');
  let partyIDArr = [];
  for (let i = 0; i < noPartyIDs; i++) {
    partyIDArr.push({
      partyID: partyIDs[i],
    });
  }

  const currency = getValue(parsedServerMessage.getField(Fields.Currency), 'value');
  const quantity = getValue(parsedServerMessage.getField(Fields.Quantity), 'value');

  const ozAccountCurrency = getValue(parsedServerMessage.getField(Fields.OZAccountCurrency), 'value');
  const ozAccountBalance = getValue(parsedServerMessage.getField(Fields.OZAccountBalance), 'value');
  const ozMarginUtilizationPercentage = getValue(
    parsedServerMessage.getField(Fields.OZMarginUtilizationPercentage),
    'value'
  );
  const ozUsedMargin = getValue(parsedServerMessage.getField(Fields.OZUsedMargin), 'value');
  const ozFreeMargin = getValue(parsedServerMessage.getField(Fields.OZFreeMargin), 'value');
  const ozUnrealizedProfitOrLoss = getValue(
    parsedServerMessage.getField(Fields.OZUnrealizedProfitOrLoss),
    'value'
  );
  const ozEquity = getValue(parsedServerMessage.getField(Fields.OZEquity), 'value');
  const ozAccountCredit = getValue(parsedServerMessage.getField(Fields.OZAccountCredit), 'value');

  return {
    collRptID,
    collInquiryID,
    collStatus,
    partyIDArr,
    currency,
    quantity,
    ozAccountCurrency,
    ozAccountBalance,
    ozMarginUtilizationPercentage,
    ozUsedMargin,
    ozFreeMargin,
    ozUnrealizedProfitOrLoss,
    ozEquity,
    ozAccountCredit,
  };
};

const processRequestForPositionsAck = (parsedServerMessage) => {
  const posMaintRptID = getValue(parsedServerMessage.getField(Fields.PosMaintRptID), 'value');
  const posReqID = getValue(parsedServerMessage.getField(Fields.PosReqID), 'value');
  const totalNumPosReports = getValue(parsedServerMessage.getField(Fields.TotalNumPosReports), 'value');

  const posReqResultField = parsedServerMessage.getField(Fields.PosReqResult);
  let posReqResult = '';
  if (posReqResultField) {
    posReqResult = getValue(
      parsedServerMessage.getEnum(posReqResultField.tag, posReqResultField.value),
      'Description'
    );
  }

  const posReqStatusField = parsedServerMessage.getField(Fields.PosReqStatus);
  let posReqStatus = '';
  if (posReqStatusField) {
    posReqStatus = getValue(
      parsedServerMessage.getEnum(posReqStatusField.tag, posReqStatusField.value),
      'Description'
    );
  }

  const account = getValue(parsedServerMessage.getField(Fields.Account), 'value');

  const accountTypeField = parsedServerMessage.getField(Fields.AccountType);
  let accountType = '';
  if (accountTypeField) {
    accountType = getValue(
      parsedServerMessage.getEnum(accountTypeField.tag, accountTypeField.value),
      'Description'
    );
  }

  const text = getValue(parsedServerMessage.getField(Fields.Text), 'value');

  return {
    posMaintRptID,
    posReqID,
    totalNumPosReports,
    posReqResult,
    posReqStatus,
    account,
    accountType,
    text,
  };
};

const processMarket = (parsedServerMessage) => {
  const symbol = getValue(parsedServerMessage.getField(Fields.Symbol), 'value');
  const MDReqID = getValue(parsedServerMessage.getField(Fields.MDReqID), 'value');
  const NoMDEntries = getValue(parsedServerMessage.getField(Fields.NoMDEntries), 'value');

  const MDEntryTypeValues = getValues(parsedServerMessage.getFields(Fields.MDEntryType), 'value');
  const MDEntryTypes = getValues(
    parsedServerMessage.getFields(Fields.MDEntryType),
    'enumeration',
    'description'
  );

  const MDEntryPx = getValues(parsedServerMessage.getFields(Fields.MDEntryPx), 'value');
  const MDEntrySizes = getValues(parsedServerMessage.getFields(Fields.MDEntrySize), 'value');

  const QuoteConditionValues = getValues(parsedServerMessage.getFields(Fields.QuoteCondition), 'value');
  const QuoteConditions = getValues(
    parsedServerMessage.getFields(Fields.QuoteCondition),
    'enumeration',
    'description'
  );

  const MDEntryOriginators = getValues(parsedServerMessage.getFields(Fields.MDEntryOriginator), 'value');
  const QuoteEntryIDs = getValues(parsedServerMessage.getFields(Fields.QuoteEntryID), 'value');

  let marketData = [];

  for (let i = 0; i < NoMDEntries; i++) {
    marketData.push({
      type: MDEntryTypes[i],
      value: MDEntryTypeValues[i],
      price: MDEntryPx[i],
      volume: MDEntrySizes[i],
      condition: {
        type: QuoteConditions[i],
        value: QuoteConditionValues[i],
      },
      originator: MDEntryOriginators[i],
      quoteID: new Date().getTime() + i,
    });
  }

  return {
    symbol,
    MDReqID,
    NoMDEntries,
    marketData,
  };
};

const processOrderCancelReject = (parsedServerMessage) => {
  const orderID = getValue(parsedServerMessage.getField(Fields.OrderID), 'value');
  const clOrdID = getValue(parsedServerMessage.getField(Fields.ClOrdID), 'value');
  const origClOrdID = getValue(parsedServerMessage.getField(Fields.OrigClOrdID), 'value');

  const ordStatusField = parsedServerMessage.getField(Fields.OrdStatus);
  let ordStatus = '';
  if (ordStatusField) {
    ordStatus = getValue(
      parsedServerMessage.getEnum(ordStatusField.tag, ordStatusField.value),
      'Description'
    );
  }

  const cxlRejReasonField = parsedServerMessage.getField(Fields.CxlRejReason);
  let cxlRejReason = '';
  if (cxlRejReasonField) {
    cxlRejReason = getValue(
      parsedServerMessage.getEnum(cxlRejReasonField.tag, cxlRejReasonField.value),
      'Description'
    );
  }

  const cxlRejResponseToField = parsedServerMessage.getField(Fields.CxlRejResponseTo);
  let cxlRejResponseTo = '';
  if (cxlRejResponseToField) {
    cxlRejResponseTo = getValue(
      parsedServerMessage.getEnum(cxlRejResponseToField.tag, cxlRejResponseToField.value),
      'Description'
    );
  }

  const text = getValue(parsedServerMessage.getField(Fields.Text), 'value');

  return {
    orderID,
    clOrdID,
    origClOrdID,
    ordStatus,
    cxlRejReason,
    cxlRejResponseTo,
    text,
  };
};

const processExecutionReport = (parsedServerMessage) => {
  const orderID = getValue(parsedServerMessage.getField(Fields.OrderID), 'value');
  const clOrdID = getValue(parsedServerMessage.getField(Fields.ClOrdID), 'value');
  const origClOrdID = getValue(parsedServerMessage.getField(Fields.OrigClOrdID), 'value');
  const execID = getValue(parsedServerMessage.getField(Fields.ExecID), 'value');

  const execTypeCode = getValue(parsedServerMessage.getField(Fields.ExecType), 'value');
  const execTypeField = parsedServerMessage.getField(Fields.ExecType);
  let execType = '';
  if (execTypeField) {
    execType = getValue(parsedServerMessage.getEnum(execTypeField.tag, execTypeField.value), 'Description');
  }

  const ordStatusCode = getValue(parsedServerMessage.getField(Fields.OrdStatus), 'value');
  const ordStatusField = parsedServerMessage.getField(Fields.OrdStatus);
  let ordStatus = '';
  if (ordStatusField) {
    ordStatus = getValue(
      parsedServerMessage.getEnum(ordStatusField.tag, ordStatusField.value),
      'Description'
    );
  }

  const ordRejReasonField = parsedServerMessage.getField(Fields.OrdRejReason);
  let ordRejReason = '';
  if (ordRejReasonField) {
    ordRejReason = getValue(
      parsedServerMessage.getEnum(ordRejReasonField.tag, ordRejReasonField.value),
      'Description'
    );
  }

  const timeInForceCode = getValue(parsedServerMessage.getField(Fields.TimeInForce), 'value');
  const timeInForceField = parsedServerMessage.getField(Fields.TimeInForce);
  let timeInForce = '';
  if (timeInForceField) {
    timeInForce = getValue(
      parsedServerMessage.getEnum(timeInForceField.tag, timeInForceField.value),
      'SymbolicName'
    );
  }

  const ordTypeCode = getValue(parsedServerMessage.getField(Fields.OrdType), 'value');
  const ordTypeField = parsedServerMessage.getField(Fields.OrdType);
  let ordType = '';
  if (ordTypeField) {
    ordType = getValue(parsedServerMessage.getEnum(ordTypeField.tag, ordTypeField.value), 'Description');
  }

  const sideCode = getValue(parsedServerMessage.getField(Fields.Side), 'value');
  const sideField = parsedServerMessage.getField(Fields.Side);
  let side = '';
  if (sideField) {
    side = getValue(parsedServerMessage.getEnum(sideField.tag, sideField.value), 'Description');
  }

  const symbol = getValue(parsedServerMessage.getField(Fields.Symbol), 'value');
  const orderQty = getValue(parsedServerMessage.getField(Fields.OrderQty), 'value');
  const lastQty = getValue(parsedServerMessage.getField(Fields.LastQty), 'value');
  const lastPx = getValue(parsedServerMessage.getField(Fields.LastPx), 'value');
  const leavesQty = getValue(parsedServerMessage.getField(Fields.LeavesQty), 'value');
  const cumQty = getValue(parsedServerMessage.getField(Fields.CumQty), 'value');
  const avgPx = getValue(parsedServerMessage.getField(Fields.AvgPx), 'value');
  const text = getValue(parsedServerMessage.getField(Fields.Text), 'value');

  return {
    orderID,
    clOrdID,
    origClOrdID,
    execID,
    execType,
    execTypeCode,
    ordStatus,
    ordStatusCode,
    ordRejReason,
    symbol,
    side,
    sideCode,
    orderQty,
    ordType,
    ordTypeCode,
    lastQty,
    lastPx,
    leavesQty,
    cumQty,
    avgPx,
    text,
    timeInForce,
    timeInForceCode,
    date: new Date().toISOString(),
  };
};

const logReceivedServerMessage = (title, description, string) => {
  if (
    description.length > 0 &&
    ['marketdataincrementalrefresh'].includes(description.toLowerCase()) === false
  ) {
    LOG_TO_CONSOLE &&
      console.log('\x1b[37m%s\x1b[0m', `[${title}] ↓ Received ${description}\n` + formatMessage(string));
    logToFile(
      JSON.stringify({ title, type: `${description.toLowerCase()}_received`, message: formatMessage(string) })
    );
  }
};

const getValue = (obj, field = 'value') => (obj && obj[field] ? obj[field] : null);
const getValues = (arr, field1 = 'value', field2 = '') =>
  arr.map((entry) => {
    let result = entry[field1];
    if (field2) {
      return result[field2];
    }
    return result;
  });
