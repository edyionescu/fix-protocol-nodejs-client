function ApiError({ state: { initialStateError, textReject, textReason }, fns: { setState } }) {
  return (
    <div className="error">
      {textReject} {textReason.length ? ` - ${textReason}` : ''}
      <button
        onClick={() =>
          setState((prev) => ({
            ...prev,
            error: initialStateError,
          }))
        }
      >
        [x]
      </button>
    </div>
  );
}

export default ApiError;
