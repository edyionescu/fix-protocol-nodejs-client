const initialTestCaseRoutes = {
  trade: {
    result: '',
    fixMessage: '',
  },
  quote: {
    result: '',
    fixMessage: '',
  },
};

const initialTestCases = {
  socket_open: {
    index: '1.a)',
    headline: 'Connectivity and Authentication',
    message: 'Client Opens Socket Connection to FIX Server on pre-defined port',
    test: () => true,
    ...initialTestCaseRoutes,
  },
  logon_sent: {
    index: '1.b)',
    message: 'Client sends Logon (35=A)',
    test: () => true,
    ...initialTestCaseRoutes,
  },
  logon_received: {
    index: '1.c)',
    message: 'FIX Server sends Logon Response (35=A)',
    test: () => true,
    ...initialTestCaseRoutes,
  },
  heartbeat_received: {
    index: '1.d.1)',
    message: 'FIX Server / Client Exchange Heartbeat Message (35=0) / Received',
    test: () => true,
    ...initialTestCaseRoutes,
  },
  heartbeat_sent: {
    index: '1.d.2)',
    message: 'FIX Server / Client Exchange Heartbeat Message (35=0) / Sent',
    test: () => true,
    ...initialTestCaseRoutes,
  },
  logout_sent: {
    index: '1.e)',
    message: 'Client sends Logout (35=5), FIX Server acknowledges Logout Message (35=5)',
    test: () => true,
    ...initialTestCaseRoutes,
  },
  logout_received: {
    index: '1.f)',
    message: 'FIX Server sends Logout Message (35=5), Client acknowledges Logout Message (35=5)',
    test: () => true,
    ...initialTestCaseRoutes,
  },
  reject_received: {
    index: '1.g)',
    message: `Client sends Logon Message (35=A) with an invalid username (553),
     FIX Server responds with Reject (35=3)`,
    test: (msg) => (msg.includes('|35=3|') && msg.includes('|58=')) || '',
    ...initialTestCaseRoutes,
  },
  logon_reset_seq: {
    index: '1.h)',
    message: 'Client resets sequence numbers on Trade/Quote sessions',
    test: (msg) => msg.includes('|35=A|') && msg.includes('|141=Y|'),
    ...initialTestCaseRoutes,
  },
  marketdatarequest_sent: {
    index: '3.a.1)',
    headline: 'Quote Streaming',
    message: 'Client sends MarketDataRequest (35=V)',
    test: (msg) => msg.includes('|35=V|'),
    ...initialTestCaseRoutes,
  },
  marketdatasnapshotfullrefresh_received: {
    index: '3.a.2)',
    message: 'FIX Server responds with MarketDataSnapshot / Full Refresh (35=W)',
    test: (msg) => msg.includes('|35=W|'),
    ...initialTestCaseRoutes,
  },
  marketdatasnapshotfullrefresh_bulk_received: {
    index: '3.b)',
    message: `Client sends MarketDataRequest (35=V) for multiple products in bulk,
     Client and FIX Server verify pricing`,
    test: (msg) => msg.includes('|35=W|'),
    ...initialTestCaseRoutes,
  },
  marketdatarequestreject_received: {
    index: '3.c)',
    message: `Client sends MarketDataRequest (35=V) with unsupported symbol (XXX/YYY),
 FIX Server responds with MaketDataRequestReject (35=Y). Client acknowledges the reject,
 and does not attempt to re-subscribe to the unsupported symbol during active session`,
    test: (msg) => msg.includes('|35=Y|'),
    ...initialTestCaseRoutes,
  },
  quotecancel_received: {
    index: '3.d)',
    message: `FIX Server sends a QuoteCancel (35=Z) to the client for a symbol they are currently
 receiving quotes for. Client should acknowledge receipt of the QuoteCancel msg
 without rejection back to FIX Server Bridge.`,
    test: (msg) => msg.includes('|35=Z|'),
    ...initialTestCaseRoutes,
  },
  marketdatarequest_unsubscribe_sent: {
    index: '3.e)',
    message: `Client sends MarketDataRequest (35=V) where SubscriptionRequestType (263) is
     "Unsubscribe" (2) to cancel streaming, FIX Server and Client verify pricing stops`,
    test: (msg) => (msg.includes('|35=V|') && msg.includes('|263=2|')) || '',
    ...initialTestCaseRoutes,
  },
  order_sent: {
    index: '5.a.1)',
    headline: `Order Execution`,
    message: `Client sends NewOrderSingle (35=D)`,
    test: (msg) => msg.includes('|35=D|'),
    ...initialTestCaseRoutes,
  },
  executionreport_received: {
    index: '5.a.2)',
    message: `FIX Server responds with ExecutionReport (35=8), OrdStatus (39)
      is "Pending New" (A) and ExecType (150) is "Pending New" (A)`,
    test: (msg) => (msg.includes('|35=8|') && msg.includes('|39=A|') && msg.includes('|150=A|')) || '',
    ...initialTestCaseRoutes,
  },
  executionreport_filled_received: {
    index: '5.b)',
    message: `FIX Server responds with ExecutionReport (35=8) where ExecType (150)
      is "Trade" (F) and OrdStatus (39) is "Filled" (2)`,
    test: (msg) => (msg.includes('|35=8|') && msg.includes('|39=2|') && msg.includes('|150=F|')) || '',
    ...initialTestCaseRoutes,
  },
  order_gtc_sent: {
    index: '5.c.1)',
    message: `Client sends NewOrderSingle (35=D) with TimeinForce "GTC" (59=1)`,
    test: (msg) => (msg.includes('|35=D|') && msg.includes('|59=1|')) || '',
    ...initialTestCaseRoutes,
  },
  order_ioc_sent: {
    index: '5.c.2)',
    message: `Client sends NewOrderSingle (35=D) with TimeinForce "IOC" (59=3)`,
    test: (msg) => (msg.includes('|35=D|') && msg.includes('|59=3|')) || '',
    ...initialTestCaseRoutes,
  },
  order_fok_sent: {
    index: '5.c.3)',
    message: `Client sends NewOrderSingle (35=D) with TimeinForce "FOK" (59=4)`,
    test: (msg) => (msg.includes('|35=D|') && msg.includes('|59=4|')) || '',
    ...initialTestCaseRoutes,
  },
  order_unique_clordid_sent: {
    index: '5.d)',
    message: `Client disconnects. Then reconnects and places additional orders,
     FIX Server verifies ClOrdID (11) is unique across sessions in NewOrderSingle (35=D)`,
    test: (msg) => msg.includes('|11='),
    ...initialTestCaseRoutes,
  },
  executionreport_cancel_with_remainder_received: {
    index: '5.e)',
    message: `Cancel with Remainder: FIX Server sends ExecutionReport (35=8)
     where ExecType (150) is "Canceled" (4) and CumQty (14) is the filled amount`,
    test: (msg) => (msg.includes('|35=8|') && msg.includes('|150=4|') && msg.includes('|14=')) || '',
    ...initialTestCaseRoutes,
  },
  executionreport_rejected_received: {
    index: '5.f)',
    message: `FIX Server sends ExecutionReport (35=8) where ExecType (150) is Rejected" (8)
     and CumQty (14) is the filled amount`,
    test: (msg) => (msg.includes('|35=8|') && msg.includes('|150=8|')) || '',
    ...initialTestCaseRoutes,
  },
  executionreport_order_cancel_received: {
    index: '5.g)',
    message: `Order Cancel: Client sends NewOrderSingle (35=D), FIX Server holds the order
    in "New", Client sends OrderCancelRequest (35=F), FIX Server respond with
    ExecutionReport (35=8) with ExecType "Canceled" (4)`,
    test: (msg) => (msg.includes('|35=8|') && msg.includes('|150=4|')) || '',
    ...initialTestCaseRoutes,
  },
  executionreport_order_trade_filled_received: {
    index: '6.c)',
    message: `In ExecutionReport (35=8), where ExecType is "Trade" (F)
    and OrdStatus (39) is "Filled"(2) verify Symbol (55), Side (54), OrderQty (38),
    TimeInForce (59), OrdType (40), LastPx (31), and CumQty (14)`,
    test: (msg) =>
      (msg.includes('|35=8|') &&
        msg.includes('|150=F|') &&
        msg.includes('|39=2|') &&
        msg.includes('|55=') &&
        msg.includes('|54=') &&
        msg.includes('|38=') &&
        msg.includes('|59=') &&
        msg.includes('|40=') &&
        msg.includes('|31=') &&
        msg.includes('|14=')) ||
      '',
    ...initialTestCaseRoutes,
  },
  executionreport_order_cancel_cumqty_received: {
    index: '6.d)',
    message: `FIX Server respond with ExecutionReport (35=8) with ExecType "Canceled" (4),
    verify Client is using CumQty (14) for final fill amount`,
    test: (msg) => (msg.includes('|35=8|') && msg.includes('|150=4|') && msg.includes('|14=')) || '',
    ...initialTestCaseRoutes,
  },
  requestforpositions_sent: {
    index: '7.a.1)',
    headline: `Query Positions`,
    message: `Client sends RequestForPostions (35=AN)`,
    test: (msg) => msg.includes('|35=AN|') || '',
    ...initialTestCaseRoutes,
  },
  requestforpositionsack_received: {
    index: '7.a.2)',
    message: `FIX Server responds with RequestForPositionsAck (35=AO)`,
    test: (msg) => msg.includes('|35=AO|') || '',
    ...initialTestCaseRoutes,
  },
  positionreport_received: {
    index: '7.a.3)',
    message: `FIX Server responds a number of PositionReports(35=AP)`,
    test: (msg) => msg.includes('|35=AP|') || '',
    ...initialTestCaseRoutes,
  },
  requestforpositionsack_posreqid_received: {
    index: '8.a.1)',
    message: `Verify RequestForPositions (35=AN) Tag 710 (PosReqID) is same
        for all response msgs RequestForPositionsAck(35=AO)`,
    test: (msg, currentPosReqID) =>
      ((msg.includes('|35=AO|') &&
        msg.includes('|710=') &&
        Number(
          msg
            .split('|')
            .find((el) => el.includes('710='))
            .replace('710=', '')
        )) ||
        0) === currentPosReqID || '',
    ...initialTestCaseRoutes,
  },
  positionreport_posreqid_received: {
    index: '8.a.2)',
    message: `Verify RequestForPositions (35=AN) Tag 710 (PosReqID) is same
        for all response msgs PositionsReport(35=AP)`,
    test: (msg, currentPosReqID) =>
      ((msg.includes('|35=AP|') &&
        msg.includes('|710=') &&
        Number(
          msg
            .split('|')
            .find((el) => el.includes('710='))
            .replace('710=', '')
        )) ||
        0) === currentPosReqID || '',
    ...initialTestCaseRoutes,
  },
  positionreport_totalnum_received: {
    index: '8.b)',
    message: `Verify RequestForPositionsAck(35=AO) Tag 727 (TotalNumPosReports)
      equals the number of PositionReport (35=AP) messages client received`,
    test: (msg, numOfReceivedPositionReports) =>
      ((msg.includes('|35=AP|') &&
        msg.includes('|727=') &&
        Number(
          msg
            .split('|')
            .find((el) => el.includes('727='))
            .replace('727=', '')
        )) ||
        0) === numOfReceivedPositionReports || '',
    ...initialTestCaseRoutes,
  },
  collateralinquiry_sent: {
    index: '9.a.1)',
    headline: `Collateral Reports`,
    message: `Client sends CollateralInquiry (35=BB)`,
    test: (msg) => msg.includes('|35=BB|') || '',
    ...initialTestCaseRoutes,
  },
  collateralinquiryack_received: {
    index: '9.a.2)',
    message: `FIX Server responds with CollateralInquiryACK (35=BG)`,
    test: (msg) => msg.includes('|35=BG|') || '',
    ...initialTestCaseRoutes,
  },
  collateralreport_received: {
    index: '9.a.3)',
    message: `FIX Server responds with a number of CollateralReport (35=BA)`,
    test: (msg) => msg.includes('|35=BA|') || '',
    ...initialTestCaseRoutes,
  },
  collateralinquiryack_collinquiryid_received: {
    index: '10.a.1)',
    message: `Verify CollateralInquiry (35=BB) Tag 909 (CollInquiryId) is same
        for all response msgs CollateralInquiryACK (35=BG)`,
    test: (msg, currentCollInquiryID) =>
      ((msg.includes('|35=BG|') &&
        msg.includes('|909=') &&
        Number(
          msg
            .split('|')
            .find((el) => el.includes('909='))
            .replace('909=', '')
        )) ||
        0) === currentCollInquiryID || '',
    ...initialTestCaseRoutes,
  },
  collateralreport_collinquiryid_received: {
    index: '10.a.2)',
    message: `Verify CollateralInquiry (35=BB) Tag 909 (CollInquiryId) is same
        for all response msgs CollateralReport (35=BA)`,
    test: (msg, currentCollInquiryID) =>
      ((msg.includes('|35=BA|') &&
        msg.includes('|909=') &&
        Number(
          msg
            .split('|')
            .find((el) => el.includes('909='))
            .replace('909=', '')
        )) ||
        0) === currentCollInquiryID || '',
    ...initialTestCaseRoutes,
  },
  collateralreport_totalnum_received: {
    index: '10.b)',
    message: `Verify CollateralInquiryACK (35=BG) Tag 911 (TotNumReports)
      equals the number of CollateralReport (35=BA) messages client received`,
    test: (msg, numOfReceivedCollateralReports) =>
      ((msg.includes('|35=BA|') &&
        msg.includes('|911=') &&
        Number(
          msg
            .split('|')
            .find((el) => el.includes('911='))
            .replace('911=', '')
        )) ||
        0) === numOfReceivedCollateralReports || '',
    ...initialTestCaseRoutes,
  },
};

