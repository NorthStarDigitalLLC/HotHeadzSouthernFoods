/* ═══════════════════════════════════════════════════════════════════
   NorthStar Connect — ONE hosted connector for every client site.
   Put this on a client site with one line:

     <script src="https://www.nsdsystems.com/nsd-connect.js"
             data-client="THE_CLIENT_ID"></script>

   It points the site at NorthStar's central database, scopes every call to
   that client, and (inside the Control Center) authenticates writes with the
   logged-in admin. The Supabase URL + public key live HERE and nowhere else,
   so you only ever update them in one place.
   ═══════════════════════════════════════════════════════════════════ */
(function(){
  var me = document.currentScript;
  var CID = (me && me.getAttribute('data-client'))
          || window.NSD_CLIENT
          || new URLSearchParams(location.search).get('client') || '';
  // This is the live central project returned by both northstardigitalweb.com
  // and bhiservices.org. Keep Hotheadz on that exact source of truth.
  var NSD = "https://fkisefambrcyxjrwrplb.supabase.co";
  var ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraXNlZmFtYnJjeHhqcndycGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNzA2NzEsImV4cCI6MjA5OTk0NjY3MX0.sDy0HJdssg_vxMQz0NvgLD7OykFZ2LfD6a6qtYevnyk";
  var LEGACY = "https://zgqjzgonwvkxfbdseieg.supabase.co"; // catch old hardcoded calls
  // Hotheadz now has dedicated, visibly labelled tables in the same central
  // Supabase project used by NorthStar and BHI. Keep the logical names here so
  // older page code is upgraded automatically instead of ever reaching the
  // retired restaurant database.
  var MAP = {
    menu_defaults:'Hotheadz_menu_defaults',
    lunch_dates:'Hotheadz_lunch_dates',
    drawing_projects:'Hotheadz_drawing_projects'
  };
  var PK  = {
    Hotheadz_menu_defaults:'key',
    Hotheadz_lunch_dates:'lunch_date',
    Hotheadz_drawing_projects:'id'
  };
  function tok(){ try{ var s=JSON.parse(localStorage.getItem('ncc_session')); return (s&&s.access_token)||ANON; }catch(e){ return ANON; } }
  window.NSD_CONFIG = { url:NSD, anonKey:ANON, clientId:CID };
  // Upload a file/blob to the central 'media' bucket; returns its public URL.
  // Writes use the logged-in admin token (works inside the editor).
  window.nsdUpload = async function(path, blob, contentType){
    var enc = String(path).split('/').map(encodeURIComponent).join('/');
    var r = await real(NSD + '/storage/v1/object/media/' + enc, { method:'POST',
      headers:{ apikey:ANON, Authorization:'Bearer '+tok(), 'x-upsert':'true', 'Content-Type':contentType||'application/octet-stream', 'cache-control':'3600' }, body:blob });
    if(!r.ok) throw new Error('upload ' + r.status + ': ' + (await r.text().catch(function(){return '';})).slice(0,160));
    return NSD + '/storage/v1/object/public/media/' + enc;
  };
  var real = window.fetch.bind(window);
  window.fetch = function(input, init){
    try{
      var url = (typeof input==='string') ? input : ((input && input.url) || '');
      var idx = url.indexOf('/rest/v1/');
      if(idx>-1 && (url.indexOf(NSD)===0 || url.indexOf(LEGACY)===0)){
        init = Object.assign({}, init||{});
        var rest = url.slice(idx+9), qm = rest.indexOf('?');
        var tbl = qm<0?rest:rest.slice(0,qm), qs = qm<0?'':rest.slice(qm+1);
        var mapped = MAP[tbl]||tbl, scoped = mapped.indexOf('site_')===0;
        var method = ((init.method||'GET')+'').toUpperCase();
        if(scoped && CID && method!=='POST'){ qs += (qs?'&':'')+'client_id=eq.'+CID; }
        var newUrl = NSD + '/rest/v1/' + mapped + (qs?('?'+qs):'');
        var h = Object.assign({}, init.headers||{}); h['apikey']=ANON; h['Authorization']='Bearer '+tok(); init.headers=h;
        if(scoped && CID && init.body && (method==='POST'||method==='PATCH')){
          try{ var b=JSON.parse(init.body);
            if(Array.isArray(b)) b.forEach(function(o){ if(o&&typeof o==='object') o.client_id=CID; });
            else if(b&&typeof b==='object') b.client_id=CID;
            init.body=JSON.stringify(b);
          }catch(e){}
        }
        if(scoped && ((h['Prefer']||'')+'').indexOf('merge-duplicates')>-1 && PK[mapped] && newUrl.indexOf('on_conflict=')<0){
          newUrl += (newUrl.indexOf('?')<0?'?':'&')+'on_conflict='+PK[mapped];
        }
        input = newUrl;
      }
    }catch(e){ console.warn('[nsd-connect]', e); }
    return real(input, init);
  };
})();
