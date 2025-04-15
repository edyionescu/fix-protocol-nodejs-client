function Connections({
  state: { quoteWsReady = false, tradeWsReady = false, tcpConnected = false, tcpLoggedIn = false },
}) {
  return (
    <>
      <span className={`dot ${quoteWsReady ? 'bg-green' : 'bg-red'}`} />
      <label className="label">Quote WebSocket Ready</label>

      <span className={`dot ${tradeWsReady ? 'bg-green' : 'bg-red'}`} />
      <label className="label">Trade WebSocket Ready</label>

      <span className={`dot ${tcpConnected ? 'bg-green' : 'bg-red'}`} />
      <label className="label">TCP Socket {tcpConnected ? 'Connected' : 'Disconnected'}</label>

      <span className={`dot ${tcpLoggedIn ? 'bg-green' : 'bg-red'}`} />
      <label className="label">TCP Socket {tcpLoggedIn ? 'Logged In' : 'Logged Out'}</label>
    </>
  );
}

export default Connections;
