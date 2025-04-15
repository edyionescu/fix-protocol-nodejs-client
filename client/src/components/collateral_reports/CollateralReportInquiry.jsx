function CollateralInquiry({ inquiries }) {
  return (
    <div className="mt-15">
      <details open className="listing">
        <summary>Collateral Inquiries</summary>
        <pre
          style={{
            maxHeight: 515,
            overflowY: 'scroll',
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Inquiry ID</th>
                <th>Total Number of Reports</th>
                <th>Text</th>
                <th>Result</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(inquiries)
                .sort()
                .reverse()
                .map(([key, inquiry]) => {
                  return (
                    <tr key={key}>
                      <td>#{inquiry.collInquiryID}</td>
                      <td>{inquiry.totNumReports || '-'}</td>
                      <td>{inquiry.text || '-'}</td>
                      <td>
                        {inquiry.collInquiryResult ? (
                          <div
                            className={`inquiry inquiry--${
                              inquiry.collInquiryResult.toLowerCase() || 'empty'
                            }`}
                          >
                            {inquiry.collInquiryResult}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {inquiry.collInquiryStatus ? (
                          <div
                            className={`inquiry inquiry--${
                              inquiry.collInquiryStatus.toLowerCase() || 'empty'
                            }`}
                          >
                            {inquiry.collInquiryStatus}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </pre>
      </details>
    </div>
  );
}

export default CollateralInquiry;
