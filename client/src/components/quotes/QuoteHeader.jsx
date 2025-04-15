function QuoteHeader({
  symbols1 = [],
  symbols2 = [],
  state: { allowSubscription, marketStreaming },
  refs: { quoteSymbol1Ref, quoteSymbol2Ref, useUnsupportedSymbolRef },
  fns: { sendMarketDataRequest, setState },
}) {
  const elementDisabled = !allowSubscription || marketStreaming;

  return (
    <header>
      <h2>QUOTE</h2>

      <form>
        <label>
          Symbol [1]
          <select defaultValue="" ref={quoteSymbol1Ref} disabled={elementDisabled}>
            <option value="" />
            {symbols1.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </label>
        <label>
          Symbol [2]
          <select defaultValue="" ref={quoteSymbol2Ref} disabled={elementDisabled}>
            <option value="" />
            {symbols2.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="button-smaller"
          disabled={elementDisabled}
          onClick={() => {
            sendMarketDataRequest({
              subscriptionType: 'snapshot',
            });
          }}
        >
          Snapshot
        </button>

        <button
          type="button"
          className="button-smaller"
          disabled={elementDisabled}
          onClick={() => {
            sendMarketDataRequest({
              subscriptionType: 'subscribe',
            });
          }}
        >
          Subscribe
        </button>

        <button
          type="button"
          className="button-smaller"
          disabled={!marketStreaming}
          onClick={() => {
            sendMarketDataRequest({
              subscriptionType: 'unsubscribe',
            });
          }}
        >
          Unsubscribe
        </button>
        <label className="unsupportedSymbol">
          <input
            type="checkbox"
            ref={useUnsupportedSymbolRef}
            onChange={() => {
              if (!useUnsupportedSymbolRef.current.checked) {
                setState((prev) => ({ ...prev, allowSubscription: true }));
              }
            }}
          />{' '}
          Send with Unsupported Symbol
        </label>
      </form>
    </header>
  );
}

export default QuoteHeader;
