const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';

// Safe Database Reading to prevent EJSONPARSE errors
const readDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return { users: [], posts: [], busSchedules: {}, reports: [] };
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return data.trim() ? JSON.parse(data) : { users: [], posts: [], busSchedules: {}, reports: [] };
    } catch (err) {
        console.error("DB Read Error:", err);
        return { users: [], posts: [], busSchedules: {}, reports: [] };
    }
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- COUS & System Endpoints ---
app.get('/api/bus-schedules', (req, res) => {
    const db = readDB();
    res.json(db.busSchedules || {});
});

// --- Post System (Fixed & Functional) ---
app.post('/api/post', (req, res) => {
    const { text, author, userHandle } = req.body;
    const db = readDB();
    
    const newPost = {
        id: Date.now(),
        author,
        handle: userHandle,
        text,
        likes: [],
        comments: [],
        timestamp: new Date().toISOString()
    };

    db.posts.unshift(newPost); // Newest first
    writeDB(db);
    res.json({ success: true, post: newPost });
});

// --- Social System (Follow/Unfollow) ---
app.post('/api/user/follow', (req, res) => {
    const { currentUser, targetUser } = req.body;
    const db = readDB();
    
    const me = db.users.find(u => u.user === currentUser);
    const target = db.users.find(u => u.user === targetUser);

    if (me && target) {
        if (!me.following) me.following = [];
        if (!target.followers) target.followers = [];

        const index = me.following.indexOf(targetUser);
        if (index === -1) {
            me.following.push(targetUser);
            target.followers.push(currentUser);
        } else {
            me.following.splice(index, 1);
            target.followers.splice(target.followers.indexOf(currentUser), 1);
        }
        writeDB(db);
        res.json({ success: true, following: me.following.includes(targetUser) });
    } else {
        res.status(404).json({ success: false });
    }
});

// --- Admin Control Endpoints ---
app.post('/api/admin/bus-update', (req, res) => {
    const { wilaya, time } = req.body;
    const db = readDB();
    if (!db.busSchedules) db.busSchedules = {};
    db.busSchedules[wilaya] = time;
    writeDB(db);
    res.json({ success: true });
});

app.delete('/api/admin/post/:id', (req, res) => {
    const db = readDB();
    db.posts = db.posts.filter(p => p.id != req.params.id);
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/admin/user-action', (req, res) => {
    const { targetUser, action } = req.body; // action: 'verify', 'ban', 'delete'
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.user === targetUser);

    if (userIndex !== -1) {
        if (action === 'verify') db.users[userIndex].isVerified = !db.users[userIndex].isVerified;
        if (action === 'ban') db.users[userIndex].status = (db.users[userIndex].status === 'banned' ? 'active' : 'banned');
        if (action === 'delete') db.users.splice(userIndex, 1);
        
        writeDB(db);
        res.json({ success: true });
    } else {
        res.status(404).send("User not found");
    }
});

app.listen(PORT, () => console.log(`Kulliya Engine running on port ${PORT}`));
