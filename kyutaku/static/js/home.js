/**
 * merged home.js — updated:
 * - Creating an album only updates "My Albums" modal (does NOT render the album inline in the page container)
 * - Removed visible "Choose file" flow: upload button now opens file picker and the photo is sent when a file is chosen
 *
 * Keep this file at static/js/home.js
 */

(function () {
  // helpers
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // CSRF helper
  function getCookie(name) {
    const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return v ? v.pop() : '';
  }
  const csrftoken = getCookie('csrftoken') || document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  // -----------------------
  // Basic element refs
  // -----------------------
  const menuToggle = $('#menuToggle');
  const sideMenu = $('#sideMenu');
  const bgColorInput = $('#bgColorInput');
  const bgImageInput = $('#bgImageInput');
  const bgImageName = $('#bgImageName'); // optional span showing filename
  const resetBg = $('#resetBg');
  const musicColorInput = $('#musicColorInput');
  const profileColorInput = $('#profileColorInput');
  const albumColorInput = $('#albumColorInput');
  const postColorInput = $('#postColorInput');

  // music player refs (may be absent on some pages)
  const musicUpload = $('#musicUpload');
  const audioPlayer = $('#audioPlayer');
  const playBtn = $('#playBtn');
  const prevBtn = $('#prevBtn');
  const nextBtn = $('#nextBtn');
  const nowPlaying = $('#nowPlaying');
  const seek = $('#seek');
  const curTime = $('#curTime');
  const durTime = $('#durTime');
  const volUp = $('#volUp');
  const volDown = $('#volDown');
  const volPct = $('#volPct');
  const openPlaylist = $('#openPlaylist');
  const playlistModal = $('#playlistModal');
  const playlistClose = $('#playlistClose');
  const closePlaylist = $('#closePlaylist');
  const playlistList = $('#playlistList');
  const playlistSearch = $('#playlistSearch');

  // album & post elements (may be absent on some pages)
  // NOTE: keep legacy album modal refs (for backward compatibility) and also new split modals
  const albumModal = $('#albumModal');
  const albumModalBackdrop = $('#albumModalBackdrop');
  const openAlbumListBtn = $('#openAlbumListBtn');
  const closeAlbumModalBtn = $('#closeAlbumModal');
  const albumListAjax = $('#albumListAjax');
  const albumNameInputModal = $('#albumNameInputModal');
  const createAlbumModalBtn = $('#createAlbumModalBtn');
  const refreshAlbumListBtn = $('#refreshAlbumListBtn');

  // NEW split modals (Add Album modal and My Albums modal)
  const addAlbumModal = $('#addAlbumModal');
  const addAlbumModalBackdrop = $('#addAlbumModalBackdrop');
  const addAlbumNameInput = $('#addAlbumNameInput');
  const createAddAlbumBtn = $('#createAddAlbumBtn');
  const closeAddAlbumModalBtn = $('#closeAddAlbumModal');

  const myAlbumsModal = $('#myAlbumsModal');
  const myAlbumsModalBackdrop = $('#myAlbumsModalBackdrop');
  const myAlbumsListAjax = $('#myAlbumsListAjax');
  const refreshMyAlbumsBtn = $('#refreshMyAlbumsBtn');
  const closeMyAlbumsModalBtn = $('#closeMyAlbumsModal');

  // NEW: an albums area in the main UI (optional). If absent, fallback to albumListAjax
  const albumsContainer = $('#albumsContainer') || albumListAjax;

  // Upload controls: keep hidden file input; upload triggered by button (no visible "choose file")
  const uploadPhotoInput = $('#uploadPhotoInput'); // hidden input (may be present in template)
  const uploadAlbumSelect = $('#uploadAlbumSelect');
  const uploadPhotoBtn = $('#uploadPhotoBtn');
  const photosGrid = $('#photosGrid');

  const postModal = $('#postModal');
  const postModalBackdrop = $('#postModalBackdrop');
  const openCreatePostBtn = $('#openCreatePostBtn');
  const closePostModalBtn = $('#closePostModal');
  const postForm = $('#postForm');
  const postModalTitle = $('#postModalTitle');
  const postIdField = $('#post_id_field');
  const postContentField = $('#post_content_field');
  const postImageInput = $('#post_image_input');
  const postImagePreview = $('#post_image_preview');
  const savePostBtn = $('#savePostBtn');
  const cancelPostBtn = $('#cancelPostBtn');
  const postsContainer = $('#postsContainer');

  const photoViewerModal = $('#photoViewerModal');
  const closePhotoViewerBtn = $('#closePhotoViewer');
  const photoViewerBackdrop = $('#photoViewerBackdrop');
  const photoViewerImage = $('#photoViewerImage');

  // Edit profile modal elements (may be present)
  const openEditProfileBtn = $('#openEditProfileBtn');
  const editProfileModal = $('#editProfileModal');
  const editProfileBackdrop = $('#editProfileBackdrop');
  const closeEditProfileBtn = $('#closeEditProfileBtn');
  const submitEditProfileBtn = $('#submitEditProfileBtn');
  const cancelEditProfileBtn = $('#cancelEditProfileBtn');
  const edit_image_input = $('#edit_image_input');
  const edit_image_preview = $('#edit_image_preview');

  // client-side caches & state
  let albumCache = [];   // array of {id, name}
  let photosCache = [];  // array of {id, album, image_url, ...}
  let selectedAlbumId = null;

  let playlist = JSON.parse(localStorage.getItem('ky_playlist') || '[]');
  let currentIndex = parseInt(localStorage.getItem('ky_currentIndex') || '0', 10) || 0;
  let isPlaying = false;
  let savedVolume = parseFloat(localStorage.getItem('ky_volume') || '1');

  // init colors (already in previous code)
  function applyColorVar(name, value){ document.documentElement.style.setProperty(name, value); }
  function initColors(){
    const bg = localStorage.getItem('bgColor') || '#0a0a0a';
    const bgImg = localStorage.getItem('bgImage') || '';
    const musicC = localStorage.getItem('musicContainerColor') || '#111114';
    const profC = localStorage.getItem('profileCardColor') || '#1a0022';
    const albumC = localStorage.getItem('albumContainerColor') || '#1a0022';
    const postC = localStorage.getItem('postFeedColor') || '#1a0022';

    applyColorVar('--bgColor', bg);
    if(bgImg) document.body.style.backgroundImage = `url(${bgImg})`; else document.body.style.backgroundImage = '';

    applyColorVar('--musicContainerColor', musicC);
    applyColorVar('--profileCardColor', profC);
    applyColorVar('--albumContainerColor', albumC);
    applyColorVar('--postFeedColor', postC);

    if(bgColorInput) bgColorInput.value = bg;
    if(musicColorInput) musicColorInput.value = musicC;
    if(profileColorInput) profileColorInput.value = profC;
    if(albumColorInput) albumColorInput.value = albumC;
    if(postColorInput) postColorInput.value = postC;
  }

  // toggle side menu
  if(menuToggle && sideMenu) menuToggle.addEventListener('click', ()=> sideMenu.classList.toggle('active'));

  // background inputs
  if(bgColorInput) {
    bgColorInput.addEventListener('input', e => {
      localStorage.setItem('bgColor', e.target.value);
      applyColorVar('--bgColor', e.target.value);
      document.body.style.backgroundImage = '';
      localStorage.removeItem('bgImage');
      // clear filename indicator if present
      if(bgImageName) bgImageName.textContent = '';
      if(bgImageInput) bgImageInput.value = '';
    });
  }

  if(bgImageInput) {
    bgImageInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if(!f) return;
      const r = new FileReader();
      r.onload = () => {
        localStorage.setItem('bgImage', r.result);
        document.body.style.backgroundImage = `url(${r.result})`;
        // update filename display if present
        if(bgImageName) bgImageName.textContent = f.name;
      };
      r.readAsDataURL(f);
    });
  }

  // Improved resetBg: clear image from DOM immediately, update UI and storage
  if(resetBg) {
    resetBg.addEventListener('click', ()=> {
      try { localStorage.removeItem('bgImage'); } catch(e){/*ignore*/}
      try { localStorage.setItem('bgColor','#0a0a0a'); } catch(e){/*ignore*/}
      applyColorVar('--bgColor','#0a0a0a');
      // remove any inline background image so change is instant
      document.body.style.backgroundImage = '';
      // clear file input and filename UI
      if(bgImageInput) {
        try { bgImageInput.value = ''; } catch(e){ /* some browsers restrict setting value */ }
      }
      if(bgImageName) bgImageName.textContent = '';
      if(bgColorInput) bgColorInput.value='#0a0a0a';
      // small visual feedback
      resetBg.classList.add('flash');
      setTimeout(()=> resetBg.classList.remove('flash'), 220);
    });
  }

  const bindColorInput = (input, varName, key) => {
    if(!input) return;
    input.addEventListener('input', e => {
      localStorage.setItem(key, e.target.value);
      applyColorVar(varName, e.target.value);
    });
  };
  bindColorInput(musicColorInput,'--musicContainerColor','musicContainerColor');
  bindColorInput(profileColorInput,'--profileCardColor','profileColor');
  bindColorInput(albumColorInput,'--albumContainerColor','albumContainerColor');
  bindColorInput(postColorInput,'--postFeedColor','postFeedColor');

  // -----------------------
  // Side menu improvements & reset buttons (merged update)
  // -----------------------
  (function sideMenuEnhancements(){
    const closeSide = document.getElementById('closeSide');
    const resetMusicColorBtn = document.getElementById('resetMusicColorBtn');
    const resetProfileColorBtn = document.getElementById('resetProfileColorBtn');
    const resetAlbumColorBtn = document.getElementById('resetAlbumColorBtn');
    const resetPostColorBtn = document.getElementById('resetPostColorBtn');

    const DEFAULTS = {
      musicContainerColor: '#111114',
      profileCardColor: '#1a0022',
      albumContainerColor: '#1a0022',
      postFeedColor: '#1a0022',
    };

    function persistAndApply(storageKey, cssVar, value, inputEl){
      try{ localStorage.setItem(storageKey, value); } catch(e){ console.warn('LocalStorage write failed', e); }
      applyColorVar(cssVar, value);
      if(inputEl) inputEl.value = value;
      if(inputEl) { inputEl.classList.add('flash'); setTimeout(()=> inputEl.classList.remove('flash'), 260); }
    }

    if(closeSide) closeSide.addEventListener('click', ()=> sideMenu?.classList.remove('active'));

    if(resetMusicColorBtn) resetMusicColorBtn.addEventListener('click', ()=> persistAndApply('musicContainerColor','--musicContainerColor',DEFAULTS.musicContainerColor,musicColorInput));
    if(resetProfileColorBtn) resetProfileColorBtn.addEventListener('click', ()=> persistAndApply('profileCardColor','--profileCardColor',DEFAULTS.profileCardColor,profileColorInput));
    if(resetAlbumColorBtn) resetAlbumColorBtn.addEventListener('click', ()=> persistAndApply('albumContainerColor','--albumContainerColor',DEFAULTS.albumContainerColor,albumColorInput));
    if(resetPostColorBtn) resetPostColorBtn.addEventListener('click', ()=> persistAndApply('postFeedColor','--postFeedColor',DEFAULTS.postFeedColor,postColorInput));

    // Note: "Reset All Colors" removed as requested — no dynamic button is added and no handler exists.
  })();

  // inject flash CSS once
  (function injectFlashStyle(){
    if(!document.getElementById('kyutaku-flash-style')){
      const css = `.flash{ box-shadow: 0 0 12px rgba(255,79,168,0.28) !important; transform: translateY(-2px); transition: all 220ms ease; } .album-item{cursor:pointer;padding:8px;border-radius:8px;margin-bottom:6px;} .album-item.active{outline:2px solid rgba(255,179,214,0.3);} .albums-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;} .upload-controls.hidden{display:none;}`;
      const style = document.createElement('style');
      style.id = 'kyutaku-flash-style';
      style.appendChild(document.createTextNode(css));
      document.head.appendChild(style);
    }
  })();

  // simplified player logic (unchanged but with guards)
  function savePlaylist(){ localStorage.setItem('ky_playlist', JSON.stringify(playlist)); }

  function renderPlaylist(){
    if(!playlistList) return;
    playlistList.innerHTML = '';
    const q = (playlistSearch && playlistSearch.value.trim().toLowerCase()) || '';
    const filtered = playlist.filter(t => t.name.toLowerCase().includes(q));
    if(filtered.length === 0){
      playlistList.innerHTML = '<p style="text-align:center;color:#ffb3e1">No songs found 💗</p>';
      return;
    }
    filtered.forEach(t => {
      const el = document.createElement('div');
      el.className = 'playlist-item';
      el.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;border:2px solid rgba(255,179,214,0.2);margin-bottom:8px;background:#12060a;';
      const left = document.createElement('div');
      left.textContent = `🎵 ${t.name}`;
      left.style.flex = '1';
      left.style.cursor = 'pointer';
      left.addEventListener('click', () => {
        currentIndex = playlist.indexOf(t);
        localStorage.setItem('ky_currentIndex', currentIndex);
        playCurrent();
        closePlaylistModal();
      });
      const del = document.createElement('button');
      del.className = 'btn tiny';
      del.textContent = '✖';
      del.addEventListener('click', (ev) => { ev.stopPropagation(); deleteSong(t.id); });
      el.appendChild(left);
      el.appendChild(del);
      playlistList.appendChild(el);
    });
  }

  function deleteSong(id){
    playlist = playlist.filter(s => s.id !== id);
    if(currentIndex >= playlist.length) currentIndex = 0;
    savePlaylist();
    renderPlaylist();
  }

  if(musicUpload) musicUpload.addEventListener('change', e => {
    const f = e.target.files[0];
    if(!f) return;
    if(!f.type.includes('audio')){ alert('Please upload a valid MP3 file 🎶'); return; }
    const url = URL.createObjectURL(f);
    const t = { id: Date.now(), name: f.name, url };
    playlist.push(t);
    savePlaylist();
    renderPlaylist();
    currentIndex = playlist.findIndex(x => x.id === t.id);
    localStorage.setItem('ky_currentIndex', currentIndex);
    playCurrent();
  });

  function playCurrent(){
    if(!playlist.length || !audioPlayer) return;
    const track = playlist[currentIndex];
    audioPlayer.src = track.url;
    if(nowPlaying){ nowPlaying.style.display = ''; nowPlaying.textContent = `🎶 ${track.name}`; }
    audioPlayer.play().then(()=> { isPlaying = true; if(playBtn) playBtn.textContent = '⏸'; }).catch(()=> { isPlaying = true; if(playBtn) playBtn.textContent = '⏸'; });
  }
  function pause(){ if(!audioPlayer) return; audioPlayer.pause(); isPlaying = false; if(playBtn) playBtn.textContent = '▶️'; }
  function resume(){ if(!audioPlayer) return; audioPlayer.play(); isPlaying = true; if(playBtn) playBtn.textContent = '⏸'; }

  if(playBtn) playBtn.addEventListener('click', () => { if(!playlist.length) return; if(isPlaying) pause(); else resume(); });
  if(prevBtn) prevBtn.addEventListener('click', () => { if(!playlist.length) return; currentIndex = (currentIndex - 1 + playlist.length) % playlist.length; localStorage.setItem('ky_currentIndex', currentIndex); playCurrent(); });
  if(nextBtn) nextBtn.addEventListener('click', () => { if(!playlist.length) return; currentIndex = (currentIndex + 1) % playlist.length; localStorage.setItem('ky_currentIndex', currentIndex); playCurrent(); });

  if(audioPlayer){
    audioPlayer.addEventListener('timeupdate', () => {
      if(!audioPlayer.duration) return;
      const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
      if(seek) seek.value = pct;
      if(curTime) curTime.textContent = formatTime(audioPlayer.currentTime);
      if(durTime) durTime.textContent = formatTime(audioPlayer.duration);
    });
    audioPlayer.addEventListener('ended', () => { if(nextBtn) nextBtn.click(); });
  }

  if(seek) seek.addEventListener('input', e => { if(!audioPlayer || !audioPlayer.duration) return; const val = parseFloat(e.target.value); audioPlayer.currentTime = (val / 100) * audioPlayer.duration; });

  if(volUp) volUp.addEventListener('click', () => { savedVolume = clamp(savedVolume + 0.05, 0, 1); setVolume(savedVolume); });
  if(volDown) volDown.addEventListener('click', () => { savedVolume = clamp(savedVolume - 0.05, 0, 1); setVolume(savedVolume); });

  function setVolume(v){
    savedVolume = v;
    if(audioPlayer) audioPlayer.volume = v;
    if(volPct) volPct.textContent = `${Math.round(v * 100)}%`;
    localStorage.setItem('ky_volume', v);
  }

  function openPlaylistModal(){ if(!playlistModal) return; playlistModal.classList.remove('hidden'); renderPlaylist(); }
  function closePlaylistModal(){ if(!playlistModal) return; playlistModal.classList.add('hidden'); }

  if(openPlaylist) openPlaylist.addEventListener('click', openPlaylistModal);
  if(closePlaylist) closePlaylist.addEventListener('click', closePlaylistModal);
  if(playlistClose) playlistClose.addEventListener('click', closePlaylistModal);
  if(playlistSearch) playlistSearch.addEventListener('input', renderPlaylist);

  function formatTime(s){ if(!s || isNaN(s)) return '00:00'; const mm = Math.floor(s / 60).toString().padStart(2, '0'); const ss = Math.floor(s % 60).toString().padStart(2, '0'); return `${mm}:${ss}`; }

  function restorePlayer(){
    const vol = parseFloat(localStorage.getItem('ky_volume') || '1');
    setVolume(vol);
    if(playlist.length){
      if(currentIndex >= playlist.length) currentIndex = 0;
      if(audioPlayer){
        audioPlayer.src = playlist[currentIndex].url;
        if(nowPlaying){ nowPlaying.style.display = ''; nowPlaying.textContent = `🎶 ${playlist[currentIndex].name}`; }
      }
      isPlaying = false;
      if(playBtn) playBtn.textContent = '▶️';
    } else {
      if(nowPlaying) nowPlaying.style.display = 'none';
    }
  }

  // -----------------------
  // Album manager (AJAX + modal) with improved UI & selection behavior
  // -----------------------
  // The file supports both the legacy single albumModal and the new split modals (addAlbumModal, myAlbumsModal).
  function showAlbumModal(){ if(!albumModal) return; albumModal.classList.remove('hidden'); fetchAlbumList(); }
  function hideAlbumModal(){ if(!albumModal) return; albumModal.classList.add('hidden'); }

  if(openAlbumListBtn) openAlbumListBtn.addEventListener('click', () => {
    // Prefer new My Albums modal if present, otherwise fallback to legacy albumModal
    if(myAlbumsModal) showMyAlbumsModal();
    else showAlbumModal();
  });
  if(closeAlbumModalBtn) closeAlbumModalBtn.addEventListener('click', hideAlbumModal);
  if(albumModalBackdrop) albumModalBackdrop.addEventListener('click', hideAlbumModal);

  // New modal show/hide for split UX
  function showAddAlbumModal(){ if(!addAlbumModal) return; addAlbumModal.classList.remove('hidden'); if(addAlbumNameInput) addAlbumNameInput.focus(); }
  function hideAddAlbumModal(){ if(!addAlbumModal) return; addAlbumModal.classList.add('hidden'); }

  function showMyAlbumsModal(){ if(!myAlbumsModal) {
    // fallback to legacy album modal
    if(albumModal) albumModal.classList.remove('hidden');
    fetchAlbumList();
    return;
  }
    myAlbumsModal.classList.remove('hidden'); fetchAlbumList();
  }
  function hideMyAlbumsModal(){ if(!myAlbumsModal) { if(albumModal) albumModal.classList.add('hidden'); return; } myAlbumsModal.classList.add('hidden'); }

  if(closeAddAlbumModalBtn) closeAddAlbumModalBtn.addEventListener('click', hideAddAlbumModal);
  if(addAlbumModalBackdrop) addAlbumModalBackdrop.addEventListener('click', hideAddAlbumModal);
  if(closeMyAlbumsModalBtn) closeMyAlbumsModalBtn.addEventListener('click', hideMyAlbumsModal);
  if(myAlbumsModalBackdrop) myAlbumsModalBackdrop.addEventListener('click', hideMyAlbumsModal);

  if(refreshMyAlbumsBtn) refreshMyAlbumsBtn.addEventListener('click', fetchAlbumList);

  async function fetchAlbumList(){
    // fetch from server and populate albumCache; then render UI
    if(!albumsContainer && !myAlbumsListAjax && !albumListAjax) return;
    if(albumListAjax) albumListAjax.innerHTML = '<p style="text-align:center;color:#ffb3e1">Loading…</p>';
    if(myAlbumsListAjax) myAlbumsListAjax.innerHTML = '<p style="text-align:center;color:#ffb3e1">Loading…</p>';
    try {
      const res = await fetch('/album/list/ajax/');
      const data = await res.json();
      if(data.ok){
        albumCache = Array.isArray(data.albums) ? data.albums.slice() : [];
        // render the header in the main UI (hero area) if available
        renderAlbumHeader();
        // render list in legacy modal or My Albums modal
        if(albumListAjax) renderAlbumsUI(); // legacy rendering into albumListAjax/albumsContainer
        if(myAlbumsListAjax) renderMyAlbumsList(albumCache);
        populateUploadAlbumSelect();
      } else {
        if(albumListAjax) albumListAjax.innerHTML = '<p style="color:#ff8aa6">Failed to load</p>';
        if(myAlbumsListAjax) myAlbumsListAjax.innerHTML = '<p style="color:#ff8aa6">Failed to load</p>';
      }
    } catch(e) {
      if(albumListAjax) albumListAjax.innerHTML = '<p style="color:#ff8aa6">Error</p>';
      if(myAlbumsListAjax) myAlbumsListAjax.innerHTML = '<p style="color:#ff8aa6">Error</p>';
    }
  }

  // Render the dashed hero/header with two buttons (Add Album, My Albums) into albumsContainer
  function renderAlbumHeader(){
    if(!albumsContainer) return;
    const existingHero = albumsContainer.querySelector('.album-hero, .album-banner');
    if(existingHero) return; // already rendered
    const hero = document.createElement('div');
    hero.className = 'album-hero';
    hero.innerHTML = `
      <div class="album-hero-inner">
        <div class="album-hero-title">📸 <span class="hero-title-text">Photo Album</span></div>
        <div class="album-hero-actions">
          <button class="btn small outline js-open-add-album">✚ Add Album</button>
          <button class="btn small js-open-my-albums">❤️ My Albums</button>
        </div>
        <div class="album-hero-note muted" style="width:100%;text-align:center;margin-top:8px"></div>
      </div>
    `.trim();
    albumsContainer.insertBefore(hero, albumsContainer.firstChild);

    // wire up the buttons
    const addBtnLocal = hero.querySelector('.js-open-add-album');
    const myBtnLocal = hero.querySelector('.js-open-my-albums');
    if(addBtnLocal) addBtnLocal.addEventListener('click', (e) => { e.preventDefault(); if(addAlbumModal) showAddAlbumModal(); else if(albumModal) albumModal.classList.remove('hidden'); });
    if(myBtnLocal) myBtnLocal.addEventListener('click', (e) => { e.preventDefault(); showMyAlbumsModal(); });
  }

  // -----------------------
  // IMPORTANT: Updated renderAlbumsUI to avoid rendering inline duplicate list
  // Renders into #albumListAjax (modal) if present; falls back to albumsContainer but avoids duplicating hero.
  // -----------------------
  function renderAlbumsUI(){
    const target = albumListAjax || albumsContainer;
    if(!target) return;

    const contentRoot = document.createElement('div');
    contentRoot.id = 'albums-root-content';
    contentRoot.style.marginTop = '8px';

    if(!albumCache || albumCache.length === 0){
      const p = document.createElement('p');
      p.style.color = '#ffb3e1';
      p.style.textAlign = 'center';
      p.textContent = 'No albums yet 💗';
      contentRoot.appendChild(p);
    } else {
      albumCache.forEach(a => {
        const div = document.createElement('div');
        div.className = 'album-item';
        div.dataset.albumId = a.id;
        div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:10px;background:#12060a;margin-bottom:8px;border:2px solid rgba(255,182,205,0.06);';
        const left = document.createElement('div'); left.textContent = `📁 ${a.name}`;
        left.style.flex = '1';
        left.addEventListener('click', ()=> { selectAlbum(a.id); });
        const del = document.createElement('button'); del.className = 'btn tiny'; del.textContent = '✖';
        del.addEventListener('click', async (ev) => { ev.stopPropagation(); if(!confirm('Delete album and its photos?')) return; const r = await deleteAlbumAjax(a.id); if(r.ok){ removeAlbumFromCache(a.id); } else alert('Delete failed'); });
        div.appendChild(left); div.appendChild(del);
        contentRoot.appendChild(div);
      });
    }

    const prev = target.querySelector('#albums-root-content');
    if(prev) prev.remove();
    target.appendChild(contentRoot);

    highlightSelectedAlbum();
  }

  // Render My Albums modal list (new split modal)
  function renderMyAlbumsList(albs){
    if(!myAlbumsListAjax) return;
    myAlbumsListAjax.innerHTML = '';
    if(!albs || albs.length === 0){
      myAlbumsListAjax.innerHTML = '<p style="text-align:center;color:#ffb3e1">No albums yet 💗</p>';
      return;
    }
    albs.forEach(a => {
      const row = document.createElement('div');
      row.className = 'album-item';
      row.dataset.albumId = a.id;
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px;border-radius:10px;background:#12060a;margin-bottom:8px;border:2px solid rgba(255,182,205,0.06);';
      const left = document.createElement('div'); left.textContent = `📁 ${a.name}`; left.style.cursor='pointer';
      left.addEventListener('click', ()=> {
        selectAlbum(a.id);
        hideMyAlbumsModal();
      });
      const right = document.createElement('div');
      const del = document.createElement('button'); del.className = 'btn tiny'; del.textContent='✖';
      del.addEventListener('click', async (ev) => { ev.stopPropagation(); if(!confirm('Delete album and its photos?')) return; const r = await deleteAlbumAjax(a.id); if(r.ok){ removeAlbumFromCache(a.id); } else alert('Delete failed'); });
      right.appendChild(del);
      row.appendChild(left); row.appendChild(right);
      myAlbumsListAjax.appendChild(row);
    });
  }

  function highlightSelectedAlbum(){
    if(!albumsContainer) return;
    const items = albumsContainer.querySelectorAll('.album-item');
    items.forEach(it => {
      if(String(it.dataset.albumId) === String(selectedAlbumId)) it.classList.add('active');
      else it.classList.remove('active');
    });
    // modal list highlight too
    if(myAlbumsListAjax){
      myAlbumsListAjax.querySelectorAll('.album-item').forEach(it => {
        if(String(it.dataset.albumId) === String(selectedAlbumId)) it.classList.add('active');
        else it.classList.remove('active');
      });
    }
  }

  function removeAlbumFromCache(albumId){
    albumCache = albumCache.filter(a => String(a.id) !== String(albumId));
    // remove any photos for the album from cache
    photosCache = photosCache.filter(p => String(p.album) !== String(albumId));
    // if deleted album was selected, clear selection
    if(String(selectedAlbumId) === String(albumId)){
      selectedAlbumId = null;
      hideUploadControls();
      renderPhotosForSelectedAlbum();
    }
    // re-render lists and header
    // IMPORTANT: renderAlbumsUI may add inline list; we still call it for legacy modal target only.
    if(albumListAjax) renderAlbumsUI();
    renderMyAlbumsList(albumCache);
    populateUploadAlbumSelect();
    renderAlbumHeader();
  }

  // call this when we want to select an album (from UI)
  function selectAlbum(albumId){
    selectedAlbumId = String(albumId);
    populateUploadAlbumSelect(); // ensure the select has this album and is set
    highlightSelectedAlbum();
    showUploadControlsForSelected();
    renderPhotosForSelectedAlbum();
  }

  // Show/hide upload controls depending on selection
  function showUploadControlsForSelected(){
    // upload controls existence optional; show/hide uploadPhotoBtn as before
    const uploadControls = document.querySelector('.upload-controls');
    if(uploadControls) uploadControls.classList.remove('hidden');

    if(uploadAlbumSelect){
      uploadAlbumSelect.value = selectedAlbumId || '';
      if(selectedAlbumId) uploadAlbumSelect.disabled = true;
      else uploadAlbumSelect.disabled = false;
    }
    if(uploadPhotoBtn){
      uploadPhotoBtn.style.display = selectedAlbumId ? '' : 'none';
    }
  }

  function hideUploadControls(){
    const uploadControls = document.querySelector('.upload-controls');
    if(uploadControls) uploadControls.classList.add('hidden');
    if(uploadAlbumSelect){
      uploadAlbumSelect.value = '';
      uploadAlbumSelect.disabled = false;
    }
    if(uploadPhotoBtn){
      uploadPhotoBtn.style.display = '';
    }
  }

  function populateUploadAlbumSelect(){
    if(!uploadAlbumSelect) return;
    // clear and repopulate
    uploadAlbumSelect.innerHTML = '';
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '-- Choose album --';
    uploadAlbumSelect.appendChild(emptyOpt);

    albumCache.forEach(a=>{
      const o = document.createElement('option');
      o.value = a.id;
      o.textContent = a.name;
      uploadAlbumSelect.appendChild(o);
    });

    if(selectedAlbumId){
      uploadAlbumSelect.value = selectedAlbumId;
      uploadAlbumSelect.disabled = true;
    } else {
      uploadAlbumSelect.disabled = false;
    }
  }

  async function createAlbumAjax(name){
    try{
      const fd = new FormData(); fd.append('name', name);
      const res = await fetch('/album/create/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
      return await res.json();
    }catch(e){ return { ok:false, error:'network' }; }
  }

  // Helper to create album and update UI/caches after creation
  // IMPORTANT CHANGE:
  // - Do NOT insert new album into the inline container (in-page). Only update "My Albums" modal list.
  async function createAlbumAndUpdate(name, autoSelect = false){
    try{
      const r = await createAlbumAjax(name);
      if(r.ok && r.album){
        // update local cache (so My Albums and selects will reflect it)
        albumCache.unshift(r.album);

        // DO NOT render inline albums UI into the page container.
        // Only update the My Albums modal list and the upload album select (if desired).
        renderMyAlbumsList(albumCache);
        populateUploadAlbumSelect();

        // Do NOT auto-select the new album into page container unless explicitly requested (default false)
        if(autoSelect){
          selectAlbum(r.album.id);
        } else {
          // Keep the page selection as-is; user will pick the album from "My Albums" modal
          hideAddAlbumModal();
          hideAlbumModal();
          hideMyAlbumsModal(); // keep modal closed if desired
        }

        // Clear input fields
        if(albumNameInputModal) albumNameInputModal.value = '';
        if(addAlbumNameInput) addAlbumNameInput.value = '';
        return r.album;
      } else {
        alert('Create failed: ' + (r.error || 'unknown'));
        return null;
      }
    } catch(err){
      console.error(err);
      alert('Create failed due to network error');
      return null;
    }
  }

  async function deleteAlbumAjax(albumId){
    try{
      const fd = new FormData(); fd.append('album_id', albumId);
      const res = await fetch('/album/delete/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
      return await res.json();
    }catch(e){ return { ok:false }; }
  }

  // Adjust handlers: when creating via Add Album modal, don't auto-insert into container (autoSelect=false)
  if(createAlbumModalBtn) createAlbumModalBtn.addEventListener('click', async ()=>{
    const name = (albumNameInputModal && albumNameInputModal.value || '').trim();
    if(!name) return alert('Enter album name');
    createAlbumModalBtn.disabled = true;
    // Legacy modal: keep same behavior but prefer not auto-select and not insert into page container
    const created = await createAlbumAndUpdate(name, false);
    createAlbumModalBtn.disabled = false;
  });

  if(createAddAlbumBtn) createAddAlbumBtn.addEventListener('click', async ()=>{
    const name = (addAlbumNameInput && addAlbumNameInput.value || '').trim();
    if(!name) return alert('Enter album name');
    createAddAlbumBtn.disabled = true;
    // New behavior: do not auto-select and do not render in page container
    const created = await createAlbumAndUpdate(name, false);
    createAddAlbumBtn.disabled = false;
    if(created){
      // keep modal open to allow multiple creations or close as desired
      // here we'll keep modal open but clear input (done in createAlbumAndUpdate)
    }
  });

  if(refreshAlbumListBtn) refreshAlbumListBtn.addEventListener('click', fetchAlbumList);

  // upload photo via AJAX (unchanged helper)
  async function uploadPhotoAjax(albumId, file){
    const fd = new FormData(); if(albumId) fd.append('album_id', albumId); fd.append('image', file);
    const res = await fetch('/album/upload/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
    return res.ok ? await res.json() : { ok:false };
  }

  // IMPORTANT CHANGE: Remove visible "Choose file" flow.
  // - uploadPhotoBtn now triggers the hidden file input click()
  // - when uploadPhotoInput changes (user selected a file), we upload immediately
  if(uploadPhotoBtn){
    uploadPhotoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Ensure an album is selected (either via page selection or select)
      const albumId = selectedAlbumId || (uploadAlbumSelect && uploadAlbumSelect.value) || '';
      if(!albumId){
        return alert('Please choose an album first (open "My Albums" and select one).');
      }
      // Programmatically open file picker (input can be hidden)
      if(uploadPhotoInput){
        uploadPhotoInput.click();
      } else {
        // If input not present, inform user (template must include a hidden input)
        alert('File input is missing from the page.');
      }
    });
  }

  // When the hidden file input changes (file chosen), upload automatically
  if(uploadPhotoInput){
    uploadPhotoInput.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if(!f) return;
      const albumId = selectedAlbumId || (uploadAlbumSelect && uploadAlbumSelect.value) || '';
      if(!albumId){
        alert('Please choose an album first');
        uploadPhotoInput.value = '';
        return;
      }
      uploadPhotoBtn.disabled = true;
      const r = await uploadPhotoAjax(albumId, f);
      uploadPhotoBtn.disabled = false;
      if(r.ok && r.photo){
        const p = r.photo;
        // update cache
        photosCache.unshift(p);
        // render only if this photo belongs to currently selected album
        if(String(p.album) === String(selectedAlbumId)){
          if(photosGrid){
            const div = document.createElement('div'); div.className='photo-card'; div.dataset.photoId = p.id;
            div.style.position = 'relative';
            const img = document.createElement('img'); img.src = p.image_url; img.style.maxWidth='100%'; div.appendChild(img);
            const actions = document.createElement('div'); actions.style.cssText='position:absolute;left:8px;bottom:8px;display:flex;gap:6px;';
            const viewBtn = document.createElement('button'); viewBtn.className='btn tiny view-photo-btn'; viewBtn.textContent='🔍'; viewBtn.dataset.imageUrl = p.image_url; actions.appendChild(viewBtn);
            const delBtn = document.createElement('button'); delBtn.className='btn tiny delete-photo-btn'; delBtn.textContent='✖'; delBtn.dataset.photoId = p.id; actions.appendChild(delBtn);
            div.appendChild(actions);
            photosGrid.prepend(div);
          }
        }
      } else {
        alert('Upload failed');
      }
      // clear file input
      try { uploadPhotoInput.value = ''; } catch(e){ /* ignore */ }
    });
  }

  // photo view & delete (delegation)
  document.addEventListener('click', async (e)=>{
    if(e.target.matches('.view-photo-btn')){
      const url = e.target.dataset.imageUrl;
      openPhotoViewer(url);
    } else if(e.target.matches('.delete-photo-btn')){
      const id = e.target.dataset.photoId;
      if(!confirm('Delete photo?')) return;
      const fd = new FormData(); fd.append('photo_id', id);
      const res = await fetch('/album/delete-photo/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
      const data = await res.json();
      if(data.ok){
        // remove from DOM and cache
        const card = document.querySelector(`.photo-card[data-photo-id="${id}"]`);
        if(card) card.remove();
        photosCache = photosCache.filter(p => String(p.id) !== String(id));
      } else alert('Delete failed');
    }
  });

  // Photo viewer modal
  function openPhotoViewer(url){ if(!photoViewerModal || !photoViewerImage) return; photoViewerImage.src = url; photoViewerModal.classList.remove('hidden'); }
  function closePhotoViewer(){ if(!photoViewerModal) return; photoViewerModal.classList.add('hidden'); if(photoViewerImage) photoViewerImage.src=''; }
  if(closePhotoViewerBtn) closePhotoViewerBtn.addEventListener('click', closePhotoViewer);
  if(photoViewerBackdrop) photoViewerBackdrop.addEventListener('click', closePhotoViewer);

  // -----------------------
  // Posts: create/edit/delete/like/comment via AJAX
  // (unchanged from previous behavior, left intact)
  // -----------------------
  function openNewPostModal(){
    if(!postModal) return;
    if(postModalTitle) postModalTitle.textContent = 'New Post';
    if(postIdField) postIdField.value = '';
    if(postContentField) postContentField.value = '';
    if(postImageInput) postImageInput.value = '';
    if(postImagePreview) { postImagePreview.style.display = 'none'; postImagePreview.src = ''; }
    postModal.classList.remove('hidden');
  }
  function closePostModal(){ if(!postModal) return; postModal.classList.add('hidden'); }

  if(openCreatePostBtn) openCreatePostBtn.addEventListener('click', openNewPostModal);
  if(closePostModalBtn) closePostModalBtn.addEventListener('click', closePostModal);
  if(postModalBackdrop) postModalBackdrop.addEventListener('click', closePostModal);
  if(cancelPostBtn) cancelPostBtn.addEventListener('click', closePostModal);

  // preview image
  if(postImageInput && postImagePreview) postImageInput.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if(!f){ postImagePreview.style.display='none'; postImagePreview.src=''; return; }
    const url = URL.createObjectURL(f);
    postImagePreview.src = url; postImagePreview.style.display = 'block';
  });

  // Save post (create or edit)
  async function createPostAjax(content, file){
    const fd = new FormData(); fd.append('content', content); if(file) fd.append('image', file);
    const res = await fetch('/post/create/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
    return await res.json();
  }
  async function editPostAjax(post_id, content, file){
    const fd = new FormData(); fd.append('post_id', post_id); fd.append('content', content); if(file) fd.append('image', file);
    const res = await fetch('/post/edit/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
    return await res.json();
  }

  if(savePostBtn) savePostBtn.addEventListener('click', async ()=>{
    savePostBtn.disabled = true;
    const id = postIdField ? postIdField.value : '';
    const content = postContentField ? postContentField.value.trim() : '';
    const file = postImageInput ? postImageInput.files[0] : null;
    if(!content && !file){ alert('Write something or add image'); savePostBtn.disabled=false; return; }
    if(id){
      // edit
      const r = await editPostAjax(id, content, file);
      savePostBtn.disabled=false;
      if(r.ok){
        if(postsContainer){
          const card = postsContainer.querySelector(`.post-card[data-post-id="${id}"]`);
          if(card){
            const body = card.querySelector('.post-body'); if(body) body.textContent = r.post.content;
            const img = card.querySelector('.post-image');
            if(r.post.image_url){
              if(img) img.src = r.post.image_url; else {
                const newImg = document.createElement('img'); newImg.className='post-image'; newImg.src=r.post.image_url; card.insertBefore(newImg, card.querySelector('.post-actions'));
              }
            } else { if(img) img.remove(); }
          }
        }
        closePostModal();
      } else alert('Edit failed');
    } else {
      // create
      const r = await createPostAjax(content, file);
      savePostBtn.disabled=false;
      if(r.ok){
        const p = r.post;
        if(postsContainer){
          const div = document.createElement('div'); div.className='post-card'; div.dataset.postId = p.id;
          div.innerHTML = `
            <div class="post-top"><strong class="post-name">${p.username}</strong><div class="post-time">${new Date(p.created_at).toLocaleString()}</div></div>
            <div class="post-body">${p.content}</div>
            ${p.image_url ? `<img src="${p.image_url}" class="post-image">` : ''}
            <div class="post-actions">
              <button class="btn tiny ajax-like-btn" data-post-id="${p.id}">❤️ <span class="likes-count">0</span></button>
              <button class="btn tiny comment-toggle" data-id="${p.id}">💬 Comments (0)</button>
              <button class="btn tiny ajax-edit-post-btn" data-post-id="${p.id}" data-content="${p.content||''}">✏ Edit</button>
              <button class="btn tiny ajax-delete-post-btn" data-post-id="${p.id}">✖ Delete</button>
            </div>
            <div id="comments-${p.id}" class="comments-area hidden">
              <form class="add-comment-ajax" data-post-id="${p.id}">
                <input name="text" placeholder="Write a comment..." />
                <button class="btn tiny" type="button">💬</button>
              </form>
              <div class="comment-list"></div>
            </div>
          `;
          postsContainer.prepend(div);
        }
        closePostModal();
      } else alert('Create failed');
    }
  });

  // delegated events for post actions (like, edit, delete, comment)
  document.addEventListener('click', async (e)=>{
    // like
    if(e.target.matches('.ajax-like-btn') || e.target.closest('.ajax-like-btn')){
      const btn = e.target.closest('.ajax-like-btn');
      const id = btn.dataset.postId;
      const fd = new FormData(); fd.append('post_id', id);
      const res = await fetch('/post/toggle-like/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
      const data = await res.json();
      if(data.ok){
        if(btn.querySelector('.likes-count')) btn.querySelector('.likes-count').textContent = data.likes_count;
        btn.style.opacity = data.liked ? '1' : '0.6';
      }
    }

    // open edit post modal
    if(e.target.matches('.ajax-edit-post-btn')){
      const btn = e.target;
      const id = btn.dataset.postId;
      const content = btn.dataset.content || '';
      if(postModalTitle) postModalTitle.textContent = 'Edit Post';
      if(postIdField) postIdField.value = id;
      if(postContentField) postContentField.value = content;
      if(postImageInput) postImageInput.value = '';
      if(postImagePreview) { postImagePreview.style.display = 'none'; postImagePreview.src = ''; }
      if(postModal) postModal.classList.remove('hidden');
    }

    // delete post
    if(e.target.matches('.ajax-delete-post-btn')){
      const id = e.target.dataset.postId;
      if(!confirm('Delete post?')) return;
      const fd = new FormData(); fd.append('post_id', id);
      const res = await fetch('/post/delete/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
      const data = await res.json();
      if(data.ok){
        const card = document.querySelector(`.post-card[data-post-id="${id}"]`);
        if(card) card.remove();
      } else alert('Delete failed');
    }

    // comment add (button)
    if(e.target.matches('.add-comment-ajax button')){
      const form = e.target.closest('.add-comment-ajax');
      const postId = form.dataset.postId;
      const input = form.querySelector('input[name="text"]');
      const text = input.value.trim();
      if(!text) return;
      const fd = new FormData(); fd.append('post_id', postId); fd.append('text', text);
      const res = await fetch('/comment/add/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
      const data = await res.json();
      if(data.ok){
        const list = form.parentElement.querySelector('.comment-list');
        const ci = document.createElement('div'); ci.className='comment-item'; ci.dataset.commentId = data.comment.id;
        ci.innerHTML = `<div><strong class="c-name">${data.comment.user_full_name}</strong><div class="c-time">${new Date(data.comment.created_at).toLocaleString()}</div><div class="c-text">${data.comment.text}</div></div><button class="btn tiny ajax-delete-comment-btn" data-comment-id="${data.comment.id}">❌</button>`;
        if(list) list.appendChild(ci);
        input.value='';
      } else alert('Comment failed');
    }

    // delete comment
    if(e.target.matches('.ajax-delete-comment-btn')){
      const id = e.target.dataset.commentId;
      if(!confirm('Delete comment?')) return;
      const fd = new FormData(); fd.append('comment_id', id);
      const res = await fetch('/comment/delete/ajax/', { method:'POST', headers:{ 'X-CSRFToken': csrftoken }, body: fd });
      const data = await res.json();
      if(data.ok){
        const c = document.querySelector(`.comment-item[data-comment-id="${id}"]`);
        if(c) c.remove();
      } else alert('Delete failed');
    }

    // comment toggle
    if(e.target.matches('.comment-toggle') || e.target.closest('.comment-toggle')){
      const btn = e.target.closest('.comment-toggle');
      const id = btn.dataset.id;
      const box = document.getElementById('comments-'+id);
      if(box) box.classList.toggle('hidden');
    }
  });

  // -----------------------
  // album/photo helper: fetch photos for album and show in modal/album area
  // -----------------------
  async function fetchAllPhotos(){
    try{
      const res = await fetch('/album/get/ajax/');
      const data = await res.json();
      if(data.ok){
        photosCache = Array.isArray(data.photos) ? data.photos.slice() : [];
        return photosCache;
      } else {
        return [];
      }
    } catch(e){ console.error('Error fetching photos', e); return []; }
  }

  async function renderPhotosForSelectedAlbum(){
    if(!photosGrid) return;
    // ensure cached photos are available
    if(!photosCache.length) await fetchAllPhotos();
    // filter
    if(!selectedAlbumId){
      photosGrid.innerHTML = '<p style="text-align:center;color:#ffb3e1">Select an album to view its photos</p>';
      return;
    }
    const photos = photosCache.filter(p => String(p.album) === String(selectedAlbumId));
    photosGrid.innerHTML = '';
    if(!photos || photos.length === 0){
      photosGrid.innerHTML = '<p style="text-align:center;color:#ffb3e1">No photos in this album</p>';
      return;
    }
    photos.forEach(p=>{
      const div = document.createElement('div'); div.className='photo-card'; div.dataset.photoId = p.id; div.style.position='relative';
      const img = document.createElement('img'); img.src = p.image_url; img.style.maxWidth='100%'; div.appendChild(img);
      const actions = document.createElement('div'); actions.style.cssText='position:absolute;left:8px;bottom:8px;display:flex;gap:6px;';
      const viewBtn = document.createElement('button'); viewBtn.className='btn tiny view-photo-btn'; viewBtn.textContent='🔍'; viewBtn.dataset.imageUrl = p.image_url; actions.appendChild(viewBtn);
      const delBtn = document.createElement('button'); delBtn.className='btn tiny delete-photo-btn'; delBtn.textContent='✖'; delBtn.dataset.photoId = p.id; actions.appendChild(delBtn);
      div.appendChild(actions);
      photosGrid.appendChild(div);
    });
  }

  // convenience wrapper used by album list modal click earlier (keeps previous behavior: open viewer with first photo)
  async function fetchAlbumPhotosAndShow(albumId, albumName){
    try{
      if(!albumId) return;
      await fetchAllPhotos();
      const photos = photosCache.filter(p => String(p.album) === String(albumId));
      if(photos.length === 0){ alert('No photos in this album'); return; }
      openPhotoViewer(photos[0].image_url);
    } catch(e){ console.error(e); alert('Error'); }
  }

  // -----------------------
  // Edit Profile modal behavior (restores previous UX: clicking edit opens modal)
  // -----------------------
  (function editProfileModalHandler(){
    const profileLeftBox = document.getElementById('profileLeftBox'); // contains data-* attributes
    const profileImageDisplay = document.getElementById('profileImageDisplay');
    const profileBioText = document.getElementById('profileBioText');

    function openEditModalAndPopulate(){
      if(!editProfileModal) return;
      // populate fields from data attributes if available
      if(profileLeftBox){
        const d = profileLeftBox.dataset || {};
        if($('#edit_full_name')) $('#edit_full_name').value = d.full_name || '';
        if($('#edit_age')) $('#edit_age').value = d.age || '';
        if($('#edit_birthday')) $('#edit_birthday').value = d.birthday || '';
        if($('#edit_gender')) $('#edit_gender').value = d.gender || '';
        if($('#edit_location')) $('#edit_location').value = d.location || '';
        if($('#edit_favorites')) $('#edit_favorites').value = d.favorites || '';
        if($('#edit_life_status')) $('#edit_life_status').value = d.life_status || '';
        if($('#edit_bio')) $('#edit_bio').value = d.bio || '';
      } else {
        // fallback: fill from visible DOM values
        if($('#edit_full_name')) $('#edit_full_name').value = document.getElementById('val_full_name')?.textContent?.trim() || '';
        if($('#edit_age')) $('#edit_age').value = document.getElementById('val_age')?.textContent?.trim() || '';
        if($('#edit_birthday')) $('#edit_birthday').value = document.getElementById('val_birthday')?.textContent?.trim() || '';
        if($('#edit_gender')) $('#edit_gender').value = document.getElementById('val_gender')?.textContent?.trim() || '';
        if($('#edit_location')) $('#edit_location').value = document.getElementById('val_location')?.textContent?.trim() || '';
        if($('#edit_favorites')) $('#edit_favorites').value = document.getElementById('val_favorites')?.textContent?.trim() || '';
        if($('#edit_life_status')) $('#edit_life_status').value = document.getElementById('val_life_status')?.textContent?.trim() || '';
        if($('#edit_bio')) $('#edit_bio').value = profileBioText?.textContent?.trim() || '';
      }

      // preview image
      if(edit_image_preview){
        if(profileImageDisplay && profileImageDisplay.tagName === 'IMG'){
          edit_image_preview.src = profileImageDisplay.src;
          edit_image_preview.style.display = 'block';
        } else {
          edit_image_preview.style.display = 'none';
        }
      }

      // show modal
      if(editProfileModal) editProfileModal.classList.remove('hidden');
    }

    function closeEditModal(){
      if(editProfileModal) editProfileModal.classList.add('hidden');
    }

    // open
    if(openEditProfileBtn) openEditProfileBtn.addEventListener('click', (e) => { e.preventDefault(); openEditModalAndPopulate(); });

    // close handlers
    if(closeEditProfileBtn) closeEditProfileBtn.addEventListener('click', closeEditModal);
    if(editProfileBackdrop) editProfileBackdrop.addEventListener('click', closeEditModal);
    if(cancelEditProfileBtn) cancelEditProfileBtn.addEventListener('click', closeEditModal);

    // preview selected image
    if(edit_image_input && edit_image_preview){
      edit_image_input.addEventListener('change', (ev) => {
        const f = ev.target.files[0];
        if(!f){ edit_image_preview.style.display = 'none'; edit_image_preview.src = ''; return; }
        const url = URL.createObjectURL(f);
        edit_image_preview.src = url;
        edit_image_preview.style.display = 'block';
      });
    }

    // submit edit profile via AJAX to update_profile_api
    if(submitEditProfileBtn){
      submitEditProfileBtn.addEventListener('click', async ()=>{
        submitEditProfileBtn.disabled = true;
        const fd = new FormData();
        const full_name = $('#edit_full_name')?.value || '';
        const age = $('#edit_age')?.value || '';
        const birthday = $('#edit_birthday')?.value || '';
        const gender = $('#edit_gender')?.value || '';
        const location = $('#edit_location')?.value || '';
        const favorites = $('#edit_favorites')?.value || '';
        const life_status = $('#edit_life_status')?.value || '';
        const bio = $('#edit_bio')?.value || '';

        fd.append('full_name', full_name);
        if(age) fd.append('age', age);
        if(birthday) fd.append('birthday', birthday);
        if(gender) fd.append('gender', gender);
        if(location) fd.append('location', location);
        if(favorites) fd.append('favorites', favorites);
        if(life_status) fd.append('life_status', life_status);
        if(bio) fd.append('bio', bio);

        const file = edit_image_input?.files?.[0];
        if(file) fd.append('image', file);

        try {
          const res = await fetch('/update-profile/ajax/', {
            method: 'POST',
            headers: { 'X-CSRFToken': csrftoken },
            body: fd
          });
          const data = await res.json();
          submitEditProfileBtn.disabled = false;
          if(data.ok){
            // update DOM fields
            if(data.profile){
              if(document.getElementById('val_full_name')) document.getElementById('val_full_name').textContent = data.profile.full_name || '';
              if(document.getElementById('val_age')) document.getElementById('val_age').textContent = data.profile.age || '';
              if(document.getElementById('val_birthday')) document.getElementById('val_birthday').textContent = data.profile.birthday || '';
              if(document.getElementById('val_gender')) document.getElementById('val_gender').textContent = data.profile.gender || '';
              if(document.getElementById('val_location')) document.getElementById('val_location').textContent = data.profile.location || '';
              if(document.getElementById('val_favorites')) document.getElementById('val_favorites').textContent = data.profile.favorites || '';
              if(document.getElementById('val_life_status')) document.getElementById('val_life_status').textContent = data.profile.life_status || '';
              if(profileBioText) profileBioText.textContent = data.profile.bio || '';
              if(profileImageDisplay && data.profile.image_url){
                try {
                  profileImageDisplay.src = data.profile.image_url;
                } catch (e) { /* ignore */ }
              }
              // update profileLeftBox dataset so future opens are accurate
              if(profileLeftBox && data.profile){
                profileLeftBox.dataset.full_name = data.profile.full_name || '';
                profileLeftBox.dataset.age = data.profile.age || '';
                profileLeftBox.dataset.birthday = data.profile.birthday || '';
                profileLeftBox.dataset.gender = data.profile.gender || '';
                profileLeftBox.dataset.location = data.profile.location || '';
                profileLeftBox.dataset.favorites = data.profile.favorites || '';
                profileLeftBox.dataset.life_status = data.profile.life_status || '';
                profileLeftBox.dataset.bio = data.profile.bio || '';
              }
            }
            closeEditModal();
          } else {
            alert(data.error || 'Failed to update profile');
          }
        } catch (err) {
          console.error('Profile update error', err);
          submitEditProfileBtn.disabled = false;
          alert('Profile update error.');
        }
      });
    }
  })();

  // -----------------------
  // Initialize
  // -----------------------
  initColors();
  renderPlaylist();
  restorePlayer();

  // Fetch albums and photos initially to populate UI
  (async function initAlbumArea(){
    // Render the hero header immediately so page visually matches desired layout
    renderAlbumHeader?.();
    await fetchAlbumList();
    await fetchAllPhotos();
    // initial render: if an album was preselected in markup, try to use it
    const preselect = document.querySelector('[data-selected-album]');
    if(preselect) {
      selectedAlbumId = preselect.dataset.selectedAlbum;
      highlightSelectedAlbum();
      showUploadControlsForSelected();
      renderPhotosForSelectedAlbum();
    } else {
      // do not auto-select albums into page container; user picks from My Albums modal
      if(photosGrid) photosGrid.innerHTML = '<p style="width:200%;text-align:center;margin-top:8px ;color:#ffb3e1">Open "My Albums" to view your folders 💗</p>';
    }
  })();
 
})();