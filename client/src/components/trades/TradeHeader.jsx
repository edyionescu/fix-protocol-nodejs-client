import { TimeInForceDef } from '../../lib/fixTypes';

function TradeHeader({
  symbols = [],
  state: { canCancelOrder, orders, currentclOrdID },
  refs: { orderSymbolRef, orderQuantityRef, orderTimeInForceRef, orderTypeRef, orderLimitPriceRef },
  fns: { handleMarketChange, sendNewOrderSingle, sendOrderCancelRequest },
}) {
  return (
    <header>
      <h2>TRADE</h2>

      <form>
        <label>
          Symbol
          <select defaultValue={symbols[0] ?? ''} ref={orderSymbolRef}>
            {symbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input type="number" ref={orderQuantityRef} defaultValue="0.001" style={{ width: '4em' }} />
        </label>
        <label>
          Time in Force
          <select defaultValue="Day" ref={orderTimeInForceRef} disabled>
            {Object.entries(TimeInForceDef).map(([key, def]) => (
              <option key={key} value={key}>
                {def}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select defaultValue="Market" ref={orderTypeRef} onChange={handleMarketChange}>
            <option value="Market">MARKET</option>
            <option value="Limit">LIMIT</option>
          </select>
        </label>
        <label>
          Price
          <input type="number" ref={orderLimitPriceRef} defaultValue="1" disabled style={{ width: '6em' }} />
        </label>
        <button type="button" className="button-smaller" onClick={() => sendNewOrderSingle('Buy')}>
          BUY
        </button>
        <button type="button" className="button-smaller" onClick={() => sendNewOrderSingle('Sell')}>
          SELL
        </button>
        <button
          type="button"
          className="button-smaller"
          disabled={!canCancelOrder || !orders[currentclOrdID].orderID}
          onClick={() => sendOrderCancelRequest('Cancel')}
        >
          CANCEL LAST ORDER
        </button>
      </form>
    </header>
  );
}

export default TradeHeader;
