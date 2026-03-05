import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import Routes
import userRoutes from './routes/user.routes.js';
import youtubeRoutes from './routes/youtube.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Main Root Route for checking
app.get('/', (req, res) => {
    res.send('YouTube Backend Setup');
});

// Routes
app.use('/api/user', userRoutes);
app.use('/api/youtube', youtubeRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
