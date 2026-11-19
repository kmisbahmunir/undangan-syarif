(function(){
  'use strict';
  var root=document.documentElement;
  var reduce=false;
  try{reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
  function $(id){return document.getElementById(id)}
  function all(sel){return Array.prototype.slice.call(document.querySelectorAll(sel))}
  function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}

  var CFG=window.APP_CONFIG||{};
  var AC=window.ACARA||{};
  var PANITIA=AC.panitia||[],GARIS=AC.garis||[],KEL=AC.keluarga||[];

  /* ---- data penerima ----
     (1) file undangan: nama & alamat sudah tertanam di #penerima
     (2) tautan pribadi ?u=KODE: diambil dari server (nama & alamat tidak bisa diubah penerima)
     (3) tanpa keduanya: kolom nama terbuka */
  var DATA={};
  try{DATA=JSON.parse($('penerima').textContent)||{}}catch(e){DATA={}}
  function tertanam(k){return String(DATA[k]==null?'':DATA[k]).replace(/\s+/g,' ').trim()}
  var NAMA=tertanam('nama'),ALAMAT=tertanam('alamat');
  var EMBED=!!NAMA;
  var KODE=(/[?&]u=([a-f0-9]{12})(?:&|$)/.exec(location.search)||[])[1]||'';
  var btnBuka=$('buka'),catatan=$('c-note');

  function pasang(){
    if(NAMA){
      $('c-nama').textContent=NAMA;$('h-nama').textContent=NAMA;$('l-nama').textContent=NAMA;
      $('w-lock').hidden=false;$('w-nama').hidden=true;
    }else{$('w-lock').hidden=true;$('w-nama').hidden=false}
    if(ALAMAT){
      $('c-alamat').textContent=ALAMAT;$('c-alamat').hidden=false;
      $('h-alamat').textContent=ALAMAT;$('h-alamat').hidden=false;
      $('l-alamat').textContent=ALAMAT;
    }
    if(typeof segarkan==='function')segarkan();
  }
  function catat(teks,err){catatan.textContent=teks||'';catatan.className='cv-note'+(err?' err':'')}
  function siapTombol(on,label){btnBuka.disabled=!on;btnBuka.textContent=label||'Buka Undangan'}
  function muat(){
    if(EMBED||!KODE){pasang();siapTombol(true);return}
    if(!CFG.GAS_URL||/URL_EXEC/.test(CFG.GAS_URL)){catat('Alamat server belum diisi.',true);siapTombol(false);return}
    siapTombol(false,'Memuat…');catat('');
    fetch(CFG.GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'undangan',u:KODE})})
      .then(function(r){return r.json()})
      .then(function(r){
        if(r&&r.ok){NAMA=String(r.nama||'').trim();ALAMAT=String(r.alamat||'').trim();pasang();siapTombol(true)}
        else{catat('Undangan tidak ditemukan. Tautan mungkin salah ketik atau sudah dihapus. Silakan hubungi panitia.',true);siapTombol(false,'Tidak tersedia')}
      })
      .catch(function(){catat('Tidak bisa memuat undangan. Periksa sambungan internet Anda.',true);siapTombol(true,'Coba lagi');btnBuka.dataset.ulang='1'});
  }

  /* ---- daftar keluarga (dari lembar data) ---- */
  if(KEL.length){
    $('keluarga').hidden=false;
    $('fam').innerHTML=KEL.map(function(g){
      return '<div class="oct rv"><div class="oct-in"><h3>'+h(g.judul)+'</h3><ul>'+
        (g.anggota||[]).map(function(a){return '<li><span>'+h(a.nama)+'</span><em>'+h(a.asal||'')+'</em></li>'}).join('')+
        '</ul></div></div>';
    }).join('');
  }
  if(AC.ketua){$('ttd').hidden=false;$('ketua').textContent=AC.ketua}
  if(AC.infaq&&AC.infaq.jumlah){$('infaq').hidden=false;$('infaq-jml').textContent=AC.infaq.jumlah;$('infaq-ket').textContent=AC.infaq.ket||''}
  if(GARIS.length){
    $('w-garis').hidden=false;
    $('f-garis').innerHTML='<option value="">Belum tahu / lainnya</option>'+GARIS.map(function(g){return '<option>'+h(g)+'</option>'}).join('');
  }

  /* ---- bintang berkedip ---- */
  function rng(seed){var s=seed%2147483647;if(s<=0)s+=2147483646;return function(){s=s*16807%2147483647;return (s-1)/2147483646}}
  (function(){
    var host=$('stars'),r=rng(17),f=document.createDocumentFragment();
    for(var i=0;i<80;i++){
      var s=document.createElement('i'),z=r();
      s.className='star';
      s.style.cssText='left:'+(r()*100).toFixed(2)+'%;top:'+(r()*100).toFixed(2)+'%;--s:'+(z>.93?3:z>.62?2:1.4)+'px;--d:'+(2.5+r()*4).toFixed(1)+'s;--l:-'+(r()*6).toFixed(1)+'s';
      f.appendChild(s);
    }
    host.appendChild(f);
  })();

  /* ---- debu emas melayang ---- */
  var cv=$('dust'),cx=cv.getContext('2d'),W=0,H=0,P=[],raf=0,dpr=Math.min(window.devicePixelRatio||1,2);
  function fit(){W=window.innerWidth;H=window.innerHeight;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);cx.setTransform(dpr,0,0,dpr,0,0)}
  function spawn(init){return{x:Math.random()*W,y:init?Math.random()*H:H+14,r:.6+Math.random()*1.7,v:.14+Math.random()*.42,a:.3+Math.random()*.45,ph:Math.random()*6.28,sw:.3+Math.random()*.8,big:Math.random()<.14}}
  function fill(){P=[];var n=Math.round(Math.max(28,Math.min(70,W*H/18000)));for(var i=0;i<n;i++)P.push(spawn(true))}
  function frame(t){
    cx.clearRect(0,0,W,H);
    for(var i=0;i<P.length;i++){
      var p=P[i];
      p.y-=p.v;p.x+=Math.sin(t/1700+p.ph)*p.sw*.35;
      if(p.y<-16){P[i]=p=spawn(false)}
      var tw=.55+.45*Math.sin(t/650+p.ph);
      if(p.big){
        var g=cx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*14);
        g.addColorStop(0,'rgba(248,232,196,'+(.22*tw).toFixed(3)+')');g.addColorStop(1,'rgba(248,232,196,0)');
        cx.fillStyle=g;cx.beginPath();cx.arc(p.x,p.y,p.r*14,0,6.2832);cx.fill();
      }
      cx.fillStyle='rgba(255,238,176,'+(p.a*tw).toFixed(3)+')';
      cx.beginPath();cx.arc(p.x,p.y,p.r,0,6.2832);cx.fill();
    }
    raf=requestAnimationFrame(frame);
  }
  function run(){if(!raf&&!reduce)raf=requestAnimationFrame(frame)}
  function halt(){if(raf){cancelAnimationFrame(raf);raf=0}}
  fit();fill();
  if(reduce){frame(0);halt()}else{run()}
  var rt=0;
  window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){fit();fill();if(reduce){frame(0);halt()}},160)});
  document.addEventListener('visibilitychange',function(){if(document.hidden){halt()}else{run()}});

  /* ---- munculkan bagian saat digulir ---- */
  var io=null,ioFired=false,started=false;
  function munculkan(el){el.classList.add('in')}
  function mulaiMuncul(){
    if(started)return;started=true;
    var els=all('.rv');
    if('IntersectionObserver' in window){
      io=new IntersectionObserver(function(es){
        ioFired=true;
        es.forEach(function(e){if(e.isIntersecting){munculkan(e.target);io.unobserve(e.target)}});
      },{threshold:.12,rootMargin:'0px 0px -6% 0px'});
      els.forEach(function(el){io.observe(el)});
      setTimeout(function(){if(!ioFired)els.forEach(munculkan)},2200);
    }else{els.forEach(munculkan)}
  }

  /* ---- sampul dibuka ---- */
  var cover=$('cover'),isi=$('isi');
  try{isi.inert=true}catch(e){}
  function buka(){
    if(btnBuka.dataset.ulang==='1'){btnBuka.dataset.ulang='';muat();return}
    if(btnBuka.disabled||cover.classList.contains('open'))return;
    cover.classList.add('open');
    root.classList.add('opened');
    setTimeout(mulaiMuncul,reduce?0:500);
    setTimeout(function(){
      root.classList.remove('locked');
      try{isi.inert=false}catch(e){}
      if(cover.parentNode)cover.parentNode.removeChild(cover);
      window.scrollTo(0,0);
      try{$('beranda').focus({preventScroll:true})}catch(e){}
    },reduce?120:1500);
  }
  btnBuka.addEventListener('click',buka);

  /* ---- bilah kemajuan, garis acara, pergerakan siluet ---- */
  var bar=$('prog'),tl=$('tl'),skyfig=$('skyfig'),near=$('sky-near'),far=$('sky-far'),tick=false;
  function update(){
    tick=false;
    var vh=window.innerHeight,st=window.pageYOffset||document.documentElement.scrollTop;
    var max=document.documentElement.scrollHeight-vh;
    bar.style.transform='scaleX('+(max>0?Math.min(1,Math.max(0,st/max)):0).toFixed(4)+')';
    var r=tl.getBoundingClientRect();
    var p=(vh*.72-r.top)/Math.max(1,r.height);
    tl.style.setProperty('--p',Math.max(0,Math.min(1,p)).toFixed(3));
    if(!reduce&&vh>0){
      var s=skyfig.getBoundingClientRect(),d=(s.top+s.height/2-vh/2)/vh;
      near.setAttribute('transform','translate(0 '+(d*8).toFixed(2)+')');
      far.setAttribute('transform','translate('+(d*-14).toFixed(2)+' '+(d*3).toFixed(2)+')');
    }
  }
  function onScroll(){if(!tick){tick=true;requestAnimationFrame(update)}}
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll);
  update();

  /* ---- hitung mundur ---- */
  var MULAI=new Date('2026-12-20T08:00:00+07:00').getTime();
  var AKHIR=new Date('2026-12-20T23:59:59+07:00').getTime();
  function two(n){return n<10?'0'+n:String(n)}
  function setDigit(id,v){
    var el=$(id);
    if(el.textContent!==v){el.textContent=v;el.classList.remove('flip');void el.offsetWidth;el.classList.add('flip')}
  }
  function hitung(){
    var now=Date.now(),d=MULAI-now,box=$('cd'),note=$('cd-note');
    if(d<=0){
      box.hidden=true;note.hidden=false;
      note.textContent=now<=AKHIR?'Hari ini reuni berlangsung. Silakan hadir.':'Reuni telah selesai. Jazakumullah khairan.';
      return;
    }
    var s=Math.floor(d/1000);
    setDigit('cd-d',two(Math.floor(s/86400)));setDigit('cd-h',two(Math.floor(s%86400/3600)));
    setDigit('cd-m',two(Math.floor(s%3600/60)));setDigit('cd-s',two(s%60));
  }
  hitung();setInterval(hitung,1000);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)hitung()});

  /* ---- konfirmasi lewat WhatsApp ---- */
  var LABEL={hadir:'Insya Allah hadir',belum:'Belum pasti',tidak:'Mohon maaf, berhalangan hadir'};
  function wa62(no){var d=String(no).replace(/\D/g,'');if(d.charAt(0)==='0')d='62'+d.slice(1);return d}
  function fmtNo(no){return String(no).replace(/\D/g,'').replace(/^(\d{4})(\d{4})(\d+)$/,'$1-$2-$3')}
  var S={hadir:'hadir',cp:PANITIA.length?PANITIA[0].k:''};
  if(PANITIA.length){
    $('w-cp').hidden=false;
    $('cp').innerHTML=PANITIA.map(function(c,i){
      return '<div class="opt"><input type="radio" name="cp" id="cp-'+h(c.k)+'" value="'+h(c.k)+'"'+(i?'':' checked')+'><label for="cp-'+h(c.k)+'"><span class="who"><b>'+h(c.nama)+'</b><small>'+h(c.kota||'')+'</small></span><i>'+h(fmtNo(c.no))+'</i></label></div>';
    }).join('');
  }
  function jml(){var n=parseInt($('f-jml').value,10);if(isNaN(n)||n<1)n=1;if(n>30)n=30;return n}
  function pesan(){
    var nama=NAMA||$('f-nama').value.replace(/\s+/g,' ').trim();
    var L=[];
    L.push("Assalamu'alaikum Wr. Wb.");
    L.push('Konfirmasi kehadiran Reuni & Haul ke-28 Keluarga Besar Bani KH. Syarif Krempyang, Ahad 20 Desember 2026, pukul 08.00 WIB, di Sub Bani Mintahid (Rumah Keluarga Alm. Bapak Yusuf), Ds. Bagbogo, Kec. Tanjunganom, Kab. Nganjuk.');
    L.push('');
    L.push('Nama: '+(nama||'(belum diisi)'));
    if(ALAMAT)L.push('Alamat: '+ALAMAT);
    var g=GARIS.length?$('f-garis').value:'';if(g)L.push('Garis keluarga: '+g);
    if(S.hadir!=='tidak')L.push('Jumlah hadir: '+jml()+' orang');
    L.push('Kehadiran: '+LABEL[S.hadir]);
    L.push('');
    L.push('Jazakumullah khairan.');
    return L.join('\n');
  }
  function segarkan(){
    var m=pesan(),cp=PANITIA.filter(function(c){return c.k===S.cp})[0]||PANITIA[0];
    $('pv').value=m;
    $('wa').href='https://wa.me/'+(cp?wa62(cp.no):'')+'?text='+encodeURIComponent(m);
    $('w-jml').hidden=S.hadir==='tidak';
  }
  all('input[name="hadir"]').forEach(function(r){r.addEventListener('change',function(){if(this.checked){S.hadir=this.value;segarkan()}})});
  all('input[name="cp"]').forEach(function(r){r.addEventListener('change',function(){if(this.checked){S.cp=this.value;segarkan()}})});
  $('f-garis').addEventListener('change',segarkan);
  $('f-nama').addEventListener('input',function(){if(this.value.trim())$('err-nama').hidden=true;segarkan()});
  $('f-jml').addEventListener('input',segarkan);
  $('f-jml').addEventListener('change',function(){this.value=String(jml());segarkan()});
  $('min').addEventListener('click',function(){$('f-jml').value=String(Math.max(1,jml()-1));segarkan()});
  $('plus').addEventListener('click',function(){$('f-jml').value=String(Math.min(30,jml()+1));segarkan()});
  $('rsvp').addEventListener('submit',function(e){e.preventDefault()});
  $('wa').addEventListener('click',function(e){
    if(!NAMA&&!$('f-nama').value.trim()){
      e.preventDefault();$('err-nama').hidden=false;$('f-nama').focus();
    }
  });

  /* ---- mulai ---- */
  segarkan();
  muat();
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!EMBED){
    window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
  }
})();
