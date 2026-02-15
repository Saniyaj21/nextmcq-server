import express from 'express';
import connectDB from './config/database.js';
import authRoutes from './routes/auth.js';
import instituteRoutes from './routes/institutes.js';
import bannerRoutes from './routes/banner.js';
import testRoutes from './routes/test.js';
import testTakingRoutes from './routes/testTaking.js';
import questionRoutes from './routes/question.js';
import rankingRoutes from './routes/ranking.js';
import rankingV2Routes from './routes/rankingV2.js';
import userRoutes from './routes/user.js';
import ratingRoutes from './routes/rating.js';
import inviteRoutes from './routes/invite.js';
import postRoutes from './routes/post.js';
import feedbackRoutes from './routes/feedback.js';
import batchRoutes from './routes/batch.js';
import adminRoutes from './routes/admin.js';
import { loadSettings } from './utils/settingsCache.js';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { fileURLToPath } from 'url';



const app = express();
const PORT = process.env.PORT || 8080;

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database, then load settings cache
connectDB().then(() => loadSettings());
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  })

// Middleware
app.use(cors());
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
app.use('/api/ranking', rankingV2Routes); // V2 endpoints (production-grade)
app.use('/api/user', userRoutes);
app.use('/api/rating', ratingRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/admin', adminRoutes);

// Account deletion page route (for Google Play Store compliance)
app.get('/account-deletion', (req, res) => {
    res.sendFile(path.join(__dirname, 'account-deletion', 'index.html'));
});

// Basic route
app.get('/', (req, res) => {
    res.json({
        message: 'NextMCQ API Server',
        version: '1.0.0',
        status: 'running'
    });
});


app.listen(PORT, () => {
    // Server started
});