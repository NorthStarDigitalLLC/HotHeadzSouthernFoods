(function(){
  "use strict";
  var SITE = {
    name: "Hot Headz Southern Foods",
    phoneDisplay: "(337) 221-1035",
    phoneHref: "tel:+13372211035",
    addressLine1: "2741 US-190",
    addressLine2: "DeRidder, LA 70634",
    directions: "https://maps.google.com/?q=2741+US-190+DeRidder+LA+70634",
    timeZone: "America/Chicago",
    hours: [
      {days:[1,2,3,4,5],label:"Monday – Friday",open:"05:30",close:"14:00"},
      {days:[6],label:"Saturday",open:"06:00",close:"14:00"},
      {days:[0],label:"Sunday",open:"07:00",close:"15:00"}
    ],
    promotions: {
      backToSchoolBreakfast: {
        enabled:true,
        announceFrom:"2026-08-05",
        starts:"2026-08-06",
        ends:null
      }
    }
  };
  window.HOT_HEADZ_SITE = SITE;

  function qsAll(selector){return Array.prototype.slice.call(document.querySelectorAll(selector));}
  function mins(value){var p=value.split(":");return Number(p[0])*60+Number(p[1]);}
  function fmt(value){
    var p=value.split(":"),h=Number(p[0]),m=Number(p[1]),suffix=h>=12?"pm":"am";
    h=h%12||12;
    return h+(m?":"+String(m).padStart(2,"0"):"")+suffix;
  }
  function centralNow(){
    var parts=new Intl.DateTimeFormat("en-US",{
      timeZone:SITE.timeZone,weekday:"short",year:"numeric",month:"2-digit",
      day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false
    }).formatToParts(new Date());
    var out={};
    parts.forEach(function(p){if(p.type!=="literal")out[p.type]=p.value;});
    var dayIndex=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(out.weekday);
    return {
      day:dayIndex,
      minutes:(Number(out.hour)%24)*60+Number(out.minute),
      iso:out.year+"-"+out.month+"-"+out.day
    };
  }
  function hoursFor(day){
    return SITE.hours.find(function(group){return group.days.indexOf(day)>-1;})||null;
  }
  function statusText(){
    var now=centralNow(),today=hoursFor(now.day);
    if(today){
      var opening=mins(today.open),closing=mins(today.close);
      if(now.minutes>=opening&&now.minutes<closing){
        return {open:true,label:"Open now · closes "+fmt(today.close)};
      }
      if(now.minutes<opening){
        return {open:false,label:"Opens today at "+fmt(today.open)};
      }
    }
    for(var i=1;i<=7;i++){
      var nextDay=(now.day+i)%7,entry=hoursFor(nextDay);
      if(entry){
        var dayLabel=i===1?"tomorrow":["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][nextDay];
        return {open:false,label:"Opens "+dayLabel+" at "+fmt(entry.open)};
      }
    }
    return {open:false,label:"Call for today’s hours"};
  }
  function renderHours(el){
    el.innerHTML="";
    SITE.hours.forEach(function(group){
      var block=document.createElement("span");
      block.className="hours-block";
      var strong=document.createElement("strong");
      strong.textContent=group.label;
      var value=document.createElement("span");
      value.textContent=fmt(group.open)+"–"+fmt(group.close);
      block.appendChild(strong);block.appendChild(value);el.appendChild(block);
    });
  }
  function promotionVisible(p){
    if(!p||!p.enabled)return false;
    var today=centralNow().iso;
    if(p.announceFrom&&today<p.announceFrom)return false;
    if(p.ends&&today>p.ends)return false;
    return true;
  }
  function init(){
    document.documentElement.classList.add("hh-enhanced");
    qsAll("[data-hh-phone]").forEach(function(el){
      el.textContent=SITE.phoneDisplay;
      if(el.tagName==="A")el.href=SITE.phoneHref;
    });
    qsAll("[data-hh-address]").forEach(function(el){
      el.textContent=SITE.addressLine1+", "+SITE.addressLine2;
      if(el.tagName==="A")el.href=SITE.directions;
    });
    qsAll("[data-hh-hours]").forEach(renderHours);
    var state=statusText();
    qsAll("[data-hh-status]").forEach(function(el){
      el.textContent=state.label;
      el.classList.toggle("is-open",state.open);
      el.classList.toggle("is-closed",!state.open);
    });
    qsAll("[data-hh-promo]").forEach(function(el){
      var key=el.getAttribute("data-hh-promo");
      var promo=SITE.promotions[key];
      el.hidden=!promotionVisible(promo);
    });
    var path=(location.pathname.replace(/\.html$/,"").replace(/\/$/,"")||"/");
    qsAll(".topnav a[href]").forEach(function(link){
      var href=(link.getAttribute("href")||"").replace(/\.html$/,"").replace(/\/$/,"")||"/";
      if(href===path)link.setAttribute("aria-current","page");
    });
    qsAll("[data-hh-year]").forEach(function(el){el.textContent=String(new Date().getFullYear());});
    mountStaffBar();
    qsAll('a[target="_blank"]').forEach(function(link){
      var rel=(link.getAttribute("rel")||"").split(/\s+/).filter(Boolean);
      ["noopener","noreferrer"].forEach(function(token){if(rel.indexOf(token)<0)rel.push(token);});
      link.setAttribute("rel",rel.join(" "));
    });
    qsAll("img:not([loading])").forEach(function(img){
      if(!img.closest(".hero")&&!img.closest("[data-hh-promo]"))img.loading="lazy";
    });
  }
  /* Staff entry point, injected rather than pasted into four files.
     Two different footers exist on this site — .hh-site-footer on the dark
     utility pages, footer.foot on the homepage and About — so find whichever
     one this page has and hang the bar off the end of it. Bail quietly if a
     page already carries one, or has no footer at all. */
  function mountStaffBar(){
    if(document.querySelector(".hh-staff-bar"))return;
    var host=document.querySelector(".hh-site-footer")
          || document.querySelector("footer.foot .wrap")
          || document.querySelector("footer.foot");
    if(!host)return;

    var bar=document.createElement("div");
    bar.className="hh-staff-bar";

    var a=document.createElement("a");
    a.className="hh-staff-btn";
    a.href="/editor";
    a.rel="nofollow";
    a.textContent="Staff";
    bar.appendChild(a);

    host.appendChild(bar);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);
  else init();
})();