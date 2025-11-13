const os = require('os');
const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000

app.use(cors());

class Queue {
    constructor() {
        this.items = [];
        this.pause = false;
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

// Increase the limit to handle larger payloads like base64 images
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
    res.send('Hello From Image Recognition Service!');
});

const queue = new Queue();

const run = async () => {
    if (queue.isEmpty()) {
        return;
    }
    if (!queue.pause) {
        const item = queue.dequeue();
        const res = await fetch("http://localhost:5000/api/search", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                img: item.img
            })
        })
        const data = await res.json();  
        console.log(data);
    }
    run()
}

let flag = true;

app.post('/create', (req, res) => {
    console.log("[Username]", req.body.username)
    // const base64Data = req.body.img.replace(/^data:image\/jpeg;base64,/, "");
    let filename = Date.now().toString(36) + ".jpeg"
    // fs.mkdirSync(path.join(__dirname, "images"), { recursive: true })
    let imgpath = path.join(__dirname, "images", filename)
    // fs.writeFileSync(imgpath, base64Data, 'base64');
    queue.enqueue({ img: req.body.img, username: req.body.username });
    // if (flag) {
    // flag = false;
    run();
    // }
    console.log(`[CREATE] Filename - ${imgpath}`)
    res.status(201).send({ message: "Image data added to the queue.", filename, length: queue.size() });
});

app.get("/get", (req, res) => {
    res.send(queue.peek());
})

app.delete("/delete", (req, res) => {
    res.send(queue.dequeue());
})

app.listen(port, () => {
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
        console.log(`Local IP addresses: ${localIps.join(', ')}:${port}`);
    } else {
        console.log('No local IPv4 address found.');
    }
    console.log(`Example app listening on port ${port}`);
});
