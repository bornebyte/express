const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const os = require('os')

const app = express();
app.use(cors()); // Enable CORS for all routes

const server = http.createServer(app);

// Configure Socket.IO with CORS settings
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins. For production, restrict this to your frontend's URL.
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

let pause = false;
let running = false;

class Queue {
    constructor() {
        this.items = [];
    }

    // Adds an element to the end of the queue
    enqueue(element) {
        this.items.push(element);
    }

    // Removes and returns the first element from the queue
    dequeue() {
        if (this.isEmpty()) {
            return "Underflow"; // Or handle empty queue condition as needed
        }
        return this.items.shift();
    }

    // Returns the first element without removing it
    peek() {
        if (this.isEmpty()) {
            return "No elements in queue";
        }
        return this.items[0];
    }

    // Checks if the queue is empty
    isEmpty() {
        return this.items.length === 0;
    }

    // Returns the number of elements in the queue
    size() {
        return this.items.length;
    }

    // Clears all elements from the queue
    clear() {
        this.items = [];
    }
}

const queue = new Queue();

const run = () => {
    if (queue.isEmpty()) {
        return;
    }
    if (!running) {
        const item = queue.dequeue();
        running = true;
        fetch("http://localhost:5000/api/search", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                img: item.img
            })
        }).then((res) => {
            res.json().then(data => {
                io.emit('search-progress', { progress: queue.size() })
                io.emit('search-complete', data)
                running = false;
                run()
            })
        })
    }
}

// --- Express Routes (Optional) ---
app.get('/', (req, res) => {
    res.send('Socket.IO server is running.');
});

// --- Socket.IO Logic ---
io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    socket.on('face-search', (data) => {
        const { username, img } = data;
        queue.enqueue({ img, username });
        console.log(`Starting face search for user: ${username}`);
        run();
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// --- Start Server ---
server.listen(PORT, () => {
    const networkInterfaces = os.networkInterfaces();
    let localIps = [];

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            // Filter out internal and IPv6 addresses for typical local IP
            if (!iface.internal && iface.family === 'IPv4') {
                localIps.push(iface.address);
            }
        }
    }

    if (localIps.length > 0) {
        console.log(`Local IP addresses: ${localIps.join(', ')}:${PORT}`);
    } else {
        console.log('No local IPv4 address found.');
    }
    console.log(`Example app listening on port ${PORT}`);
});
