const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      'mongodb://127.0.0.1:27017/data_viz_auth';

    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) {
      console.warn(
        '[Database] MONGODB_URI not set in environment; falling back to 127.0.0.1:27017'
      );
    }

    const options = {};
    const withoutQuery = mongoUri.split('?')[0];
    const afterHost = withoutQuery.replace(/^mongodb(\+srv)?:\/\/[^/]+/, '');
    if (!afterHost || afterHost === '/') {
      options.dbName = 'data_viz_auth';
    }

    const conn = await mongoose.connect(mongoUri, options);
    console.log(
      `MongoDB connected successfully (${conn.connection.host}/${conn.connection.name})`
    );
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

module.exports = connectDB;
