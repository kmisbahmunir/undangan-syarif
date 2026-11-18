(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var CFG=window.APP_CONFIG||{};
var S={pin:'',pesanLink:'',pesanFile:'',daftar:[],html:{},aset:{},aktif:null,saring:'semua',cari:'',tab:'buat',cidBuat:'',cidBanyak:''};

/* ---------- penyimpanan lokal (boleh gagal) ---------- */
function simpanPin(v){try{if(v)localStorage.setItem('ud-pin',v);else localStorage.removeItem('ud-pin')}catch(e){}}
function bacaPin(){try{return localStorage.getItem('ud-pin')||''}catch(e){return ''}}

/* ---------- perkakas ---------- */
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function rapi(s){return String(s==null?'':s).replace(/\s+/g,' ').trim()}
function normNo(s){
  var d=String(s==null?'':s).replace(/\D+/g,'');
  if(!d)return '';
  if(d.indexOf('620')===0)d='62'+d.slice(3);
  else if(d.indexOf('62')!==0){if(d.charAt(0)==='0')d='62'+d.slice(1);else if(d.charAt(0)==='8')d='62'+d}
  return d.length>=11&&d.length<=15&&d.indexOf('62')===0?d:'';
}
function fmtNo(n){return n?'+62 '+n.slice(2).replace(/^(\d{3})(\d{4})(\d+)$/,'$1-$2-$3'):''}
function baseUndangan(){
  var b=CFG.UNDANGAN_URL||(location.origin+location.pathname.replace(/[^\/]*$/,''));
  return b.charAt(b.length-1)==='/'?b:b+'/';
}
function linkPribadi(rek){return baseUndangan()+'?u='+rek.kode}
function namaFile(n){var s=String(n||'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40);return 'Undangan-'+(s||'Tamu')+'.html'}
function cidBaru(){return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
function isiPesan(tpl,rek){
  var peta={nama:rek.nama,alamat:rek.alamat||'',link:linkPribadi(rek)};
  return String(tpl).replace(/\{(nama|alamat|link)\}/g,function(m,k){return peta[k]});
}
function waUrl(rek,teks){return 'https://wa.me/'+(rek.wa||'')+'?text='+encodeURIComponent(teks)}

/* jembatan ke server Apps Script (JSON murni; text/plain agar lolos CORS) */
function api(action,payload){
  if(!CFG.GAS_URL||/URL_EXEC/.test(CFG.GAS_URL))return Promise.reject(new Error('Alamat server (GAS_URL) belum diisi di js/config.js.'));
  return fetch(CFG.GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action:action},payload||{}))})
    .then(function(r){return r.json()})
    .catch(function(e){throw new Error('Tidak bisa terhubung ke server. Periksa internet Anda, lalu coba lagi.')});
}
// panggilan yang dilindungi kode; bila kode ditolak -> kembali ke layar masuk
function aman(action,payload){
  return api(action,Object.assign({pin:S.pin},payload||{})).then(function(r){
    if(r&&r.ok===false&&/kode sekretaris|terlalu banyak/i.test(r.pesan||'')){keluar(r.pesan);throw new Error(r.pesan)}
    return r;
  });
}

