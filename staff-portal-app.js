// =============================================
// HOT HEADZ STAFF PORTAL — App Logic v3
// Features: Monthly calendar, click-to-assign,
// no-typing scheduling, custom inputs, messaging,
// master login, all original features preserved
// =============================================

var ALL_ROLES=['Cook','Cashier','Server','Prep','Dishwasher','Manager','Other'];
var START_TIMES=['5:30','6:00','7:00','8:00','9:00','10:00','11:00'];
var END_TIMES=['10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

function buildRolePicker(id){var el=document.getElementById(id);if(!el)return;el.innerHTML='';ALL_ROLES.forEach(function(role){var chip=document.createElement('span');chip.className='role-chip';chip.textContent=role;chip.setAttribute('data-role',role);chip.addEventListener('click',function(){this.classList.toggle('selected');});el.appendChild(chip);});}
function getSelectedRoles(id){var out=[];document.querySelectorAll('#'+id+' .role-chip.selected').forEach(function(c){out.push(c.getAttribute('data-role'));});return out.join('/');}
function clearRolePicker(id){document.querySelectorAll('#'+id+' .role-chip').forEach(function(c){c.classList.remove('selected');});}

// Custom input toggle
function toggleCustom(id,show){var el=document.getElementById(id);if(el)el.classList.toggle('show',show);}

// Time preset builder
function buildTimePresets(containerId,times,callback){
  var el=document.getElementById(containerId);if(!el)return;el.innerHTML='';
  times.forEach(function(t){
    var btn=document.createElement('span');btn.className='time-preset';
    var h=parseInt(t),m=t.split(':')[1]||'00';
    btn.textContent=(h>12?h-12:h||12)+':'+m+(h>=12?'pm':'am');
    btn.setAttribute('data-time',t);
    btn.addEventListener('click',function(){
      el.querySelectorAll('.time-preset').forEach(function(b){b.classList.remove('selected');});
      this.classList.add('selected');
      if(callback)callback(t);
    });
    el.appendChild(btn);
  });
}

function getSelectedTime(containerId,customId){
  var custom=document.getElementById(customId);
  if(custom&&custom.classList.contains('show')&&custom.value)return custom.value;
  var sel=document.querySelector('#'+containerId+' .time-preset.selected');
  return sel?sel.getAttribute('data-time'):'';
}

document.addEventListener('DOMContentLoaded',function(){
  buildRolePicker('emp-roles');
  buildRolePicker('modal-roles');
  buildTimePresets('modal-start-presets',START_TIMES);
  buildTimePresets('modal-end-presets',END_TIMES);
  // Default select 5:30am start and 2:00pm end
  var defStart=document.querySelector('#modal-start-presets .time-preset[data-time="5:30"]');
  var defEnd=document.querySelector('#modal-end-presets .time-preset[data-time="14:00"]');
  if(defStart)defStart.classList.add('selected');
  if(defEnd)defEnd.classList.add('selected');
  var defRole=document.querySelector('#modal-roles .role-chip[data-role="Cook"]');
  if(defRole)defRole.classList.add('selected');
});

// =============================================
// API
// =============================================
var API_URL='https://script.google.com/macros/s/AKfycbxnCSfbRk15e66t3rhDCMYzVmc6fpwptTxh611NIqPn8KV3mybvqxoFe97wpXM1YqtMrQ/exec';
function api(params){var qs=Object.keys(params).map(function(k){return encodeURIComponent(k)+'='+encodeURIComponent(params[k]);}).join('&');return fetch(API_URL+'?'+qs,{method:'GET',mode:'cors'}).then(function(r){return r.text();}).then(function(t){return JSON.parse(t);});}
function loading(msg,color){document.getElementById('loadingText').textContent=msg||'Loading...';document.getElementById('spinner').className='spinner '+(color||'red');document.getElementById('loadingOverlay').classList.add('show');}
function stopLoading(){document.getElementById('loadingOverlay').classList.remove('show');}
function toast(msg,type){var t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+(type||'ok');clearTimeout(t._t);t._t=setTimeout(function(){t.className='toast';},2800);}
function updateClock(){var el=document.getElementById('liveClock');if(!el)return;var n=new Date();el.textContent=n.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})+' · '+n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});}
setInterval(updateClock,1000);updateClock();

