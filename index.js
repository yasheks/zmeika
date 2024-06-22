const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

let sockets = [];
let food = [];
let heads = {};

function random(a, b) {
    return Math.random() * (b - a) + a;
}

function addFood() {
    const eda = {
        x: random(0, 800),
        y: random(0, 600),
    };
    food.push(eda);
    sockets.forEach(socket => socket.emit("eda", food));
}

function removeOldEda() {
    if (food.length > 15) {
        food.shift();
        sockets.forEach(socket => socket.emit("eda", food));
    }
}

function addHead(socket) {
    const head = {
        id: socket.id,
        x: random(0, 800),
        y: random(0, 600),
        direction: 'down',
        moving: false,
        tail: []
    };
    heads[socket.id] = head;
    socket.emit("headd", head);
}

function moveHead(socket, direction) {
    const head = heads[socket.id];
    if (head) {
        head.direction = direction;
        head.moving = true;
        updateHead(socket);
    }
}

function updateHead(socket) {
    const head = heads[socket.id];
    if (head) {
        if (head.moving) {
            switch (head.direction) {
                case 'up':
                    head.y -= 5;
                    break;
                case 'down':
                    head.y += 5;
                    break;
                case 'left':
                    head.x -= 5;
                    break;
                case 'right':
                    head.x += 5;
                    break;
            }

            if (head.tail.length > 0) {
                head.tail.pop();
                head.tail.unshift({ x: head.x, y: head.y });
            }
        }
        socket.emit("headd", head);
        io.emit("head", Object.values(heads));
    }
}

io.on("connection", (socket) => {

    socket.on("eda", (client_food) => {
        food = client_food
        io.emit("eda", food);
    })
    sockets.push(socket);
    socket.emit("eda", food);
    addHead(socket);
    socket.on("tail", (playerHead) => {
        for (let i = 0; i < heads.length; i++) {
            if (heads[i].id == playerHead.id) {
                socket.emit("headd", heads);
    })

    io.emit("head", Object.values(heads));

    socket.on("move_left", () => moveHead(socket, 'left'));
    socket.on("move_right", () => moveHead(socket, 'right'));
    socket.on("move_up", () => moveHead(socket, 'up'));
    socket.on("move_down", () => moveHead(socket, 'down'));



    socket.on("disconnect", () => {
        console.log('user disconnected');
        sockets.splice(sockets.indexOf(socket), 1);
        delete heads[socket.id];
        io.emit("head", Object.values(heads));
    });
});

setInterval(() => {
    addFood();
    removeOldEda();

}, 1000);

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.use(express.static(__dirname + "/assets"));

http.listen(3000, () => {
    console.log("Сервер запущен на порту 3000");
});
