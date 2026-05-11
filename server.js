const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const app = express();

app.use(express.json());
app.use(express.static('public'));

// --- DATABASE PATH ---
// On Render, we use /tmp or the root. 
// Note: This file resets if you push a new update from GitHub.
const DB_PATH = path.join(__dirname, 'db.json');

// --- INITIAL SEED DATA ---
let db = { 
    users: [
        { user: 'admin', pass: 'owner2026', name: 'المطور', role: 'admin', status: 'active' }
    ], 
    posts: [],
    banned: [] 
};

// --- LOAD DATA ON START ---
if (fs.existsSync(DB_PATH)) {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        db = JSON.parse(data);
        console.log("✅ Database Loaded");
    } catch (e) {
        console.log("⚠️ DB Corrupt, using defaults");
    }
}

// --- SAVE FUNCTION ---
const save = () => {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
};

// ==========================================
// 1. AUTHENTICATION (Student Side)
// ==========================================

app.post('/api/register', (req, res) => {
    const { user, pass, name, info } = req.body;
    if (db.users.find(u => u.user === user)) {
        return res.status(400).json({ err: 'المستخدم موجود بالفعل' });
    }
    // New students are ALWAYS 'pending'
    db.users.push({ user, pass, name, info, status: 'pending', role: 'student' });
    save();
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    const found = db.users.find(u => u.user === user && u.pass === pass);
    
    if (!found) return res.status(401).json({ err: 'خطأ في اسم المستخدم أو كلمة السر' });
    if (db.banned.includes(user)) return res.status(403).json({ err: 'هذا الحساب محظور' });
    if (found.status === 'pending') return res.status(403).json({ err: 'حسابك بانتظار تفعيل الإدارة' });
    
    res.json({ success: true, user: found });
});

// ==========================================
// 2. ADMIN ACTIONS (Hidden Area)
// ==========================================

// Get all data for the Admin Dashboard
app.get('/api/admin/data', (req, res) => {
    res.json({ users: db.users, posts: db.posts });
});

// Approve a student
app.post('/api/admin/approve', (req, res) => {
    const { targetUser } = req.body;
    const user = db.users.find(u => u.user === targetUser);
    if (user) {
        user.status = 'active';
        save();
        res.json({ success: true });
    } else {
        res.status(404).json({ err: 'User not found' });
    }
});

// Ban a student
app.post('/api/admin/ban', (req, res) => {
    const { targetUser } = req.body;
    if (!db.banned.includes(targetUser)) db.banned.push(targetUser);
    save();
    res.json({ success: true });
});

// ==========================================
// 3. THE FEED (Social Side)
// ==========================================

app.get('/api/posts', (req, res) => {
    res.json(db.posts.slice().reverse()); // Newest first
});

app.post('/api/posts', (req, res) => {
    const { author, content } = req.body;
    const post = {
        id: Date.now(),
        author,
        content,
        date: new Date(),
        likes: 0
    };
    db.posts.push(post);
    save();
    res.json(post);
});

// ==========================================
// 4. KEEP-ALIVE (Anti-Sleep for Render)
// ==========================================

setInterval(() => {
    // Replace with your actual Render URL
    const appUrl = 'https://' + process.env.RENDER_EXTERNAL_HOSTNAME;
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
        https.get(appUrl, (res) => {
            console.log("Self-Ping: " + res.statusCode);
        });
    }
}, 840000); // Pings every 14 minutes

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Kulliya Engine Active on Port ${PORT}`);
});