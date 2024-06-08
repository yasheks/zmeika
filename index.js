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
    socket.emit("headd", head);
}

io.on("connection", (socket) => {
    sockets.push(socket);
    socket.emit("eda", food);

    addHead(socket);
    sockets.forEach(socket => socket.emit("head", heads));

    socket.on("move_left", (client_head) => {
        playerHead = client_head;
        console.log("лева")
        playerHead.x -= 5;
        for (let i = 0; i<heads.length; i++){
            if(heads[i].id == playerHead.id){
                heads[i] = playerHead;
            }
        }
        socket.emit("headd", playerHead)
        io.emit("head", heads);
    });

    socket.on("move_right", client_head => {
        console.log("права", client_head)
        playerHead = client_head;
        playerHead.x += 5;
        for (let i = 0; i<heads.length; i++){
            if(heads[i].id == playerHead.id){
                heads[i] = playerHead;
            }
        }
        socket.emit("headd", playerHead)
        io.emit("head", heads);
    });

    socket.on("move_up", client_head => {
        playerHead = client_head;
        playerHead.y -= 5;
        console.log("вdееерх")
        for (let i = 0; i<heads.length; i++){
            if(heads[i].id == playerHead.id){
                heads[i] = playerHead;
            }
        }
        socket.emit("headd", playerHead)
        io.emit("head", heads);
    });

    socket.on("move_down", client_head => {
        console.log("ниииз")
        playerHead = client_head;
        playerHead.y += 5;
        for (let i = 0; i<heads.length; i++){
            if(heads[i].id == playerHead.id){
                heads[i] = playerHead;
            }
        }
        socket.emit("headd", playerHead)
        io.emit("head", heads);
    });
});
setInterval(() => {
    addFood();
    removeOldEda();

    sockets.forEach(socket => socket.emit("head", heads));
}, 1000);


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.use(express.static(__dirname + "/assets"));

http.listen(3000, () => {
    console.log("Сервер запущен на порту 3000");
});
