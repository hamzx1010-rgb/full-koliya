const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';

// Helper to read database
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { users: [], posts: [], busSchedules: {}, reports: [] };
    }
};

// Helper to write database
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- 1. ROUTING FIX ---
// This forces the homepage to be the login page (Login.html or index.html)
// Adjust the filename below to match your actual login file (e.g., index.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// --- 2. COUS TIMER API ---
// This is the route the Admin Panel uses to update bus times
app.post('/api/admin/bus-update', (req, res) => {
    const { wilaya, time } = req.body;
    const db = readDB();
    
    if (!db.busSchedules) db.busSchedules = {};
    db.busSchedules[wilaya] = time; 
    
    writeDB(db);
    res.json({ success: true, message: `Updated ${wilaya} to ${time}` });
});

// --- 3. DATA FETCHING ---
app.get('/api/admin/data', (req, res) => {
    res.json(readDB());
});

// --- 4. AUTH & POSTING ---
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    const db = readDB();
    const found = db.users.find(u => u.user === user && u.pass === pass);
    if (!found) return res.json({ success: false });
    res.json({ success: true, user: found });
});

app.post('/api/post', (req, res) => {
    const { text, author, userHandle } = req.body;
    const db = readDB();
    const newPost = {
        id: Date.now(),
        author,
        handle: userHandle,
        text,
        likes: 0,
        comments: [],
        timestamp: new Date().toISOString()
    };
    db.posts.unshift(newPost);
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
