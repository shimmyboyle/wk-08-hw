//Initialize the express 'app' object
let express = require("express");
let app = express();
let fs = require('fs');
let path = require('path');

app.use("/", express.static("public"));

//Initialize HTTP server
let http = require("http");
let server = http.createServer(app);
let port = process.env.PORT || 3000;

//Initialize socket.io
let io = require("socket.io");
io = new io.Server(server);

// Create images directory if it doesn't exist
const imageDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imageDir)) {
    try {
        fs.mkdirSync(imageDir, { recursive: true });
        console.log('Created images directory at:', imageDir);
    } catch (err) {
        console.error('Error creating images directory:', err);
    }
}

// Track available and used images
let imageCount = 0;
let availableImages = [];
let usedImages = new Set();
let currentDragImages = new Map(); // Track current image for each dragging user

// Function to reset the image pool
function resetImagePool() {
    availableImages = Array.from({ length: imageCount }, (_, i) => i);
    usedImages.clear();
    console.log('Image pool reset. All images available again.');
}

// Function to get a random unused image
function getRandomUnusedImage() {
    if (availableImages.length === 0) {
        resetImagePool();
    }
    
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const selectedImageIndex = availableImages[randomIndex];
    
    // Remove the selected image from available and add to used
    availableImages.splice(randomIndex, 1);
    usedImages.add(selectedImageIndex);
    
    console.log(`Selected image ${selectedImageIndex + 1}. ${availableImages.length} images remaining.`);
    return selectedImageIndex;
}

//Listen for a client to connect and disconnect
io.on("connection", (socket) => {
    console.log("We have a new client: " + socket.id);
  
    // Count the number of PNG files in the images directory
    try {
        const files = fs.readdirSync(imageDir);
        imageCount = files.filter(file => file.toLowerCase().endsWith('.png')).length;
        console.log(`Found ${imageCount} PNG files in images directory`);
        
        // Initialize the image pools if this is the first connection
        if (availableImages.length === 0 && usedImages.size === 0) {
            resetImagePool();
        }
        
        socket.emit('image-count', imageCount);
    } catch (err) {
        console.error('Error reading images directory:', err);
        socket.emit('image-count', 0);
    }

    socket.on('request-image', (data) => {
        let imageIndex;
        
        if (data.isDragging && data.useCurrentImage) {
            // If dragging, use the stored image index for this socket
            imageIndex = currentDragImages.get(socket.id);
        } else {
            // Get a new random image
            imageIndex = getRandomUnusedImage();
            if (data.isDragging) {
                // Store this image index for this socket's dragging session
                currentDragImages.set(socket.id, imageIndex);
            }
        }

        // Add the image index to the data
        const imageData = {
            ...data,
            imageIndex: imageIndex
        };
        
        io.emit('message-share', imageData);
    });

    socket.on("disconnect", () => {
        console.log("A client has disconnected: " + socket.id);
        // Clean up any stored drag image data for this socket
        currentDragImages.delete(socket.id);
    });
});

server.listen(port, () => {
    console.log("App listening at port: " + port);
    console.log("Images directory path:", imageDir);
});