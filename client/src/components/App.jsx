import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import parse from 'html-react-parser';
import DOMPurify from 'dompurify';

import Connections from './Connections';
import Sections from './Sections';
import Quote from './quotes/Quote';
import QuoteHeader from './quotes/QuoteHeader';
import QuoteData from './quotes/QuoteData';
import Trade from './trades/Trade';
import TradeHeader from './trades/TradeHeader';
import TradeData from './trades/TradeData';
import Position from './positions/Position';
import PositionHeader from './positions/PositionHeader';
import PositionData from './positions/PositionData';
import PositionReports from './positions/PositionReports';
import CollateralReport from './collateral_reports/CollateralReport';
import CollateralReportHeader from './collateral_reports/CollateralReportHeader';
import CollateralReportInquiry from './collateral_reports/CollateralReportInquiry';
import CollateralReportData from './collateral_reports/CollateralReportData';
import TestCases from './TestCases';
import Logs from './Logs';
import FixApiError from './FixApiError';

import { TimeInForceDef, PosReqTypeDef, AccountTypeDef } from '../lib/fixTypes';
import {
  initialTestCases,
  verifyConnectivityFixMessage,
  verifyQuoteFixMessage,
  verifyTradingFixMessage,
} from '../lib/testCases';

// Constants
const { VITE_SERVER_URL, VITE_SERVER_ENCRYPTED } = import.meta.env;
const WS_Protocol = VITE_SERVER_ENCRYPTED === 'true' ? 'wss' : 'ws';
const URL_Protocol = VITE_SERVER_ENCRYPTED === 'true' ? 'https' : 'http';
const CLIENT = 1;

// Utility functions
const generateUUID = () => new Date().getTime();

const tradeRoute = 'trade';
const quoteRoute = 'quote';

const initialState = {
  tradeWsReady: false,
  quoteWsReady: false,
  tcpConnectedTrade: false,
  tcpConnectedQuote: false,
  tcpLoggedInTrade: false,
  tcpLoggedInQuote: false,
  showConnectivitySection: JSON.parse(localStorage.getItem('showConnectivitySection')) ?? true,
  showQuoteSection: JSON.parse(localStorage.getItem('showQuoteSection')) ?? true,
  showTradeSection: JSON.parse(localStorage.getItem('showTradeSection')) ?? true,
  showQueryPositionsSection: JSON.parse(localStorage.getItem('showQueryPositionsSection')) ?? true,
  showCollateralReportsSection: JSON.parse(localStorage.getItem('showCollateralReportsSection')) ?? true,
  showHeartbeats: JSON.parse(localStorage.getItem('showHeartbeats')) ?? true,
  market: {},
  marketStreaming: false,
  currentMDReqID: generateUUID(),
  allowSubscription: true,
  orders: {},
  currentclOrdID: '',
  currentOrderID: '',
  canCancelOrder: false,
  positions: {},
  currentPosReqID: '',
  numOfReceivedPositionReports: 0,
  inquiries: {},
  currentCollInquiryID: '',
  numOfReceivedCollateralReports: 0,
  error: {
    textReject: '',
    textReason: '',
  },
  logs: '',
  tests: initialTestCases,
};

