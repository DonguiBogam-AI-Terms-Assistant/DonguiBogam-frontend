(function(){"use strict";const h=/이용약관|개인정보|동의|제3자\s*제공|보유기간|수집\s*및\s*이용|처리방침|privacy policy|terms of service|terms and conditions/i,b=/수집|이용|제공|처리|보관|파기|위탁|동의|거부|권리|의무|책임|손해|배상/g,y=[{name:"url_keywords",weight:15,check:()=>/terms|privacy|policy|agreement|consent|tos|eula/i.test(location.href)},{name:"heading_keywords",weight:25,check:t=>{const e=t.querySelector("h1, h2, h3");return h.test((e==null?void 0:e.textContent)??"")}},{name:"text_keywords",weight:20,check:t=>h.test(t.textContent??"")},{name:"text_density",weight:15,check:t=>{var e;return(((e=t.textContent)==null?void 0:e.length)??0)>1500}},{name:"keyword_frequency",weight:15,check:t=>{var n;return(((n=t.textContent)==null?void 0:n.match(b))??[]).length>=5}},{name:"scrollable_container",weight:10,check:t=>{const e=getComputedStyle(t);return e.overflowY==="scroll"||e.overflowY==="auto"}},{name:"consent_button",weight:15,check:t=>{const e=t.querySelectorAll('button, input[type="button"], input[type="submit"], a');return Array.from(e).some(n=>/동의|agree|accept|confirm|확인|승인/i.test(n.textContent??""))}},{name:"is_overlay",weight:10,check:t=>{const e=getComputedStyle(t);return e.position==="fixed"||e.position==="absolute"}},{name:"dialog_role",weight:10,check:t=>t.getAttribute("role")==="dialog"||t.getAttribute("aria-modal")==="true"}],E=55;function T(t){return y.reduce((e,n)=>{try{return e+(n.check(t)?n.weight:0)}catch{return e}},0)}const x=new Set(["SCRIPT","STYLE","NOSCRIPT","IFRAME","IMG","SVG","CANVAS","VIDEO","AUDIO"]),p=new Set(["P","DIV","SECTION","ARTICLE","ASIDE","H1","H2","H3","H4","H5","H6","LI","DT","DD","TR","TD","TH","BLOCKQUOTE","PRE","BR","HR"]);function S(t){const e=[];function n(o){var r;if(o.nodeType===Node.ELEMENT_NODE){const s=o;if(x.has(s.tagName)||s.getAttribute("aria-hidden")==="true")return;const c=getComputedStyle(s);if(c.display==="none"||c.visibility==="hidden")return;p.has(s.tagName)&&e.push(`
`),o.childNodes.forEach(n),p.has(s.tagName)&&e.push(`
`)}else if(o.nodeType===Node.TEXT_NODE){const s=(r=o.textContent)==null?void 0:r.trim();s&&e.push(s)}}return n(t),e.join(" ").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,`
`).replace(/\n{3,}/g,`

`).trim()}function w(t){var o;const e=t.querySelector("h1, h2");if((o=e==null?void 0:e.textContent)!=null&&o.trim())return e.textContent.trim().slice(0,100);const n=document.querySelector('meta[property="og:title"]');return n!=null&&n.getAttribute("content")?n.getAttribute("content").slice(0,100):document.title.slice(0,100)||"약관 문서"}function N(t){const e=t.replace(/\s+/g," ").trim().slice(0,2e3);let n=2166136261;for(let o=0;o<e.length;o++)n^=e.charCodeAt(o),n=Math.imul(n,16777619)>>>0;return n.toString(16).padStart(8,"0")}const A=['[role="dialog"]','[role="alertdialog"]','[aria-modal="true"]',".modal",".modal-body",".modal-content",'[class*="terms"]','[class*="privacy"]','[class*="agreement"]','[class*="consent"]','[id*="terms"]','[id*="privacy"]','[id*="agreement"]',"main","article"],_=400,I=200;let l=null;const f=new Set;function m(t){const e=new Set;for(const n of A){let o;try{o=document.querySelectorAll(n)}catch{continue}o.forEach(r=>{if(e.has(r))return;e.add(r);const s=T(r);if(s<E)return;const c=S(r);if(c.length<I)return;const d=N(c);if(f.has(d))return;f.add(d);const H={fingerprint:d,plainText:c,title:w(r),sourceUrl:location.href,score:s,detectedAt:Date.now()};t(H)})}}function C(t){l!==null&&clearTimeout(l),l=setTimeout(()=>m(t),_)}function D(t){m(t),new MutationObserver(n=>{n.some(r=>r.addedNodes.length>0||r.type==="attributes"&&["style","class","hidden","aria-hidden"].includes(r.attributeName??""))&&C(t)}).observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["style","class","hidden","aria-hidden","display"]})}const v="terms-ai-floating-host";let i=null,a=null;const O=`
  <style>
    :host { all: initial; }

    .fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #4f46e5;
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 16px rgba(79, 70, 229, 0.45);
      z-index: 2147483647;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      font-size: 22px;
      line-height: 1;
    }

    .fab:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.55);
    }

    .fab:active {
      transform: scale(0.96);
    }

    .badge {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ef4444;
      border: 2px solid #fff;
    }

    .tooltip {
      position: absolute;
      right: 64px;
      top: 50%;
      transform: translateY(-50%);
      background: #1e1b4b;
      color: #fff;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 5px 10px;
      border-radius: 6px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }

    .fab:hover .tooltip {
      opacity: 1;
    }
  </style>

  <button class="fab" id="fab-btn" title="약관 요약 AI">
    <span>📋</span>
    <span class="badge"></span>
    <span class="tooltip">약관이 감지됐어요</span>
  </button>
`;function k(t){if(i){a=t;return}a=t,i=document.createElement("div"),i.id=v;const e=i.attachShadow({mode:"closed"});e.innerHTML=O;const n=e.getElementById("fab-btn");n==null||n.addEventListener("click",()=>{a==null||a()}),document.body.appendChild(i)}function L(){i&&(i.remove(),i=null,a=null)}function g(t){return chrome.runtime.sendMessage(t)}let u=null;function R(t){console.log(`[약관AI] 감지됨 score=${t.score} fp=${t.fingerprint}`),u=t,g({type:"TERMS_DETECTED",payload:{terms:t}}).catch(e=>{console.warn("[약관AI] TERMS_DETECTED 전송 실패:",e)}),k(M)}function M(){u&&g({type:"OPEN_PANEL",payload:{tabId:0}}).catch(t=>{console.warn("[약관AI] OPEN_PANEL 전송 실패:",t)})}chrome.runtime.onMessage.addListener(t=>{t.type==="HIDE_BUTTON"&&(L(),u=null)}),D(R)})();
