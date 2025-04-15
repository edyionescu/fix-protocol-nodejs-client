const TimeInForceDef = {
  GoodTillCancel: 'GOOD_TILL_CANCEL',
  ImmediateOrCancel: 'IMMEDIATE_OR_CANCEL',
  FillOrKill: 'FILL_OR_KILL',
};

const PosReqTypeDef = {
  Position: 'Position',
  Trade: 'Trade',
  Exercise: 'Exercise',
  Assignments: 'Assignments',
};

const AccountTypeDef = {
  AccountIsCarriedOnCustomerSideOfBooks: 'Account is carried on customer Side of Books',
  AccountIsCarriedOnNonCustomerSideOfBooks: 'Account is carried on non-Customer Side of books',
  HouseTrader: 'House Trader',
  FloorTrader: 'Floor Trader',
  AccountIsCarriedOnNonCustomerSideOfBooksAndIsCrossMargined:
    'Account is carried on non-customer side of books and is cross margined',
  AccountIsHouseTraderAndIsCrossMargined: 'Account is house trader and is cross margined',
  JointBackofficeAccount: 'Joint Backoffice Account (JBO)',
};

export { TimeInForceDef, PosReqTypeDef, AccountTypeDef };
