const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';

// --- Database Logic ---
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        // Fallback structure if db.json is corrupted or empty
        return { users: [], posts: [], banned: [] };
    }
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// --- Auth Endpoints ---

// Registration with new Wilaya/Uni fields
app.post('/api/register', (req, res) => {
    const { name, user, pass, wilaya, uni } = req.body;
    const db = readDB();

    if (db.users.find(u => u.user === user)) {
        return res.json({ success: false, message: "اسم المستخدم موجود مسبقاً" });
    }

    db.users.push({
        name,
        user,
        pass,
        wilaya,
        uni,
        status: 'pending', // Default status for new signups
        role: 'student',
        joinedAt: new Date().toISOString()
    });

    writeDB(db);
    res.json({ success: true });
});

// Login - Sends profile data to prevent "Undefined" errors in Feed
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    const db = readDB();
    const found = db.users.find(u => u.user === user && u.pass === pass);

    if (!found) return res.json({ success: false, message: "بيانات خاطئة" });
    if (found.status === 'pending') return res.json({ success: false, message: "حسابك قيد الانتظار" });
    if (found.status === 'banned') return res.json({ success: false, message: "تم حظر هذا الحساب" });

    res.json({ 
        success: true, 
        user: { 
            name: found.name, 
            user: found.user, 
            uni: found.uni, 
            wilaya: found.wilaya 
        } 
    });
});

// --- Admin Endpoints ---

// Get all data for the professional dashboard
app.get('/api/admin/data', (req, res) => {
    const db = readDB();
    res.json({
        users: db.users || [],
        posts: db.posts || []
    });
});

// Approve, Ban, or Reject users
app.post('/api/admin/approve', (req, res) => {
    const { targetUser, status } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.user === targetUser);

    if (userIndex !== -1) {
        if (status === 'rejected') {
            db.users.splice(userIndex, 1); // Delete if rejected
        } else {
            db.users[userIndex].status = status; // 'active' or 'banned'
        }
        writeDB(db);
        return res.json({ success: true });
    }
    res.status(404).json({ success: false, message: "User not found" });
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server live on port ${PORT}`);
});
