import { Fragment } from 'react';

function Logs({ state: { logs, showHeartbeats }, fns: { setState, clearLog, renderLog } }) {
  const logsFormatted = logs
    .split('\n')
    .reverse()
    .filter((log) => log.length > 2)
    .filter((log) => (showHeartbeats ? true : !log.includes('heartbeat')));

  return (
    <details open className="flex-item flex-item-logs">
      <summary>
        Logs
        <button onClick={clearLog}>Clear</button>
      </summary>

      <label>
        <input
          type="checkbox"
          defaultChecked={showHeartbeats}
          onChange={({ target: { checked } }) => {
            setState((prev) => ({
              ...prev,
              showHeartbeats: checked,
            }));
            localStorage.setItem('showHeartbeats', JSON.stringify(checked));
          }}
        />
        Show Heartbeats
      </label>

      <pre className="maxh-680 overflow-y-scroll">{logsFormatted.map(renderLog)}</pre>
    </details>
  );
}

export default Logs;