// =============================================
// NAVIGATION
// =============================================
var _mode=null,_isMaster=false;
function showLogin(mode){_mode=mode;document.getElementById('landing').style.display='none';document.getElementById('loginScreen').style.display='flex';if(mode==='employee'){document.getElementById('empLoginBox').style.display='block';document.getElementById('ownLoginBox').style.display='none';loadEmployeeNames();}else{document.getElementById('empLoginBox').style.display='none';document.getElementById('ownLoginBox').style.display='block';setTimeout(function(){document.getElementById('ownPass').focus();},100);}}
function goLanding(){document.getElementById('loginScreen').style.display='none';document.getElementById('empApp').style.display='none';document.getElementById('ownApp').style.display='none';document.getElementById('mainHeader').style.display='none';document.getElementById('landing').style.display='flex';document.getElementById('empError').textContent='';document.getElementById('ownError').textContent='';document.getElementById('masterError').textContent='';document.getElementById('empPin').value='';document.getElementById('ownPass').value='';document.getElementById('masterPass').value='';document.getElementById('masterEmpPicker').style.display='none';_isMaster=false;}
function signOut(){goLanding();}
function showHeader(mode){document.getElementById('mainHeader').style.display='flex';var badge=document.getElementById('modeBadge');if(mode==='employee'){badge.textContent='Employee';badge.className='mode-badge emp';}else{badge.textContent='Manager';badge.className='mode-badge own';}}
document.addEventListener('keydown',function(e){if(e.key!=='Enter')return;if(document.getElementById('loginScreen').style.display==='flex'){if(_mode==='employee')empLogin();else if(_mode==='owner')ownLogin();}});

// =============================================
// MASTER LOGIN
// =============================================
function masterLogin(){
  var pass=document.getElementById('masterPass').value;
  if(!pass){document.getElementById('masterError').textContent='Enter master password.';return;}
  loading('Checking master password...','ember');
  Promise.all([api({action:'checkMaster',pass:pass}),api({action:'getEmployees'})]).then(function(res){
    stopLoading();
    if(!res[0].ok){document.getElementById('masterError').textContent='Incorrect master password.';return;}
    _isMaster=true;
    // Show employee picker
    var emps=(res[1].ok?res[1].data:[]).sort(function(a,b){return a.name.localeCompare(b.name);});
    var grid=document.getElementById('masterEmpGrid');grid.innerHTML='';
    // Option to enter as owner
    var ob=document.createElement('span');ob.className='master-emp-btn';ob.textContent='👔 MANAGER VIEW';ob.style.borderColor='rgba(230,126,34,.4)';ob.style.color='var(--ember-light)';
    ob.addEventListener('click',function(){showOwnApp();});
    grid.appendChild(ob);
    emps.forEach(function(e){
      var btn=document.createElement('span');btn.className='master-emp-btn';btn.textContent=e.name;
      btn.addEventListener('click',function(){
        _currentUser=e.name;
        showEmpApp();
      });
      grid.appendChild(btn);
    });
    document.getElementById('masterEmpPicker').style.display='block';
  }).catch(function(){stopLoading();document.getElementById('masterError').textContent='Connection error.';});
}

// =============================================
// EMPLOYEE
// =============================================
var _currentUser=null,_empMonthOffset=0,_schedule=[],_notices=[],_empMessages=[];
function loadEmployeeNames(){loading('Loading staff...','red');api({action:'getEmployees'}).then(function(r){stopLoading();if(!r.ok)return;var sel=document.getElementById('empName');sel.innerHTML='<option value="">— Select your name —</option>';(r.data||[]).sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(e){var o=document.createElement('option');o.value=e.name;o.textContent=e.name;sel.appendChild(o);});}).catch(function(){stopLoading();});}
function empLogin(){var name=document.getElementById('empName').value.trim(),pin=document.getElementById('empPin').value.trim(),err=document.getElementById('empError');if(!name){err.textContent='Select your name.';return;}if(!pin){err.textContent='Enter your PIN.';return;}loading('Checking...','red');api({action:'checkPin',name:name,pin:pin}).then(function(r){stopLoading();if(r.ok){_currentUser=name;showEmpApp();}else err.textContent=r.error||'Incorrect PIN.';}).catch(function(){stopLoading();err.textContent='Connection error.';});}

function showEmpApp(){
  document.getElementById('loginScreen').style.display='none';document.getElementById('empApp').style.display='block';showHeader('employee');
  document.getElementById('empWelcomeName').textContent=_currentUser;
  document.getElementById('empWelcomeMeta').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  loading('Loading...','red');
  Promise.all([api({action:'getSchedule'}),api({action:'getNotices'}),api({action:'getMessages',name:_currentUser})]).then(function(res){
    stopLoading();
    if(res[0].ok)_schedule=(res[0].data||[]).map(function(s){if(s.date&&s.date.length>10)s.date=s.date.slice(0,10);return s;});
    if(res[1].ok)_notices=res[1].data||[];
    if(res[2].ok)_empMessages=res[2].data||[];
    empRenderMonth();empRenderMyShifts();empRenderNotices();empRenderMessages();
  }).catch(function(){stopLoading();});
}