var tt=0;
function toast(teks,aksi,fn){
  var t=$('toast');clearTimeout(tt);
  if(!$('gerbang').hidden){t.hidden=true;return}   /* di layar masuk, pesan sudah tampil di sana */
  t.innerHTML='<span>'+h(teks)+'</span>';
  if(aksi){var b=document.createElement('button');b.type='button';b.textContent=aksi;b.onclick=function(){t.hidden=true;fn&&fn()};t.appendChild(b)}
  t.hidden=false;tt=setTimeout(function(){t.hidden=true},aksi?7000:3500);
}
function sibuk(btn,on,teks){
  if(on){btn.dataset.asli=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spin"></span> '+h(teks||'Tunggu…')}
  else{btn.disabled=false;if(btn.dataset.asli!=null){btn.innerHTML=btn.dataset.asli;delete btn.dataset.asli}}
}

/* ---------- masuk / keluar ---------- */
function tampilApp(){$('gerbang').hidden=true;$('app').hidden=false}
function keluar(pesan){
  S.pin='';S.html={};S.aset={};simpanPin('');tutupLembar();
  $('app').hidden=true;$('gerbang').hidden=false;$('i-pin').value='';
  $('g-salah').textContent=pesan||'';
}
function masuk(pin,ingat,senyap){
  var b=$('b-masuk');sibuk(b,true,'Memeriksa…');$('g-salah').textContent='';
  return api('cekPin',{pin:pin}).then(function(r){
    sibuk(b,false);
    if(!r.ok){if(!senyap)$('g-salah').textContent=r.pesan||'Kode salah.';simpanPin('');return}
    S.pin=String(pin).trim();S.pesanLink=r.pesanLink;S.pesanFile=r.pesanFile;
    if(ingat)simpanPin(S.pin);else simpanPin('');
    tampilApp();muatDaftar(true);
  }).catch(function(e){sibuk(b,false);$('g-salah').textContent=e.message});
}
$('f-masuk').addEventListener('submit',function(ev){
  ev.preventDefault();var p=$('i-pin').value.trim();
  if(!p){$('g-salah').textContent='Isi kode sekretaris dulu.';return}
  masuk(p,$('i-ingat').checked,false);
});
$('b-keluar').addEventListener('click',function(){keluar('')});

/* ---------- tab ---------- */
function pilihTab(t){
  S.tab=t;
  ['buat','daftar','banyak'].forEach(function(k){
    $('p-'+k).hidden=(k!==t);
    $('t-'+k).setAttribute('aria-selected',k===t?'true':'false');
  });
  if(t==='daftar')muatDaftar(false);
  window.scrollTo(0,0);
}
Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'),function(b){b.addEventListener('click',function(){pilihTab(b.dataset.tab)})});

/* ---------- form BUAT ---------- */
function segarPratinjau(){
  var n=rapi($('i-nama').value),a=rapi($('i-alamat').value);
  $('pv-nama').textContent=n||'—';$('pv-alamat').textContent=a;
  var w=$('i-wa').value.trim(),inf=$('wa-info');
  if(!w){inf.textContent='';inf.className='info'}
  else if(normNo(w)){inf.textContent='Dikirim ke '+fmtNo(normNo(w));inf.className='info ok'}
  else{inf.textContent='Nomor belum lengkap/tidak sah. Contoh: 0812 3456 7890';inf.className='info err'}
}
['i-nama','i-alamat','i-wa'].forEach(function(id){$(id).addEventListener('input',function(){
  segarPratinjau();this.classList.remove('salah-isi');$('buat-err').textContent='';
})});

$('f-buat').addEventListener('submit',function(ev){
  ev.preventDefault();
  var d={nama:rapi($('i-nama').value),alamat:rapi($('i-alamat').value),wa:$('i-wa').value.trim()};
  var err=$('buat-err');err.textContent='';$('i-nama').classList.remove('salah-isi');$('i-wa').classList.remove('salah-isi');
  if(!d.nama){err.textContent='Nama penerima belum diisi.';$('i-nama').classList.add('salah-isi');$('i-nama').focus();return}
  if(d.wa&&!normNo(d.wa)){err.textContent='Nomor WhatsApp tidak sah. Kosongkan bila tidak ada.';$('i-wa').classList.add('salah-isi');$('i-wa').focus();return}
  var b=$('b-buat');sibuk(b,true,'Membuat undangan…');
  S.cidBuat=S.cidBuat||cidBaru();
  aman('buat',{nama:d.nama,alamat:d.alamat,wa:d.wa,cid:S.cidBuat}).then(function(r){
    sibuk(b,false);
    if(!r.ok){err.textContent=r.pesan||'Gagal membuat.';return}
    S.cidBuat='';
    S.daftar.unshift(r.rek);hitung();
    $('i-nama').value='';$('i-alamat').value='';$('i-wa').value='';segarPratinjau();
    bukaLembar(r.rek,true);
  }).catch(function(e){sibuk(b,false);err.textContent=e.message});
});

/* ---------- form BANYAK ---------- */
$('b-banyak').addEventListener('click',function(){
  var teks=$('i-banyak').value;if(!teks.trim()){toast('Isi daftar penerima dulu.');return}
  var b=$('b-banyak'),o=$('hasil-banyak');o.innerHTML='';sibuk(b,true,'Membuat…');
  S.cidBanyak=S.cidBanyak||cidBaru();
  aman('buatBanyak',{teks:teks,cid:S.cidBanyak}).then(function(r){
    sibuk(b,false);
    if(!r.ok){o.innerHTML='<span style="color:var(--merah)">'+h(r.pesan||'Gagal.')+'</span>';return}
    S.cidBanyak='';
    r.dibuat.slice().reverse().forEach(function(x){S.daftar.unshift(x)});hitung();
    var s='<div class="ok">'+r.dibuat.length+' undangan berhasil dibuat.</div>';
    if(r.dibuat.length)s+='<button class="tbl kecil" id="ke-daftar" type="button" style="margin-top:10px">Buka Daftar &rsaquo;</button>';
    if(r.gagal.length){s+='<div style="margin-top:10px;color:var(--merah);font-weight:650">'+r.gagal.length+' baris tidak dibuat:</div><ul>';
      r.gagal.forEach(function(g){s+='<li>Baris '+g.baris+': '+h(g.alasan)+'</li>'});s+='</ul>'}
    o.innerHTML=s;
    if(!r.gagal.length)$('i-banyak').value='';
    var k=$('ke-daftar');if(k)k.onclick=function(){pilihTab('daftar')};
  }).catch(function(e){sibuk(b,false);o.innerHTML='<span style="color:var(--merah)">'+h(e.message)+'</span>'});
});

/* ---------- DAFTAR ---------- */
function hitung(){
  var baru=0,kirim=0;S.daftar.forEach(function(x){if(x.status==='Terkirim')kirim++;else baru++});
  $('n-daftar').textContent=S.daftar.length;$('c-semua').textContent=S.daftar.length;
  $('c-baru').textContent=baru;$('c-kirim').textContent=kirim;
  gambarDaftar();
}
function gambarDaftar(){
  var q=S.cari.toLowerCase(),o=$('daftar');
  var isi=S.daftar.filter(function(x){
    if(S.saring!=='semua'&&x.status!==S.saring)return false;
    return !q||(x.nama+' '+x.alamat).toLowerCase().indexOf(q)>=0;
  });
  if(!isi.length){
    o.innerHTML='<div class="kosong"><svg style="color:var(--e1)"><use href="#khatam"/></svg><p>'+
      (S.daftar.length?'Tidak ada yang cocok.':'Belum ada undangan.<br>Mulai dari tab <b>Buat</b>.')+'</p></div>';return;
  }
  o.innerHTML=isi.map(function(x){
    var lb='<span class="lencana'+(x.status==='Terkirim'?' kirim':'')+'">'+(x.status==='Terkirim'?'&#10003; Terkirim':'Belum dikirim')+'</span>';
    if(x.wa)lb+='<span class="lencana wa">'+h(fmtNo(x.wa))+'</span>';
    if(x.dibuka)lb+='<span class="lencana buka">Dibuka '+x.dibuka+'&times;</span>';
    return '<button class="item" type="button" data-k="'+h(x.kode)+'"><span class="n">'+h(x.nama)+'</span>'+
      (x.alamat?'<span class="a">'+h(x.alamat)+'</span>':'')+'<span class="b">'+lb+'</span></button>';
  }).join('');
}
$('daftar').addEventListener('click',function(ev){
  var b=ev.target.closest('.item');if(!b)return;
  var rek=S.daftar.filter(function(x){return x.kode===b.dataset.k})[0];if(rek)bukaLembar(rek,false);
});
$('i-cari').addEventListener('input',function(){S.cari=rapi(this.value);gambarDaftar()});
$('chips').addEventListener('click',function(ev){
  var c=ev.target.closest('.chip');if(!c)return;S.saring=c.dataset.f;
  Array.prototype.forEach.call(document.querySelectorAll('.chip'),function(x){x.setAttribute('aria-pressed',x===c?'true':'false')});
  gambarDaftar();
});
function muatDaftar(senyap){
  var b=$('b-muat');if(!senyap)b.disabled=true;
  return aman('daftar').then(function(r){
    b.disabled=false;if(r.ok){S.daftar=r.daftar;hitung()}
  }).catch(function(e){b.disabled=false;if(!senyap)toast(e.message)});
}
$('b-muat').addEventListener('click',function(){muatDaftar(false)});

/* ---------- LEMBAR AKSI ---------- */
function perbarui(rek){
  for(var i=0;i<S.daftar.length;i++)if(S.daftar[i].kode===rek.kode){S.daftar[i]=rek;break}
  if(S.aktif&&S.aktif.kode===rek.kode)S.aktif=rek;
  hitung();
}
function bukaLembar(rek,baru){
  S.aktif=rek;
  $('l-siap').hidden=!baru;
  $('l-nama').textContent=rek.nama;
  $('l-alamat').textContent=rek.alamat||'(tanpa alamat)';
  $('l-wa').textContent=rek.wa?('WhatsApp '+fmtNo(rek.wa)):'Tanpa nomor WhatsApp';
  $('l-ket').className='ket';$('l-ket').innerHTML='';
  $('a-wa').textContent=rek.wa?'Kirim tautan lewat WhatsApp':'Kirim tautan (pilih kontak di WhatsApp)';
  var h2=$('a-hapus');h2.classList.remove('yakin');h2.textContent='Hapus penerima ini';
  segarTandai();siapkanFile(rek);
  $('lembar').hidden=false;document.body.style.overflow='hidden';
}
function tutupLembar(){$('lembar').hidden=true;document.body.style.overflow='';S.aktif=null}
Array.prototype.forEach.call(document.querySelectorAll('[data-tutup]'),function(e){e.addEventListener('click',tutupLembar)});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('lembar').hidden)tutupLembar()});

