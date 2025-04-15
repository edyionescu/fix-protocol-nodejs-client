import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './components/App';
import Error from './components/Error';
import '/src/main.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallbackRender={({ error }) => <Error code="400" error={error} />}>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
