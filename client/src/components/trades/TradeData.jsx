import { TimeInForceDef } from '../../lib/fixTypes';

function TradeData({ orders }) {
  return (
    <div style={{ marginTop: 15 }}>
      <details open className="listing">
        <summary>Orders</summary>
        <pre className="maxh-515 overflow-y-scroll">
          <table>
            <thead>
              <tr>
                <th>ClOrdID</th>
                <th>OrderID</th>
                <th>Symbol</th>
                <th className="text-center">Average Price</th>
                <th className="text-center">Last Price</th>
                <th className="text-center">Quantity</th>
                <th className="text-center">Executed</th>
                <th>Type</th>
                <th>Side</th>
                <th>Time In Force</th>
                <th>Reject Reason</th>
                <th>CxlRej Reason</th>
                <th>Text</th>
                <th>Execution Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(orders)
                .sort()
                .reverse()
                .map(([key, order]) => (
                  <tr key={key}>
                    <td>{order.clOrdID}</td>
                    <td>{order.orderID ? order.orderID : '-'}</td>
                    <td>{order.symbol || '-'}</td>
                    <td className="text-center">{order.avgPx || '-'}</td>
                    <td className="text-center">{order.lastPx || '-'}</td>
                    <td className="text-center">{order.orderQty || '-'}</td>
                    <td className="text-center">{order.cumQty || '-'}</td>
                    <td>{order.ordType || <center>-</center>}</td>
                    <td className={order.side == 'Buy' ? 'green' : 'red'}>
                      {order.side == 'Sell' ? '↑' : order.side == 'Buy' ? '↓' : ''} {order.side}
                    </td>
                    <td style={{ width: 170 }}>
                      {order.timeInForce ? TimeInForceDef[order.timeInForce] : '-'}
                    </td>
                    <td style={{ width: 230 }}>
                      {order.ordRejReason || <div style={{ marginLeft: 50 }}>-</div>}
                    </td>
                    <td>
                      {order.cxlRejReason ? (
                        <center
                          style={{ cursor: 'pointer' }}
                          title={order.cancelRejectData}
                          onClick={() => alert(order.cancelRejectData)}
                        >
                          {order.cxlRejReason} ⚠
                        </center>
                      ) : (
                        <center>-</center>
                      )}
                    </td>
                    <td>
                      {order.text ? (
                        <center
                          style={{ cursor: 'pointer', fontSize: '1.2em' }}
                          title={order.text}
                          onClick={() => alert(order.text)}
                        >
                          ⚠
                        </center>
                      ) : (
                        <center>-</center>
                      )}
                    </td>
                    <td>
                      <div
                        className={`execution execution--${
                          order.execType ? order.execType.toLowerCase() : 'empty'
                        }`}
                      >
                        {order.execType || '-'}
                      </div>
                    </td>
                    <td>
                      <div className={`order order--${order.ordStatus.toLowerCase() || 'empty'}`}>
                        {order.ordStatus || <center>-</center>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </pre>
      </details>
    </div>
  );
}

export default TradeData;
