import { Fragment } from 'react';

function QuoteData({ market }) {
  const entries = Object.entries(market);

  return (
    <>
      {entries.length > 0 && (
        <details open className="marketData">
          <summary>Market Data</summary>
          <pre className="maxh-515 overflow-y-scroll">
            <table>
              <thead>
                <tr>
                  <th className="text-left w-25">Symbol</th>
                  <th></th>
                  <th className="text-right w-25">Bid</th>
                  <th className="text-right w-25">Offer</th>
                </tr>
              </thead>
              <tbody>
                {entries.sort().map(([key, marketData]) => (
                  <Fragment key={key}>
                    <tr className="row">
                      <td className="text-left">
                        <b>{key}</b>
                      </td>
                      <td className="text-right">Price</td>
                      <td className="text-right">
                        {marketData
                          .filter((el) => el.type === 'Bid')
                          .map((el, idx) => (
                            <div
                              key={`${key}${el.price}${idx}`}
                              className={el.priceDirection == 'up' ? 'green' : 'red'}
                            >
                              {el.price}
                            </div>
                          )) || '-'}
                      </td>
                      <td className="text-right">
                        {marketData
                          .filter((el) => el.type === 'Offer')
                          .map((el, idx) => (
                            <div
                              key={`${key}${el.price}${idx}`}
                              className={el.priceDirection == 'up' ? 'green' : 'red'}
                            >
                              {el.price}
                            </div>
                          ))}
                      </td>
                    </tr>
                    <tr>
                      <td></td>
                      <td className="text-right">Volume</td>
                      <td className="text-right">
                        {marketData
                          .filter((el) => el.type === 'Bid')
                          .map((el, idx) => (
                            <div key={`${key}${el.volume}${idx}`}>{el.volume}</div>
                          ))}
                      </td>
                      <td className="text-right">
                        {marketData
                          .filter((el) => el.type === 'Offer')
                          .map((el, idx) => (
                            <div key={`${key}${el.volume}${idx}`}>{el.volume}</div>
                          ))}
                      </td>
                    </tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </pre>
        </details>
      )}
    </>
  );
}

export default QuoteData;
