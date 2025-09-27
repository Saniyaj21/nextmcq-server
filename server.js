import express from 'express';
import cors from 'cors';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import instituteRoutes from './routes/institutes.js';
import bannerRoutes from './routes/banner.js';
import testRoutes from './routes/test.js';
import testTakingRoutes from './routes/testTaking.js';
import questionRoutes from './routes/question.js';
import rankingRoutes from './routes/ranking.js';
import userRoutes from './routes/user.js';
import dotenv from 'dotenv';
dotenv.config();
import { v2 as cloudinary } from 'cloudinary';



const app = express();
const PORT = process.env.PORT || 8080;

// Connect to database
connectDB();
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  })

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development - in production, specify your domains
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/banner', bannerRoutes);
app.use('/api/test', testRoutes);
app.use('/api/test-taking', testTakingRoutes);
app.use('/api/question', questionRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/user', userRoutes);
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