// Helper functions for FIX message verification
function verifyConnectivityFixMessage(message) {
  if (!message.includes('|')) {
    return {
      all: false,
      tests: [],
    };
  }

  const parts = message.split('|');

  const test1 = {
    message: '2.a) BeginString (8) is always present and the first field',
    result: parts[0].slice(0, 1) == 8,
  };

  const test2 = {
    message: '2.b) BodyLength (9) is always present and the second field',
    result: parts[1].slice(0, 1) == 9,
  };

  const test3 = {
    message: '2.c) MessageType (35) is always present and the third field',
    result: parts[2].slice(0, 2) == 35,
  };

  const test4 = {
    message: '2.d) Verify MsgSeqNum (34), SenderCompID (49) and TargetCompID (56) are always present',
    result: message.includes('|34=') && message.includes('|49=') && message.includes('|56='),
  };

  let test5 = {
    message: '',
    result: true,
  };

  if (message.includes('|35=A|')) {
    test5 = {
      message: '2.e) Verify ResetSeqNumFlag (141) is resetting every login',
      result: message.includes('|141=Y|'),
    };
  }

  let all = test1.result && test2.result && test3.result && test4.result && test5.result;
  let tests = [test1, test2, test3, test4, test5];

  return {
    all,
    tests,
  };
}

