const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(bodyParser.json());


let commandQueue = [];


const AUTHORIZED_USER_ID = 1076889137; 
const SECRET_KEY = "doge"; 


app.get('/poll-commands', (req, res) => { 
    const { gameId, secret } = req.query;


    if (secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }


    const commandsToExecute = [...commandQueue];
    commandQueue = []; 

    res.json({
        success: true,
        commands: commandsToExecute
    });
});


app.post('/send-command', (req, res) => {
    const { script, userId, secret } = req.body;


    if (secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }


    if (userId !== AUTHORIZED_USER_ID) {
        return res.status(403).json({ error: 'User not authorized' });
    }

    if (!script || typeof script !== 'string') {
        return res.status(400).json({ error: 'Invalid script' });
    }


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
