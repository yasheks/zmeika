const socket = io();

let canvasW;
let canvasH;

let loaded_images = 0;
let score = 0
let food = [];
let tail = [];

let heads = [];
let head = [];

let last_key_pressed = "s"; // Variable to store the last key pressed

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

function poedanie(x, y) {
    let currentSize = food.length;

    food = food.filter((eda) => !(eda.x - 30 <= x && x <= eda.x + 30 && eda.y - 30 <= y && y <= eda.y + 30));
    socket.emit("eda", food);
    score += currentSize - food.length;
    if (currentSize - food.length > 0)tail.unshift({ x: head.x , y: head.y });
    // Добавляем новую часть хвоста для данного игрока
    socket.emit("tail", { x: head.x, y: head.y });

    // Удаляем последний элемент хвоста, если он превышает длину
    if (tail.length > heads.length) {
        tail.pop();
    }
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
        ctx.drawImage(images.head, head.x - 50, head.y - 50, 50, 50);
    });
}
function drawTail(ctx) {
    tail.forEach((part) => {
        ctx.drawImage(images.head, part.x - 50, part.y - 50, 50, 50);
    });
}
window.addEventListener('keydown', event => {
    if (event.key == 'a' || event.key == 'A' || event.key == 'ф' || event.key == 'Ф') {
        last_key_pressed = 'a';

    }
    if (event.key == 'w' || event.key == 'W' || event.key == 'ц' || event.key == 'ц') {
        last_key_pressed = 'w';

    }
    if (event.key == 'd' || event.key == 'D' || event.key == 'в' || event.key == 'В') {
        last_key_pressed = 'd';

    }
    if (event.key == 'ы' || event.key == 'Ы' || event.key == 's' || event.key == 'S') {
        last_key_pressed = 's';

    }
});




function drawFrame() {
    makeFullscreen();
    const ctx = canvas.getContext("2d");
    drawBackground(ctx);

    drawHavka(ctx);
    drawHead(ctx);
    drawTail(ctx);

    poedanie(head.x, head.y);
}


function startGame() {
    socket.on("headd", server_head => {
        tail.unshift({ x: head.x, y: head.y });
        head = server_head;
    });

    socket.on('eda', server_food => {
        food = server_food;
    });

    socket.on("head", server_head => {
        heads = server_head;
    });

    socket.on("tail", server_tail => {
        tail = server_tail;
    });

    setInterval(() => {
        if (last_key_pressed === 'a') {
            socket.emit('move_left', head);
        } else if (last_key_pressed === 'w') {
            socket.emit('move_up', head);
        } else if (last_key_pressed === 'd') {
            socket.emit('move_right', head);
        } else if (last_key_pressed === 's') {
            socket.emit('move_down', head);
        }
        drawFrame();
    }, 20);
}

loadAllImages();
