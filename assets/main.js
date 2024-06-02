const socket = io();

let canvasW;
let canvasH;

let loaded_images = 0;

let food = [];
let tela = [];
let heads = [];
let head = [];

const images = {
    "head": "images/head.png",
    "telo": "images/telo.png",
    "eda": "images/eda.png",
};

let interval;

const canvas = document.getElementById("screen");

function loadAllImages() {
    Object.keys(images).forEach((image_title) => {
        let img = new Image();

        img.addEventListener("load", () => {
            loaded_images += 1;
            if (loaded_images === Object.keys(images).length) {
                startGame();
            }
        });

        img.src = images[image_title];
        images[image_title] = img;
    });
}

function makeFullscreen() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;

    canvasW = canvas.width;
    canvasH = canvas.height;
}

function drawBackground(ctx) {
    ctx.fillStyle = "#f5f5dc";
    ctx.fillRect(0, 0, canvasW, canvasH);
}

function drawHavka(ctx) {
    food.forEach((eda) => {
        ctx.drawImage(images.eda, eda.x - 30, eda.y - 30, 30, 30);
    });
}

function drawHead(ctx) {
    heads.forEach((head) => {
        ctx.drawImage(images.head, head.x - 30, head.y - 50, 30, 50);
    });
}

function move() {
    window.addEventListener('keydown', event => {
        console.log(event.key)
        if (event.key == 'a' || event.key == 'A' || event.key == 'ф' || event.key == 'Ф') {
            socket.emit('move_left', head);
        }
        if (event.key == 'w' || event.key == 'W' || event.key == 'ц' || event.key == 'ц') {
            socket.emit('move_up', head);
        }
        if (event.key == 'd' || event.key == 'D' || event.key == 'в' || event.key == 'В') {
            socket.emit('move_right', head);
        }
        if (event.key == 'ы' || event.key == 'Ы' || event.key == 's' || event.key == 'S') {
            socket.emit('move_down', head);
        }
    });
}

function drawFrame() {

    socket.on('eda', server_food => {
        food = server_food;

    });
    socket.on("head", server_head => {
        heads = server_head;
    });
    makeFullscreen();
    const ctx = canvas.getContext("2d");
    drawBackground(ctx);
    console.log(head)


    drawHavka(ctx);
    drawHead(ctx);
}

function startGame() {
    socket.on("headd", server_head => {
        head = server_head;
    });


    setInterval(drawFrame, 20);
}

loadAllImages();

