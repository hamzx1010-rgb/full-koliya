const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';

// --- Database Helpers ---
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { users: [], posts: [], busSchedules: {}, reports: [] };
    }
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- 1. THE MAIN PAGE FIX ---
// This ensures that visiting koliya.com (the root) always shows the Login/Index page.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// --- 2. THE COUS UPDATE FIX ---
// This handles the "Update" button from your admin panel
app.post('/api/admin/bus-update', (req, res) => {
    const { wilaya, time } = req.body;
    const db = readDB();
    
    if (!db.busSchedules) db.busSchedules = {};
    db.busSchedules[wilaya] = time; // This saves the new time to the JSON
    
    writeDB(db);
    res.json({ success: true });
});

// --- 3. DATA FETCHING ---
app.get('/api/admin/data', (req, res) => {
    res.json(readDB());
});

// --- 4. LOGIN LOGIC ---
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    const db = readDB();
    const found = db.users.find(u => u.user === user && u.pass === pass);
    
    if (!found) return res.json({ success: false });
    
    // Send user role so frontend can redirect correctly
    res.json({ 
        success: true, 
        user: { name: found.name, user: found.user, role: found.role, wilaya: found.wilaya } 
    });
});

// --- 5. POSTING LOGIC ---
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

app.listen(PORT, () => console.log(`Kulliya Server running on port ${PORT}`));
