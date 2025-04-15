import * as fix from '../fix/index.js';
import { Socket } from 'net';
import { TLSSocket } from 'tls';

const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED_: 3,
};

const originIsAllowed = (origin) => {
  const WS_ALLOWED_CLIENTS = process.env.ALLOWED_CLIENTS?.split(',') || [];
  return WS_ALLOWED_CLIENTS.some((elem) => origin.includes(elem));
};

const defaultOptions = {
  debug: false,
  mayConnect: ({ host, port }) => true,
  createConnection: (ws, origin) => ({
    send: (data) => ws.send(JSON.stringify(data)),
    isOpen: () => ws.readyState === WS_READY_STATE.OPEN,
    ws,
    origin,
    client: ws.protocol,
  }),
  defaultTcpOptions: {
    host: 'localhost',
    port: 9999,
    sender: '',
    target: '',
    account: {},
    reset: 'Y',
    user: '',
    pass: '',
    heartbeat: 60,
    ssl: false,
    encoding: 'utf8',
    timeout: 0,
    noDelay: false,
    keepAlive: false,
    initialDelay: 0,
    title: '',
    autoconnect: false,
  },
};

const generateUUID = () => new Date().getTime();
const debounce = (func, wait) => {
  let timeout, args, context, timestamp;

  return function () {
    context = this;
    args = [].slice.call(arguments, 0);
    timestamp = new Date();

    var later = function () {
      var last = new Date() - timestamp;

      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        func.apply(context, args);
      }
    };

    if (!timeout) {
      timeout = setTimeout(later, wait);
    }
  };
};

class TCP {
  constructor(options = {}) {
    this.options = {
      ...defaultOptions,
      ...options,
      defaultTcpOptions: {
        ...defaultOptions.defaultTcpOptions,
        ...options.defaultTcpOptions,
      },
    };
    this.messageSequence = 1;
    this.socket = null;
    this.connections = [];
    this.loggedin = false;
    this.orders = {};
    this.positions = {};
    this.inquiries = {};
    this.checkingTcpConnection = 0;
    this.checkingTcpActivity = 0;
    this.sendingHeartbeat = 0;
    this.lastReceivedTcpMessage = null;

    this.symbolToStream = '';
    this.symbolsRejected = [];
    this.symbolsStreaming = [];
    this.currentMDReqID = generateUUID();
  }

  notifyAll(json, { checkConnection = true, checkSocket = false, client = null } = {}) {
    return this.connections
      .filter((connection) => client === null || (client !== null && connection.client === client))
      .forEach((connection) => {
        if (checkConnection && !connection.isOpen()) {
          return;
        }
        if (checkSocket && !this.socket) {
          return;
        }
        connection.send(json);
      });
  }

  setInProgressOrders(orders = {}) {
    // Executed on application start
    this.orders = orders;
    return this.orders;
  }

  clientIsAllowed({ origin = '', client, ws = null } = {}) {
    let isValidOrigin = origin == '' || (origin != '' && originIsAllowed(origin));

    if (!isValidOrigin) {
      if (ws !== null && ws.readyState === WS_READY_STATE.OPEN) {
        ws.send(JSON.stringify({ type: 'connect', success: false, error: 'unauthorized' }));
        ws.close();
      }

      fix.LOG_TO_CONSOLE && console.log(`\n Rejected connection for client ${client}` + '\n' + new Date());
      return false;
    }

    return true;
  }

  startCheckingTcpConnection() {
    const checkTcpConnection = () => {
      fix.LOG_TO_CONSOLE &&
        console.log('\x1b[33m%s\x1b[0m', `[${this.options.title}] Checking remote Tcp connection...`);

      fix.logToFile(
        JSON.stringify({
          title: this.options.title,
          type: 'socket_check',
          message: 'Checking remote Tcp connection...',
        })
      );

      this.dispatchConnect();
    };

    if (this.checkingTcpConnection === 0 && !this.socket) {
      checkTcpConnection();
      this.checkingTcpConnection = setInterval(checkTcpConnection, 5000);
    }
  }

  stopCheckingTcpConnection() {
    fix.LOG_TO_CONSOLE &&
      console.log('\x1b[33m%s\x1b[0m', `[${this.options.title}] Remote Tcp connection established\n`);

    fix.logToFile(
      JSON.stringify({
        title: this.options.title,
        type: 'socket_open',
        message: 'Remote Tcp connection established',
      })
    );

    clearInterval(this.checkingTcpConnection);
    this.checkingTcpConnection = 0;
  }