// ── Calendar helpers ──
var DAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],FULL_DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],FULL_MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function fmtD(d){return d.toISOString().slice(0,10);}
function fmt12(t){if(!t)return'—';var p=String(t).split(':').map(Number),h=p[0],m=p[1];return(h%12||12)+':'+(m<10?'0':'')+m+(h>=12?'pm':'am');}
function calcH(s,e){if(!s||!e)return 0;var a=s.split(':').map(Number),b=e.split(':').map(Number),d=(b[0]*60+b[1])-(a[0]*60+a[1]);return d>0?+(d/60).toFixed(1):0;}
function fmtDate(s){if(!s)return'';var d=new Date(s+'T00:00:00');return MONTHS[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear();}
function fmtDay(s){if(!s)return'';return FULL_DAYS[new Date(s+'T00:00:00').getDay()];}

function getMonthDates(offset){
  var now=new Date(),y=now.getFullYear(),m=now.getMonth()+offset;
  while(m<0){y--;m+=12;}while(m>11){y++;m-=12;}
  var first=new Date(y,m,1),startDay=first.getDay();
  var calStart=new Date(first);calStart.setDate(1-startDay);
  var cells=[];for(var i=0;i<42;i++){var d=new Date(calStart);d.setDate(calStart.getDate()+i);cells.push({date:d,iso:fmtD(d),inMonth:d.getMonth()===first.getMonth()&&d.getFullYear()===first.getFullYear()});}
  return{cells:cells,year:y,month:m,label:FULL_MONTHS[m]+' '+y};
}
function buildDowRow(id){var el=document.getElementById(id);if(el)el.innerHTML=DAYS.map(function(d){return'<div class="cal-dow">'+d+'</div>';}).join('');}

function renderCalendarGrid(gridId,labelId,dowId,monthOffset,schedule,highlightUser,clickable){
  var md=getMonthDates(monthOffset);
  if(labelId)document.getElementById(labelId).innerHTML=' — <span>'+md.label+'</span>';
  if(dowId)buildDowRow(dowId);
  var todayISO=fmtD(new Date()),grid=document.getElementById(gridId);grid.innerHTML='';
  md.cells.forEach(function(cell){
    var ds=cell.iso,isToday=ds===todayISO;
    var dayShifts=schedule.filter(function(s){return s.date===ds;});
    var col=document.createElement('div');
    col.className='day-col'+(isToday?' today':'')+(cell.inMonth?'':' other-month');
    var hdr=document.createElement('div');hdr.className='day-header';
    var dateHtml='<div class="day-date">'+cell.date.getDate()+'</div>';
    if(clickable&&cell.inMonth)dateHtml+='<span class="day-add-btn" title="Add shift">＋</span>';
    hdr.innerHTML=dateHtml;
    col.appendChild(hdr);
    // Click-to-assign
    if(clickable&&cell.inMonth){
      col.addEventListener('click',function(e){if(e.target.classList.contains('del-btn'))return;openShiftModal(ds);});
    }
    var slots=document.createElement('div');slots.className='day-slots';
    dayShifts.forEach(function(s){
      var c=document.createElement('div');
      c.className='shift-card'+(highlightUser&&s.name.trim().toLowerCase()===highlightUser.trim().toLowerCase()?' mine':'');
      c.innerHTML='<div class="shift-name">'+s.name+'</div><div class="shift-time">'+fmt12(s.startTime)+'</div><div class="shift-role">'+(s.role||'')+'</div>';
      slots.appendChild(c);
    });
    col.appendChild(slots);grid.appendChild(col);
  });
}

function empChangeMonth(d){_empMonthOffset+=d;empRenderMonth();}
function empGoToday(){_empMonthOffset=0;empRenderMonth();}
function empRenderMonth(){renderCalendarGrid('empScheduleGrid','empMonthRange','empDowRow',_empMonthOffset,_schedule,_currentUser,false);empRenderStats();}

function empRenderMyShifts(){var today=new Date();today.setHours(0,0,0,0);var me=_currentUser.trim().toLowerCase();var upcoming=_schedule.filter(function(s){return s.name.trim().toLowerCase()===me&&new Date(s.date+'T00:00:00')>=today;}).sort(function(a,b){return a.date.localeCompare(b.date);}).slice(0,10);var el=document.getElementById('empMyShifts');if(!upcoming.length){el.innerHTML='<div class="no-shifts"><span class="ns-icon">📅</span>No upcoming shifts.</div>';return;}el.innerHTML='';upcoming.forEach(function(s,i){var d=new Date(s.date+'T00:00:00'),hrs=calcH(s.startTime,s.endTime);var row=document.createElement('div');row.className='panel-row';row.innerHTML='<div class="sdb '+(i===0?'next':'')+'"><div class="sdb-day">'+DAYS[d.getDay()]+'</div><div class="sdb-num">'+d.getDate()+'</div></div><div class="pi"><div class="pi-title">'+MONTHS[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear()+'</div><div class="pi-meta">'+fmt12(s.startTime)+(s.endTime?' – '+fmt12(s.endTime):'')+'</div><div class="pi-role">'+(s.role||'Staff')+(s.notes?' · '+s.notes:'')+'</div></div><div class="hrs-badge">'+(hrs>0?hrs+'h':'–')+'<span>hours</span></div>';el.appendChild(row);});}

function empRenderStats(){
  var md=getMonthDates(_empMonthOffset),myMonth=[];
  md.cells.forEach(function(cell){if(!cell.inMonth)return;_schedule.filter(function(s){return s.date===cell.iso&&s.name.trim().toLowerCase()===_currentUser.trim().toLowerCase();}).forEach(function(s){myMonth.push(s);});});
  var totalHrs=myMonth.reduce(function(a,s){return a+calcH(s.startTime,s.endTime);},0);
  var totalDays=[...new Set(myMonth.map(function(s){return s.date;}))].length;
  var sorted=myMonth.sort(function(a,b){return a.date.localeCompare(b.date);});
  document.getElementById('empStatHours').innerHTML=totalHrs+'<span>h</span>';
  document.getElementById('empStatDays').textContent=totalDays;
  document.getElementById('empStatIn').textContent=sorted.length?fmt12(sorted[0].startTime):'–';
  document.getElementById('empStatOut').textContent=sorted.length?fmt12(sorted[sorted.length-1].endTime):'–';
}

function empRenderNotices(){var el=document.getElementById('empNoticeBoard');var defaults=[{text:'Kitchen hours: <strong>Mon–Fri 5:30am – 2pm</strong>. Crawfish Thu–Sat 4–8pm.',type:'info',date:'Standing'},{text:'Call <strong>(337) 221-1035</strong> if you are going to be late.',type:'ok',date:'Standing'}];var all=defaults.concat(_notices.slice().reverse()).slice(0,8);el.innerHTML='';all.forEach(function(n){var item=document.createElement('div');item.className='notice-item';item.innerHTML='<div class="ndot '+(n.type||'')+'"></div><div><div class="n-text">'+n.text+'</div><div class="n-date">'+(n.date||'')+'</div></div>';el.appendChild(item);});}

function empRenderMessages(){
  var el=document.getElementById('empMessages');
  if(!_empMessages.length){el.innerHTML='<div class="no-shifts" style="padding:1.5rem"><span class="ns-icon" style="font-size:1.5rem">💬</span>No messages yet.</div>';return;}
  el.innerHTML='';
  _empMessages.slice().reverse().forEach(function(m){
    var item=document.createElement('div');item.className='msg-item'+(m.read?'':' unread');
    item.innerHTML='<div class="msg-from">From: '+(m.from||'Manager')+'</div><div class="msg-text">'+m.text+'</div><div class="msg-date">'+(m.date||'')+'</div>';
    el.appendChild(item);
    // Mark as read
    if(!m.read&&m.id)api({action:'markRead',id:m.id}).catch(function(){});
  });
}

// =============================================
// SHIFT MODAL (click-to-assign)
// =============================================
var _modalDate='';
function openShiftModal(isoDate){
  _modalDate=isoDate;
  var d=new Date(isoDate+'T12:00:00');
  document.getElementById('modalDate').textContent=FULL_DAYS[d.getDay()]+', '+MONTHS[d.getMonth()]+' '+d.getDate();
  // Populate employee dropdown
  var sel=document.getElementById('modal-emp');
  sel.innerHTML='<option value="">— Select Employee —</option>';
  _ownEmployees.sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(e){
    var o=document.createElement('option');o.value=e.name;o.textContent=e.name;sel.appendChild(o);
  });
  document.getElementById('modal-notes').value='';
  document.getElementById('shiftModal').classList.add('show');
}
function closeShiftModal(){document.getElementById('shiftModal').classList.remove('show');}

function submitShiftModal(){
  // Get employee
  var empCustom=document.getElementById('modal-emp-custom');
  var name=(empCustom&&empCustom.classList.contains('show')&&empCustom.value)?empCustom.value.trim():document.getElementById('modal-emp').value;
  if(!name){toast('Select an employee','err');return;}
  // Get times
  var start=getSelectedTime('modal-start-presets','modal-start-custom');
  var end=getSelectedTime('modal-end-presets','modal-end-custom');
  // Get roles
  var roleCustom=document.getElementById('modal-role-custom');
  var role=(roleCustom&&roleCustom.classList.contains('show')&&roleCustom.value)?roleCustom.value.trim():getSelectedRoles('modal-roles');
  if(!role){toast('Select a role','err');return;}
  var notes=document.getElementById('modal-notes').value.trim();

  loading('Adding shift...','ember');
  api({action:'addShift',name:name,date:_modalDate,startTime:start,endTime:end,role:role,notes:notes}).then(function(r){
    stopLoading();
    if(r.ok){
      _ownSchedule.push({id:r.id,name:name,date:_modalDate,startTime:start,endTime:end,role:role,notes:notes});
      renderCalendarGrid('ownScheduleGrid','ownMonthRange','ownDowRow',_ownMonthOffset,_ownSchedule,null,true);
      renderShiftTable();
      closeShiftModal();
      toast(name+' assigned to '+fmtDate(_modalDate));
    } else toast('Error','err');
  }).catch(function(){stopLoading();toast('Connection error','err');});
}

// Close modal on backdrop click or escape
document.addEventListener('click',function(e){if(e.target.id==='shiftModal')closeShiftModal();});
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeShiftModal();});

