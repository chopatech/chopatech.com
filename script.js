// scroll reveal
const reveals=document.querySelectorAll('.reveal');

const observer=new IntersectionObserver(entries=>{
entries.forEach(entry=>{
if(entry.isIntersecting){
entry.target.classList.add('active');
}
});
},{threshold:.15});

reveals.forEach(el=>observer.observe(el));

/* circular bot toggle + hidden chat panel */
function toggleChatWidget(){
const panel=document.querySelector('.chat-float');
const toggle=document.getElementById('botToggle');
if(!panel || !toggle) return;

const isOpen=panel.classList.contains('is-open');
const nextOpen=!isOpen;

// class + direct style (robust against CSS parsing/order issues)
panel.classList.toggle('is-open',nextOpen);
panel.style.display=nextOpen ? 'block' : 'none';
panel.setAttribute('aria-hidden',String(!nextOpen));

toggle.classList.toggle('is-open',nextOpen);
toggle.setAttribute('aria-expanded',String(nextOpen));

/* immediate visual feedback to prove the handler fired */
toggle.style.transform=nextOpen ? 'scale(1.08)' : '';
toggle.style.borderColor=nextOpen ? 'rgba(0,255,255,.7)' : 'rgba(0,255,255,.35)';
toggle.textContent=nextOpen ? '✖' : '🤖';
}

const botToggle=document.getElementById('botToggle');
if(botToggle){
botToggle.addEventListener('click',toggleChatWidget);
botToggle.addEventListener('keydown',(e)=>{
if(e.key==='Enter' || e.key===' '){
e.preventDefault();
toggleChatWidget();
}
});
}

// mobile hamburger menu toggle
const menuBtn=document.getElementById('menuBtn');
const mainNav=document.getElementById('mainNav');
if(menuBtn && mainNav){
menuBtn.addEventListener('click',()=>{
const isOpen=mainNav.classList.contains('is-open');
mainNav.classList.toggle('is-open',!isOpen);
menuBtn.setAttribute('aria-expanded',String(!isOpen));
});
menuBtn.addEventListener('keydown',(e)=>{
if(e.key==='Enter' || e.key===' '){
e.preventDefault();
menuBtn.click();
}
});
}

// close menu when clicking a link (mobile)
mainNav.querySelectorAll('a').forEach(a=>{
a.addEventListener('click',()=>{
mainNav.classList.remove('is-open');
menuBtn.setAttribute('aria-expanded','false');
});
});

// simple chatbot demo
function sendMessage(){
const input=document.getElementById('userInput');
const chat=document.getElementById('chatBox');
if(!input || !input.value.trim()) return;

let user=document.createElement('div');
user.className='user-msg';
user.textContent=input.value;
chat.appendChild(user);

let text=input.value.toLowerCase();
input.value='';

setTimeout(()=>{
let bot=document.createElement('div');
bot.className='bot-msg';

if(text.includes('website')){
bot.textContent='We build modern websites, web apps and SaaS platforms.';
}
else if(text.includes('wifi')||text.includes('network')){
bot.textContent='We provide networking and Wi-Fi deployment solutions.';
}
else if(text.includes('ai')){
bot.textContent='We develop AI solutions, chatbots and automation systems.';
}
else{
bot.textContent='Thanks for contacting ChopaTech. Ask me about AI, websites or networking.';
}

chat.appendChild(bot);
chat.scrollTop=chat.scrollHeight;
},700);
}
