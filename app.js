// ======= HELPERS =======
const $ = sel => document.querySelector(sel);
const logBox = $("#log");

function log(msg, cat = "misc") {
  const ts = new Date().toLocaleTimeString();
  if (cat === "motor" && !$("#logMotor").checked) return;
  if (cat === "net" && !$("#logNet").checked) return;
  if (cat === "telem" && !$("#logTelem").checked) return;
  const line = document.createElement("div");
  line.textContent = `[${ts}] ${msg}`;
  logBox.prepend(line);
}

$("#clearLog").onclick = () => logBox.innerHTML = "";

// ====== GLOBALS ======
apiBase = $("#apiBase")?.value.trim() || "http://192.168.31.96";
let demo = false;

$("#connectBtn").onclick = () => { 
    apiBase = $("#apiBase").value.trim() || "http://192.168.31.96";
    log(`Используем IP: ${apiBase}`, "net");
    sendESPCommand("stop"); // стартовая команда
};



// ====== COMMAND MAPPING ======
const cmdMap = {
  forward: "FORWARD",
  backward: "BACKWARD",
  left: "LEFT",
  right: "RIGHT",
  stop: "STOP",
  TURN360: "TURN360"
};

// ====== SEND COMMAND ======
async function sendESPCommand(cmd) {
  const espCmd = cmdMap[cmd] || "STOP";

  // Лог команды всегда
  log(`Команда отправлена: ${espCmd}`, "motor");

  if (demo) return;

  try {
    await fetch(`${apiBase}/api/move`, {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: `cmd=${encodeURIComponent(espCmd)}`,
    });
  } catch(e) {
    // Ошибки сети отдельно, не мешают логам команд
    log(`Сетевая ошибка: ${e.message}`, "net");
  }
  
}



async function stopESP() { await sendESPCommand("stop"); }

// ====== BUTTON CONTROL ======
document.querySelectorAll(".btn").forEach(b => {
  b.addEventListener("mousedown", () => sendESPCommand(b.dataset.cmd));
  b.addEventListener("touchstart", e => { e.preventDefault(); sendESPCommand(b.dataset.cmd); }, {passive:false});
});
document.querySelectorAll(".dir").forEach(b => {
  b.addEventListener("mouseup", stopESP);
  b.addEventListener("mouseleave", e => { if(e.buttons===1) stopESP(); });
  b.addEventListener("touchend", stopESP);
});

// ====== TURN360 BUTTON ======
document.addEventListener("DOMContentLoaded", () => {
    const turnBtn = document.getElementById("square");
    if(turnBtn) {
        turnBtn.addEventListener("click", () => {
            sendESPCommand("TURN360");
            log("Команда отправлена: TURN360", "motor");
        });
    }
});

// ====== KEYBOARD CONTROL ======
// ====== KEYBOARD CONTROL ======
let keysPressed = new Set();
let currentCmd = "stop"; // текущая команда
let kbEnabled = false; // глобально: включена ли клавиатура




// кнопка переключения клавиатуры
$("#kbBtn").onclick = () => {
    kbEnabled = !kbEnabled;
    $("#kbBtn").innerText = kbEnabled ? "Выключить управление клавой" : "Включить управление клавой";
    $("#kbStatus").innerText = "Режим: " + (kbEnabled ? "включён" : "выключен");
    
};

// После определения sendESPCommand() добавляем обработчик кнопки


// маппинг клавиш
const keyMap = { 
  "w": "forward", "ArrowUp": "forward", "W": "forward", "ArrowUp": "forward",
  "s": "backward", "ArrowDown": "backward", "S": "backward", "ArrowDown": "backward",
  "a": "left", "ArrowLeft": "left", "A": "left", "ArrowLeft": "left",
  "d": "right", "ArrowRight": "right", "D": "right", "ArrowRight": "right",
  " ": "stop",
  "k": "TURN360",
};

