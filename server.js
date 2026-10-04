const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const commandQueue = [];

const AUTHORIZED_USER_ID = 1076889137;
const SECRET_KEY = process.env.SECRET_KEY || "doge";

app.get('/', (req, res) => {
    res.json({ success: true, message: 'Roblox bridge is running' });
});

app.get('/poll-commands', (req, res) => {
    if (req.query.secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const commandsToExecute = commandQueue.splice(0);
    res.json({ success: true, commands: commandsToExecute });
});

const COMMAND_REGEX =
    /^require\((\d+)\)(?:([.:])([A-Za-z_][A-Za-z0-9_]*))?\((?:["']([^"']*)["'])?\)$/;

app.post('/send-command', (req, res) => {
    const { command, userId, secret } = req.body;

    if (secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (userId !== AUTHORIZED_USER_ID) {
        return res.status(403).json({ error: 'User not authorized' });
    }

    if (typeof command !== 'string' || !command.trim()) {
        return res.status(400).json({ error: 'Missing command' });
    }

    const match = command.trim().match(COMMAND_REGEX);

    if (!match) {
        return res.status(400).json({
            error: 'Invalid command format',
            expected: [
                'require(assetId).functionName()',
                'require(assetId):functionName()',
                'require(assetId).functionName("argument")',
                'require(assetId):functionName("argument")',
                'require(assetId)("argument")'
            ]
        });
    }

    const [, assetIdStr, separator, functionName, argument] = match;

    if (!functionName && argument === undefined) {
        return res.status(400).json({ error: 'Direct call needs an argument' });
    }

    const entry = {
        assetId: Number(assetIdStr),
        function: functionName || null,
        callStyle: separator === ':' ? 'method' : 'dot',
        argument: argument !== undefined ? argument : null,
        timestamp: Date.now()
    };

    commandQueue.push(entry);

    console.log(
        `Queued: require(${entry.assetId})` +
        (entry.function
            ? `${separator}${entry.function}(${entry.argument !== null ? `"${entry.argument}"` : ''})`
            : `("${entry.argument}")`)
    );

    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`Bridge running on port ${PORT}`);
});
