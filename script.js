// DIGICAM ARCHIVE V3 — Supabase shared gallery.
// Frontend hanya memakai anon/publishable key. Keamanan tulis ditegakkan oleh RLS.
const CONFIG = window.DIGICAM_CONFIG || {};
const $ = id => document.getElementById(id);
const BUCKET = "digicam-photos";
const OLD_STORAGE_KEY = "digicam-archive-v2";

let supabaseClient = null;
let session = null;
let albums = [];
let photos = [];
let currentPhoto = null;

const gallery = $("gallery");
const loginDialog = $("loginDialog");
const albumDialog = $("albumDialog");
const photoDialog = $("photoDialog");
const manageDialog = $("manageDialog");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function dateLabel(value) {
  return new Date(value).toLocaleDateString("id-ID", {day:"2-digit",month:"short",year:"numeric"});
}
function isConfigured() {
  return CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY &&
    !CONFIG.SUPABASE_URL.includes("PASTE_") && !CONFIG.SUPABASE_ANON_KEY.includes("PASTE_");
}
function isAdmin() { return !!session?.user; }
function setNotice(title, message) {
  gallery.innerHTML = `<div class="empty-state"><div class="empty-icon">▧</div><h3>${escapeHTML(title)}</h3><p>${escapeHTML(message)}</p></div>`;
}
function updateAdminUI() {
  $("adminBtn").textContent = isAdmin() ? "LOG OUT" : "ADMIN LOGIN";
  $("adminActions").hidden = !isAdmin();
  $("uploadControls").hidden = !isAdmin();
  $("adminHint").hidden = !isAdmin();
  $("visitorHint").hidden = isAdmin();
  $("manageAlbumsBtn").hidden = !isAdmin();
  $("movePhotoAlbum").hidden = !isAdmin();
  $("deletePhoto").hidden = !isAdmin();
}
async function loadAlbums() {
  const { data, error } = await supabaseClient.from("albums").select("*").order("created_at", {ascending:true});
  if (error) throw error;
  albums = data || [];
  if (!albums.some(a => a.name === "Unsorted")) {
    const { data: created, error: createError } = await supabaseClient.from("albums").insert({name:"Unsorted"}).select().single();
    if (createError && createError.code !== "23505") throw createError;
    const { data: refreshed, error: refreshError } = await supabaseClient.from("albums").select("*").order("created_at", {ascending:true});
    if (refreshError) throw refreshError;
    albums = refreshed || (created ? [...albums, created] : albums);
  }
}
async function loadPhotos() {
  const { data, error } = await supabaseClient.from("photos")
    .select("id,name,storage_path,album_id,created_at,albums(name)")
    .order("created_at", {ascending:false});
  if (error) throw error;
  photos = (data || []).map(p => ({
    ...p,
    albumName: p.albums?.name || "Unsorted",
    url: supabaseClient.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl
  }));
}
function renderAlbums() {
  const previousFilter = $("albumFilter").value || "all";
  const previousUpload = $("uploadAlbum").value;
  const opts = albums.map(a => `<option value="${a.id}">${escapeHTML(a.name)}</option>`).join("");
  $("uploadAlbum").innerHTML = opts;
  $("albumFilter").innerHTML = `<option value="all">All albums</option>${opts}`;
  $("albumFilter").value = previousFilter === "all" || albums.some(a => a.id === previousFilter) ? previousFilter : "all";
  $("uploadAlbum").value = albums.some(a => a.id === previousUpload) ? previousUpload : (albums.find(a => a.name === "Unsorted")?.id || "");
  $("albumList").innerHTML =
    `<button class="album-chip ${$("albumFilter").value === "all" ? "active" : ""}" data-album="all">All photos <small>${photos.length}</small></button>` +
    albums.map(a => {
      const count = photos.filter(p => p.album_id === a.id).length;
      return `<button class="album-chip ${$("albumFilter").value === a.id ? "active" : ""}" data-album="${a.id}">${escapeHTML(a.name)} <small>${count}</small></button>`;
    }).join("");
}
function render() {
  renderAlbums();
  const selected = $("albumFilter").value || "all";
  const query = $("searchInput").value.trim().toLowerCase();
  const visible = photos.filter(p =>
    (selected === "all" || p.album_id === selected) &&
    p.name.toLowerCase().includes(query)
  );
  $("photoCount").textContent = `(${visible.length})`;
  if (!visible.length) {
    setNotice(photos.length ? "No photos found." : "Your archive is waiting.", photos.length ? "Coba kata pencarian atau album lain." : "The shared collection is ready for its first photos.");
    return;
  }
  gallery.innerHTML = visible.map(p => `
    <article class="photo-card" data-id="${p.id}" tabindex="0" role="button" aria-label="Buka ${escapeHTML(p.name)}">
      <div class="photo-frame"><img src="${p.url}" alt="${escapeHTML(p.name)}" loading="lazy">
        <div class="photo-overlay"><button type="button" data-download="${p.id}">↓ DOWNLOAD</button></div>
      </div>
      <div class="photo-caption"><strong title="${escapeHTML(p.name)}">${escapeHTML(p.name)}</strong><span>${dateLabel(p.created_at)}</span></div>
      <div class="photo-album">${escapeHTML(p.albumName)}</div>
    </article>`).join("");
}
async function refresh() {
  await loadAlbums();
  await loadPhotos();
  render();
}
function downloadPhoto(photo) {
  const a = document.createElement("a");
  a.href = photo.url;
  a.download = photo.name || "digicam-photo";
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
}
async function uploadFiles(fileList) {
  const files = [...fileList].filter(f => f.type.startsWith("image/"));
  if (!files.length) return;
  const albumId = $("uploadAlbum").value || null;
  for (const file of files) {
    const safeName = file.name.replace(/[^\w.\-() ]/g, "_");
    const path = `${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabaseClient.storage.from(BUCKET).upload(path, file, {
      cacheControl:"3600", upsert:false, contentType:file.type
    });
    if (uploadError) {
      alert(`Gagal upload ${file.name}: ${uploadError.message}`);
      continue;
    }
    const { error: insertError } = await supabaseClient.from("photos").insert({
      name:file.name, storage_path:path, album_id:albumId
    });
    if (insertError) {
      await supabaseClient.storage.from(BUCKET).remove([path]);
      alert(`Foto ${file.name} ter-upload tetapi data gagal disimpan: ${insertError.message}`);
    }
  }
  await refresh();
}
async function openPhoto(id) {
  const p = photos.find(x => x.id === id);
  if (!p) return;
  currentPhoto = p;
  $("largePhoto").src = p.url;
  $("largeName").textContent = p.name;
  $("largeAlbum").textContent = `${p.albumName} · Added ${dateLabel(p.created_at)}`;
  $("movePhotoAlbum").innerHTML = albums.map(a => `<option value="${a.id}">${escapeHTML(a.name)}</option>`).join("");
  $("movePhotoAlbum").value = p.album_id || "";
  updateAdminUI();
  photoDialog.showModal();
}
async function deletePhoto() {
  if (!currentPhoto || !confirm(`Hapus foto "${currentPhoto.name}" dari galeri online?`)) return;
  const { error: rowError } = await supabaseClient.from("photos").delete().eq("id", currentPhoto.id);
  if (rowError) return alert(rowError.message);
  const { error: fileError } = await supabaseClient.storage.from(BUCKET).remove([currentPhoto.storage_path]);
  if (fileError) alert("Data foto dihapus, tetapi file penyimpanan perlu diperiksa: " + fileError.message);
  photoDialog.close();
  currentPhoto = null;
  await refresh();
}
async function movePhoto() {
  if (!currentPhoto) return;
  const albumId = $("movePhotoAlbum").value;
  const { error } = await supabaseClient.from("photos").update({album_id:albumId}).eq("id", currentPhoto.id);
  if (error) return alert(error.message);
  await refresh();
  currentPhoto = photos.find(p => p.id === currentPhoto.id) || null;
  if (currentPhoto) $("largeAlbum").textContent = `${currentPhoto.albumName} · Added ${dateLabel(currentPhoto.created_at)}`;
}
async function createAlbum(name) {
  const { error } = await supabaseClient.from("albums").insert({name});
  if (error) throw error;
  await refresh();
  const created = albums.find(a => a.name.toLowerCase() === name.toLowerCase());
  if (created) { $("uploadAlbum").value = created.id; $("albumFilter").value = created.id; render(); }
}
async function renderManageAlbums() {
  $("manageAlbumList").innerHTML = albums.map(a => {
    const count = photos.filter(p => p.album_id === a.id).length;
    return `<div class="manage-row"><span>${escapeHTML(a.name)} <small>(${count})</small></span><button type="button" data-delete-album="${a.id}" ${a.name === "Unsorted" ? "disabled" : ""}>DELETE</button></div>`;
  }).join("");
}
async function deleteAlbum(id) {
  const album = albums.find(a => a.id === id);
  if (!album || album.name === "Unsorted") return;
  if (!confirm(`Hapus album "${album.name}"? Foto akan dipindahkan ke Unsorted.`)) return;
  const unsorted = albums.find(a => a.name === "Unsorted");
  const { error: moveError } = await supabaseClient.from("photos").update({album_id:unsorted.id}).eq("album_id", id);
  if (moveError) return alert(moveError.message);
  const { error } = await supabaseClient.from("albums").delete().eq("id", id);
  if (error) return alert(error.message);
  await refresh(); await renderManageAlbums();
}
async function importV2Photos() {
  let old;
  try { old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY)); } catch {}
  if (!old || !Array.isArray(old.photos) || !Array.isArray(old.albums) || !old.photos.length) {
    alert("Tidak ditemukan arsip V2 di browser ini. Buka V2 di browser/perangkat yang dulu dipakai upload foto.");
    return;
  }
  if (!confirm(`Ditemukan ${old.photos.length} foto lokal. Impor ke galeri online? Proses ini mengunggah salinan foto ke Supabase.`)) return;
  for (const name of old.albums) {
    if (!albums.some(a => a.name.toLowerCase() === String(name).toLowerCase())) {
      const { error } = await supabaseClient.from("albums").insert({name:String(name).slice(0,32)});
      if (error && error.code !== "23505") { alert(error.message); return; }
    }
  }
  await loadAlbums();
  for (const photo of old.photos) {
    try {
      const response = await fetch(photo.data);
      const blob = await response.blob();
      const file = new File([blob], photo.name || "imported-photo.jpg", {type:blob.type || "image/jpeg"});
      const target = albums.find(a => a.name === photo.album) || albums.find(a => a.name === "Unsorted");
      const path = `${crypto.randomUUID()}-${(file.name || "photo").replace(/[^\w.\-() ]/g,"_")}`;
      const { error: upErr } = await supabaseClient.storage.from(BUCKET).upload(path, file, {contentType:file.type || "image/jpeg"});
      if (upErr) { console.warn(upErr); continue; }
      const { error: rowErr } = await supabaseClient.from("photos").insert({name:file.name,storage_path:path,album_id:target?.id || null});
      if (rowErr) { await supabaseClient.storage.from(BUCKET).remove([path]); console.warn(rowErr); }
    } catch (e) { console.warn("Import failed", photo.name, e); }
  }
  await refresh();
  alert("Impor selesai. Periksa galeri online untuk memastikan semua foto sudah masuk.");
}

$("adminBtn").addEventListener("click", async () => {
  if (isAdmin()) {
    await supabaseClient.auth.signOut();
    session = null; updateAdminUI(); render();
  } else {
    $("loginError").textContent = "";
    loginDialog.showModal();
  }
});
$("closeLogin").addEventListener("click", () => loginDialog.close());
$("cancelLogin").addEventListener("click", () => loginDialog.close());
$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  $("loginError").textContent = "";
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email:$("adminEmail").value.trim(), password:$("adminPassword").value
  });
  if (error) { $("loginError").textContent = "Login gagal. Periksa email dan password."; return; }
  session = data.session;
  loginDialog.close(); $("adminPassword").value = "";
  updateAdminUI(); render();
});
$("newAlbumBtn").addEventListener("click", () => { $("albumName").value = ""; albumDialog.showModal(); });
$("closeAlbumDialog").addEventListener("click", () => albumDialog.close());
$("cancelAlbum").addEventListener("click", () => albumDialog.close());
$("albumForm").addEventListener("submit", async e => {
  e.preventDefault();
  try { await createAlbum($("albumName").value.trim()); albumDialog.close(); }
  catch (error) { alert("Gagal membuat album: " + error.message); }
});
$("photoInput").addEventListener("change", async e => {
  try { await uploadFiles(e.target.files); } catch (error) { alert("Upload gagal: " + error.message); }
  e.target.value = "";
});
$("importOldBtn").addEventListener("click", importV2Photos);
$("manageAlbumsBtn").addEventListener("click", async () => { await renderManageAlbums(); manageDialog.showModal(); });
$("manageAlbumList").addEventListener("click", e => { const id = e.target.dataset.deleteAlbum; if (id) deleteAlbum(id); });
$("albumList").addEventListener("click", e => {
  const b = e.target.closest("[data-album]"); if (!b) return;
  $("albumFilter").value = b.dataset.album; render();
});
$("albumFilter").addEventListener("change", render);
$("searchInput").addEventListener("input", render);
gallery.addEventListener("click", e => {
  const d = e.target.closest("[data-download]");
  if (d) { e.stopPropagation(); const p = photos.find(x => x.id === d.dataset.download); if (p) downloadPhoto(p); return; }
  const card = e.target.closest("[data-id]"); if (card) openPhoto(card.dataset.id);
});
gallery.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-id]")) { e.preventDefault(); openPhoto(e.target.dataset.id); }
});
$("closePhoto").addEventListener("click", () => photoDialog.close());
$("downloadLarge").addEventListener("click", () => { if (currentPhoto) downloadPhoto(currentPhoto); });
$("deletePhoto").addEventListener("click", deletePhoto);
$("movePhotoAlbum").addEventListener("change", movePhoto);
photoDialog.addEventListener("click", e => { if (e.target === photoDialog) photoDialog.close(); });

async function init() {
  updateAdminUI();
  if (!isConfigured()) {
    setNotice("Setup required", "Isi Supabase Project URL dan anon/publishable key di config.js, lalu upload ulang ke GitHub.");
    return;
  }
  if (!window.supabase?.createClient) {
    setNotice("Connection library unavailable", "Periksa koneksi internet lalu muat ulang halaman.");
    return;
  }
  supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  const { data } = await supabaseClient.auth.getSession();
  session = data.session;
  supabaseClient.auth.onAuthStateChange((_event, newSession) => {
    session = newSession; updateAdminUI(); refresh().catch(err => setNotice("Could not load gallery", err.message));
  });
  updateAdminUI();
  try { await refresh(); }
  catch (error) { setNotice("Could not load gallery", error.message + " — Periksa SQL setup dan bucket Supabase."); }
}
init();
