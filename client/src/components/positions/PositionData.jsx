import { AccountTypeDef } from '../../lib/fixTypes';

function PositionData({ positions }) {
  return (
    <div className="mt-15">
      <details open className="listing">
        <summary>Requests For Positions</summary>
        <pre
          style={{
            maxHeight: 515,
            overflowY: 'scroll',
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Request Type</th>
                <th>Account</th>
                <th>Account Type</th>
                <th>Clearing Business Date</th>
                <th>Number of Reports</th>
                <th>Text</th>
                <th>Result</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(positions)
                .sort()
                .reverse()
                .map(([key, position]) => {
                  const dateParts =
                    (position.clearingBusinessDate &&
                      position.clearingBusinessDate.match(/(\d{4})(\d{2})(\d{2})/)) ||
                    [];
                  const year = dateParts[1];
                  const month = dateParts[2];
                  const day = dateParts[3];

                  return (
                    <tr key={key}>
                      <td>#{position.posReqID}</td>
                      <td>{position.posReqType}</td>
                      <td>{position.account}</td>
                      <td>{AccountTypeDef[position.accountType]}</td>
                      <td className="text-center">{dateParts.length ? `${month}/${day}/${year}` : '-'}</td>
                      <td className="text-center">{position.totalNumPosReports || '-'}</td>
                      <td>{position.text || '-'}</td>
                      <td className="text-center">
                        {position.posReqResult ? (
                          <div
                            className={`position position--${position.posReqResult.toLowerCase() || 'empty'}`}
                          >
                            {position.posReqResult}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {position.posReqStatus ? (
                          <div
                            className={`position position--${position.posReqStatus.toLowerCase() || 'empty'}`}
                          >
                            {position.posReqStatus}
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

export default PositionData;
