// Live-preview renderer — lives ONLY inside the admin panel. This mirrors
// the real website's app.js rendering logic (kept in sync by hand whenever
// the site's rendering changes) but is fed the current unsaved draft via
// postMessage instead of fetching committed JSON from disk, and resolves
// links against this sandboxed /preview-site/ copy instead of the site root.
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const iconSvg={linkedin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 8.2H3V21h3.5V8.2ZM4.75 3A2.05 2.05 0 1 0 4.75 7.1 2.05 2.05 0 0 0 4.75 3ZM21 13.6c0-3.8-2-5.6-4.8-5.6-2.2 0-3.2 1.2-3.8 2v-1.8H9V21h3.4v-6.3c0-1.7.3-3.4 2.5-3.4 2.1 0 2.1 2 2.1 3.5V21H21v-7.4Z"/></svg>',whatsapp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0 11.8 11.8 0 0 0 1.7 17.7L0 24l6.5-1.7A11.9 11.9 0 0 0 24 12a11.8 11.8 0 0 0-3.5-8.5ZM12.1 21.8c-1.8 0-3.6-.5-5.1-1.5l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.5 4.8Zm5.4-7.4c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.6-.8-2.7-1.4-3.8-3.2-.3-.5.3-.5.8-1.7.1-.2 0-.4-.1-.6l-.9-2.1c-.2-.5-.5-.4-.7-.4h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.1 3.1 1.3 3.3c.2.2 2.2 3.4 5.4 4.8 2 .9 2.7 1 3.7.8.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4 0-.3-.2-.4-.5-.5Z"/></svg>',facebook:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v8h4v-8h3.3l.7-4H13V9c0-.7.3-1 1-1Z"/></svg>',instagram:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3.5A4.5 4.5 0 1 1 12 16.5 4.5 4.5 0 0 1 12 7.5Zm0 2A2.5 2.5 0 1 0 12 14.5 2.5 2.5 0 0 0 12 9.5Zm5.2-3.1a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z"/></svg>'};

// The admin panel pre-resolves every image path (including blob: URLs for
// staged, not-yet-saved uploads) before posting data in, so this just needs
// to pass values through and handle the empty case.
function img(p){return p||''}

// This copy is served from /preview-site/ as plain static files (no
// directory-index resolution), so the one hardcoded path the real site's
// app.js uses for home-page project cards ('/projects/') becomes this
// instead — everything else about projectCard() is identical to app.js.
const PROJECTS_PAGE_HREF='/preview-site/projects/index.html';

function socialLinks(socials){return socials.map(s=>`<a href="${s.url}" target="_blank" rel="noreferrer" aria-label="${s.label}" title="${s.label}">${iconSvg[s.icon]||s.icon}</a>`).join('')}
function render(key,data){if(key==='home')renderHome(data);else renderPage(key,data)}
function renderHome(d){document.title=`${d.site.title} | ${d.person.name}`;$('#site-title').textContent=d.site.title;$('#hero-name').textContent=d.person.name;$('#hero-intro').textContent=d.person.intro;document.querySelector('.hero').style.backgroundImage=`linear-gradient(rgba(50,60,48,.28),rgba(35,45,36,.34)),url('${img(d.heroImage)}')`;$('#hero-socials').innerHTML=socialLinks(d.person.socials);$('#news-list').innerHTML=d.news.map(n=>`<li><span class="news-date">${n.date}:</span> ${n.text} ${n.link?`<a href="${n.link}">${n.label||'Read more'}</a>`:''}</li>`).join('');renderGallery(d.gallery);$('#education-home').innerHTML=d.education.map(row).join('')+`<h3 class="home-subheading">Experience</h3>`+d.experience.map(row).join('');$('#project-cards').innerHTML=d.projects.map(p=>projectCard(p,PROJECTS_PAGE_HREF)).join('');$('#publication-home').innerHTML=d.publications.map(pub).join('');$('#contact-email').innerHTML=`<a href="mailto:${d.contact.email}">${d.contact.email}</a>`;$('#contact-phone').innerHTML=`<a href="tel:${d.contact.phone.replace(/[^+\d]/g,'')}">${d.contact.phone}</a>`;$('#contact-location').textContent=d.contact.location;commonFooter(d.person)}
function renderGallery(gallery){let i=0;const main=$('#gallery-featured'),thumbs=$('#gallery-thumbs');if(!main||!thumbs)return;function show(n){i=(n+gallery.length)%gallery.length;main.src=img(gallery[i].image);main.alt=gallery[i].alt||'';[...thumbs.children].forEach((t,idx)=>t.classList.toggle('active',idx===i))}
thumbs.innerHTML=gallery.map((g,idx)=>`<button class="gallery-thumb" type="button" data-i="${idx}"><img loading="lazy" src="${img(g.image)}" alt="${g.alt||''}">${idx===0?`<span class="thumb-caption">${g.alt||''}</span>`:''}</button>`).join('');
thumbs.querySelectorAll('.gallery-thumb').forEach(t=>t.addEventListener('click',()=>show(+t.dataset.i)));
const next=$('#gallery-next');if(next)next.addEventListener('click',()=>show(i+1));
show(0)}
function projectCard(p,page){return `<article class="project-card"><a href="${page}?view=${p.id||'overview'}">${p.image?`<img src="${img(p.image)}" alt="${p.title}">`:`<div class="project-card-noimg">${p.meta||'GIS Project'}</div>`}<div class="project-card-body"><h3>${p.title}</h3><p>${p.description||p.summary||p.details||''}</p><small>${p.meta||''}</small><span class="card-link">View project →</span></div></a></article>`}
function pub(p){return `<article class="publication-item"><div class="pub-year">${p.year}</div><h3>${p.title}</h3><p>${p.authors}. ${p.status}. ${p.link?`<a href="${p.link}" ${p.link.startsWith('http')?'target="_blank" rel="noreferrer"':''}>Read here</a>`:''}</p></article>`}
function row(x){return `<article class="timeline-item"><div class="timeline-period">${x.period}</div><div><h3>${x.institution}</h3><p><strong>${x.role}</strong><br>${x.details}</p></div></article>`}
function renderSection(s){return `${s.heading?`<h2>${s.heading}</h2>`:''}${(s.content||[]).map(b=>b.type==='image'?`<figure class="section-image"><img loading="lazy" src="${img(b.image)}" alt="${b.alt||''}">${b.alt?`<figcaption>${b.alt}</figcaption>`:''}</figure>`:`<p>${b.text}</p>`).join('')}`}
function renderPage(key,d){document.title=`${d.title} | Geography Portfolio`;$('#page-heading').textContent=d.heading;const c=$('#page-content');const view=new URLSearchParams(location.search).get('view');if(view&&view!=='overview'){const item=findItem(d,view);if(item){c.innerHTML=detail(item);return}}
if(key==='my-story')c.innerHTML=`<div class="prose">${d.intro?`<p>${d.intro}</p>`:''}${(d.sections||[]).map(renderSection).join('')}</div>`;if(key==='education-experience')c.innerHTML=`<h2>Education</h2>${d.education.map(row).join('')}<h2>Experience</h2>${d.experience.map(row).join('')}`;if(key==='gis-projects')c.innerHTML=`<p class="section-lead">${d.intro}</p><div class="project-cards page-projects">${d.projects.map(p=>projectCard(p,'')).join('')}</div>`;if(key==='research-publications')c.innerHTML=d.publications.map(pub).join('');if(key==='conferences')c.innerHTML=`<div class="conference-cards">${d.items.map(conferenceCard).join('')}</div>`;if(key==='leadership')c.innerHTML=`<p class="section-lead">${d.intro||''}</p><div class="leadership-cards">${d.items.map(i=>`<article class="info-card"><h3>${i.title}</h3><p>${i.details}</p><a href="?view=${i.id}">View details →</a></article>`).join('')}</div>`;}
function conferenceCard(i){return `<article class="conference-card"><div class="info-date">${i.date}</div><h3>${i.title}</h3><p>${i.details}</p><a href="?view=${i.id}">View conference →</a></article>`}
function findItem(d,id){for(const key of ['projects','publications','items']){const item=d[key]?.find(x=>(x.id||'')===id);if(item)return item}return null}
function detail(i){const hasSections=Array.isArray(i.sections)&&i.sections.length>0;return `<article class="detail-view"><p class="detail-kicker">${i.year||i.date||i.meta||'Portfolio detail'}</p><h2>${i.title||i.name}</h2>${i.image?`<img class="detail-image" src="${img(i.image)}" alt="${i.title}">`:''}${hasSections?`${i.summary?`<p>${i.summary}</p>`:''}${i.sections.map(renderSection).join('')}`:`<p>${i.details||i.description||i.authors||''}</p>`}${i.status?`<p><strong>${i.status}</strong></p>`:''}${i.link?`<a class="detail-link" href="${i.link}" ${i.link.startsWith('http')?'target="_blank" rel="noreferrer"':''}>Open related link →</a>`:''}<p class="back-link"><a href="?view=overview">← Back to overview</a></p></article>`}
function commonFooter(person={}){if($('#footer-name'))$('#footer-name').textContent=`© ${new Date().getFullYear()} ${person.name||''}`}
function bind(){const b=$('.menu-button'),n=$('#site-nav');if(b)b.addEventListener('click',()=>{const open=n.classList.toggle('open');b.setAttribute('aria-expanded',open)});$$('#site-nav a').forEach(a=>a.addEventListener('click',()=>n.classList.remove('open')))}

window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  const msg = e.data;
  if (!msg || msg.type !== 'PORTFOLIO_PREVIEW_DATA') return;
  document.body.dataset.page = msg.pageKey;
  try { render(msg.pageKey, msg.data); bind(); } catch (err) { console.error(err); }
});