function segarTandai(){
  var r=S.aktif;if(!r)return;
  $('a-tandai').textContent=r.status==='Terkirim'?'Batalkan tanda terkirim':'Tandai terkirim';
}
function tombolFile(siap,teks){
  var b=$('a-file');b.disabled=!siap;
  b.innerHTML=siap?'Kirim file undangan (.html)':'<span class="spin"></span> '+h(teks||'Menyiapkan file…');
}
/* Undangan HTML dirakit di HP ini: templat index.html + CSS + JS disatukan, nama & alamat ditanam */
function ambilAset(url){
  if(S.aset[url]!=null)return Promise.resolve(S.aset[url]);
  return fetch(url,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('Gagal memuat '+url);return r.text()}).then(function(t){S.aset[url]=t;return t});
}
function bangunHtml(rek){
  var dasar=baseUndangan()+'index.html';
  return ambilAset(dasar).then(function(tpl){
    var re=/<(?:link|script)\b[^>]*data-inline="(css|js)"[^>]*>(?:<\/script>)?/g,daftar=[],m;
    while((m=re.exec(tpl))){var u=/(?:href|src)="([^"]+)"/.exec(m[0]);if(u)daftar.push({tag:m[0],css:m[1]==='css',url:new URL(u[1],dasar).href})}
    return Promise.all(daftar.map(function(d){return ambilAset(d.url)})).then(function(isi){
      var out=tpl;
      daftar.forEach(function(d,i){
        var k=isi[i];
        out=out.split(d.tag).join(d.css?'<style>\n'+k+'\n</style>':'<script>\n'+k.replace(/<\/script/gi,'<\\/script')+'\n</script>');
      });
      var json=JSON.stringify({nama:rek.nama,alamat:rek.alamat}).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
      out=out.replace(/(<script type="application\/json" id="penerima">)[\s\S]*?(<\/script>)/,function(x,a,b){return a+json+b});
      return {file:namaFile(rek.nama),html:out};
    });
  });
}
function siapkanFile(rek){
  if(S.html[rek.kode]){tombolFile(true);return}
  tombolFile(false);
  bangunHtml(rek).then(function(d){
    S.html[rek.kode]=d;
    if(S.aktif&&S.aktif.kode===rek.kode)tombolFile(true);
  }).catch(function(e){if(S.aktif&&S.aktif.kode===rek.kode){tombolFile(false,'Gagal menyiapkan');$('l-ket').className='ket';$('l-ket').textContent=e.message}});
}

