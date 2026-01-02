const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// --------------------
// Deployment state flag
// --------------------
let shuttingDown = false;

// --------------------
// Middleware: block new requests during shutdown
// --------------------
app.use((req, res, next) => {
  if (shuttingDown) {
    return res.status(503).json({
      message: 'Server is restarting, please retry shortly'
    });
  }
  next();
});

// --------------------
// Middleware: LOG /health if status != 200
// --------------------
app.use((req, res, next) => {
  if (req.path === '/health') {
    const originalJson = res.json;

    res.json = function (body) {
      if (res.statusCode !== 200) {
        console.log('🚨 HEALTH CHECK ISSUE');
        console.log('Status:', res.statusCode);
        console.log('Response:', body);
        console.log('--------------------------');
      }

      return originalJson.call(this, body);
    };
  }
  next();
});

// --------------------
// Routes
// --------------------

// Home
app.get('/', (req, res) => {
  res.send('Hello From Version Four');
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });

  // Uncomment to simulate errors:
  // res.status(400).json({ error: 'Bad Request' });
  // res.status(500).json({ error: 'Internal Server Error' });
});

// --------------------
// Long Running API (5 minutes)
// --------------------
app.get('/long-running', async (req, res) => {
  console.log('⏳ Long running API started From Version ONE...');

  let responseClosed = false;

  // Detect response stream close (proxy/client)
  res.on('close', () => {
    responseClosed = true;

    // This is normal during nginx reload / blue-green switch
    console.log('ℹ️ Response stream closed (likely nginx reload or client finished)');
  });

  try {
    // Simulate 5-minute async task
    await new Promise(resolve => setTimeout(resolve, 300000));

    // Only send response if still possible
    if (!responseClosed && !res.headersSent) {
      return res.status(200).send(
        'Your 5 minutes query from the version One ran successfully'
      );
    }

  } catch (error) {
    console.error('❌ Long running API unexpected error:', error.message);

    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Server Error'
      });
    }
  }
});

// --------------------
// Start HTTP Server
// --------------------
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// --------------------
// Graceful Shutdown
// --------------------
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM received — starting graceful shutdown...');
  shuttingDown = true;

  server.close(() => {
    console.log('✅ All active connections closed. Exiting.');
    process.exit(0);
  });

  // Force exit after 2 minutes
  setTimeout(() => {
    console.log('⛔ Force exiting after timeout.');
    process.exit(1);
  }, 120000);
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT received — shutting down...');
  shuttingDown = true;

  server.close(() => {
    process.exit(0);
  });
});