// =============================================
// OWNER
// =============================================
var _ownMonthOffset=0,_ownSchedule=[],_ownEmployees=[],_ownMessages=[],_filterFrom='',_filterTo='';

function ownLogin(){var pass=document.getElementById('ownPass').value;if(!pass){document.getElementById('ownError').textContent='Enter your password.';return;}loading('Checking...','ember');api({action:'checkAdmin',pass:pass}).then(function(r){stopLoading();if(r.ok)showOwnApp();else document.getElementById('ownError').textContent='Incorrect password.';}).catch(function(err){stopLoading();document.getElementById('ownError').textContent='Connection error';});}

function showOwnApp(){
  document.getElementById('loginScreen').style.display='none';document.getElementById('ownApp').style.display='block';showHeader('owner');
  document.getElementById('ownWelcomeMeta').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  var now=new Date(),y=now.getFullYear(),m=now.getMonth();
  document.getElementById('filterFrom').value=new Date(y,m,1).toISOString().slice(0,10);
  document.getElementById('filterTo').value=new Date(y,m+1,0).toISOString().slice(0,10);
  _filterFrom=document.getElementById('filterFrom').value;_filterTo=document.getElementById('filterTo').value;
  ownLoadAll();
}

function ownLoadAll(){
  loading('Loading...','ember');
  Promise.all([api({action:'getSchedule'}),api({action:'getEmployees'}),api({action:'getNotices'}),api({action:'getMessages'})]).then(function(res){
    stopLoading();
    if(res[0].ok){_ownSchedule=(res[0].data||[]).map(function(s){if(s.date&&s.date.length>10)s.date=s.date.slice(0,10);return s;});renderCalendarGrid('ownScheduleGrid','ownMonthRange','ownDowRow',_ownMonthOffset,_ownSchedule,null,true);renderShiftTable();}
    if(res[1].ok){_ownEmployees=res[1].data||[];renderEmpGrid();renderMsgRecipients();}
    if(res[2].ok)renderNoticeList(res[2].data||[]);
    if(res[3].ok){_ownMessages=res[3].data||[];renderOwnMessages();}
  }).catch(function(){stopLoading();toast('Failed to load','err');});
}

