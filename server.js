const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const dotenv = require('dotenv');
const sequelize = require('./db');
const SessionManager = require('./services/SessionManager');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan('dev'));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const authRoutes = require('./routes/auth');
const vitalsRoutes = require('./routes/vitals');
const sessionRoutes = require('./routes/session');
const reportRoutes = require('./routes/report');

app.use('/api/auth', authRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/report', reportRoutes);

// Socket.io Connection Logic
SessionManager.init(io);

io.on('connection', (socket) => {
    SessionManager.registerClient(socket);
});

// Fallback to index.html for SPA-like behavior
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sync Database and Start Server
sequelize.sync().then(async () => {
    console.log('SQLite Database connected and synced');
    
    try {
        const adminExists = await User.findOne({ where: { username: 'admin' } });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                password: bcrypt.hashSync('admin123', 10)
            });
            console.log('Seeded default user: admin / admin123');
        }
    } catch (e) {
        console.error('Failed to seed admin user:', e);
    }

    server.listen(PORT, () => {
        console.log(`VitalSync server running at http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync database:', err);
});