  getNextTargetMsgSeqNum() {
    return this.messageSequence;
  }

  setNextTargetMsgSeqNum(nextMsgSeqNum) {
    this.messageSequence = nextMsgSeqNum;
    return this.messageSequence;
  }

  getNextMDReqID() {
    return this.currentMDReqID;
  }

  setNextMDReqID() {
    this.currentMDReqID = generateUUID();
    return this.currentMDReqID;
  }

  close() {
    if (this.socket) {
      this.options.debug && console.log(`[${this.options.title}] Closing connection`);
      this.socket.end();
    }
  }

  removeWsConnection(closedConnection) {
    return (this.connections = this.connections.filter(
      (currentConnection) => currentConnection.ws !== closedConnection.ws
    ));
  }

  getClient({ clOrdID = '', posReqID = '', collInquiryID = '' } = {}) {
    let client = null;

    if (clOrdID != '') {
      client = (this.orders[clOrdID] && this.orders[clOrdID].client) || null;
    }

    if (posReqID != '') {
      client = (this.positions[posReqID] && this.positions[posReqID].client) || null;
    }

    if (collInquiryID != '') {
      client = (this.inquiries[collInquiryID] && this.inquiries[collInquiryID].client) || null;
    }

    return client;
  }

  updateOrder({ client = null, clOrdID = '', currentReport = {} } = {}) {
    if (client) {
      this.orders = { ...this.orders, [clOrdID]: currentReport };
    }
    console.log({ updatedOrders: this.orders });
  }

  updatePosition({
    client = null,
    position = { posReqID: '' },
    report = { posReqID: '', posMaintRptID: '' },
  } = {}) {
    let { posReqID } = position;
    let { posMaintRptID } = report;

    if (report.posReqID) {
      posReqID = report.posReqID;
    }

    if (client && posReqID) {
      if (!this.positions[posReqID].reports) {
        position = { ...position, reports: {} };
      }

      if (posMaintRptID) {
        this.positions = {
          ...this.positions,
          [posReqID]: {
            ...this.positions[posReqID],
            reports: {
              ...this.positions[posReqID].reports,
              [posMaintRptID]: {
                ...this.positions[posReqID].reports[posMaintRptID],
                ...report,
              },
            },
          },
        };
      } else {
        this.positions = {
          ...this.positions,
          [posReqID]: {
            ...this.positions[posReqID],
            ...position,
          },
        };
      }
    }

    console.log(this.positions);
  }

  updateInquiry({
    client = null,
    inquiry = { collInquiryID: '' },
    report = { collInquiryID: '', collRptID: '' },
  } = {}) {
    let { collInquiryID } = inquiry;
    let { collRptID } = report;

    if (report.collInquiryID) {
      collInquiryID = report.collInquiryID;
    }

    if (client && collInquiryID) {
      if (!this.inquiries[collInquiryID].reports) {
        inquiry = { ...inquiry, reports: {} };
      }

      if (collRptID) {
        this.inquiries = {
          ...this.inquiries,
          [collInquiryID]: {
            ...this.inquiries[collInquiryID],
            reports: {
              ...this.inquiries[collInquiryID].reports,
              [collRptID]: {
                ...this.inquiries[collInquiryID].reports[collRptID],
                ...report,
              },
            },
          },
        };
      } else {
        this.inquiries = {
          ...this.inquiries,
          [collInquiryID]: {
            ...this.inquiries[collInquiryID],
            ...inquiry,
          },
        };
      }
    }

    console.log(this.inquiries);
  }

