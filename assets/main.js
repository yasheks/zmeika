const socket = io();

let canvasW;
let canvasH;
let max = 0


let interval;


const canvas = document.getElementById("screen");

food = []

socket.on('eda', server_food => {
    food = server_food
    console.log(food)
})

window.addEventListener('keydown', event => {
    console.log(event.key)
    if (event.key == 'a') {
        socket.emit('spawn')
    }
});



//let VsaHavka = [];
//let tela = [];
//
//
//let score = 0;
//let loaded_images = 0;
//let cadr = 0;
//
//const images = {
//    "head": "images/head.png",
//    "telo": "images/telo.png",
//    "eda": "images/eda.png",
//}
//
//
//
//
//function loadAllImages() {
//    Object.keys(images).forEach((image_title) => {
//        let img = new Image()
//
//        img.addEventListener("load", () => {
//            loaded_images += 1
//            if (loaded_images === Object.keys(images).length) {
//                startGame()
//            }
//        });
//
//        img.src = images[image_title]
//        images[image_title] = img
//    })
//}
//
//
//
//
//function makeFullscreen() {
//    canvas.width = document.body.clientWidth;
//    canvas.height = document.body.clientHeight;
//
//    canvasW = canvas.width;
//    canvasH = canvas.height;
//}
//function drawBackground(ctx) {
//    ctx.fillStyle = "#f5f5dc";
//    ctx.fillRect(0, 0, canvasW, canvasH);
//}
//function drawHavka(ctx) {
//    VsaHavka.forEach((eda) => {
//        ctx.drawImage(images.eda, eda.x - 30, eda.y - 30, 30, 30);
//    });
//}
//
//function drawFrame() {
//    makeFullscreen();
//    removeOldEda();
//
//    const ctx = canvas.getContext("2d");
//
//    drawBackground(ctx);
//
//
//    drawHavka(ctx);
//}
//
//
//function startGame() {
//    enable();
//    clearInterval(eda_interval);
//    setInterval(drawFrame, 20);
//    eda_interval = setInterval(createEda, 1000);
//    socket.on('send_eda', (data) => {
//    console.log(data);
//
//    })
//
//
////    addEventListener("mousemove", saveMousePosition);
////    addEventListener("mousedown", mouseClick);
//}
//
//loadAllImages();



//socket.on("chat message", (data) =>{
//    const item = document.createElement("li");
//    item.innerHTML = `<span>${data.name}</span>: ${data.message}`;
//    messages.appendChild(item);
//    window.scrollTo(0, document.body.scrollHeight)
//});