function ownChangeMonth(d){_ownMonthOffset+=d;renderCalendarGrid('ownScheduleGrid','ownMonthRange','ownDowRow',_ownMonthOffset,_ownSchedule,null,true);}
function ownGoToday(){_ownMonthOffset=0;renderCalendarGrid('ownScheduleGrid','ownMonthRange','ownDowRow',_ownMonthOffset,_ownSchedule,null,true);}

function showTab(id){
  var tabIds=['schedule','employees','messages','notices','settings'];
  document.querySelectorAll('.tab-btn').forEach(function(b,i){b.classList.toggle('active',tabIds[i]===id);});
  document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.toggle('active',p.id==='tab-'+id);});
}

// ── Shifts ──
function deleteShift(id){if(!confirm('Delete this shift?'))return;loading('Deleting...','ember');api({action:'deleteShift',id:id}).then(function(r){stopLoading();if(r.ok){_ownSchedule=_ownSchedule.filter(function(s){return s.id!==id;});renderCalendarGrid('ownScheduleGrid','ownMonthRange','ownDowRow',_ownMonthOffset,_ownSchedule,null,true);renderShiftTable();toast('Deleted');}else toast('Error','err');}).catch(function(){stopLoading();toast('Error','err');});}
function clearAllShifts(){loading('Clearing...','ember');api({action:'clearShifts'}).then(function(r){stopLoading();if(r.ok){_ownSchedule=[];renderCalendarGrid('ownScheduleGrid','ownMonthRange','ownDowRow',_ownMonthOffset,_ownSchedule,null,true);renderShiftTable();toast('Cleared');}}).catch(function(){stopLoading();toast('Error','err');});}
function applyFilter(){_filterFrom=document.getElementById('filterFrom').value;_filterTo=document.getElementById('filterTo').value;renderShiftTable();}
function clearFilter(){_filterFrom='';_filterTo='';document.getElementById('filterFrom').value='';document.getElementById('filterTo').value='';document.getElementById('filterName').value='';renderShiftTable();}
function renderShiftTable(){var fn=(document.getElementById('filterName')||{value:''}).value.toLowerCase().trim();var data=_ownSchedule.slice();if(_filterFrom)data=data.filter(function(s){return s.date>=_filterFrom;});if(_filterTo)data=data.filter(function(s){return s.date<=_filterTo;});if(fn)data=data.filter(function(s){return s.name.toLowerCase().includes(fn);});data.sort(function(a,b){return a.date.localeCompare(b.date)||a.name.localeCompare(b.name);});var tbody=document.getElementById('shiftTableBody');tbody.innerHTML='';if(!data.length){tbody.innerHTML='<tr class="empty-row"><td colspan="9">No shifts found.</td></tr>';document.getElementById('shiftCount').textContent='';return;}var total=data.reduce(function(a,s){return a+calcH(s.startTime,s.endTime);},0);document.getElementById('shiftCount').textContent=data.length+' shift'+(data.length!==1?'s':'')+' · '+total.toFixed(1)+' hrs';data.forEach(function(s){var h=calcH(s.startTime,s.endTime),tr=document.createElement('tr');tr.innerHTML='<td><strong>'+s.name+'</strong></td><td>'+fmtDate(s.date)+'</td><td style="color:#A8A098">'+fmtDay(s.date)+'</td><td>'+fmt12(s.startTime)+'</td><td>'+fmt12(s.endTime)+'</td><td><span class="badge be">'+(h>0?h+'h':'—')+'</span></td><td><span class="badge br">'+(s.role||'Staff')+'</span></td><td style="color:#A8A098;font-size:.78rem">'+(s.notes||'')+'</td><td><button class="del-btn" onclick="deleteShift(\''+s.id+'\')">🗑</button></td>';tbody.appendChild(tr);});}

