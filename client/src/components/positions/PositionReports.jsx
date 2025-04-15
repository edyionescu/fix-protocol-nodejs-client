function PositionReports({ positions }) {
  return (
    <div className="mt-15">
      <details open className="listing">
        <summary>Position Reports</summary>
        <pre className="maxh-515 overflow-y-scroll">
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Report ID</th>
                <th>Clearing Business Date</th>
                <th>Result</th>
                <th>Number of Party IDs</th>
                <th>Party IDs</th>
                <th>Symbol</th>
                <th>Number of Positions</th>
                <th>Position Types</th>
                <th>Long Quantity</th>
                <th>Short Quantity</th>
                <th>Used Margin</th>
                <th>Unrealized Profit Or Loss</th>
                <th>Account Currency</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(positions)
                .sort()
                .reverse()
                .map(([, position]) => {
                  return Object.entries(position.reports || {})
                    .sort()
                    .reverse()
                    .map(([key, report]) => {
                      const dateParts =
                        (report.clearingBusinessDate &&
                          report.clearingBusinessDate.match(/(\d{4})(\d{2})(\d{2})/)) ||
                        [];
                      const year = dateParts[1];
                      const month = dateParts[2];
                      const day = dateParts[3];

                      return (
                        <tr key={key}>
                          <td>#{report.posReqID}</td>
                          <td>#{report.posMaintRptID}</td>
                          <td className="text-center">
                            {dateParts.length ? `${month}/${day}/${year}` : '-'}
                          </td>
                          <td className="text-center">
                            {report.posReqResult ? (
                              <div
                                className={`position position--${
                                  report.posReqResult.toLowerCase() || 'empty'
                                }`}
                              >
                                {report.posReqResult}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="text-center">{report.noPartyIDs || '-'}</td>
                          <td className="text-center">
                            {report.partyIDArr.length
                              ? report.partyIDArr.map((el, idx) => <div key={idx}>{el.partyID}</div>)
                              : '-'}
                          </td>
                          <td className="text-center">{report.symbol || '-'}</td>
                          <td className="text-center">{report.noPositions || '-'}</td>
                          <td className="text-center">
                            {report.positionQtyType.length
                              ? report.positionQtyType.map((el, idx) => <div key={idx}>{el.posType}</div>)
                              : '-'}
                          </td>
                          <td className="text-center">
                            {report.positionQtyType.length
                              ? report.positionQtyType.map((el, idx) => <div key={idx}>{el.longQty}</div>)
                              : '-'}
                          </td>
                          <td className="text-center">
                            {report.positionQtyType.length
                              ? report.positionQtyType.map((el, idx) => <div key={idx}>{el.shortQty}</div>)
                              : '-'}
                          </td>
                          <td className="text-center">{report.OZUsedMargin || '-'}</td>
                          <td className="text-center">{report.OZUnrealizedProfitOrLoss || '-'}</td>
                          <td className="text-center">{report.OZAccountCurrency || '-'}</td>
                        </tr>
                      );
                    });
                })}
            </tbody>
          </table>
        </pre>
      </details>
    </div>
  );
}

export default PositionReports;