  dispatch(message, ws, skipClientVerification = false) {
    try {
      // Incoming actions dispatched from browser
      let json = JSON.parse(message);
      const tcpOptions = this.options.defaultTcpOptions;
      this.options.debug &&
        console.log(`[${this.options.title}] Got message`, json, 'has socket?', !!this.socket);

      let client = ws.protocol;

      if (!skipClientVerification && !this.clientIsAllowed({ client, ws })) {
        return;
      }

      switch (json.type) {
        case 'connect': {
          if (this.socket && this.loggedin) {
            return this.notifyAll(
              { type: 'connect', success: true, route: this.options.title.toLowerCase() },
              { checkSocket: true }
            );
          } else {
            this.loggedin = false;

            const __connect__ = () => {
              if (Object.keys(json).includes('username')) {
                const testInvalidUsername = json.username;
                return this.dispatchConnect(testInvalidUsername);
              } else {
                return this.dispatchConnect();
              }
            };

            if (this.socket !== null) {
              this.socket.destroy();
              setTimeout(__connect__, 2000);
            } else {
              __connect__();
            }

            break;
          }
        }

        case 'stream': {
          this.symbolToStream = json.symbolToStream;

          if (this.options.title === 'Quote' && !this.symbolsStreaming.includes(this.symbolToStream)) {
            const message = this.buildMarketDataRequest({ subscriptionType: 'subscribe' });
            this.dispatch(message, ws);
            this.symbolsStreaming = [...this.symbolsStreaming, this.symbolToStream];
          }

          break;
        }

        case 'check_connected': {
          return this.notifyAll(
            {
              type: 'check_connected',
              success: this.socket !== null,
              route: this.options.title.toLowerCase(),
            },
            { checkSocket: true }
          );
        }

        case 'check_loggedin': {
          return this.notifyAll(
            {
              type: 'check_loggedin',
              success: this.loggedin,
              route: this.options.title.toLowerCase(),
              target: tcpOptions.target,
            },
            { checkSocket: true }
          );
        }

        case 'data': {
          if (json.payload.action == 'clearlog') {
            fix.clearLogFile();

            return this.notifyAll(
              { type: 'data', payload: JSON.stringify(json.payload) },
              { checkSocket: true }
            );
          }

          switch (json.payload.action) {
            case 'disconnect':
              json = fix.createLogoutData(
                {
                  sender: tcpOptions.sender,
                  target: tcpOptions.target,
                  title: this.options.title,
                },
                this.getNextTargetMsgSeqNum()
              );

              break;

            case 'collateralinquiry':
              const collInquiryID = String(json.payload.collInquiryID);

              this.inquiries[collInquiryID] = {
                client,
                collInquiryID,
              };

              json = fix.createCollateralInquiryData(
                {
                  ...json,
                  sender: tcpOptions.sender,
                  target: tcpOptions.target,
                  title: this.options.title,
                },
                this.getNextTargetMsgSeqNum()
              );

              break;

            case 'requestforpositions':
              const posReqID = String(json.payload.posReqID);

              this.positions[posReqID] = {
                client,
                posReqID,
              };

              json = fix.createRequestForPositionsData(
                {
                  ...json,
                  sender: tcpOptions.sender,
                  target: tcpOptions.target,
                  title: this.options.title,
                },
                this.getNextTargetMsgSeqNum()
              );

              break;

            case 'newordersingle':
              const currentOrder = json.payload;
              delete currentOrder.action;

              this.orders[currentOrder.clOrdID] = {
                client,
                ...currentOrder,
              };

              json = fix.createNewOrderSingleData(
                {
                  ...json,
                  sender: tcpOptions.sender,
                  target: tcpOptions.target,
                  title: this.options.title,
                },
                this.getNextTargetMsgSeqNum()
              );

              break;

            case 'ordercancelrequest':
              const origClOrdID = String(json.payload.origClOrdID);

              if (!(this.orders[origClOrdID] && this.orders[origClOrdID].client === client)) {
                return;
              }

              json = fix.createOrderCancelRequestData(
                {
                  ...json,
                  sender: tcpOptions.sender,
                  target: tcpOptions.target,
                  title: this.options.title,
                },
                this.getNextTargetMsgSeqNum()
              );

              break;

            case 'marketdatarequest':
              json = fix.createMarketDataRequestData(
                {
                  ...json,
                  sender: tcpOptions.sender,
                  target: tcpOptions.target,
                  title: this.options.title,
                },
                this.getNextTargetMsgSeqNum()
              );

              break;

            default:
              break;
          }

          this.dispatchData(json);
          break;
        }
        case 'close': {
          this.dispatchClose(json);
          break;
        }
      }
    } catch (e) {
      console.log('error', e);
      this.notifyAll({ type: 'error', error: e.message }, { checkConnection: false });
    }
  }

  dispatchClose(json) {
    if (this.socket) {
      this.close();
    } else {
      this.notifyAll({ type: 'error', error: 'not connected' }, { checkConnection: false });
    }
  }

  sendHeartbeat(TestReqID = null) {
    const tcpOptions = this.options.defaultTcpOptions;
    const heartbeat = fix.createHeartbeatData(
      {
        sender: tcpOptions.sender,
        target: tcpOptions.target,
        title: this.options.title,
      },
      this.getNextTargetMsgSeqNum(),
      TestReqID
    );
    this.dispatchData(heartbeat);
  }

