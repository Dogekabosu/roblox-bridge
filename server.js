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
    const {
        command,
        userId,
        secret
    } = req.body;

    // -------------------------
    // Authentication
    // -------------------------

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

    // -------------------------
    // Validate command
    // -------------------------

    if (typeof command !== 'string' || !command.trim()) {
        return res.status(400).json({
            error: 'Missing command'
        });
    }

    const input = command.trim();

    // ========================================================
    // FORMAT 1
    //
    // require(123456789).functionName("argument")
    // ========================================================
const functionMatch = input.match(
    /^require\((\d+)\)\.([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/
);

if (functionMatch) {
    const assetId = Number(functionMatch[1]);
    const functionName = functionMatch[2];
    const argumentText = functionMatch[3].trim();

    commandQueue.push({
        assetId,
        function: functionName,
        arguments: argumentText,
        timestamp: Date.now()
    });

    console.log(
        `Queued: require(${assetId}).${functionName}(${argumentText})`
    );

    return res.json({
        success: true
    });
}


    // ========================================================
    // FORMAT 2
    //
    // require(123456789)("argument")
    // ========================================================

   const directMatch = input.match(
    /^require\((\d+)\)\((.*)\)$/
);

if (directMatch) {
    const assetId = Number(directMatch[1]);
    const argumentText = directMatch[2].trim();

    commandQueue.push({
        assetId,
        function: null,
        arguments: argumentText,
        timestamp: Date.now()
    });

    console.log(
        `Queued: require(${assetId})(${argumentText})`
    );

    return res.json({
        success: true
    });
}


    // ========================================================
    // Invalid command
    // ========================================================

    return res.status(400).json({
        error: 'Invalid command format',
        expected: [
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
