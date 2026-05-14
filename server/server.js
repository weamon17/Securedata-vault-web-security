// server/server.js
// Process entry point: builds the app, starts the HTTP listener,
// and handles graceful shutdown.

const createApp = require('./app');
const config = require('./config');

const app = createApp();

const server = app.listen(config.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    '\n  SecureData Vault — backend\n' +
    '  ─────────────────────────────────────────────\n' +
    `  Env       : ${config.NODE_ENV}\n` +
    `  Port      : ${config.PORT}\n` +
    `  Lab mode  : ${config.LAB_MODE ? 'ON  (/api/vulnerable enabled)' : 'OFF'}\n` +
    `  Client    : ${config.CLIENT_ORIGIN}\n` +
    `  Health    : http://localhost:${config.PORT}/api/health\n`
  );
});

// Graceful shutdown so nodemon restarts / Ctrl+C don't leak sockets.
function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`\n[${signal}] received — closing HTTP server...`);
  server.close((err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Surface unhandled rejections in dev instead of swallowing them.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection]', reason);
});
