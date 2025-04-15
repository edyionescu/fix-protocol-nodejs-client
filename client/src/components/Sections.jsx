function Sections({
  state: {
    showConnectivitySection = false,
    showQuoteSection = false,
    showTradeSection = false,
    showQueryPositionsSection = false,
    showCollateralReportsSection = false,
  },
  fns: { setState },
}) {
  return (
    <details className="toggleSection">
      <summary>SECTIONS</summary>
      <pre className="m-0">
        <table>
          <tbody>
            <tr>
              <td>
                <input
                  id="sectionConnectivity"
                  type="checkbox"
                  defaultChecked={showConnectivitySection}
                  onChange={({ target: { checked } }) => {
                    setState((prev) => ({ ...prev, showConnectivitySection: checked }));
                    localStorage.setItem('showConnectivitySection', JSON.stringify(checked));
                  }}
                />
              </td>
              <td>
                <label className="label" htmlFor="sectionConnectivity">
                  CONNECTIVITY AND AUTHENTICATION
                </label>
              </td>
            </tr>
            <tr>
              <td>
                <input
                  id="sectionQuote"
                  type="checkbox"
                  defaultChecked={showQuoteSection}
                  onChange={({ target: { checked } }) => {
                    setState((prev) => ({ ...prev, showQuoteSection: checked }));
                    localStorage.setItem('showQuoteSection', JSON.stringify(checked));
                  }}
                />
              </td>
              <td>
                <label className="label" htmlFor="sectionQuote">
                  QUOTE STREAMING
                </label>
              </td>
            </tr>
            <tr>
              <td>
                <input
                  id="tradeQuote"
                  type="checkbox"
                  defaultChecked={showTradeSection}
                  onChange={({ target: { checked } }) => {
                    setState((prev) => ({ ...prev, showTradeSection: checked }));
                    localStorage.setItem('showTradeSection', JSON.stringify(checked));
                  }}
                />
              </td>
              <td>
                <label className="label" htmlFor="tradeQuote">
                  ORDER EXECUTION
                </label>
              </td>
            </tr>
            <tr>
              <td>
                <input
                  id="queryPositions"
                  type="checkbox"
                  defaultChecked={showQueryPositionsSection}
                  onChange={({ target: { checked } }) => {
                    setState((prev) => ({ ...prev, showQueryPositionsSection: checked }));
                    localStorage.setItem('showQueryPositionsSection', JSON.stringify(checked));
                  }}
                />
              </td>
              <td>
                <label className="label" htmlFor="queryPositions">
                  QUERY POSITIONS
                </label>
              </td>
            </tr>
            <tr>
              <td>
                <input
                  id="collateralReports"
                  type="checkbox"
                  defaultChecked={showCollateralReportsSection}
                  onChange={({ target: { checked } }) => {
                    setState((prev) => ({ ...prev, showCollateralReportsSection: checked }));
                    localStorage.setItem('showCollateralReportsSection', JSON.stringify(checked));
                  }}
                />
              </td>
              <td>
                <label className="label" htmlFor="collateralReports">
                  COLLATERAL REPORTS
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </pre>
    </details>
  );
}

export default Sections;
