let seconds = 60;
let initialSeconds = 60;
let paused = false;
let price = 5000;
let timerId = null;

const timerEl = document.getElementById("timer");
const progress = document.getElementById("progressBar");
const toast = document.getElementById("toast");
const priceEl = document.querySelector(".price");

function formatTime(s){
  const m = Math.floor(s/60).toString().padStart(2,"0");
  const sec = (s%60).toString().padStart(2,"0");
  return `${m}:${sec}`;
}
function render(){
  timerEl.textContent = formatTime(seconds);
  progress.style.width = `${Math.max(0,Math.min(100,(seconds/initialSeconds)*100))}%`;
  priceEl.innerHTML = `${price.toLocaleString("en-US")} <span>ريال</span>`;
}
function tick(){
  if(paused) return;
  if(seconds > 0){seconds--; render();}
  else {clearInterval(timerId); showToast("انتهى وقت المزاد");}
}
timerId = setInterval(tick,1000);
render();

function showToast(msg){
  toast.textContent=msg; toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"),2200);
}
document.getElementById("increaseTime").onclick=()=>{
  seconds+=60; initialSeconds=Math.max(initialSeconds,seconds); render(); showToast("تمت إضافة دقيقة");
};
document.getElementById("skipBtn").onclick=()=>{
  seconds+=120; initialSeconds=Math.max(initialSeconds,seconds); render(); showToast("تمت إضافة دقيقتين");
};
document.getElementById("pauseBtn").onclick=(e)=>{
  paused=!paused; e.currentTarget.textContent=paused?"▶ متابعة":"⏸ إيقاف مؤقت";
  showToast(paused?"تم إيقاف المؤقت":"تمت متابعة المزاد");
};
document.getElementById("endBtn").onclick=()=>{
  seconds=60; initialSeconds=60; paused=false; document.getElementById("pauseBtn").textContent="⏸ إيقاف مؤقت"; render(); showToast("تمت إعادة ضبط المزاد");
};

const modal=document.getElementById("adminModal");
document.getElementById("rulesBtn").onclick=()=>modal.classList.remove("hidden");
document.getElementById("closeModal").onclick=()=>modal.classList.add("hidden");
document.getElementById("saveAdmin").onclick=()=>{
  price=Math.max(0,Number(document.getElementById("adminPrice").value)||0);
  seconds=Math.max(1,Number(document.getElementById("adminTime").value)||60);
  initialSeconds=seconds; paused=false;
  document.getElementById("pauseBtn").textContent="⏸ إيقاف مؤقت";
  render(); modal.classList.add("hidden"); showToast("تم حفظ إعدادات المزاد");
};