  dispatchData(json) {
    if (this.socket) {
      if (json.payload !== undefined) {
        const payload = typeof json.payload === 'string' ? json.payload : Uint8Array.from(json.payload);
        this.socket.write(payload, this.options.encoding);
        this.setNextTargetMsgSeqNum(this.getNextTargetMsgSeqNum() + 1);
      } else {
        console.log(`${this.options.title} Error: no payload`);
      }
    } else {
      console.log(`${this.options.title} Error: not connected`);
    }
  }

  dispatchConnect(testInvalidUsername) {
    if (this.socket === null) {
      const tcpOptions = this.options.defaultTcpOptions;
      this.options.debug && console.log(`[${this.options.title}] Using connect options`, tcpOptions);
      if (this.options.mayConnect({ host: tcpOptions.host, port: tcpOptions.port })) {
        const socket = (this.socket = tcpOptions.ssl ? new TLSSocket() : new Socket());
        socket.connect({ port: tcpOptions.port, host: tcpOptions.host }, () => {
          socket.setEncoding(tcpOptions.encoding);
          socket.setTimeout(tcpOptions.timeout);
          socket.setNoDelay(tcpOptions.noDelay);
          socket.setKeepAlive(tcpOptions.keepAlive, tcpOptions.initialDelay);
        });
        socket.on('ready', () => {
          this.options.debug && console.log(`[${this.options.title}] Socket ready`);
          this.stopCheckingTcpConnection();

          this.notifyAll({ type: 'connect', success: true, route: this.options.title.toLowerCase() });

          const logon = fix.createLogonData(
            {
              sender: tcpOptions.sender,
              target: tcpOptions.target,
              reset: tcpOptions.reset,
              user: typeof testInvalidUsername == 'string' ? testInvalidUsername : tcpOptions.user,
              pass: tcpOptions.pass,
              heartbeat: tcpOptions.heartbeat,
              title: this.options.title,
            },
            this.getNextTargetMsgSeqNum()
          );
          this.dispatchData(logon);
        });
        socket.on('end', () => {
          this.options.debug && console.log(`[${this.options.title}] Socket end`);
          if (tcpOptions.reset == 'Y') {
            this.setNextTargetMsgSeqNum(1);
          }
          if (this.sendingHeartbeat) {
            clearInterval(this.sendingHeartbeat);
            this.sendingHeartbeat = 0;
          }

          fix.logToFile(
            JSON.stringify({
              title: this.options.title,
              type: 'socket_end',
              message: 'Socket End',
            })
          );

          this.notifyAll({ type: 'end' });
        });
        socket.on('close', async (hadError) => {
          this.socket = null;
          this.loggedin = false;

          if (this.sendingHeartbeat) {
            clearInterval(this.sendingHeartbeat);
            this.sendingHeartbeat = 0;
          }

          if (tcpOptions.reset == 'Y') {
            this.setNextTargetMsgSeqNum(1);
          }

          if (this.options.autoconnect && this.checkingTcpConnection === 0) {
            this.startCheckingTcpConnection();
          }

          fix.logToFile(
            JSON.stringify({
              title: this.options.title,
              type: 'socket_close',
              message: 'Socket Closed',
            })
          );

          this.options.debug && console.log(`[${this.options.title}] Socket closed`, 'error?', hadError);
          this.notifyAll({ type: 'close', hadError });
        });
        socket.on('timeout', () => {
          this.options.debug && console.log(`[${this.options.title}] Socket timeout`);

          fix.logToFile(
            JSON.stringify({
              title: this.options.title,
              type: 'socket_timeout',
              message: 'Socket Timeout',
            })
          );

          if (this.socket !== null) {
            this.socket.destroy();
            if (this.sendingHeartbeat) {
              clearInterval(this.sendingHeartbeat);
              this.sendingHeartbeat = 0;
            }
          }
          this.notifyAll({ type: 'timeout' });
        });
        socket.on('error', (error) => {
          this.options.debug && console.log(`[${this.options.title}] Socket error`, error);

          fix.logToFile(
            JSON.stringify({
              title: this.options.title,
              type: 'socket_error',
              message: error,
            })
          );

          this.notifyAll({ type: 'error', error: error.errno });
        });
        socket.on('data', (serverMessage) => {
          this.options.debug && console.log(`[${this.options.title}] Socket data`, serverMessage);

          const wsMessage = fix.buildWsMessage(serverMessage, this.options.title);
          const { payload, sendHeartbeat, TestReqID } = wsMessage;

          if (sendHeartbeat) {
            this.sendHeartbeat(TestReqID);
          }

          const payloadObj = JSON.parse(payload);

          this.lastReceivedTcpMessage = new Date();

          if (payloadObj.action === 'logon') {
            this.loggedin = true;

            this.symbolToStream = '';
            this.symbolsRejected = [];
            this.symbolsStreaming = [];

            if (this.sendingHeartbeat === 0) {
              this.sendingHeartbeat = setInterval(() => {
                this.sendHeartbeat();
              }, tcpOptions.heartbeat * 1000);
            }

            if (this.checkingTcpActivity === 0) {
              this.checkingTcpActivity = setInterval(() => {
                const now = new Date();
                const diffInSeconds = (now - this.lastReceivedTcpMessage) / 1000;

                if (diffInSeconds > 30 && this.options.autoconnect) {
                  clearInterval(this.checkingTcpActivity);
                  this.checkingTcpActivity = 0;
                  this.lastReceivedTcpMessage = null;
                  if (this.socket !== null) {
                    this.socket.destroy();
                  }
                }
              }, 5000);
            }
          }

          if (payloadObj.action === 'logout') {
            this.loggedin = false;
            if (tcpOptions.reset == 'Y') {
              this.setNextTargetMsgSeqNum(1);
            }
            this.socket = null;

            this.symbolToStream = '';
            this.symbolsRejected = [];
            this.symbolsStreaming = [];

            if (this.sendingHeartbeat) {
              clearInterval(this.sendingHeartbeat);
              this.sendingHeartbeat = 0;
            }
          }

          let client = null;

          if (payloadObj.action === 'executionreport') {
            const currentReport = payloadObj;
            delete currentReport.action;
            delete currentReport.success;

            const clOrdID = currentReport.origClOrdID || currentReport.clOrdID;
            client = this.getClient({ clOrdID });
            currentReport.client = client;

            this.updateOrder({
              client,
              clOrdID,
              currentReport,
            });
          }

          if (payloadObj.action === 'requestforpositionsack') {
            client = this.getClient({ posReqID: payloadObj.posReqID });
            this.updatePosition({
              client,
              position: {
                posReqID: payloadObj.posReqID,
                totalNumPosReports: payloadObj.totalNumPosReports,
                posReqResult: payloadObj.posReqResult,
                posReqStatus: payloadObj.posReqStatus,
                text: payloadObj.text,
              },
            });
          }

          if (payloadObj.action === 'positionreport') {
            client = this.getClient({ posReqID: payloadObj.posReqID });
            this.updatePosition({
              client,
              report: {
                posMaintRptID: payloadObj.posMaintRptID,
                posReqID: payloadObj.posReqID,
                posReqResult: payloadObj.posReqResult,
                clearingBusinessDate: payloadObj.clearingBusinessDate,
                noPartyIDs: payloadObj.noPartyIDs,
                partyIDArr: payloadObj.partyIDArr,
                symbol: payloadObj.symbol,
                noPositions: payloadObj.noPositions,
                positionQtyType: payloadObj.positionQtyType,
                ozUsedMargin: payloadObj.ozUsedMargin,
                ozUnrealizedProfitOrLoss: payloadObj.ozUnrealizedProfitOrLoss,
                ozAccountCurrency: payloadObj.ozAccountCurrency,
              },
            });
          }

          if (payloadObj.action === 'collateralinquiryack') {
            client = this.getClient({ collInquiryID: payloadObj.collInquiryID });
            this.updateInquiry({
              client,
              inquiry: {
                collInquiryID: payloadObj.collInquiryID,
                totNumReports: payloadObj.totNumReports,
                collInquiryResult: payloadObj.collInquiryResult,
                collInquiryStatus: payloadObj.collInquiryStatus,
                text: payloadObj.text,
              },
            });
          }

          if (payloadObj.action === 'collateralreport') {
            client = this.getClient({ collInquiryID: payloadObj.collInquiryID });
            this.updateInquiry({
              client,
              report: {
                collRptID: payloadObj.collRptID,
                collInquiryID: payloadObj.collInquiryID,
                collStatus: payloadObj.collStatus,
                partyIDArr: payloadObj.partyIDArr,
                currency: payloadObj.currency,
                quantity: payloadObj.quantity,
                ozAccountCurrency: payloadObj.ozAccountCurrency,
                ozAccountBalance: payloadObj.ozAccountBalance,
                ozMarginUtilizationPercentage: payloadObj.ozMarginUtilizationPercentage,
                ozUsedMargin: payloadObj.ozUsedMargin,
                ozFreeMargin: payloadObj.ozFreeMargin,
                ozUnrealizedProfitOrLoss: payloadObj.ozUnrealizedProfitOrLoss,
                ozEquity: payloadObj.ozEquity,
                ozAccountCredit: payloadObj.ozAccountCredit,
              },
            });
          }

          if (payloadObj.action === 'marketdatarequestreject') {
            const rejection = payloadObj.text;

            if (!rejection.includes('Failed to Unsubscribe Symbol')) {
              const isRejected = new RegExp('\\b' + this.symbolToStream + '\\b', 'gi').test(rejection);

              if (isRejected) {
                this.symbolsStreaming = this.symbolsStreaming.filter(
                  (symbol) => symbol != this.symbolToStream
                );
              }

              this.symbolsRejected = [...this.symbolsRejected, ...(isRejected ? [this.symbolToStream] : [])];
            }

            if (this.symbolsRejected.length == 0) {
              const message = this.buildMarketDataRequest({ subscriptionType: 'subscribe' });
              let json = JSON.parse(message);

              const tcpOptions = this.options.defaultTcpOptions;
              json = fix.createMarketDataRequestData(
                {
                  ...json,
                  sender: tcpOptions.sender,
                  target: tcpOptions.target,
                  title: this.options.title,
                },
                this.getNextTargetMsgSeqNum()
              );

              this.dispatchData(json);
              this.symbolsStreaming = [...this.symbolsStreaming, this.symbolToStream];
            }
          }

          if (payloadObj.action === 'quotecancel') {
            this.setNextMDReqID();
          }

          this.notifyAll(
            {
              type: 'data',
              payload: 'string' === typeof payload ? payload : payload.toString(tcpOptions.encoding),
            },
            { client }
          );
        });
      } else {
        fix.logToFile(
          JSON.stringify({
            title: this.options.title,
            type: 'socket_not_allowed',
            message: 'Not allowed connection',
          })
        );

        this.notifyAll({ type: 'error', error: 'not allowed connection' });
      }
    } else {
      if (this.socket.connecting === false) {
        fix.logToFile(
          JSON.stringify({
            title: this.options.title,
            type: 'socket_already_connected',
            message: 'Already connected',
          })
        );

        this.notifyAll({ type: 'error', error: 'already connected' });
      }
    }
  }