// ── Employees ──
function renderEmpSelect(selId){var sel=document.getElementById(selId);if(!sel)return;var cur=sel.value;sel.innerHTML='<option value="">— Select —</option>';_ownEmployees.sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(e){var o=document.createElement('option');o.value=e.name;o.textContent=e.name;if(e.name===cur)o.selected=true;sel.appendChild(o);});}

function addEmployee(){
  var name=document.getElementById('emp-name').value.trim(),pin=document.getElementById('emp-pin').value.trim();
  var roleCustom=document.getElementById('emp-role-custom');
  var role=(roleCustom&&roleCustom.classList.contains('show')&&roleCustom.value)?roleCustom.value.trim():getSelectedRoles('emp-roles');
  if(!name){toast('Enter a name','err');return;}if(!pin||pin.length<4){toast('PIN must be 4+ digits','err');return;}if(!/^\d+$/.test(pin)){toast('Numbers only','err');return;}if(!role){toast('Select a role','err');return;}
  loading('Adding...','ember');api({action:'addEmployee',name:name,pin:pin,role:role}).then(function(r){stopLoading();if(r.ok){_ownEmployees.push({name:name,role:role});renderEmpGrid();renderMsgRecipients();document.getElementById('emp-name').value='';document.getElementById('emp-pin').value='';clearRolePicker('emp-roles');toast(name+' added');}else toast('Error: '+(r.error||''),'err');}).catch(function(){stopLoading();toast('Error','err');});
}
function deleteEmployee(name){if(!confirm('Remove '+name+'?'))return;loading('Removing...','ember');api({action:'deleteEmployee',name:name}).then(function(r){stopLoading();if(r.ok){_ownEmployees=_ownEmployees.filter(function(e){return e.name!==name;});renderEmpGrid();renderMsgRecipients();toast(name+' removed');}else toast('Error','err');}).catch(function(){stopLoading();toast('Error','err');});}
function resetPin(name){var p=prompt('New PIN for '+name+' (4–6 digits):');if(!p)return;if(!/^\d{4,6}$/.test(p)){alert('Must be 4–6 digits.');return;}loading('Updating...','ember');api({action:'updatePin',name:name,pin:p}).then(function(r){stopLoading();if(r.ok)toast('PIN updated');else toast('Error','err');}).catch(function(){stopLoading();toast('Error','err');});}
function renderEmpGrid(){var g=document.getElementById('empGrid');if(!_ownEmployees.length){g.innerHTML='<p style="color:#A8A098;font-size:.85rem;grid-column:1/-1">No employees yet.</p>';return;}g.innerHTML='';_ownEmployees.sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(e){var c=document.createElement('div');c.className='emp-card';c.innerHTML='<div class="emp-name">'+e.name+'</div><div class="emp-role">'+(e.role||'Staff')+'</div><div class="emp-actions"><button class="emp-btn" onclick="resetPin(\''+e.name.replace(/'/g,"\\'")+'\')">🔑 Reset PIN</button><button class="emp-btn" onclick="deleteEmployee(\''+e.name.replace(/'/g,"\\'")+'\')">✕ Remove</button></div>';g.appendChild(c);});}

