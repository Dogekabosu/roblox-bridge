const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());


let commandQueue = [];


const AUTHORIZED_USER_ID = 1076889137; 
const SECRET_KEY = "doge"; 


app.get('/poll-commands', (req, res) => { 
    const { gameId, secret } = req.query;

    // Basic Security Check
    if (secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    // Send pending commands and clear the queue
    const commandsToExecute = [...commandQueue];
    commandQueue = []; // Clear queue after delivery

    res.json({
        success: true,
        commands: commandsToExecute
    });
});

// 2. Your C# App sends commands to this endpoint
app.post('/send-command', (req, res) => {
    const { script, userId, secret } = req.body;

    // Security Check 1: Secret Key
    if (secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    // Security Check 2: User ID Verification
    if (userId !== AUTHORIZED_USER_ID) {
        return res.status(403).json({ error: 'User not authorized' });
    }

    if (!script || typeof script !== 'string') {
        return res.status(400).json({ error: 'Invalid script' });
    }

    // Add to queue
    commandQueue.push({
        script: script,
        timestamp: Date.now(),
        source: 'c#-app'
    });

    console.log(`Command queued. Queue size: ${commandQueue.length}`);
    res.json({ success: true, message: 'Command queued for execution' });
});

app.listen(PORT, () => {
    console.log(`Bridge server running on port ${PORT}`);
    console.log(`Public URL must be accessible by Roblox (HTTPS required)`);
});
