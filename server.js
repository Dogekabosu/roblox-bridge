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
    const {
        assetId,
        functionName,
        argument,
        userId,
        secret
    } = req.body;

    if (secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (userId !== AUTHORIZED_USER_ID) {
        return res.status(403).json({ error: 'User not authorized' });
    }

    if (!assetId || !functionName) {
        return res.status(400).json({
            error: 'Missing assetId or functionName'
        });
    }

    commandQueue.push({
        assetId,
        function: functionName,
        argument,
        timestamp: Date.now()
    });

    res.json({
        success: true
    });
});
