/* Castimonia Retrospect v0.2.0: client-side search, works with static GitHub Pages.
   Index lives in homepage only, so post/tag pages do not each duplicate 1700+ post records. */
(() => {
  'use strict';
  const form = document.querySelector('.site-search-form');
  const results = document.getElementById('castimonia-search-results');
  const input = document.getElementById('castimonia-search');
  if (!form || !results || !input) return;
  const PAGE_SIZE = 30;
  let page = 1;
  let indexPromise;
  let lastQuery = '';
  let matches = [];
  const clean = text => String(text || '').normalize('NFKC').toLocaleLowerCase().trim();
  const normalized = text => clean(text).replace(/\s+/g, ' ');
  const siteUrl = form.getAttribute('data-source-url') || form.action;
  async function getIndex() {
    if (!indexPromise) indexPromise = (async () => {
      let node = document.getElementById('archive-index');
      if (!node) {
        const resp = await fetch(siteUrl, {credentials: 'same-origin'});
        if (!resp.ok) throw new Error('index fetch failed');
        const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
        node = doc.getElementById('archive-index');
      }
      if (!node) throw new Error('search index missing');
      const parsed = JSON.parse(node.textContent);
      if (!Array.isArray(parsed)) throw new Error('invalid index');
      return parsed.map(item => ({
        title: String(item.title || ''),
        date: String(item.date || ''),
        url: String(item.url || ''),
        searchText: normalized([item.title,item.excerpt,(item.tags || []).join(' '),item.date].join(' '))
      })).filter(item => item.title && item.url);
    })().catch(err => { indexPromise = undefined; throw err; });
    return indexPromise;
  }
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function clear() { results.replaceChildren(); results.hidden = true; }
  function showMessage(text) {
    results.replaceChildren(el('p', 'search-results-status', text));
    results.hidden = false;
  }
  function display() {
    results.replaceChildren();
    results.hidden = false;
    const totalPages = Math.max(1, Math.ceil(matches.length/PAGE_SIZE));
    page = Math.min(page,totalPages);
    results.append(el('p','search-results-status',`검색 결과 ${matches.length}개${matches.length > PAGE_SIZE ? ` · ${page}/${totalPages} 페이지` : ''}`));
    if (!matches.length) return;
    const list = el('ul');
    for (const item of matches.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)) {
      const li = el('li');
      const a = el('a', null, item.title); a.href = item.url;
      li.append(a,el('small',null,item.date));list.append(li);
    }
    results.append(list);
    if (totalPages > 1) {
      const nav = el('div','search-results-nav');
      const prev = el('button',null,'← 이전'); prev.type='button'; prev.disabled=page===1;
      const next = el('button',null,'다음 →'); next.type='button'; next.disabled=page===totalPages;
      const current = el('span',null,`${page} / ${totalPages}`);
      prev.addEventListener('click',()=>{page--;display();});
      next.addEventListener('click',()=>{page++;display();});
      nav.append(prev,current,next); results.append(nav);
    }
  }
  async function runSearch(value) {
    const query = normalized(value);
    lastQuery = query;
    page=1;
    if (!query) {clear();return;}
    showMessage('검색 중…');
    try {
      const data = await getIndex();
      if (query !== lastQuery) return;
      const tokens = query.split(' ').filter(Boolean);
      matches = data.filter(item => tokens.every(tok=>item.searchText.includes(tok)));
      display();
    } catch (_) {
      if (query===lastQuery) showMessage('검색 자료를 불러오지 못했습니다. 홈페이지에서 다시 시도해 주세요.');
    }
  }
  let debounceId;
  input.addEventListener('input', () => {
    clearTimeout(debounceId);
    const value = input.value;
    debounceId = setTimeout(() => runSearch(value), 160);
  });
  form.addEventListener('submit', e => {
    e.preventDefault();clearTimeout(debounceId);runSearch(input.value);
  });
  // A GET ?q= link remains usable from search results and bookmarked URLs.
  const urlQuery = new URLSearchParams(location.search).get('q');
  if (urlQuery) {input.value=urlQuery;runSearch(urlQuery);}
})();
