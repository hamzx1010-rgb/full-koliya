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
    } catch (err) {
        // Return default structure if file is missing or corrupt
        return { users: [], posts: [], banned: [] };
    }
};

const writeDB = (data) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// --- Authentication Routes ---

// 1. Registration (Updated for Wilaya & Uni)
app.post('/api/register', (req, res) => {
    const { name, user, pass, wilaya, uni } = req.body;
    const db = readDB();

    if (db.users.find(u => u.user === user)) {
        return res.json({ success: false, message: "اسم المستخدم محجوز بالفعل" });
    }

    const newUser = {
        name,
        user,
        pass,
        wilaya,
        uni,
        status: 'pending', // Requires admin approval
        role: 'student',
        joinedAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);
    res.json({ success: true, message: "تم إرسال طلبك للإدارة" });
});

// 2. Login (Fixes "Undefined" by sending full profile)
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    const db = readDB();

    const found = db.users.find(u => u.user === user && u.pass === pass);

    if (!found) {
        return res.json({ success: false, message: "بيانات الدخول غير صحيحة" });
    }

    if (found.status === 'pending') {
        return res.json({ success: false, message: "حسابك لم يفعل بعد من طرف الإدارة" });
    }

    // Send data needed for colors and bus timers
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

// --- Admin Operations ---

app.get('/api/admin/data', (req, res) => {
    const db = readDB();
    res.json({ users: db.users });
});

app.post('/api/admin/approve', (req, res) => {
    const { targetUser } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.user === targetUser);
    
    if (user) {
        user.status = 'active';
        writeDB(db);
        res.json({ success: true });
    }
});

// --- Inbox & Messaging ---

app.get('/api/inbox', (req, res) => {
    const { user, type } = req.query;
    // type: 'chats', 'channels', or 'requests'
    
    // In a real app, you'd filter messages from db.json here.
    // This matches the multi-tab UI we built.
    const mockData = {
        chats: [
            { sender: "سارة", text: "هل أكملت ملخص الإيكولوجيا؟", time: "12:45" }
        ],
        channels: [
            { sender: "COUS News", text: "تحديث: تم تغيير مواقيت النقل غداً", time: "10:00" }
        ],
        requests: []
    };
    
    res.json(mockData[type] || []);
});

// --- Search System ---

app.get('/api/search', (req, res) => {
    const { q } = req.query;
    const db = readDB();
    const results = db.users
        .filter(u => u.status === 'active' && (u.name.includes(q) || u.user.includes(q)))
        .map(u => ({ name: u.name, user: u.user, uni: u.uni }));
    
    res.json(results);
});

// --- Initialize Server ---
app.listen(PORT, () => {
    console.log(`Kulliya Engine running on port ${PORT}`);
    console.log(`Admin access: /admin.html (pass: owner2026)`);
});
