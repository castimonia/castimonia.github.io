/* Castimonia month switcher for Publii static sites, no third-party dependencies. */
(() => {
  'use strict';
  const json = document.getElementById('archive-index');
  if (!json) return; // On single posts only the sidebar is shown.
  let posts;
  try { posts = JSON.parse(json.textContent); } catch (_) { return; }
  if (!Array.isArray(posts) || !posts.length) return;
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('month');
  const requestedPostId = params.get('post');
  const selectedPost = requestedPostId && /^\d+$/.test(requestedPostId)
    ? posts.find(p => p.id === requestedPostId) : null;
  const firstMonth = posts[0].month;
  const selected = selectedPost ? selectedPost.month :
    (requested && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : firstMonth);
  const inMonth = posts.filter(p => p.month === selected);
  const label = document.getElementById('month-label');
  const article = document.getElementById('current-article');
  const others = document.querySelector('#month-list ul');
  for (const a of document.querySelectorAll('[data-archive-month]')) {
    if (a.dataset.archiveMonth === selected) {
      a.classList.add('active');
      a.closest('details')?.setAttribute('open', '');
      a.setAttribute('aria-current', 'page');
    }
  }
  if (label) label.textContent = selectedPost ? `POST No. ${selectedPost.id}` :
    requested ? `${selected.replace('-', '년 ')}월` : 'LATEST ARTICLE';
  if (!article || !others) return;
  others.replaceChildren();
  const latest = selectedPost || inMonth[0];
  const otherPosts = inMonth.filter(p => p.id !== latest?.id);
  for (const p of otherPosts) {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = `${window.location.pathname}?post=${encodeURIComponent(p.id)}`;
    const number = document.createElement('span');
    number.className = 'list-number'; number.textContent = p.id;
    link.append(number, document.createTextNode(p.title));
    const date = document.createElement('time');
    date.dateTime = p.date; date.textContent = p.date;
    li.append(link, date); others.append(li);
  }
  // The global contentStructure is an index, not guaranteed to contain full post HTML.
  // Keep the server-rendered body if present; otherwise hydrate from the real post URL.
  const initialBody = article.querySelector('.post-body');
  const hasInitialBody = initialBody && (initialBody.textContent.trim() || initialBody.children.length);
  if (!requested && !selectedPost && hasInitialBody) return;
  if (!inMonth.length) {
    article.replaceChildren();
    const empty = document.createElement('p');
    empty.textContent = '해당 월에는 공개된 글이 없습니다.';
    article.append(empty); return;
  }
  if (!latest) return;
  if (!selectedPost && selected === firstMonth && hasInitialBody) return;
  article.replaceChildren();
  const number = document.createElement('div'); number.className = 'post-number';
  number.textContent = `No. ${latest.id}`;
  const title = document.createElement('h1'); title.className = 'post-title';
  const titleLink = document.createElement('a'); titleLink.href = `${window.location.pathname}?post=${encodeURIComponent(latest.id)}`; titleLink.textContent = latest.title;
  title.append(titleLink);
  const date = document.createElement('time'); date.className = 'post-date';
  date.dateTime = latest.date; date.textContent = latest.date;
  const body = document.createElement('div'); body.className = 'post-body';
  const loading = document.createElement('p'); loading.className = 'loading';
  loading.textContent = '글을 불러오는 중입니다…'; body.append(loading);
  const links = document.createElement('p'); links.className = 'post-link';
  const original = document.createElement('a'); original.href = latest.url; original.textContent = '원래 글 주소';
  links.append(original);
  article.append(number, title, date, body, links);
  const fallback = () => {
    body.replaceChildren();
    const p = document.createElement('p'); p.className = 'error-msg';
    p.textContent = '본문 미리보기를 불러오지 못했습니다. 제목을 클릭하면 전체 글을 읽으실 수 있습니다.';
    body.append(p);
  };
  fetch(latest.url, {credentials:'same-origin'})
    .then(r => {if (!r.ok) throw Error('request failed'); return r.text();})
    .then(html => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const content = doc.querySelector('.post-detail .post-body');
      if (!content) throw Error('post body missing');
      // This HTML is generated on the same site and uses the same post template.
      body.innerHTML = content.innerHTML;
      for (const el of body.querySelectorAll('script')) el.remove();
    }).catch(fallback);
})();
