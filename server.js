import express from 'express';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';

import dotenv from 'dotenv';
dotenv.config();



const app = express();
const PORT = process.env.PORT || 8080;

// Connect to database
connectDB();

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'NextMCQ API Server',
        version: '1.0.0',
        status: 'running'
    });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});