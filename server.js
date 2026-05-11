const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';

// Safe Database Reader
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { users: [], posts: [], busSchedules: {} };
    }
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- ROUTING FIX ---
// Force the root URL to always show the Login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// --- COUS TIMER API (THE FIX) ---
app.post('/api/admin/bus-update', (req, res) => {
    const { wilaya, time } = req.body;
    const db = readDB();
    
    if (!db.busSchedules) db.busSchedules = {};
    
    // Update the specific wilaya time
    db.busSchedules[wilaya] = time;
    
    writeDB(db);
    res.json({ success: true, message: `Updated ${wilaya} to ${time}` });
});

// --- ADMIN DATA FETCH ---
app.get('/api/admin/data', (req, res) => {
    const db = readDB();
    res.json(db);
});

// --- POST SYSTEM ---
app.post('/api/post', (req, res) => {
    const { text, author, userHandle } = req.body;
    const db = readDB();
    const newPost = {
        id: Date.now(),
        author,
        handle: userHandle,
        text,
        likes: [],
        timestamp: new Date().toISOString()
    };
    db.posts.unshift(newPost);
    writeDB(db);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server fixed on port ${PORT}`));