const App = () => {
  // State management
  const [state, setState] = useState(initialState);
  const [tradeSocket, setTradeSocket] = useState(null);
  const [quoteSocket, setQuoteSocket] = useState(null);

  // Refs for form inputs
  const quoteSymbol1Ref = useRef(null);
  const quoteSymbol2Ref = useRef(null);
  const orderQuantityRef = useRef(null);
  const orderTypeRef = useRef(null);
  const orderSymbolRef = useRef(null);
  const orderLimitPriceRef = useRef(null);
  const orderTimeInForceRef = useRef(null);
  const useInvalidUsernameRef = useRef(null);
  const useUnsupportedSymbolRef = useRef(null);
  const posReqTypeRef = useRef(null);
  const accountRef = useRef(null);
  const accountTypeRef = useRef(null);
  const clearingBusinessDateRef = useRef(null);
  const positionPartyIDRef1 = useRef(null);
  const positionPartyIDRef2 = useRef(null);
  const collateralPartyIDRef1 = useRef(null);
  const collateralPartyIDRef2 = useRef(null);

  const send = useCallback(
    (msg, route) => {
      if (route === tradeRoute && tradeSocket) {
        tradeSocket.send(msg);
      } else if (route === quoteRoute && quoteSocket) {
        quoteSocket.send(msg);
      }
    },
    [tradeSocket, quoteSocket]
  );

  const checkTCPConnected = useCallback(
    (route) => {
      send(
        JSON.stringify({
          type: 'check_connected',
        }),
        route
      );
    },
    [send]
  );

  const checkTCPLoggedIn = useCallback(
    (route) => {
      send(
        JSON.stringify({
          type: 'check_loggedin',
        }),
        route
      );
    },
    [send]
  );

  const clearLog = useCallback(
    ({ shouldEmptyFile = true, shouldConfirm = true } = {}) => {
      if (shouldEmptyFile && shouldConfirm && !confirm('Confirm log clear?')) {
        return;
      }

      shouldEmptyFile &&
        send(
          JSON.stringify({
            type: 'data',
            payload: { action: 'clearlog' },
          }),
          quoteRoute
        );

      setState((prev) => ({
        ...prev,
        logs: '',
        tests: initialState.tests,
      }));
    },
    [send]
  );

  const buildTests = useCallback(
    (newLogs) => {
      let tests = {
        ...state.tests,
      };
      let testTypes = Object.keys(tests);

      newLogs
        .split('\n')
        .filter((el) => el.length > 2)
        .map((log) => {
          const [, data] = log.split('->');
          const { title, type, message } = JSON.parse(data.trim());
          const result = [{ title, type, message }];

          if (type == 'logon_sent') {
            result.push({ title, type: 'logon_reset_seq', message });
          }

          if (type == 'reject_received') {
            result.push({ title, type: 'reject_received', message });
          }

          if (type == 'executionreport_received') {
            result.push({ title, type: 'executionreport_filled_received', message });
            result.push({ title, type: 'executionreport_cancel_with_remainder_received', message });
            result.push({ title, type: 'executionreport_order_cancel_received', message });
            result.push({ title, type: 'executionreport_rejected_received', message });
            result.push({ title, type: 'executionreport_order_trade_filled_received', message });
            result.push({ title, type: 'executionreport_order_cancel_cumqty_received', message });
          }

          if (type == 'order_sent') {
            result.push({ title, type: 'order_unique_clordid_sent', message });
            result.push({ title, type: 'order_gtc_sent', message });
            result.push({ title, type: 'order_ioc_sent', message });
            result.push({ title, type: 'order_fok_sent', message });
          }

          if (type == 'positionreport_received') {
            result.push({
              title,
              type: 'positionreport_totalnum_received',
              message,
              state: state.numOfReceivedPositionReports,
            });
            result.push({
              title,
              type: 'positionreport_posreqid_received',
              message,
              state: state.currentPosReqID,
            });
          }

          if (type == 'requestforpositionsack_received') {
            result.push({
              title,
              type: 'requestforpositionsack_posreqid_received',
              message,
              state: state.currentPosReqID,
            });
          }

          if (type == 'collateralreport_received') {
            result.push({
              title,
              type: 'collateralreport_totalnum_received',
              message,
              state: state.numOfReceivedCollateralReports,
            });
            result.push({
              title,
              type: 'collateralreport_collinquiryid_received',
              message,
              state: state.currentCollInquiryID,
            });
          }

          if (type == 'collateralinquiryack_received') {
            result.push({
              title,
              type: 'collateralinquiryack_collinquiryid_received',
              message,
              state: state.currentCollInquiryID,
            });
          }

          if (type == 'marketdatasnapshotfullrefresh_received') {
            result.push({ title, type: 'marketdatasnapshotfullrefresh_bulk_received', message });
          }

          if (type == 'marketdatarequest_sent') {
            result.push({ title, type: 'marketdatarequest_unsubscribe_sent', message });
          }

          return result;
        })
        .reduce((acc, cur) => acc.concat(cur), [])
        .map(({ title, type, message, state: testState = '' }) => {
          if (testTypes.includes(type)) {
            try {
              tests = {
                ...tests,
                [type]: {
                  ...tests[type],
                  [title.toLowerCase()]: {
                    result: tests[type].test(message, testState),
                    fixMessage: message,
                  },
                },
              };
            } catch (err) {
              console.log({ type, err });
            }
          }
        });

      return tests;
    },
    [
      state.tests,
      state.numOfReceivedPositionReports,
      state.currentPosReqID,
      state.numOfReceivedCollateralReports,
      state.currentCollInquiryID,
    ]
  );

  const fetchLogs = useCallback(() => {
    const LOG_FILE = `${URL_Protocol}://${VITE_SERVER_URL}/fix.log`;

    fetch(LOG_FILE)
      .then((response) => {
        if (response.ok) {
          return response.text();
        }
        throw new Error(`${response.status}: ${response.statusText}`);
      })
      .then((logs) => {
        let tests = buildTests(logs);
        setState((prev) => ({
          ...prev,
          logs,
          tests,
        }));
      })
      .catch((error) => console.error(error));
  }, [buildTests]);

  const handleWsMessage = useCallback(
    (ev) => {
      const msg = JSON.parse(ev.data);

      fetchLogs();

      if (msg.type !== 'data') {
        console.log({ msgtype: msg.type });
      }

      switch (msg.type) {
        case 'connect': {
          const { success: connectResult, error = '', route: connectRoute } = msg;

          if (connectResult === true) {
            if (state.tcpConnectedTrade === false && connectRoute == tradeRoute) {
              setState((prev) => ({ ...prev, tcpConnectedTrade: true }));
            }

            if (state.tcpConnectedQuote === false && connectRoute == quoteRoute) {
              setState((prev) => ({ ...prev, tcpConnectedQuote: true }));
            }
          } else {
            console.log(`WS connection error: ${error}`);
          }

          break;
        }

        case 'check_connected': {
          const { success: checkConnectedResult, route: checkConnectRoute } = msg;

          if (checkConnectedResult === true) {
            if (checkConnectRoute == tradeRoute) {
              setState((prev) => ({ ...prev, tcpConnectedTrade: true }));
            } else if (checkConnectRoute == quoteRoute) {
              setState((prev) => ({ ...prev, tcpConnectedQuote: true }));
            }
          }

          break;
        }

        case 'check_loggedin': {
          const { success: checkLoggedInResult, route: checkLooggedInRoute } = msg;

          if (checkLoggedInResult === true) {
            if (checkLooggedInRoute == tradeRoute) {
              setState((prev) => ({ ...prev, tcpLoggedInTrade: true }));
            } else if (checkLooggedInRoute == quoteRoute) {
              setState((prev) => ({ ...prev, tcpLoggedInQuote: true }));
            }
          }

          break;
        }

        case 'data': {
          const { payload } = msg;
          const { action, success, route = '' } = JSON.parse(payload);

          if (action !== 'marketdataincrementalrefresh') {
            console.log({ action });
          }

          if (action == 'clearlog') {
            clearLog({ shouldEmptyFile: false });
          }

          if (action == 'logon' && success === true) {
            if (route == tradeRoute) {
              setState((prev) => ({ ...prev, tcpLoggedInTrade: true }));
            } else if (route == quoteRoute) {
              setState((prev) => ({ ...prev, tcpLoggedInQuote: true }));
            }
          }

          if (action == 'logout' && success === true) {
            if (route == tradeRoute) {
              setState((prev) => ({
                ...prev,
                tcpConnectedTrade: false,
                tcpLoggedInTrade: false,
              }));
            } else if (route == quoteRoute) {
              setState((prev) => ({
                ...prev,
                tcpConnectedQuote: false,
                tcpLoggedInQuote: false,
                allowSubscription: initialState.allowSubscription,
                canCancelOrder: initialState.canCancelOrder,
                marketStreaming: initialState.marketStreaming,
              }));
            }
          }

          if (action == 'reject') {
            const { text: textReject, sessionRejectReason: textReason } = JSON.parse(payload);

            setState((prev) => ({
              ...prev,
              error: {
                textReject,
                textReason,
              },
            }));
          }

          if (action == 'executionreport' && success === true) {
            const {
              orderID,
              clOrdID,
              origClOrdID,
              execID,
              execType,
              ordStatus,
              ordRejReason,
              symbol,
              side,
              orderQty,
              ordType,
              lastQty,
              lastPx,
              leavesQty,
              cumQty,
              avgPx,
              text,
              timeInForce,
            } = JSON.parse(payload);

            if (state.orders[origClOrdID || clOrdID]) {
              setState((prev) => ({
                ...prev,
                currentOrderID: orderID,
                orders: {
                  ...prev.orders,
                  [origClOrdID || clOrdID]: {
                    orderID,
                    clOrdID,
                    origClOrdID,
                    execID,
                    execType,
                    ordStatus,
                    ordRejReason,
                    symbol,
                    side,
                    orderQty,
                    ordType,
                    lastQty,
                    lastPx,
                    leavesQty,
                    cumQty,
                    avgPx,
                    text,
                    timeInForce,
                  },
                },
              }));
            }
          }

          if (action == 'requestforpositionsack' && success === true) {
            const { posMaintRptID, posReqID, totalNumPosReports, posReqResult, posReqStatus, text } =
              JSON.parse(payload);

            if (state.positions[posReqID]) {
              setState((prev) => ({
                ...prev,
                positions: {
                  ...prev.positions,
                  [posReqID]: {
                    ...prev.positions[posReqID],
                    posMaintRptID,
                    totalNumPosReports,
                    posReqResult,
                    posReqStatus,
                    text,
                  },
                },
              }));
            }
          }

          if (action == 'positionreport' && success === true) {
            const report = JSON.parse(payload);
            const { posReqID, posMaintRptID } = report;

            delete report.action;
            delete report.success;

            if (state.positions[posReqID]) {
              setState((prev) => ({
                ...prev,
                numOfReceivedPositionReports: prev.positions[posReqID].reports[posMaintRptID]
                  ? prev.numOfReceivedPositionReports
                  : prev.numOfReceivedPositionReports + 1,
                positions: {
                  ...prev.positions,
                  [posReqID]: {
                    ...prev.positions[posReqID],
                    reports: {
                      ...prev.positions[posReqID].reports,
                      [posMaintRptID]: {
                        ...prev.positions[posReqID].reports[posMaintRptID],
                        ...report,
                      },
                    },
                  },
                },
              }));
            }
          }

          if (action == 'collateralinquiryack' && success === true) {
            const { collInquiryID, totNumReports, collInquiryResult, collInquiryStatus, text } =
              JSON.parse(payload);

            if (state.inquiries[collInquiryID]) {
              setState((prev) => ({
                ...prev,
                inquiries: {
                  ...prev.inquiries,
                  [collInquiryID]: {
                    ...prev.inquiries[collInquiryID],
                    totNumReports,
                    collInquiryResult,
                    collInquiryStatus,
                    text,
                  },
                },
              }));
            }
          }

          if (action == 'collateralreport' && success === true) {
            const report = JSON.parse(payload);
            const { collInquiryID, collRptID } = report;

            delete report.action;
            delete report.success;

            if (state.inquiries[collInquiryID]) {
              setState((prev) => ({
                ...prev,
                numOfReceivedCollateralReports: prev.inquiries[collInquiryID].reports[collRptID]
                  ? prev.numOfReceivedCollateralReports
                  : prev.numOfReceivedCollateralReports + 1,
                inquiries: {
                  ...prev.inquiries,
                  [collInquiryID]: {
                    ...prev.inquiries[collInquiryID],
                    reports: {
                      ...prev.inquiries[collInquiryID].reports,
                      [collRptID]: {
                        ...prev.inquiries[collInquiryID].reports[collRptID],
                        ...report,
                      },
                    },
                  },
                },
              }));
            }
          }

          if (action == 'ordercancelreject' && success === true) {
            const {
              orderID,
              clOrdID,
              origClOrdID,
              cxlRejReason,
              cxlRejResponseTo,
              text: cancelRejectText,
            } = JSON.parse(payload);

            if (state.orders[origClOrdID]) {
              setState((prev) => ({
                ...prev,
                orders: {
                  ...prev.orders,
                  [origClOrdID]: {
                    ...prev.orders[origClOrdID],
                    text: cancelRejectText,
                    cxlRejReason,
                    cxlRejResponseTo,
                    cancelRejectText,
                    cancelRejectData: {
                      orderID,
                      clOrdID,
                      origClOrdID,
                    },
                  },
                },
              }));
            }
          }

          if (
            ['marketdatasnapshotfullrefresh', 'marketdataincrementalrefresh'].includes(action) &&
            success === true
          ) {
            const { symbol, MDReqID, NoMDEntries, marketData } = JSON.parse(payload);

            setState((prev) => {
              if (prev.market[symbol]) {
                prev.market[symbol].map((el, idx) => {
                  if (marketData[idx]?.price > 0) {
                    if (el.price < marketData[idx].price) {
                      marketData[idx].priceDirection = 'up';
                    } else if (el.price > marketData[idx].price) {
                      marketData[idx].priceDirection = 'down';
                    } else {
                      marketData[idx].priceDirection = '';
                    }
                  }
                });
              } else {
                marketData.map((el, idx) => {
                  marketData[idx].priceDirection = '';
                });
              }

              let prevData;

              if (marketData.length === 1 && prev.market[symbol]?.length > 0) {
                if (marketData[0].type === 'Bid') {
                  const prevOffer = prev.market[symbol].find((el) => el.type === 'Offer');
                  if (prevOffer?.price > 0) {
                    prevData = prevOffer;
                  }
                }
                if (marketData[0].type === 'Offer') {
                  const prevBid = prev.market[symbol].find((el) => el.type === 'Bid');
                  if (prevBid?.price > 0) {
                    prevData = prevBid;
                  }
                }
              }

              return {
                ...prev,
                currentMDReqID: MDReqID,
                marketStreaming: true,
                market: {
                  ...prev.market,
                  [symbol]: prevData?.price > 0 ? [...marketData, prevData] : marketData,
                },
              };
            });
          }

          if (action == 'marketdatarequestreject' && success === true) {
            setState((prev) => ({
              ...prev,
              allowSubscription: true,
              marketStreaming: false,
              currentMDReqID: generateUUID(),
            }));
          }

          if (action == 'quotecancel' && success === true) {
            setState((prev) => ({
              ...prev,
              allowSubscription: true,
              marketStreaming: false,
              currentMDReqID: generateUUID(),
            }));
          }

          break;
        }

        case 'close':
          if (state.tcpConnected) {
            setState((prev) => ({
              ...initialState,
              tradeWsReady: prev.tradeWsReady,
              quoteWsReady: prev.quoteWsReady,
              showTradeSection: prev.showTradeSection,
              showQuoteSection: prev.showQuoteSection,
              showConnectivitySection: prev.showConnectivitySection,
              showQueryPositionsSection: prev.showQueryPositionsSection,
              showCollateralReportsSection: prev.showCollateralReportsSection,
              showHeartbeats: prev.showHeartbeats,
              logs: prev.logs,
              tests: prev.tests,
            }));
          }

          break;

        case 'end':
        case 'error':
        case 'timeout':
          break;
      }
    },
    [
      clearLog,
      fetchLogs,
      state.inquiries,
      state.orders,
      state.positions,
      state.tcpConnected,
      state.tcpConnectedQuote,
      state.tcpConnectedTrade,
    ]
  );

  // Initialize WebSocket connections
  useEffect(() => {
    const newTradeSocket = new WebSocket(`${WS_Protocol}://${VITE_SERVER_URL}/${tradeRoute}`, CLIENT);
    const newQuoteSocket = new WebSocket(`${WS_Protocol}://${VITE_SERVER_URL}/${quoteRoute}`, CLIENT);

    setTradeSocket(newTradeSocket);
    setQuoteSocket(newQuoteSocket);

    return () => {
      newTradeSocket.close();
      newQuoteSocket.close();
    };
  }, []);

  // Set up WebSocket event handlers
  useEffect(() => {
    if (!tradeSocket || !quoteSocket) return;

    const onWsOpen = (route) => {
      if (route === tradeRoute) {
        setState((prev) => ({ ...prev, tradeWsReady: true }));
      } else {
        setState((prev) => ({ ...prev, quoteWsReady: true }));
      }
      checkTCPConnected(route);
      checkTCPLoggedIn(route);
    };

    const onWsClose = () => {
      setState(initialState);
    };

    const onWsMessage = (ev, route) => handleWsMessage(ev, route);

    tradeSocket.onopen = () => onWsOpen(tradeRoute);
    tradeSocket.onmessage = (ev) => onWsMessage(ev, tradeRoute);
    tradeSocket.onclose = () => onWsClose(tradeRoute);

    quoteSocket.onopen = () => onWsOpen(quoteRoute);
    quoteSocket.onmessage = (ev) => onWsMessage(ev, quoteRoute);
    quoteSocket.onclose = () => onWsClose(quoteRoute);

    return () => {
      tradeSocket.onopen = null;
      tradeSocket.onmessage = null;
      tradeSocket.onclose = null;
      quoteSocket.onopen = null;
      quoteSocket.onmessage = null;
      quoteSocket.onclose = null;
    };
  }, [tradeSocket, quoteSocket, checkTCPConnected, checkTCPLoggedIn, handleWsMessage]);

  const connectTCP = useCallback(
    (route) => {
      send(
        JSON.stringify({
          type: 'connect',
        }),
        route
      );
    },
    [send]
  );

  const connectTCPWithInvalidUsername = useCallback(
    (route) => {
      send(
        JSON.stringify({
          type: 'connect',
          username: 'username',
        }),
        route
      );
    },
    [send]
  );

  const disconnectTCP = useCallback(
    (route) => {
      send(
        JSON.stringify({
          type: 'data',
          payload: {
            action: 'disconnect',
          },
        }),
        route
      );
    },
    [send]
  );

  const sendLogonWithInvalidUsername = useCallback(() => {
    connectTCPWithInvalidUsername(tradeRoute);
    connectTCPWithInvalidUsername(quoteRoute);
    clearLog({ shouldConfirm: false });
    fetchLogs();
  }, [clearLog, connectTCPWithInvalidUsername, fetchLogs]);

  const sendLogon = useCallback(() => {
    if (useInvalidUsernameRef.current?.checked) {
      return sendLogonWithInvalidUsername();
    }
    connectTCP(tradeRoute);
    connectTCP(quoteRoute);
    clearLog({ shouldConfirm: false });
    fetchLogs();
  }, [clearLog, connectTCP, fetchLogs, sendLogonWithInvalidUsername]);

  const sendLogout = useCallback(() => {
    disconnectTCP(tradeRoute);
    disconnectTCP(quoteRoute);
    fetchLogs();
  }, [disconnectTCP, fetchLogs]);

  const sendCollateralInquiry = useCallback(() => {
    const partyIDs = [collateralPartyIDRef1.current?.value, collateralPartyIDRef2.current?.value].filter(
      Boolean
    );

    if (partyIDs.length === 0) {
      return;
    }

    clearLog({ shouldConfirm: false });

    const data = {
      collInquiryID: generateUUID(),
      noPartyIDs: partyIDs.length,
      partyIDs,
      reports: {},
    };

    send(
      JSON.stringify({
        type: 'data',
        payload: {
          action: 'collateralinquiry',
          ...data,
        },
      }),
      tradeRoute
    );

    setState((prev) => ({
      ...prev,
      inquiries: { [data.collInquiryID]: data, ...prev.inquiries },
      currentCollInquiryID: data.collInquiryID,
      numOfReceivedCollateralReports: 0,
    }));

    setTimeout(fetchLogs, 500);
  }, [send, clearLog, fetchLogs]);

  const sendRequestForPositions = useCallback(() => {
    const partyIDs = [positionPartyIDRef1.current?.value, positionPartyIDRef2.current?.value].filter(Boolean);

    if (partyIDs.length === 0) {
      return;
    }

    clearLog({ shouldConfirm: false });

    const data = {
      posReqID: generateUUID(),
      posReqType: posReqTypeRef.current?.value,
      noPartyIDs: partyIDs.length,
      partyIDs,
      account: accountRef.current?.value,
      accountType: accountTypeRef.current?.value,
      clearingBusinessDate: clearingBusinessDateRef.current?.value.replace(/-/g, ''),
      reports: {},
    };

    send(
      JSON.stringify({
        type: 'data',
        payload: {
          action: 'requestforpositions',
          ...data,
        },
      }),
      tradeRoute
    );

    setState((prev) => ({
      ...prev,
      positions: { [data.posReqID]: data, ...prev.positions },
      currentPosReqID: data.posReqID,
      numOfReceivedPositionReports: 0,
    }));

    setTimeout(fetchLogs, 500);
  }, [send, clearLog, fetchLogs]);

  const sendNewOrderSingle = useCallback(
    (side) => {
      clearLog({ shouldConfirm: false });

      const data = {
        clOrdID: generateUUID(),
        orderQty: orderQuantityRef.current?.value,
        cumQty: '',
        ordType: orderTypeRef.current?.value,
        side,
        symbol: orderSymbolRef.current?.value,
        avgPx: '',
        lastPx: '',
        ordStatus: 'Initiated',
        ordRejReason: '',
        execType: '',
        price: orderLimitPriceRef.current?.value,
        timeInForce: orderTimeInForceRef.current?.value,
      };

      send(
        JSON.stringify({
          type: 'data',
          payload: {
            action: 'newordersingle',
            ...data,
          },
        }),
        tradeRoute
      );

      setState((prev) => ({
        ...prev,
        orders: { [data.clOrdID]: data, ...prev.orders },
        currentclOrdID: data.clOrdID,
        canCancelOrder: true,
      }));

      setTimeout(fetchLogs, 500);
    },
    [send, clearLog, fetchLogs]
  );

  const sendOrderCancelRequest = useCallback(() => {
    const data = {
      clOrdID: generateUUID(),
      origClOrdID: state.currentclOrdID,
      orderID: state.orders[state.currentclOrdID]?.orderID,
      symbol: state.orders[state.currentclOrdID]?.symbol,
    };

    send(
      JSON.stringify({
        type: 'data',
        payload: {
          action: 'ordercancelrequest',
          ...data,
        },
      }),
      tradeRoute
    );

    setState((prev) => ({ ...prev, canCancelOrder: false }));
    setTimeout(fetchLogs, 500);
  }, [send, state.currentclOrdID, state.orders, fetchLogs]);

  const handleMarketChange = useCallback(() => {
    if (!orderLimitPriceRef.current || !orderTimeInForceRef.current) return;

    orderLimitPriceRef.current.disabled = false;
    orderTimeInForceRef.current.disabled = false;

    if (orderTypeRef.current?.value === 'Market') {
      orderLimitPriceRef.current.disabled = true;
      orderTimeInForceRef.current.disabled = true;
    }
  }, []);

  const sendMarketDataRequest = useCallback(
    ({ subscriptionType = 'subscribe' }) => {
      let symbols = [];
      if (quoteSymbol1Ref.current?.value) {
        symbols = [...symbols, quoteSymbol1Ref.current.value];
      }
      if (quoteSymbol2Ref.current?.value) {
        symbols = [...symbols, quoteSymbol2Ref.current.value];
      }

      if (subscriptionType === 'unsubscribe') {
        symbols = Object.keys(state.market);
      }

      if (useUnsupportedSymbolRef.current.checked) {
        symbols = ['ABCDEF'];
      }

      if (!symbols.length) {
        return;
      }

      if (subscriptionType !== 'unsubscribe') {
        clearLog({ shouldConfirm: false });
      }

      const subscriptionCodes = {
        snapshot: '0',
        subscribe: '1',
        unsubscribe: '2',
      };

      send(
        JSON.stringify({
          type: 'data',
          payload: {
            action: 'marketdatarequest',
            MDReqID: state.currentMDReqID,
            SubscriptionRequestType: subscriptionCodes[subscriptionType],
            MarketDepth: '1', // Top of Book
            MDUpdateType: '0', // Full Refresh
            NoMDEntryTypes: '2',
            MDEntryTypes: ['0', '1'], // Bid, Offer
            NoRelatedSym: symbols.length, // Number of symbols (instruments) requested
            Symbols: symbols,
          },
        }),
        quoteRoute
      );

      if (subscriptionType === 'unsubscribe') {
        setTimeout(
          () =>
            setState((prev) => ({
              ...prev,
              currentMDReqID: generateUUID(),
              marketStreaming: false,
            })),
          500
        );
      } else {
        setState((prev) => ({
          ...prev,
          marketStreaming: !useUnsupportedSymbolRef.current.checked,
          market: initialState.market,
        }));
      }

      setTimeout(fetchLogs, 500);
    },
    [send, state.currentMDReqID, state.market, fetchLogs, clearLog]
  );

  const renderLog = useCallback(
    (log) => {
      const [date, data] = log.split('->');
      const { title, type, message } = JSON.parse(data.trim());
      const direction = type.includes('sent') ? '↑' : '↓';
      const isSentFixMessage = message.includes('|') && type.includes('sent');
      const isQuoteFixMessage = message.includes('|35=V|') || message.includes('|35=Y|');

      let __html = `<time>${date.trim()}</time>: [<b>${title}</b>] ${direction} <u>${type.toUpperCase()}</u>\n`;

      if (isSentFixMessage || isQuoteFixMessage) {
        let checked = {
          all: true,
          tests: [],
        };

        const isConnectivityFixMessage =
          message.includes('|35=A|') || message.includes('|35=0|') || message.includes('|35=5|');

        if (isConnectivityFixMessage) {
          checked = verifyConnectivityFixMessage(message);
        }

        const isTradingFixMessage =
          message.includes('|35=D|') ||
          message.includes('|35=F|') ||
          message.includes('|35=AO|') ||
          message.includes('|35=AP|');

        if (isTradingFixMessage) {
          checked = verifyTradingFixMessage(message, state.currentclOrdID, state.currentOrderID);
        }

        if (isQuoteFixMessage) {
          checked = verifyQuoteFixMessage(message, state.currentMDReqID);
        }

        __html += `<details open>
          <summary>${
            checked.all ? '<span class="dot bg-green"></span>' : '<span class="dot bg-red"></span>'
          } ${message}</summary>
          ${
            checked.tests.length == 0
              ? ''
              : `<ul>
          ${checked.tests
            .filter((test) => test.message.length > 0)
            .map(
              (test) =>
                `<li>${
                  test.result ? '<span class="dot bg-green"></span>' : '<span class="dot bg-red"></span>'
                } ${test.message}</li>`
            )
            .join('\n')}</ul>`
          }
        </details>`;
      } else {
        __html += `<div>>&nbsp;&nbsp; ${message}</div>`;
      }

      const sanitizedData = DOMPurify.sanitize(__html);

      return <div key={log}>{parse(sanitizedData, { trim: true })}</div>;
    },
    [state.currentMDReqID, state.currentOrderID, state.currentclOrdID]
  );

  const {
    tradeWsReady,
    quoteWsReady,
    showConnectivitySection,
    showTradeSection,
    showQuoteSection,
    showQueryPositionsSection,
    showCollateralReportsSection,
    showHeartbeats,
    tcpConnectedTrade,
    tcpConnectedQuote,
    tcpLoggedInTrade,
    tcpLoggedInQuote,
    allowSubscription,
    marketStreaming,
    logs,
    tests,
    orders,
    canCancelOrder,
    currentclOrdID,
    positions,
    inquiries,
    market,
    error,
  } = state;

  // Derived state
  const wsReady = tradeWsReady && quoteWsReady;
  const tcpConnected = tcpConnectedTrade && tcpConnectedQuote;
  const tcpLoggedIn = tcpLoggedInTrade && tcpLoggedInQuote;

  return (
    <>
      <header className="top">
        <h1>FIX 4.4</h1>

        <Connections state={{ quoteWsReady, tradeWsReady, tcpConnected, tcpLoggedIn }} />

        {wsReady &&
          (tcpConnected && tcpLoggedIn ? (
            <button type="button" onClick={sendLogout}>
              LOGOUT
            </button>
          ) : (
            <>
              <button type="button" onClick={sendLogon}>
                LOGON
              </button>
              <label>
                <input type="checkbox" ref={useInvalidUsernameRef} /> Use invalid username
              </label>
            </>
          ))}
      </header>

      <Sections
        state={{
          showConnectivitySection,
          showQuoteSection,
          showTradeSection,
          showQueryPositionsSection,
          showCollateralReportsSection,
        }}
        fns={{ setState }}
      />

      {!(tradeWsReady || quoteWsReady) && <button onClick={() => location.reload()}>Reload</button>}

      {(error.textReason || error.textReject) && (
        <FixApiError
          state={{
            initialStateError: initialState.error,
            textReject: error.textReject,
            textReason: error.textReason,
          }}
          fns={{ setState }}
        />
      )}

      {tcpLoggedIn && (
        <>
          {showQuoteSection && (
            <Quote>
              <QuoteHeader
                symbols1={['BTCUSDT', 'ETHBTC']}
                symbols2={['ETHUSDT']}
                state={{
                  allowSubscription,
                  marketStreaming,
                }}
                refs={{ quoteSymbol1Ref, quoteSymbol2Ref, useUnsupportedSymbolRef }}
                fns={{ sendMarketDataRequest, setState }}
              />
              <QuoteData market={market} />
            </Quote>
          )}

          {showTradeSection && (
            <Trade>
              <TradeHeader
                symbols={['BTCUSDT', 'ETHBTC', 'ETHUSDT']}
                state={{
                  canCancelOrder,
                  orders,
                  currentclOrdID,
                }}
                refs={{
                  orderSymbolRef,
                  orderQuantityRef,
                  orderTimeInForceRef,
                  orderTypeRef,
                  orderLimitPriceRef,
                }}
                fns={{
                  handleMarketChange,
                  sendNewOrderSingle,
                  sendOrderCancelRequest,
                  setState,
                }}
              />
              <TradeData orders={orders} />
            </Trade>
          )}

          {showQueryPositionsSection && (
            <Position>
              <PositionHeader
                refs={{
                  posReqTypeRef,
                  accountRef,
                  accountTypeRef,
                  positionPartyIDRef1,
                  positionPartyIDRef2,
                  clearingBusinessDateRef,
                }}
                fns={{ sendRequestForPositions }}
              />
              <PositionData positions={positions} />
              <PositionReports positions={positions} />
            </Position>
          )}

          {showCollateralReportsSection && (
            <CollateralReport>
              <CollateralReportHeader
                refs={{ collateralPartyIDRef1, collateralPartyIDRef2 }}
                fns={{ sendCollateralInquiry }}
              />
              <CollateralReportData inquiries={inquiries} />
              <CollateralReportInquiry inquiries={inquiries} />
            </CollateralReport>
          )}
        </>
      )}

      {wsReady && (
        <section className="flex">
          <TestCases
            state={{
              tests,
              showConnectivitySection,
              showQuoteSection,
              showTradeSection,
              showQueryPositionsSection,
              showCollateralReportsSection,
            }}
          />
          <Logs state={{ logs, showHeartbeats }} fns={{ setState, clearLog, renderLog }} />
        </section>
      )}
    </>
  );
};

export default App;