function tawarTandai(rek){
  toast('Sudah terkirim ke '+rek.nama+'?','Tandai terkirim',function(){ubahTanda(rek,true)});
}
function ubahTanda(rek,sudah){
  return aman('tandaiKirim',{kode:rek.kode,sudah:sudah}).then(function(r){
    if(r.ok){perbarui(r.rek);segarTandai();toast(sudah?'Ditandai terkirim.':'Tanda terkirim dibatalkan.')}
    else toast(r.pesan||'Gagal.');
  }).catch(function(e){toast(e.message)});
}

/* kirim FILE: lembar berbagi bawaan HP (pilih WhatsApp), cadangan: unduh */
$('a-file').addEventListener('click',function(){
  var rek=S.aktif,d=rek&&S.html[rek.kode];if(!d)return;
  var file;
  try{file=new File([d.html],d.file,{type:'text/html'})}catch(e){unduh(d,rek);return}
  var teks=isiPesan(S.pesanFile,rek);
  var bisa=false;try{bisa=!!(navigator.canShare&&navigator.canShare({files:[file]}))}catch(e){}
  if(bisa){
    navigator.share({files:[file],title:'Undangan '+rek.nama,text:teks}).then(function(){
      tawarTandai(rek);
    }).catch(function(e){
      if(e&&e.name==='AbortError')return;
      unduh(d,rek);
    });
  }else unduh(d,rek);
});
function unduh(d,rek){
  try{
    var blob=new Blob([d.html],{type:'text/html'}),u=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=u;a.download=d.file;a.rel='noopener';document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(u)},4000);
    var k=$('l-ket');k.className='ket ok';
    k.innerHTML='File <b>'+h(d.file)+'</b> diunduh ke HP (cek folder Unduhan/Download). Buka WhatsApp, pilih kontak, ketuk klip &rarr; Dokumen, lalu pilih file itu.';
    tawarTandai(rek);
  }catch(e){
    $('l-ket').className='ket';$('l-ket').innerHTML='HP ini tidak mengizinkan unduh dari halaman ini. Ketuk <b>Simpan ke Drive</b> di bawah, lalu unduh dari tautan yang muncul.';
  }
}

