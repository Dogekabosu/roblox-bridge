const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const commandQueue = [];

const AUTHORIZED_USER_ID = 1076889137;
const SECRET_KEY = "doge";

// =========================
// POLL COMMANDS
// =========================
app.get('/poll-commands', (req, res) => {
    const { secret } = req.query;

    if (secret !== SECRET_KEY) {
        return res.status(403).json({
            error: 'Unauthorized'
        });
    }

    const commandsToExecute = commandQueue.splice(0);

    res.json({
        success: true,
        commands: commandsToExecute
    });
});

// =========================
// SEND COMMAND
// =========================
app.post('/send-command', (req, res) => {
    const {
        command,
        userId,
        secret
    } = req.body;

    // Check secret
    if (secret !== SECRET_KEY) {
        return res.status(403).json({
            error: 'Unauthorized'
        });
    }

    // Check user
    if (userId !== AUTHORIZED_USER_ID) {
        return res.status(403).json({
            error: 'User not authorized'
        });
    }

    if (typeof command !== 'string' || !command.trim()) {
        return res.status(400).json({
            error: 'Missing command'
        });
    }

    /*
        Expected format:

        require(7804327506).amigodogodenot123("eerilm")
    */

    const match = command.trim().match(
        /^require\((\d+)\)\.([A-Za-z_][A-Za-z0-9_]*)\(["']([^"']*)["']\)$/
    );

    if (!match) {
        return res.status(400).json({
            error: 'Invalid command format',
            expected: 'require(assetId).functionName("argument")'
        });
    }

    const assetId = Number(match[1]);
    const functionName = match[2];
    const argument = match[3];

    commandQueue.push({
        assetId,
        function: functionName,
        argument,
        timestamp: Date.now()
    });

    console.log(
        `Queued: require(${assetId}).${functionName}("${argument}")`
    );

    res.json({
        success: true,
        command: {
            assetId,
            function: functionName,
            argument
        }
    });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
    console.log(`Bridge running on port ${PORT}`);
});