function verifyQuoteFixMessage(message, currentMDReqID) {
  if (!message.includes('|')) {
    return {
      all: false,
      tests: [],
    };
  }

  const test1 = {
    message: '4.a) MDReqID (262) is always present and unique per session.',
    result: message.includes('|262='),
  };

  let test2 = {
    message: '',
    result: true,
  };

  if (message.includes('|35=V|')) {
    test2 = {
      message: '4.b) NoMDEntryTypes (267) is always present and has a value of 2',
      result: message.includes('|267=2|'),
    };
  }

  let test3 = {
    message: '',
    result: true,
  };

  if (message.includes('|35=V|')) {
    test3 = {
      message:
        '4.c) In Bulk subscription, NoRelatedSym (146) = the number of symbols requested, otherwise NoRelatedSym (146) = 1',
      result: (() => {
        const symbols = message.match(/55=/g) || [];
        const relatedSymbols = message.split('|').find((el) => el.includes('146='));
        if (!relatedSymbols) {
          return false;
        }
        const numOfRelatedSymbols = Number(relatedSymbols.replace('146=', '')) || 0;
        return numOfRelatedSymbols === symbols.length;
      })(),
    };
  }

  let test4 = {
    message: '',
    result: true,
  };

  if (message.includes('|35=Y|')) {
    test4 = {
      message:
        '4.e) In MarketDataRequestReject (35=Y), MDReqID (262) matches MDReqID (262) from the MarketDataRequest (35=V) message being rejected',
      result: (() => {
        if (!test1.result) {
          return false;
        }

        const rejectMDReqID = message
          .split('|')
          .find((el) => el.includes('262'))
          .replace('262=', '');

        return rejectMDReqID == currentMDReqID;
      })(),
    };
  }

  let all = test1.result && test2.result && test3.result && test4.result;
  let tests = [test1, test2, test3, test4];

  return {
    all,
    tests,
  };
}