/* kirim TAUTAN lewat WhatsApp */
$('a-wa').addEventListener('click',function(){
  var rek=S.aktif;if(!rek)return;
  window.open(waUrl(rek,isiPesan(S.pesanLink,rek)),'_blank','noopener');
  tawarTandai(rek);
});
$('a-lihat').addEventListener('click',function(){var r=S.aktif;if(r)window.open(linkPribadi(r),'_blank','noopener')});
$('a-salin').addEventListener('click',function(){
  var r=S.aktif;if(!r)return;var t=linkPribadi(r),ok=false;
  function cadangan(){
    try{var x=document.createElement('textarea');x.value=t;x.setAttribute('readonly','');x.style.cssText='position:fixed;opacity:0;top:0';
      document.body.appendChild(x);x.select();x.setSelectionRange(0,t.length);ok=document.execCommand('copy');document.body.removeChild(x)}catch(e){}
    if(ok)toast('Tautan disalin.');
    else{var k=$('l-ket');k.className='ket';k.innerHTML='Salin manual:<br><input class="fi" readonly value="'+h(t)+'" onfocus="this.select()" style="margin-top:6px;font-size:14px">'}
  }
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){toast('Tautan disalin.')},cadangan)}else cadangan();
});

/* cadangan: simpan ke Google Drive */
$('a-drive').addEventListener('click',function(){
  var rek=S.aktif;if(!rek)return;var b=$('a-drive');sibuk(b,true,'Menyimpan…');
  (S.html[rek.kode]?Promise.resolve(S.html[rek.kode]):bangunHtml(rek)).then(function(d){
    S.html[rek.kode]=d;
    return aman('simpanDrive',{kode:rek.kode,html:d.html});
  }).then(function(r){
    sibuk(b,false);var k=$('l-ket');
    if(!r.ok){k.className='ket';k.textContent=r.pesan||'Gagal menyimpan.';return}
    k.className='ket ok';
    k.innerHTML='Tersimpan di Drive (folder “Undangan Terisi”).<br>'+
      (r.terbuka?'<a href="'+h(r.unduh)+'" target="_blank" rel="noopener">Unduh file ke HP</a> &middot; ':'')+
      '<a href="'+h(r.buka)+'" target="_blank" rel="noopener">Buka di Drive</a>'+
      (r.terbuka?'<br><span style="font-weight:400;color:var(--abu)">Siapa pun yang memegang tautan unduh ini dapat membuka file tersebut.</span>':
        '<br><span style="font-weight:400;color:var(--abu)">Akun Drive ini melarang berbagi umum; hanya pemilik Drive yang bisa mengunduh.</span>');
  }).catch(function(e){sibuk(b,false);$('l-ket').className='ket';$('l-ket').textContent=e.message});
});

$('a-tandai').addEventListener('click',function(){var r=S.aktif;if(r)ubahTanda(r,r.status!=='Terkirim')});

var tHapus=0;
$('a-hapus').addEventListener('click',function(){
  var rek=S.aktif,b=$('a-hapus');if(!rek)return;
  if(!b.classList.contains('yakin')){
    b.classList.add('yakin');b.textContent='Ketuk lagi untuk menghapus';
    clearTimeout(tHapus);tHapus=setTimeout(function(){b.classList.remove('yakin');b.textContent='Hapus penerima ini'},3500);return;
  }
  clearTimeout(tHapus);sibuk(b,true,'Menghapus…');
  aman('hapus',{kode:rek.kode}).then(function(r){
    sibuk(b,false);
    if(!r.ok){toast(r.pesan||'Gagal menghapus.');return}
    S.daftar=S.daftar.filter(function(x){return x.kode!==rek.kode});delete S.html[rek.kode];
    tutupLembar();hitung();toast('Dihapus. Tautan lama tidak berlaku lagi.');
  }).catch(function(e){sibuk(b,false);toast(e.message)});
});

/* ---------- mulai ---------- */
segarPratinjau();
var tersimpan=bacaPin();
if(tersimpan){$('i-pin').value=tersimpan;masuk(tersimpan,true,true)}
else setTimeout(function(){try{$('i-pin').focus()}catch(e){}},50);

/* ---------- mode aplikasi (PWA) ---------- */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
}
})();
