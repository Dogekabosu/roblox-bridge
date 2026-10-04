const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const commandQueue = [];

const AUTHORIZED_USER_ID = 1076889137;
const SECRET_KEY = "doge";

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Roblox bridge is running'
    });
});

// ============================================================
// POLL COMMANDS
// ============================================================

app.get('/poll-commands', (req, res) => {
    const { secret } = req.query;

    if (secret !== SECRET_KEY) {
        return res.status(403).json({
            error: 'Unauthorized'
        });
    }

    // Return everything currently waiting and clear the queue.
    const commandsToExecute = commandQueue.splice(0);

    res.json({
        success: true,
        commands: commandsToExecute
    });
});

// ============================================================
// SEND COMMAND
// ============================================================

app.post('/send-command', (req, res) => {
    const { command, userId, secret } = req.body;

    if (secret !== SECRET_KEY) {
        return res.status(403).json({
            error: 'Unauthorized'
        });
    }

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

    const input = command.trim();

    // require(123456789).Function()
    const noArgFunctionMatch = input.match(
        /^require\((\d+)\)\.([A-Za-z_][A-Za-z0-9_]*)\(\)$/
    );

    if (noArgFunctionMatch) {
        const assetId = Number(noArgFunctionMatch[1]);
        const functionName = noArgFunctionMatch[2];

        commandQueue.push({
            assetId,
            function: functionName,
            argument: null,
            timestamp: Date.now()
        });

        console.log(
            `Queued: require(${assetId}).${functionName}()`
        );

        return res.json({ success: true });
    }

    // require(123456789).Function("hello")
    const functionMatch = input.match(
        /^require\((\d+)\)\.([A-Za-z_][A-Za-z0-9_]*)\(["']([^"']*)["']\)$/
    );

    if (functionMatch) {
        const assetId = Number(functionMatch[1]);
        const functionName = functionMatch[2];
        const argument = functionMatch[3];

        commandQueue.push({
            assetId,
            function: functionName,
            argument,
            timestamp: Date.now()
        });

        console.log(
            `Queued: require(${assetId}).${functionName}("${argument}")`
        );

        return res.json({ success: true });
    }

    // require(123456789)("hello")
    const directMatch = input.match(
        /^require\((\d+)\)\(["']([^"']*)["']\)$/
    );

    if (directMatch) {
        const assetId = Number(directMatch[1]);
        const argument = directMatch[2];

        commandQueue.push({
            assetId,
            function: null,
            argument,
            timestamp: Date.now()
        });

        console.log(
            `Queued: require(${assetId})("${argument}")`
        );

        return res.json({ success: true });
    }

    return res.status(400).json({
        error: 'Invalid command format',
        expected: [
            'require(assetId).functionName()',
            'require(assetId).functionName("argument")',
            'require(assetId)("argument")'
        ]
    });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
    console.log(`Bridge running on port ${PORT}`);
});
