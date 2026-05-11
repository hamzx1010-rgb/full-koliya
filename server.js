const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

const DB_FILE = './db.json';

// Helper to read/write DB
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// 1. REGISTER (Updated with Wilaya and University)
app.post('/api/register', (req, res) => {
    const { name, user, pass, wilaya, uni } = req.body;
    const db = readDB();

    if (db.users.find(u => u.user === user)) {
        return res.json({ success: false, message: "اسم المستخدم موجود مسبقاً" });
    }

    // New users are 'pending' until Admin approves them
    db.users.push({
        name,
        user,
        pass,
        wilaya,
        uni,
        status: 'pending', 
        role: 'student',
        joined: new Date().toISOString()
    });

    writeDB(db);
    res.json({ success: true });
});

// 2. LOGIN (Sends Uni and Name to fix "Undefined")
app.post('/api/login', (req, res) => {
    const { user, pass } = req.body;
    const db = readDB();

    const found = db.users.find(u => u.user === user && u.pass === pass);

    if (!found) {
        return res.json({ success: false, message: "خطأ في الاسم أو كلمة المرور" });
    }

    if (found.status === 'pending') {
        return res.json({ success: false, message: "حسابك قيد المراجعة من قبل الإدارة" });
    }

    // Sending full user object so frontend can set colors and bus times
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

// 3. ADMIN: GET PENDING USERS
app.get('/api/admin/data', (req, res) => {
    const db = readDB();
    res.json({ users: db.users });
});

// 4. ADMIN: APPROVE USER
app.post('/api/admin/approve', (req, res) => {
    const { targetUser } = req.body;
    const db = readDB();
    const userIdx = db.users.findIndex(u => u.user === targetUser);
    
    if (userIdx !== -1) {
        db.users[userIdx].status = 'active';
        writeDB(db);
        res.json({ success: true });
    }
});

// 5. INBOX API (Telegram/Insta Style Data)
app.get('/api/inbox', (req, res) => {
    const { type } = req.query;
    // For now, returning static data to match your new Inbox design
    const mockData = {
        chats: [{ sender: "سارة", text: "هل أكملت ملخص الإيكولوجيا؟", time: "12:45" }],
        channels: [{ sender: "COUS News", text: "تحديث مواقيت النقل", time: "10:00" }],
        requests: []
    };
    res.json(mockData[type] || []);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
