const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;

// Configure CORS to allow requests from any origin in development
// In production, you would restrict this to your frontend domain
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'http://tick-tack-frontend' 
    : '*',
  methods: ['GET'],
  credentials: true
}));

// Simple request logging middleware
app.use((req, res, next) => {
  const now = new Date();
  console.log(`${now.toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// Endpoint to get the current time
app.get('/api/time', (req, res) => {
  try {
    res.json({ 
      time: new Date().toISOString(),
      message: 'Tick Tack',
      server: 'AWS ECS',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error in /api/time endpoint:', error);
    res.status(500).json({ error: 'Failed to get time' });
  }
});

// Health check endpoint for AWS
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});