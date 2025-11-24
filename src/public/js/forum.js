// Forum frontend logic: fetch threads (fallback to sample), render list, show preview, simple create (client-only)
(function(){
  const threadsEl = document.getElementById('threads');
  const previewEl = document.getElementById('thread-preview');
  const searchInput = document.getElementById('forum-search');
  const paginationEl = document.getElementById('forum-pagination');

  const createBtn = document.getElementById('create-thread');
  const createModal = document.getElementById('create-modal');
  const cancelCreate = document.getElementById('cancel-create');
  const submitCreate = document.getElementById('submit-create');
  const newTitle = document.getElementById('new-title');
  const newBody = document.getElementById('new-body');

  let threads = [];
  let filtered = [];
  let page = 1;
  const pageSize = 6;

  const sampleData = [
    {id:1,title:'Hỏi về React Hooks',excerpt:'Tôi cần trợ giúp về React Hooks, đặc biệt là useEffect.',author:'TtN Yamoon',replies:5,views:120,createdAt:'2 giờ trước',comments:[{id:1,author:'userA',text:'Rất hay!'},{id:2,author:'userB',text:'Đồng ý, nên thêm ví dụ'}]},
    {id:2,title:'Hướng dẫn học JavaScript',excerpt:'Anh em nào có tài liệu hoặc bài giànhhy về JavaScript?',author:'Minh',replies:3,views:86,createdAt:'1 ngày trước',comments:[]},
    {id:3,title:'Giới thiệu Tailwind CSS',excerpt:'Mọi người cho mình xin chút kinh nghiệm khi sử dụng Tailwind CSS nhé.',author:'Lan',replies:2,views:44,createdAt:'3 ngày trước',comments:[]},
    {id:4,title:'Tự học Node.js',excerpt:'Ai có roadmap tốt để học Node server-side?',author:'Hieu',replies:4,views:60,createdAt:'4 giờ trước',comments:[]},
    {id:5,title:'Phỏng vấn frontend',excerpt:'Những câu hỏi phổ biến khi phỏng vấn frontend?',author:'Anh',replies:1,views:25,createdAt:'6 ngày trước',comments:[]},
    {id:6,title:'Sử dụng Sequelize',excerpt:'Làm sao để migrates khi deploy?',author:'Thu',replies:0,views:12,createdAt:'7 giờ trước',comments:[]},
    {id:7,title:'CSS Grid vs Flexbox',excerpt:'Khi nào nên dùng Grid?',author:'Quang',replies:6,views:150,createdAt:'5 ngày trước',comments:[]}
  ];

  async function loadThreads(){
    try{
      const res = await fetch('/api/forum');
      if(!res.ok) throw new Error('no api');
      threads = await res.json();
    }catch(err){
      // fallback to sample
      threads = sampleData;
    }
    filtered = threads.slice();
    render();
  }

  function render(){
    // paginate
    const start = (page-1)*pageSize;
    const pageItems = filtered.slice(start,start+pageSize);
    threadsEl.innerHTML = '';
    pageItems.forEach(t=>{
      const card = document.createElement('div');
      card.className='thread-card';
      card.innerHTML = `
          <div class="thread-main">
            <div class="thread-title">${escapeHtml(t.title)}</div>
            <div class="thread-excerpt">${escapeHtml(t.excerpt)}</div>
          </div>
          <div class="thread-meta">
            <div class="meta-row"><span class="meta-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-fill" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/></svg></span><span>${t.views||0}</span></div>
            <div class="meta-row"><span class="meta-icon"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16"><path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z"/><path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z"/><path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"/></svg></span><span>${t.replies || 0}</span></div>
          </div>
        `;
      card.addEventListener('click',()=>showThread(t.id));
      threadsEl.appendChild(card);
    });
    renderPagination();
  }

  function renderPagination(){
    const total = Math.ceil(filtered.length/pageSize)||1;
    paginationEl.innerHTML='';
    for(let i=1;i<=total;i++){
      const btn = document.createElement('button');
      btn.className='page-btn'+(i===page?' active':'');
      btn.textContent=i;
      btn.addEventListener('click',()=>{page=i;render();});
      paginationEl.appendChild(btn);
    }
  }

  function showThread(id){
    const t = threads.find(x=>x.id===id)||sampleData.find(x=>x.id===id);
    if(!t) return;
    previewEl.classList.remove('empty');
    previewEl.innerHTML = `
      <h3>${escapeHtml(t.title)}</h3>
      <div class="thread-author"><strong>${escapeHtml(t.author)}</strong><span>${t.createdAt||''}</span></div>
      <div class="thread-body">${escapeHtml(t.excerpt)}</div>
      <div class="comments">
        ${ (t.comments||[]).map(c=>`<div class="comment"><strong>${escapeHtml(c.author)}</strong><div>${escapeHtml(c.text)}</div></div>`).join('') }
      </div>
      <div class="comment-input"><input id="comment-text" placeholder="Nhập bình luận..." /><button id="send-comment" class="btn-primary">Gửi</button></div>
    `;
    const send = document.getElementById('send-comment');
    if(send){
      send.addEventListener('click',()=>{
        const input = document.getElementById('comment-text');
        if(!input.value) return;
        // client-only push
        t.comments = t.comments || [];
        t.comments.push({id:Date.now(),author:'Bạn',text:input.value});
        showThread(id);
      });
    }
  }

  function escapeHtml(s){
    if(!s) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Search
  searchInput.addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    filtered = threads.filter(t=>t.title.toLowerCase().includes(q) || (t.excerpt||'').toLowerCase().includes(q));
    page=1;render();
  });

  // Modal handlers
  createBtn.addEventListener('click',()=>createModal.classList.remove('hidden'));
  cancelCreate.addEventListener('click',()=>{createModal.classList.add('hidden');newTitle.value='';newBody.value='';});
  submitCreate.addEventListener('click',()=>{
    const title = newTitle.value.trim();
    const body = newBody.value.trim();
    if(!title) return alert('Nhập tiêu đề');
    const newThread = {id:Date.now(),title,excerpt:body,author:'Bạn',replies:0,views:0,createdAt:'vừa xong',comments:[]};
    threads.unshift(newThread);
    filtered = threads.slice();
    createModal.classList.add('hidden');newTitle.value='';newBody.value='';page=1;render();
    showThread(newThread.id);
  });

  // initial load
  document.addEventListener('DOMContentLoaded',loadThreads);
})();
