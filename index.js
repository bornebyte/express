const express = require('express');
const cors = require('cors');
const os = require('os')
const EventEmitter = require('events');
const uuid = require('uuid');

const eventEmitter = new EventEmitter();
const app = express();
app.use(cors()); // Enable CORS for all routes
const PORT = process.env.PORT || 3000;
let running = false;

app.use(express.json()); // Middleware to parse JSON bodies

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

const getAllMatchedImages = () => {
    if (queue.isEmpty()) {
        return;
    }
    if (!running) {
        const item = queue.dequeue();
        running = true;
        // fetch("http://localhost:5000/api/search", {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         img: item.img
        //     })
        // }).then((res) => {
        //     res.json().then(data => {
        //         eventEmitter.emit('search-progress', { progress: queue.size() })
        //         eventEmitter.emit('search-complete', data)
        //         running = false;
        //         getAllMatchedImages()
        //     })
        // })
        setTimeout(() => {
            const data = { matches: ['image1.jpg', 'image2.jpg'] }; // Mocked response
            eventEmitter.emit('search-progress', { progress: queue.size() })
            eventEmitter.emit('search-complete', data)
            console.log(queue.size())
            console.log(data)
            running = false;
            getAllMatchedImages()
        }, 7000); // Simulate network delay
    }
}

app.get('/', (req, res) => {
    res.send('Hello from Express!');
});

app.post('/create-job', (req, res) => {
    const jobId = uuid.v4();
    const timestamp = Date.now();
    // const item = {
    //     jobId: jobId,
    //     img: 'sample-image-data', // Placeholder for image data
    //     stage: 'stage-1',
    //     uid: 'user@gmail.com',
    //     timestamp: timestamp
    // }
    const item = {
        jobId: jobId,
        img: req.body.image, // Placeholder for image data
        stage: req.body.stage,
        uid: req.body.uid,
        timestamp: timestamp
    }
    queue.enqueue(item)
    getAllMatchedImages();
    res.json({ jobId, timestamp });
})

app.post('/toggle-running', (req, res) => {
    running = req.body.run;
    res.json({ running,  run:req.body.run });
});

app.get('/get-running', (req, res) => {
    res.json({ running });
});

// --- Start Server ---
app.listen(PORT, () => {
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
        console.log(`[SERVER] Local IP addresses: ${localIps.join(', ')}:${PORT}`);
    } else {
        console.log('[SERVER] No local IPv4 address found.');
    }
    console.log(`[SERVER] Example app listening on port ${PORT}`);
});
