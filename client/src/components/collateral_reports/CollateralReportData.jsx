function CollateralReportData({ inquiries }) {
  return (
    <div className="mt-15">
      <details open className="listing">
        <summary>Collateral Reports</summary>
        <pre className="maxh-515 overflow-y-scroll">
          <table className="mb-15">
            <thead>
              <tr>
                <th>Inquiry ID</th>
                <th>Report ID</th>
                <th>Party IDs</th>
                <th>Currency</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Account Currency</th>
                <th>Account Balance</th>
                <th>Margin Utilization Percentage</th>
                <th>Used Margin</th>
                <th>Free Margin</th>
                <th>Unrealized Profit Or Loss</th>
                <th>Equity</th>
                <th>Account Credit</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(inquiries)
                .sort()
                .reverse()
                .map(([, inquiry]) => {
                  return Object.entries(inquiry.reports || {})
                    .sort()
                    .reverse()
                    .map(([key, report]) => {
                      return (
                        <tr key={key}>
                          <td>#{report.collInquiryID}</td>
                          <td>#{report.collRptID}</td>
                          <td className="text-center">
                            {report.partyIDArr.length
                              ? report.partyIDArr.map((el, idx) => <div key={idx}>{el.partyID}</div>)
                              : '-'}
                          </td>
                          <td>{report.currency || '-'}</td>
                          <td>{report.quantity || '-'}</td>
                          <td>
                            {report.collStatus ? (
                              <div
                                className={`inquiry inquiry--${report.collStatus.toLowerCase() || 'empty'}`}
                              >
                                {report.collStatus}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td>{report.ozAccountCurrency || '-'}</td>
                          <td>{report.ozAccountBalance || '-'}</td>
                          <td>{report.ozMarginUtilizationPercentage || '-'}</td>
                          <td>{report.ozUsedMargin || '-'}</td>
                          <td>{report.ozFreeMargin || '-'}</td>
                          <td>{report.ozUnrealizedProfitOrLoss || '-'}</td>
                          <td>{report.ozEquity || '-'}</td>
                          <td>{report.ozAccountCredit || '-'}</td>
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

export default CollateralReportData;