  buildMarketDataRequest({ subscriptionType = 'subscribe' }) {
    const subscriptionCodes = {
      snapshot: '0',
      subscribe: '1',
      unsubscribe: '2',
    };

    let symbolsAllowed = [];
    if (!this.symbolsRejected.includes(this.symbolToStream)) {
      symbolsAllowed = [this.symbolToStream];
    }

    if (symbolsAllowed.length == 0) {
      return;
    }

    this.setNextMDReqID();

    return JSON.stringify({
      type: 'data',
      payload: {
        action: 'marketdatarequest',
        MDReqID: this.getNextMDReqID(),
        SubscriptionRequestType: subscriptionCodes[subscriptionType],
        MarketDepth: '1', // Top of Book
        MDUpdateType: '0', // Full Refresh
        NoMDEntryTypes: '2',
        MDEntryTypes: ['0', '1'], // Bid, Offer
        NoRelatedSym: symbolsAllowed.length, // Number of symbols (instruments) requested
        Symbols: symbolsAllowed,
      },
    });
  }

  handle(ws, req) {
    // 'handle' is called when a new WebSocket is instantiated
    const connection = this.options.createConnection(ws, req.headers.origin);
    this.connections.push(connection);

    const style = this.options.title === 'Trade' ? '\x1b[45m%s\x1b[0m' : '\x1b[46m%s\x1b[0m';

    fix.LOG_TO_CONSOLE &&
      console.log(style, `\n[${this.options.title} WS Open] Active connections: ${this.connections.length}`);

    ws.on('message', (message) => this.dispatch(message, ws));
    ws.on('close', () => {
      this.removeWsConnection(connection);

      fix.LOG_TO_CONSOLE &&
        console.log(
          style,
          `\n[${this.options.title} WS Close] Active connections: ${this.connections.length}`
        );
    });
  }
}

const install = (options) => {
  const tcp = new TCP(options);

  if (options.autoconnect) {
    tcp.dispatchConnect();
  }

  return tcp;
};

export default install;
