function CollateralReportHeader({
  refs: { collateralPartyIDRef1, collateralPartyIDRef2 },
  fns: { sendCollateralInquiry },
}) {
  return (
    <header>
      <h2>COLLATERAL REPORTS</h2>

      <form>
        <label>
          PartyID [1]
          <input type="text" ref={collateralPartyIDRef1} defaultValue="*" style={{ width: '10em' }} />
        </label>
        <label>
          PartyID [2]
          <input type="text" ref={collateralPartyIDRef2} defaultValue="" style={{ width: '10em' }} />
        </label>
        <button type="button" className="button-smaller" onClick={() => sendCollateralInquiry()}>
          SEND COLLATERAL INQUIRY
        </button>
      </form>
    </header>
  );
}

export default CollateralReportHeader;
