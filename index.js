const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
//let VsaHavka = [];
//let tela = [];
//let eda_interval;

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});
app.use(express.static(__dirname + "/assets"));


let sockets = []
let food = [];

io.on("connection", (socket) => {
    sockets.push(socket)
    socket.emit("eda", food);
    socket.on("spawn", addFood)
});

function addFood() {
    food.push(1)
    sockets.forEach(socket => socket.emit("eda", food))
}

http.listen(3000, () => {
    console.log("сервер запущен");
});


//function random(a, b) {
//    return Math.random() * (b - a) + a;
//}
//function createEda() {
//    const bottle = {
//        x: random(0, canvasW),
//        y: random(0, canvasH),
//    }
//    bottles.push(bottle)
//}
//function removeOldEda() {
//    if (VsaHavka.length > 15) {
//        VsaHavka.shift();
//    }
//}
//
//let sockets = []
//
//io.on("connection", (socket) => {
//    sockets.push(socket)
//    socket.emit("send_eda", VsaHavka);
//});
//
//function drawFrame() {
//    removeOldEda();
//    socket.emit("send_eda");
//
//}
//function startGame() {
//
//    clearInterval(eda_interval);
//    setInterval(drawFrame();, 20);
//    eda_interval = setInterval(createEda, 1000);
//    socket.emit("send_eda");
//    console.log(data);
//
//}
//startGame();