// обработчик нажатия
document.addEventListener("keydown", e => {
  if (!kbEnabled) return;
  const cmd = keyMap[e.key];
  if (!cmd) return;

  if (!keysPressed.has(e.key)) keysPressed.add(e.key);

  const newCmd = Array.from(keysPressed).map(k => keyMap[k])[0] || "stop";
  if (newCmd !== currentCmd) {
    currentCmd = newCmd;
    sendESPCommand(currentCmd);
  }
});

// обработчик отпускания
document.addEventListener("keyup", e => {
  if (!kbEnabled) return;
  if (keysPressed.has(e.key)) keysPressed.delete(e.key);

  const newCmd = Array.from(keysPressed).map(k => keyMap[k])[0] || "stop";
  if (newCmd !== currentCmd) {
    currentCmd = newCmd;
    sendESPCommand(currentCmd);
  }
});
  

// команды






// ====== JOYSTICK ======
const joy = $("#joystick");
const jctx = joy.getContext("2d");
const center = {x: joy.width/2, y: joy.height/2};
const R = 90, knobR = 26;
let dragging = false, knob = {...center};

function drawJoy() {
  jctx.clearRect(0,0,joy.width,joy.height);
  jctx.beginPath(); jctx.arc(center.x, center.y, R, 0, Math.PI*2);
  jctx.strokeStyle = "#2a3140"; jctx.lineWidth = 3; jctx.stroke();

  jctx.beginPath();
  jctx.moveTo(center.x-R, center.y); jctx.lineTo(center.x+R, center.y);
  jctx.moveTo(center.x, center.y-R); jctx.lineTo(center.x, center.y+R);
  jctx.strokeStyle = "#243042"; jctx.lineWidth = 1; jctx.stroke();

  jctx.beginPath();
  jctx.arc(knob.x, knob.y, knobR, 0, Math.PI*2);
  jctx.fillStyle = "#1b2330";
  jctx.fill();
  jctx.strokeStyle = "#3ea6ff";
  jctx.lineWidth = 2;
  jctx.stroke();
}

function joyCmdFromVec(dx, dy){
 const absDx = Math.abs(dx);
const absDy = Math.abs(dy);
if(absDx > absDy) return dx > 0 ? "right" : "left";
else return dy > 0 ? "forward" : "backward";

}

function setKnob(pos){
  const dx = pos.x - center.x, dy = pos.y - center.y;
  const mag = Math.hypot(dx, dy);
  if(mag>R){ const k=R/mag; knob.x=center.x+dx*k; knob.y=center.y+dy*k; }
  else knob={...pos};
  drawJoy();
  const cmd = joyCmdFromVec(dx, dy);
  if(cmd==="stop") stopESP(); else sendESPCommand(cmd);
}

function joyRelease(){ dragging=false; knob={...center}; drawJoy(); stopESP(); }
function joyPosFromEvent(e){
  const rect = joy.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX)-rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY)-rect.top;
  return {x, y};
}

joy.addEventListener("mousedown", e => { dragging=true; setKnob(joyPosFromEvent(e)); });
joy.addEventListener("mousemove", e => { if(dragging) setKnob(joyPosFromEvent(e)); });
document.addEventListener("mouseup", joyRelease);
joy.addEventListener("touchstart", e => { e.preventDefault(); dragging=true; setKnob(joyPosFromEvent(e)); }, {passive:false});
joy.addEventListener("touchmove", e => { e.preventDefault(); if(dragging) setKnob(joyPosFromEvent(e)); }, {passive:false});
joy.addEventListener("touchend", e => { e.preventDefault(); joyRelease(); }, {passive:false});

// ====== DEMO MODE ======
$("#demoToggle").onchange = () => { demo=$("#demoToggle").checked; log(`Demo: ${demo}`, "net"); };


// ====== INIT ======
window.addEventListener("load", ()=>{
  apiBase=$("#apiBase").value.trim(); 
  drawJoy(); 
});



