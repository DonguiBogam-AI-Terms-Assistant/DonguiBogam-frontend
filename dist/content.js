(function(){"use strict";var y;const h=/이용약관|개인정보|동의|제3자\s*제공|보유기간|수집\s*및\s*이용|처리방침|privacy policy|terms of service|terms and conditions/i,b=/수집|이용|제공|처리|보관|파기|위탁|동의|거부|권리|의무|책임|손해|배상/g,T=[{name:"url_keywords",weight:15,check:()=>/terms|privacy|policy|agreement|consent|tos|eula/i.test(location.href)},{name:"heading_keywords",weight:25,check:t=>{const e=t.querySelector("h1, h2, h3");return h.test((e==null?void 0:e.textContent)??"")}},{name:"text_keywords",weight:20,check:t=>h.test(t.textContent??"")},{name:"text_density",weight:15,check:t=>{var e;return(((e=t.textContent)==null?void 0:e.length)??0)>1500}},{name:"keyword_frequency",weight:15,check:t=>{var n;return(((n=t.textContent)==null?void 0:n.match(b))??[]).length>=5}},{name:"scrollable_container",weight:10,check:t=>{const e=getComputedStyle(t);return e.overflowY==="scroll"||e.overflowY==="auto"}},{name:"consent_button",weight:15,check:t=>{const e=t.querySelectorAll('button, input[type="button"], input[type="submit"], a');return Array.from(e).some(n=>/동의|agree|accept|confirm|확인|승인/i.test(n.textContent??""))}},{name:"is_overlay",weight:10,check:t=>{const e=getComputedStyle(t);return e.position==="fixed"||e.position==="absolute"}},{name:"dialog_role",weight:10,check:t=>t.getAttribute("role")==="dialog"||t.getAttribute("aria-modal")==="true"}],E=55;function x(t){return T.reduce((e,n)=>{try{return e+(n.check(t)?n.weight:0)}catch{return e}},0)}const S=new Set(["SCRIPT","STYLE","NOSCRIPT","IFRAME","IMG","SVG","CANVAS","VIDEO","AUDIO"]),p=new Set(["P","DIV","SECTION","ARTICLE","ASIDE","H1","H2","H3","H4","H5","H6","LI","DT","DD","TR","TD","TH","BLOCKQUOTE","PRE","BR","HR"]);function w(t){const e=[];function n(r){var o;if(r.nodeType===Node.ELEMENT_NODE){const i=r;if(S.has(i.tagName)||i.getAttribute("aria-hidden")==="true")return;const c=getComputedStyle(i);if(c.display==="none"||c.visibility==="hidden")return;p.has(i.tagName)&&e.push(`
`),r.childNodes.forEach(n),p.has(i.tagName)&&e.push(`
`)}else if(r.nodeType===Node.TEXT_NODE){const i=(o=r.textContent)==null?void 0:o.trim();i&&e.push(i)}}return n(t),e.join(" ").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,`
`).replace(/\n{3,}/g,`

`).trim()}function A(t){var r;const e=t.querySelector("h1, h2");if((r=e==null?void 0:e.textContent)!=null&&r.trim())return e.textContent.trim().slice(0,100);const n=document.querySelector('meta[property="og:title"]');return n!=null&&n.getAttribute("content")?n.getAttribute("content").slice(0,100):document.title.slice(0,100)||"약관 문서"}function _(t){const e=t.replace(/\s+/g," ").trim().slice(0,2e3);let n=2166136261;for(let r=0;r<e.length;r++)n^=e.charCodeAt(r),n=Math.imul(n,16777619)>>>0;return n.toString(16).padStart(8,"0")}const v=['[role="dialog"]','[role="alertdialog"]','[aria-modal="true"]',".modal",".modal-body",".modal-content",'[class*="terms"]','[class*="privacy"]','[class*="agreement"]','[class*="consent"]','[id*="terms"]','[id*="privacy"]','[id*="agreement"]',"main","article"],I=400,N=200;let l=null;const f=new Set;function m(t){const e=new Set;for(const n of v){let r;try{r=document.querySelectorAll(n)}catch{continue}r.forEach(o=>{if(e.has(o))return;e.add(o);const i=x(o);if(i<E)return;const c=w(o);if(c.length<N)return;const u=_(c);if(f.has(u))return;f.add(u);const P={fingerprint:u,plainText:c,title:A(o),sourceUrl:location.href,score:i,detectedAt:Date.now()};t(P)})}}function C(t){l!==null&&clearTimeout(l),l=setTimeout(()=>m(t),I)}function D(t){m(t),new MutationObserver(n=>{n.some(o=>o.addedNodes.length>0||o.type==="attributes"&&["style","class","hidden","aria-hidden"].includes(o.attributeName??""))&&C(t)}).observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["style","class","hidden","aria-hidden","display"]})}const O="terms-ai-floating-host";let s=null,a=null;const L=`
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
`;function k(t){if(s){a=t;return}a=t,s=document.createElement("div"),s.id=O;const e=s.attachShadow({mode:"closed"});e.innerHTML=L;const n=e.getElementById("fab-btn");n==null||n.addEventListener("click",()=>{a==null||a()}),document.body.appendChild(s)}function R(){s&&(s.remove(),s=null,a=null)}function g(t){var e;if(!((e=chrome.runtime)!=null&&e.id))return Promise.resolve(void 0);try{return chrome.runtime.sendMessage(t)}catch(n){return Promise.reject(n)}}let d=null;function M(t){console.log(`[TermsAI] detected score=${t.score} fp=${t.fingerprint}`),d=t,H(t)}async function H(t){try{await g({type:"TERMS_DETECTED",payload:{terms:t}})}catch(e){console.warn("[TermsAI] TERMS_DETECTED failed:",e)}finally{k(B)}}function B(){d&&g({type:"TOGGLE_PANEL",payload:{tabId:0}}).catch(t=>{console.warn("[TermsAI] TOGGLE_PANEL failed:",t)})}try{(y=chrome.runtime)!=null&&y.id&&chrome.runtime.onMessage.addListener(t=>{t.type==="HIDE_BUTTON"&&(R(),d=null)})}catch{}D(M)})();