// ── Messages ──
function renderMsgRecipients(){
  var el=document.getElementById('msgRecipients');if(!el)return;el.innerHTML='';
  _ownEmployees.sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(e){
    var chip=document.createElement('span');chip.className='emp-check';chip.textContent=e.name;chip.setAttribute('data-name',e.name);
    chip.addEventListener('click',function(){this.classList.toggle('selected');});
    el.appendChild(chip);
  });
}
function selectAllRecipients(){document.querySelectorAll('#msgRecipients .emp-check').forEach(function(c){c.classList.add('selected');});}
function clearRecipients(){document.querySelectorAll('#msgRecipients .emp-check').forEach(function(c){c.classList.remove('selected');});}

function sendMsg(){
  var selected=[];document.querySelectorAll('#msgRecipients .emp-check.selected').forEach(function(c){selected.push(c.getAttribute('data-name'));});
  if(!selected.length){toast('Select at least one employee','err');return;}
  var text=document.getElementById('msgText').value.trim();
  if(!text){toast('Enter a message','err');return;}
  var to=selected.join(',');
  loading('Sending...','ember');
  api({action:'sendMessage',from:'Manager',to:to,text:text}).then(function(r){
    stopLoading();
    if(r.ok){document.getElementById('msgText').value='';clearRecipients();toast('Message sent to '+selected.length+' employee'+(selected.length>1?'s':''));
    // Refresh messages
    api({action:'getMessages'}).then(function(r2){if(r2.ok){_ownMessages=r2.data||[];renderOwnMessages();}});
    }else toast('Error','err');
  }).catch(function(){stopLoading();toast('Error','err');});
}

function deleteMsg(id){
  loading('Deleting...','ember');api({action:'deleteMessage',id:id}).then(function(r){stopLoading();if(r.ok){_ownMessages=_ownMessages.filter(function(m){return m.id!==id;});renderOwnMessages();toast('Deleted');}}).catch(function(){stopLoading();toast('Error','err');});
}

function renderOwnMessages(){
  var el=document.getElementById('ownMsgList');if(!el)return;
  if(!_ownMessages.length){el.innerHTML='<p style="color:#A8A098;font-size:.82rem">No messages sent yet.</p>';return;}
  el.innerHTML='';
  _ownMessages.slice().reverse().forEach(function(m){
    var item=document.createElement('div');item.className='msg-item';
    item.innerHTML='<div class="msg-from">To: '+m.to+'</div><div class="msg-text">'+m.text+'</div><div class="msg-date">'+(m.date||'')+'</div><button class="msg-del" onclick="deleteMsg(\''+m.id+'\')">🗑</button>';
    el.appendChild(item);
  });
}

// ── Notices ──
function addNotice(){var text=document.getElementById('notice-text').value.trim(),type=document.getElementById('notice-type').value;if(!text){toast('Enter a message','err');return;}loading('Posting...','ember');api({action:'addNotice',text:text,type:type}).then(function(r){stopLoading();if(r.ok){document.getElementById('notice-text').value='';api({action:'getNotices'}).then(function(r2){if(r2.ok)renderNoticeList(r2.data||[]);});toast('Posted');}else toast('Error','err');}).catch(function(){stopLoading();toast('Error','err');});}
function deleteNotice(id){loading('Deleting...','ember');api({action:'deleteNotice',id:id}).then(function(r){stopLoading();if(r.ok){api({action:'getNotices'}).then(function(r2){if(r2.ok)renderNoticeList(r2.data||[]);});toast('Removed');}}).catch(function(){stopLoading();toast('Error','err');});}
function renderNoticeList(notices){var el=document.getElementById('noticeList');if(!notices.length){el.innerHTML='<p style="color:#A8A098;font-size:.82rem">No notices yet.</p>';return;}el.innerHTML='';notices.slice().reverse().forEach(function(n){var d=document.createElement('div');d.className='nli';d.innerHTML='<div class="ndot '+(n.type||'')+'"></div><div class="nli-body"><div class="nli-text">'+n.text+'</div><div class="nli-date">'+(n.date||'')+'</div></div><button class="del-btn" onclick="deleteNotice(\''+n.id+'\')">🗑</button>';el.appendChild(d);});}

