//Initialize and connect socket
let socket = io();
let images = []; // Array to store all loaded images
let imageCount = 0; // Will be set by server
let isDragging = false; // Track if we're currently dragging
let currentImageIndex = null; // Store the current image index while dragging
let currentScale = 1; // Store current scale while dragging
let drawnImages = []; // Store all drawn images and their positions

//Listen for confirmation of connection
socket.on('connect', () => {
    console.log("Connected");
});

// Listen for image count from server
socket.on('image-count', (count) => {
    console.log(`Loading ${count} images...`);
    imageCount = count;
    loadImages();
});

function loadImages() {
    // Load all images into the array
    for (let i = 1; i <= imageCount; i++) {
        images.push(loadImage(`images/${i}.png`, 
            // Optional: Success callback
            () => console.log(`Loaded image ${i}`),
            // Optional: Error callback
            () => console.error(`Failed to load image ${i}`)
        ));
    }
}

function setup() {
    // Create canvas to fill the window
    const canvas = createCanvas(windowWidth, windowHeight);
    // Add an ID to the canvas for styling
    canvas.id('drawing-canvas');
    imageMode(CENTER);
    background(255);

    //Listen for an event named 'message-share' from the server
    socket.on('message-share', (data) => {
        displayImage(data);
        // Store the drawn image data
        drawnImages.push(data);
        // If this is our dragged image, store the current index and scale
        if (data.isDragging && data.socketId === socket.id) {
            currentImageIndex = data.imageIndex;
            currentScale = data.scale;
        }
    });
}

// Generate random scale between 0.75 and 1.25 (±25%)
function getRandomScale() {
    return 0.75 + Math.random() * 0.5; // Range from 0.75 to 1.25
}

// Handle window resize
function windowResized() {
    // Resize the canvas to match new window size
    resizeCanvas(windowWidth, windowHeight);
    // Redraw white background
    background(255);
    // Redraw all stored images
    drawnImages.forEach(data => {
        displayImage(data);
    });
}

function mousePressed() {
    if (images.length === 0) return; // Don't do anything if images aren't loaded yet
    
    isDragging = true;
    // Generate new random scale for this drag session
    currentScale = getRandomScale();
    
    // Initial click - request new image
    let mouseData = {
        x: mouseX,
        y: mouseY,
        isDragging: true,
        socketId: socket.id,
        scale: currentScale
    };

    socket.emit('request-image', mouseData);
}

function mouseDragged() {
    if (!isDragging || images.length === 0) return;

    // While dragging, use the same image index and scale
    let mouseData = {
        x: mouseX,
        y: mouseY,
        isDragging: true,
        socketId: socket.id,
        useCurrentImage: true, // Tell server to reuse current image
        scale: currentScale // Use the same scale during drag
    };

    socket.emit('request-image', mouseData);
}

function mouseReleased() {
    isDragging = false;
    currentImageIndex = null;
    currentScale = 1;
}

// Function to display image at the specified position
function displayImage(obj) {
    if (images.length === 0) return; // Safety check
    
    let img = images[obj.imageIndex];
    // Get the scale - either from the object or default to 1
    let scale = obj.scale || 1;
    
    // Apply the scale to both width and height
    push(); // Save current transformation state
    let scaledWidth = img.width * scale;
    let scaledHeight = img.height * scale;
    image(img, obj.x, obj.y, scaledWidth, scaledHeight);
    pop(); // Restore transformation state
}

// Optional: Add some basic CSS to ensure the canvas fills the window properly
document.head.insertAdjacentHTML('beforeend', `
    <style>
        body, html {
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #drawing-canvas {
            display: block;
        }
    </style>
`);