function verifyTradingFixMessage(message, currentclOrdID, currentOrderID) {
  if (!message.includes('|')) {
    return {
      all: false,
      tests: [],
    };
  }

  let test1 = {
    message: '',
    result: true,
  };

  if (message.includes('|35=D|')) {
    test1 = {
      message: '6.a) In NewOrderSingle (35=D), ClOrdID (11) is always present and unique across sessions',
      result: message.includes('|11='),
    };
  }

  let test2 = {
    message: '',
    result: true,
  };

  if (message.includes('|35=D|')) {
    test2 = {
      message:
        '6.b) In NewOrderSingle (35=D), verify Symbol (55), Side (54), OrderQty (38), and OrdType (40). If OrdType (40) = “Limit” (2), verify Price (44) and TimeInForce (59)',
      result:
        message.includes('|55=') &&
        message.includes('|54=') &&
        message.includes('|38=') &&
        (message.includes('|40=2|') ? message.includes('|59=') : true) &&
        message.includes('|40=') &&
        (message.includes('|40=2|') ? message.includes('|44=') : true),
    };
  }

  let test3 = {
    message: '',
    result: true,
  };

  if (message.includes('|35=F|')) {
    test3 = {
      message:
        '6.e) In OrderCancelRequest (35=F), OrigClOrdID (41) matches ClOrdID (11) from NewOrderSingle (35=D) Client is attempting to cancel',
      result:
        (message.includes('|41=') &&
          Number(
            message
              .split('|')
              .find((el) => el.includes('41='))
              .replace('41=', '')
          )) ||
        0 === currentOrderID,
    };
  }

  let all = test1.result && test2.result && test3.result;
  let tests = [test1, test2, test3];

  return {
    all,
    tests,
  };
}

export { initialTestCases, verifyConnectivityFixMessage, verifyQuoteFixMessage, verifyTradingFixMessage };
