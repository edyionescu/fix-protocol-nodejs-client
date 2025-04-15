import { PosReqTypeDef, AccountTypeDef } from '../../lib/fixTypes';

function PositionHeader({
  refs: {
    posReqTypeRef,
    accountRef,
    accountTypeRef,
    positionPartyIDRef1,
    positionPartyIDRef2,
    clearingBusinessDateRef,
  },
  fns: { sendRequestForPositions },
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form className="mt-15">
      <label>
        Position Request Type
        <select defaultValue="Day" ref={posReqTypeRef}>
          {Object.entries(PosReqTypeDef).map(([key, def]) => (
            <option key={key} value={key}>
              {def}
            </option>
          ))}
        </select>
      </label>
      <label>
        Account
        <input type="text" ref={accountRef} defaultValue="ABCD" style={{ width: '10em' }} />
      </label>
      <label>
        Account Type
        <select defaultValue="Day" ref={accountTypeRef}>
          {Object.entries(AccountTypeDef).map(([key, def]) => (
            <option key={key} value={key}>
              {def}
            </option>
          ))}
        </select>
      </label>
      <br />
      <label>
        PartyID [1]
        <input type="text" ref={positionPartyIDRef1} defaultValue="*" style={{ width: '10em' }} />
      </label>
      <label>
        PartyID [2]
        <input type="text" ref={positionPartyIDRef2} defaultValue="" style={{ width: '10em' }} />
      </label>
      <label>
        Clearing Business Date
        <input type="date" ref={clearingBusinessDateRef} defaultValue={today} min={today} />
      </label>
      <button type="button" className="button-smaller" onClick={() => sendRequestForPositions()}>
        SEND
      </button>
    </form>
  );
}

export default PositionHeader;
