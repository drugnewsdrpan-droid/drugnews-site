/** Progressive enhancement only. All content and destination URLs are in HTML. */
(() => {
'use strict';
const tabs=[...document.querySelectorAll('.series-tab')];
const panels=[...document.querySelectorAll('.series-panel')];
const layout=document.querySelector('.series-layout');
let active=0;
function select(i,focus=false){
 if(!tabs[i]||!panels[i])return;
 active=i;
 tabs.forEach((t,n)=>{t.classList.toggle('is-active',n===i);t.setAttribute('aria-selected',String(n===i));t.tabIndex=n===i?0:-1;});
 panels.forEach((p,n)=>p.hidden=n!==i);
 if(focus)tabs[i].focus({preventScroll:true});
}
if(tabs.length===panels.length&&tabs.length){
 tabs.forEach((t,i)=>{t.addEventListener('click',()=>select(i));t.addEventListener('keydown',e=>{
  let n=active;if(['ArrowRight','ArrowDown'].includes(e.key))n=(n+1)%tabs.length;else if(['ArrowLeft','ArrowUp'].includes(e.key))n=(n+tabs.length-1)%tabs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=tabs.length-1;else return;e.preventDefault();select(n,true);
 });});
 layout.classList.add('tabs-ready');select(0);
}
const nav=document.getElementById('site-nav'),menu=document.querySelector('.nav-menu');
function closeMenu(){nav?.classList.remove('is-open');menu?.setAttribute('aria-expanded','false');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);menu.setAttribute('aria-expanded',String(open));});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){closeMenu();menu.focus();}});
nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
let pending=false;
function scroll(){if(pending)return;pending=true;requestAnimationFrame(()=>{const max=document.documentElement.scrollHeight-innerHeight;const progress=document.querySelector('.reading-progress');if(progress)progress.style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`;document.querySelector('.site-header')?.classList.toggle('is-scrolled',scrollY>12);pending=false;});}
window.addEventListener('scroll',scroll,{passive:true});
function orientation(){document.querySelector('.series-tabs')?.setAttribute('aria-orientation',innerWidth<=700?'horizontal':'vertical');}
window.addEventListener('resize',orientation,{passive:true});orientation();scroll();
// Activated only after handlers have loaded. Failure leaves a fully readable page.
document.documentElement.classList.add('js');
if(location.protocol==='file:'){
 document.querySelectorAll('[data-drugnews-consent-settings]').forEach(b=>b.addEventListener('click',()=>alert('此本地預覽未載入追蹤程式。正式版沿用網站原有的隱私同意管理。')));
}
})();
