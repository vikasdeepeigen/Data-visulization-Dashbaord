const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const { seedDefaultData } = require('./seed/seedDefaultData');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const softwareRoutes = require('./routes/software.routes');
const dataRecordRoutes = require('./routes/dataRecord.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const excelRoutes = require('./routes/excel.routes');
const reportRoutes = require('./routes/report.routes');
const syncRoutes = require('./routes/sync.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'https://data-visulization-dashbaord.onrender.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
  ...(process.env.CLIENT_URLS ? process.env.CLIENT_URLS.split(',').map((url) => url.trim()) : []),
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});



// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/software', softwareRoutes);
app.use('/api/records', dataRecordRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sync', syncRoutes);




// Error Handler
app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server error',
  });
});



// Start Server
const startServer = async () => {
  try {
    await connectDB();
    await seedDefaultData();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;