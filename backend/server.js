const app = require('./app');
const connectDatabase = require('./config/database');
const PORT = process.env.PORT || 4000;

connectDatabase();


// Add the required packages for file upload
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

// Configure your AWS credentials and region
aws.config.update({
  accessKeyId: 'YOUR_ACCESS_KEY',
  secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  region: 'YOUR_AWS_REGION',
});

// Create an S3 instance
const s3 = new aws.S3();

// Set up multer storage using S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'YOUR_BUCKET_NAME',
    // Other configuration options if needed
  }),
});

// Add a file upload route
app.post('/upload', upload.single('file'), (req, res) => {
  // Handle the uploaded file
  console.log('File uploaded:', req.file);
  // Respond with a success message or perform further actions
  res.json({ message: 'File uploaded successfully' });
});



const server = app.listen(PORT, () => {
    console.log(`Server Running on http://localhost:${PORT}`);
});


// ============= socket.io ==============

const io = require("socket.io")(server, {
    // pingTimeout: 60000,
    cors: {
        origin: "http://localhost:3000",
    }
});

let users = [];

const addUser = (userId, socketId) => {
    !users.some((user) => user.userId === userId) &&
        users.push({ userId, socketId });
}

const removeUser = (socketId) => {
    users = users.filter((user) => user.socketId !== socketId);
}

const getUser = (userId) => {
    return users.find((user) => user.userId === userId);
}

io.on("connection", (socket) => {
    console.log("🚀 Someone connected!");
    // console.log(users);

    // get userId and socketId from client
    socket.on("addUser", (userId) => {
        addUser(userId, socket.id);
        io.emit("getUsers", users);
    });

    // get and send message
    socket.on("sendMessage", ({ senderId, receiverId, content }) => {

        const user = getUser(receiverId);

        io.to(user?.socketId).emit("getMessage", {
            senderId,
            content,
        });
    });

    // typing states
    socket.on("typing", ({ senderId, receiverId }) => {
        const user = getUser(receiverId);
        console.log(user)
        io.to(user?.socketId).emit("typing", senderId);
    });

    socket.on("typing stop", ({ senderId, receiverId }) => {
        const user = getUser(receiverId);
        io.to(user?.socketId).emit("typing stop", senderId);
    });

    // user disconnected
    socket.on("disconnect", () => {
        console.log("⚠️ Someone disconnected")
        removeUser(socket.id);
        io.emit("getUsers", users);
        // console.log(users);
    });
});