// ── Settings ──
function changePassword(){var p1=document.getElementById('newPass1').value,p2=document.getElementById('newPass2').value,msg=document.getElementById('passMsg');if(!p1){msg.style.color='var(--red-hot)';msg.textContent='Enter a password.';return;}if(p1!==p2){msg.style.color='var(--red-hot)';msg.textContent='Passwords do not match.';return;}loading('Saving...','ember');api({action:'setAdmin',pass:p1}).then(function(r){stopLoading();if(r.ok){msg.style.color='var(--green)';msg.textContent='Updated.';document.getElementById('newPass1').value='';document.getElementById('newPass2').value='';}else msg.textContent='Error.';}).catch(function(){stopLoading();msg.style.color='var(--red-hot)';msg.textContent='Error.';});}
function changeMasterPassword(){var p1=document.getElementById('newMaster1').value,p2=document.getElementById('newMaster2').value,msg=document.getElementById('masterMsg');if(!p1){msg.style.color='var(--red-hot)';msg.textContent='Enter a password.';return;}if(p1!==p2){msg.style.color='var(--red-hot)';msg.textContent='Passwords do not match.';return;}loading('Saving...','ember');api({action:'setMaster',pass:p1}).then(function(r){stopLoading();if(r.ok){msg.style.color='var(--green)';msg.textContent='Master password updated.';document.getElementById('newMaster1').value='';document.getElementById('newMaster2').value='';}else msg.textContent='Error.';}).catch(function(){stopLoading();msg.style.color='var(--red-hot)';msg.textContent='Error.';});}

// ── Logo Rings ──
var HH_LOGO='https://www.hotheadzsouthernfoods.com/images/HotHeadzLogo.png';
function makeLogoRings(canvasId,size,opts){opts=opts||{};var canvas=document.getElementById(canvasId);if(!canvas||typeof THREE==='undefined')return null;var W=size,H=size;canvas.width=W*Math.min(window.devicePixelRatio,2);canvas.height=H*Math.min(window.devicePixelRatio,2);var renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true});renderer.setSize(W,H);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor(0x000000,0);var scene=new THREE.Scene();var camera=new THREE.PerspectiveCamera(55,1,0.1,100);camera.position.z=opts.camZ||3.2;scene.add(new THREE.AmbientLight(0xffffff,0.7));var rl=new THREE.PointLight(0xE74C3C,2.0,20);rl.position.set(3,3,5);scene.add(rl);var wl=new THREE.PointLight(0xE67E22,1.2,15);wl.position.set(-3,-2,4);scene.add(wl);var or=new THREE.Mesh(new THREE.TorusGeometry(opts.outerR||1.1,opts.outerT||0.045,32,100),new THREE.MeshStandardMaterial({color:0xE74C3C,emissive:0x8B1A28,emissiveIntensity:0.4,metalness:0.8,roughness:0.2}));or.rotation.x=0.4;scene.add(or);var ir=new THREE.Mesh(new THREE.TorusGeometry(opts.innerR||0.72,opts.innerT||0.025,24,80),new THREE.MeshStandardMaterial({color:0xE67E22,emissive:0x8B4000,emissiveIntensity:0.3,metalness:0.9,roughness:0.15}));ir.rotation.x=0.4;scene.add(ir);var lp=new THREE.Mesh(new THREE.CircleGeometry(opts.logoR||0.58,64),new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide}));scene.add(lp);new THREE.TextureLoader().load(HH_LOGO,function(tex){tex.minFilter=THREE.LinearFilter;lp.material.map=tex;lp.material.opacity=0.95;lp.material.needsUpdate=true;});var run=true;(function anim(){if(!run)return;requestAnimationFrame(anim);var t=Date.now()*0.001;or.rotation.x=0.4+Math.sin(t*0.3)*0.1;or.rotation.y=t*0.4;ir.rotation.x=0.4+Math.sin(t*0.25)*0.08;ir.rotation.y=t*0.28*-1;ir.rotation.z=Math.sin(t*0.15)*0.05;lp.rotation.y=t*0.08;rl.intensity=2.0+Math.sin(t*1.5)*0.35;wl.intensity=1.2+Math.cos(t*1.2)*0.2;renderer.render(scene,camera);})();return{stop:function(){run=false;}};}
var _li={};
function initAllLogoRings(){if(typeof THREE==='undefined'){setTimeout(initAllLogoRings,200);return;}_li.landing=makeLogoRings('landingLogoCanvas',160,{outerR:1.1,innerR:0.72,outerT:0.045,innerT:0.025,logoR:0.58,camZ:3.2});_li.empLogin=makeLogoRings('empLoginLogoCanvas',100,{outerR:1.0,innerR:0.65,outerT:0.04,innerT:0.022,logoR:0.52,camZ:3.0});_li.ownLogin=makeLogoRings('ownLoginLogoCanvas',100,{outerR:1.0,innerR:0.65,outerT:0.04,innerT:0.022,logoR:0.52,camZ:3.0});_li.header=makeLogoRings('headerLogoCanvas',38,{outerR:0.9,innerR:0.58,outerT:0.04,innerT:0.02,logoR:0.46,camZ:2.8});}
window.addEventListener('load',initAllLogoRings);
