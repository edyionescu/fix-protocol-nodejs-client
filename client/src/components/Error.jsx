function Error({ code = 404, error = {} }) {
  console.error(error);

  const errorType = {
    404: 'Page not found',
    400: 'Client error',
    500: 'Server error',
  };

  return (
    <>
      <h2 className="mb-10">The application has encountered an error</h2>
      <p className="mb-15">
        <b>
          {code} {errorType[code]}
        </b>
        : {error?.message}
      </p>
      <details open className="dib">
        <summary>Stack</summary>
        <pre className="m-0">{error?.stack}</pre>
      </details>
    </>
  );
}

export default Error;
