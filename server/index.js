import { config } from '@dotenvx/dotenvx';
config();

import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import morgan from 'morgan';
import path from 'path';
import { createStream } from 'rotating-file-stream';
import tcp from './tcp/index.js';
import { LOG_TO_CONSOLE } from './fix/index.js';

async function run() {
  try {
    let { SERVER_PORT } = process.env;

    let {
      QUOTE_HOST,
      QUOTE_PORT,
      QUOTE_SENDER,
      QUOTE_TARGET,
      QUOTE_USER = '',
      QUOTE_PASS = '',
      QUOTE_SSL = true,
      TRADE_HOST,
      TRADE_PORT,
      TRADE_SENDER,
      TRADE_TARGET,
      TRADE_USER = '',
      TRADE_PASS = '',
      TRADE_SSL = true,
    } = process.env;

    const tradeTCP = tcp({
      defaultTcpOptions: {
        host: TRADE_HOST,
        port: TRADE_PORT,
        sender: TRADE_SENDER,
        target: TRADE_TARGET,
        reset: 'Y',
        user: TRADE_USER,
        pass: TRADE_PASS,
        heartbeat: 20,
        timeout: 25000,
        keepAlive: true,
        initialDelay: 1000,
        ssl: TRADE_SSL === 'true',
      },
      title: 'Trade',
      autoconnect: false,
    });

    const quoteTCP = tcp({
      defaultTcpOptions: {
        host: QUOTE_HOST,
        port: QUOTE_PORT,
        reset: 'Y',
        sender: QUOTE_SENDER,
        target: QUOTE_TARGET,
        user: QUOTE_USER,
        pass: QUOTE_PASS,
        heartbeat: 20,
        timeout: 25000,
        keepAlive: true,
        initialDelay: 1000,
        ssl: QUOTE_SSL === 'true',
      },
      title: 'Quote',
      autoconnect: false,
    });

    const app = express();
    app.use(cors());

    expressWs(app, null, {
      wsOptions: {
        verifyClient({ origin, req } = {}) {
          const route = req.url.replace('/', '');
          const client = req.headers['sec-websocket-protocol'];
          return route === 'trade'
            ? tradeTCP.clientIsAllowed({ origin, client })
            : quoteTCP.clientIsAllowed({ origin, client });
        },
      },
    });

    const __dirname = path.resolve();
    // create a rotating write stream
    var accessLogStream = createStream('access.log', {
      size: '10M', // rotate every 10 MegaBytes written
      compress: 'gzip', // compress rotated file
      path: path.join(__dirname, 'logs'),
    });

    // set up the logger
    app.use(morgan('combined', { stream: accessLogStream }));

    app.ws('/trade', (ws, req) => tradeTCP.handle(ws, req));
    app.ws('/quote', (ws, req) => quoteTCP.handle(ws, req));

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    app.get('/fix.log', function (req, res) {
      res.status(200).send(fs.readFileSync(`./logs/fix.log`, { encoding: 'utf-8' }));
    });

    app.get('/', function (req, res) {
      res.status(200).send('FIX.4.4');
    });

    app.use((req, res, next) => {
      res.sendStatus(404);
    });

    app.listen(SERVER_PORT, () => {
      LOG_TO_CONSOLE &&
        console.log('\x1b[33m%s\x1b[0m', `\n[Trade/Quote FIX Clients] Listening on port ${SERVER_PORT}`);
    });

    app.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

      switch (error.code) {
        case 'EACCES':
          console.error(bind + ' requires elevated privileges');
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(bind + ' is already in use');
          process.exit(1);
          break;
        default:
          throw error;
      }
    });
  } catch (error) {
    console.log(error);
  }
}

run();
