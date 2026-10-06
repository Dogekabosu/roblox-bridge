const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const commandQueue = [];

// SECURITY CONFIG
const AUTHORIZED_USER_ID = 1076889137;
const SECRET_KEY = process.env.SECRET_KEY || "doge";

// ACTIVE CONNECTIONS TRACKING (In-Memory Only)
// This map stores userId -> lastHeartbeatTimestamp
const activeConnections = new Map();

// Cleanup old connections every 1 minute
// If a heartbeat hasn't been received for 2 minutes, the user is considered disconnected
const CLEANUP_INTERVAL = 60000; // 1 minute
const CONNECTION_TIMEOUT = 120000; // 2 minutes

setInterval(() => {
    const now = Date.now();
    for (const [userId, lastSeen] of activeConnections.entries()) {
        if (now - lastSeen > CONNECTION_TIMEOUT) {
            activeConnections.delete(userId);
            console.log(`Connection timeout: User ${userId} removed from active list.`);
        }
    }
}, CLEANUP_INTERVAL);

// --- ENDPOINTS ---

app.get('/', (req, res) => {
    res.json({ success: true, message: 'Roblox bridge is running' });
});

// NEW: Heartbeat Endpoint
// Clients call this to indicate they are still connected
app.post('/keep-alive', (req, res) {
    const { userId, secret } = req.body;

    if (secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (userId !== AUTHORIZED_USER_ID) {
        return res.status(403).json({ error: 'User not authorized' });
    }

    // Register/Refresh connection
    activeConnections.set(userId, Date.now());
    console.log(`Heartbeat received from user ${userId}. Active connections: ${activeConnections.size}`);
    
    res.json({ success: true, message: 'Connection registered' });
});

// NEW: Check Connection Status Endpoint (Optional but useful)
// Allows you to check if a specific user is currently "connected"
app.get('/is-connected', (req, res) {
    if (req.query.secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const targetUserId = req.query.userId;
    if (!targetUserId) {
        return res.status(400).json({ error: 'userId parameter required' });
    }

    const isConnected = activeConnections.has(targetUserId) && 
                        (Date.now() - activeConnections.get(targetUserId) < CONNECTION_TIMEOUT);
    
    res.json({ connected: isConnected });
});

app.get('/poll-commands', (req, res) {
    if (req.query.secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const commandsToExecute = commandQueue.splice(0);
    res.json({ success: true, commands: commandsToExecute });
});

const COMMAND_REGEX =
    /^require\((\d+)\)(?:([.:])([A-Za-z_][A-Za-z0-9_]*))?\((?:["']([^"']*)["'])?\)$/;

app.post('/send-command', (req, res) {
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

    const match = command.trim.match(COMMAND_REGEX);

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
    console.log(`Security: Secret key protection enabled.`);
    console.log(`Heartbeat: Active connection tracking enabled.`);
});
