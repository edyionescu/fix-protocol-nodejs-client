import { Fragment } from 'react';

function TestCases({
  state: {
    tests,
    showConnectivitySection,
    showQuoteSection,
    showTradeSection,
    showQueryPositionsSection,
    showCollateralReportsSection,
  },
}) {
  return (
    <details open className="flex-item flex-item-test-cases">
      <summary>Tests</summary>
      <pre className="maxh-680 overflow-y-auto">
        <table className="tests">
          <thead>
            <tr>
              <th>Test Case</th>
              <th>Quote</th>
              <th>Trade</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(tests)
              .sort((a, b) => a[1].index < b[1].index)
              .map(([, test]) => {
                const chapter = test.index.slice(0, test.index.indexOf('.'));
                const hideSection =
                  (chapter == 1 && showConnectivitySection === false) ||
                  (chapter == 3 && showQuoteSection === false) ||
                  ((chapter == 5 || chapter == 6) && showTradeSection === false) ||
                  ((chapter == 7 || chapter == 8) && showQueryPositionsSection === false) ||
                  ((chapter == 9 || chapter == 10) && showCollateralReportsSection === false);

                return (
                  <Fragment key={test.index}>
                    {test.headline && (
                      <tr
                        className="headline"
                        style={{
                          display: hideSection ? 'none' : 'table-row',
                        }}
                      >
                        <td colSpan={3}>
                          <h4>{test.headline}</h4>
                        </td>
                      </tr>
                    )}
                    <tr style={{ display: hideSection ? 'none' : 'table-row' }}>
                      <td>
                        <b>{test.index}</b> {test.message}
                      </td>
                      <td
                        className="dot-td"
                        style={{
                          cursor: test.quote.fixMessage ? 'pointer' : 'default',
                        }}
                        title={test.quote.fixMessage}
                        onClick={() => test.quote.fixMessage && alert(test.quote.fixMessage)}
                      >
                        {test.quote.result === '' ? (
                          '-'
                        ) : test.quote.result === true ? (
                          <span className="dot bg-green" />
                        ) : (
                          <span className="dot bg-red" />
                        )}
                      </td>
                      <td
                        className="dot-td"
                        style={{
                          cursor: test.trade.fixMessage ? 'pointer' : 'default',
                        }}
                        title={test.trade.fixMessage}
                        onClick={() => test.trade.fixMessage && alert(test.trade.fixMessage)}
                      >
                        {test.trade.result === '' ? (
                          '-'
                        ) : test.trade.result === true ? (
                          <span className="dot bg-green" />
                        ) : (
                          <span className="dot bg-red" />
                        )}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </pre>
    </details>
  );
}

export default TestCases;
