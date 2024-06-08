const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

let sockets = [];
let food = [];
let heads = [];
let playerHead = [];

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
    };
    heads.push(head);
    sockets.forEach(socket => socket.emit("headd", head));
}

function move(socket) {
    socket.on("move_left", client_head => {
        playerHead = client_head
        playerHead[1] -= 5
        for (let i = 0; i < heads.length; i++) {
            if (heads[i].id === playerHead.id) {
                socket.emit("headd", heads);
            }
        }
    })

    socket.on("move_right", client_head => {
        playerHead = client_head
        playerHead[1] += 5
        for (let i = 0; i < heads.length; i++) {
            if (heads[i].id === playerHead.id) {
                socket.emit("headd", heads);
            }
        }
    })

    socket.on("move_up", client_head => {
        playerHead = client_head
        playerHead[2] -= 5
        for (let i = 0; i < heads.length; i++) {
            if (heads[i].id === playerHead.id) {
                socket.emit("headd", heads);
            }
        }
    })

    socket.on("move_down", client_head => {
        playerHead = client_head
        playerHead[2] += 5
        for (let i = 0; i < heads.length; i++) {
            if (heads[i].id === playerHead.id) {
                socket.emit("headd", heads);
            }
        }
    })
}

io.on("connection", (socket) => {
    sockets.push(socket);
    socket.emit("eda", food);
    move(socket); // Передаем socket в функцию move
    addHead(socket);
    sockets.forEach(socket => socket.emit("head", heads));
});

setInterval(() => {
    addFood();
    removeOldEda();
    move(socket); // Передаем socket в функцию move
    sockets.forEach(socket => socket.emit("head", heads));
}, 1000);


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.use(express.static(__dirname + "/assets"));

http.listen(3000, () => {
    console.log("Сервер запущен на порту 3000");
});
// function move() {
//     socket.on("move_left", client_head => {
//         playerHead = client_head;
//         playerHead[1] -= 5;

//         }
//     });
// }