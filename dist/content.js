(function(){"use strict";var b;const x=["main","article","section",'[role="main"]','[role="dialog"]','[aria-modal="true"]',"div[id]","div[class]"].join(","),A=["header","footer","nav","aside",'[role="navigation"]','[role="banner"]','[role="contentinfo"]'].join(","),N=/(^|[-_\s])(gnb|lnb|nav|menu|footer|header|sidebar|side|language|lang|breadcrumb|quick|toolbar|search|faq)([-_\s]|$)/i,T=/서비스\s*이용약관|이용약관|서비스\s*약관|개인정보\s*처리방침|개인정보처리방침|개인정보\s*수집\s*및\s*이용\s*동의|개인정보\s*제3자\s*제공\s*동의|제3자\s*제공\s*동의|privacy policy|terms of service|terms and conditions/i,C=/제\s*\d+\s*조|제\s*\d+\s*장|목적|정의|서비스의\s*이용|이용계약|회원가입|회사의\s*의무|회원의\s*의무|이용자의\s*의무|게시물|저작권|서비스\s*이용\s*제한|계약해지|손해배상|면책|분쟁|준거법|재판관할|시행일/g,v=/개인정보의\s*수집|수집하는\s*개인정보|수집\s*및\s*이용|수집·이용|처리\s*목적|처리\s*항목|보유\s*및\s*이용기간|제3자\s*제공|개인정보\s*제3자\s*제공|처리위탁|수탁사|위탁\s*업무|국외\s*이전|파기|정보주체|이용자\s*권리|동의\s*철회|거부권|쿠키|자동\s*수집|개인정보\s*보호책임자|법정대리인/g,S=/전체\s*동의|필수\s*동의|선택\s*동의|동의합니다|동의하기|개인정보\s*수집\s*및\s*이용|개인정보\s*제3자\s*제공|제3자\s*제공\s*동의|마케팅\s*정보\s*수신/i,R=/수집\s*항목|이용\s*목적|보유\s*기간|수탁사|위탁\s*업무|제공받는\s*자|처리\s*항목/i,I=/청소년보호정책|운영정책|스팸메일정책|검색결과\s*수집|정보보호\s*인증|책임의\s*한계|법적\s*고지|실명확인|FAQ|기술|개요/gi,D=/terms|privacy|policy|agreement|consent|tos|eula/i;function m(t){return t.replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,`
`).replace(/\n{3,}/g,`

`).trim()}function o(t){if(!t)return"";try{const n="innerText"in t?t.innerText:t.textContent;return m(n??"")}catch{return m(t.textContent??"")}}function g(t){return[t.tagName,t.id,t.className,t.getAttribute("role"),t.getAttribute("aria-label")].filter(Boolean).join(" ")}function L(t){try{const n=getComputedStyle(t),e=t.getBoundingClientRect();return n.display!=="none"&&n.visibility!=="hidden"&&t.getAttribute("aria-hidden")!=="true"&&e.width>0&&e.height>0}catch{return!0}}function M(t){try{return t.closest(A)?!0:N.test(g(t))}catch{return!1}}function c(t,n){var e;try{return((e=t.match(n))==null?void 0:e.length)??0}catch{return 0}}function u(t){try{const n=t.querySelectorAll('input[type="checkbox"], label, button, a');return Array.from(n).some(e=>{const s=e.closest("label, li, p, div, section, article, tr")??e,r=o(s);return S.test(r)})}catch{return!1}}function O(t){try{const n=t.querySelectorAll("th, td, caption");return Array.from(n).some(e=>R.test(o(e)))}catch{return!1}}function w(t,n){return n.some(e=>e.includes("consent_ui"))?"CONSENT":/개인정보|privacy|제3자|수집|처리위탁|수탁사|정보주체/i.test(t)?"PRIVACY":/이용약관|서비스\s*약관|terms of service|terms and conditions|제\s*\d+\s*조/i.test(t)?"TERMS":/정책|policy/i.test(t)?"POLICY_OTHER":"UNKNOWN"}function P(){const t=[],n=new Set;try{document.querySelectorAll(x).forEach(e=>{if(n.has(e)||!L(e))return;n.add(e);const s=o(e),r=u(e);s.length<80&&!r||t.push(e)})}catch{return[]}return t.sort((e,s)=>o(s).length-o(e).length).slice(0,160)}function H(t){let n=0;const e=[];try{const s=o(t),r=o(t.querySelector('h1, h2, h3, [role="heading"]')),Z=g(t),f=c(s,C),h=c(s,v),p=c(s,I);return T.test(r)&&(n+=30,e.push("target_heading")),T.test(s.slice(0,1200))&&(n+=18,e.push("target_text_near_top")),/terms|privacy|policy|agreement|consent/i.test(Z)&&(n+=12,e.push("semantic_id_or_class")),D.test(location.href)&&(n+=5,e.push("url_hint")),f>=4&&(n+=Math.min(25,10+f*2),e.push(`terms_structure:${f}`)),h>=3&&(n+=Math.min(30,12+h*2),e.push(`privacy_structure:${h}`)),O(t)&&(n+=24,e.push("privacy_table_headers")),u(t)&&(n+=24,e.push("consent_ui_context")),s.length>1500&&(n+=10,e.push("long_form_text")),t.matches('main, article, [role="main"]')&&(n+=12,e.push("main_content_container")),t.matches('[role="dialog"], [aria-modal="true"]')&&(n+=10,e.push("dialog_container")),M(t)&&(n-=35,e.push("weak_layout_area_penalty")),p>0&&(n-=Math.min(25,p*8),e.push(`false_positive_terms:${p}`)),s.length<180&&!u(t)&&(n-=20,e.push("too_short_penalty")),{score:Math.max(0,n),reasons:e,guessedType:w(`${r}
${s}`,e)}}catch{return{score:0,reasons:["scoring_error"],guessedType:"UNKNOWN"}}}function U(){let t={detected:!1,score:0,targetElement:null,reasons:[],guessedType:"UNKNOWN"};try{for(const e of P()){const s=H(e);s.score>t.score&&(t={detected:!1,score:s.score,targetElement:e,reasons:s.reasons,guessedType:s.guessedType})}const n=t.reasons.some(e=>e!=="url_hint");return{...t,detected:t.score>=65&&n}}catch{return{detected:!1,score:0,targetElement:null,reasons:["detection_error"],guessedType:"UNKNOWN"}}}function B(t){return o(t??document.body)}function k(t){var n;try{return(t??document.body).outerHTML}catch{return((n=document.body)==null?void 0:n.outerHTML)??""}}function q(t){var s;const n=t.querySelector("h1, h2");if((s=n==null?void 0:n.textContent)!=null&&s.trim())return n.textContent.trim().slice(0,100);const e=document.querySelector('meta[property="og:title"]');return e!=null&&e.getAttribute("content")?e.getAttribute("content").slice(0,100):document.title.slice(0,100)||"약관 문서"}function F(t){const n=t.replace(/\s+/g," ").trim().slice(0,2e3);let e=2166136261;for(let s=0;s<n.length;s++)e^=n.charCodeAt(s),e=Math.imul(e,16777619)>>>0;return e.toString(16).padStart(8,"0")}const G=400,$=100;let l=null;const y=new Set;function E(t){const n=U();if(!n.detected||!n.targetElement)return;const e=B(n.targetElement);if(e.length<$)return;const s=F(e);if(y.has(s))return;y.add(s);const r={fingerprint:s,plainText:e,rawHtml:k(n.targetElement),title:q(n.targetElement),sourceUrl:location.href,score:n.score,reasons:n.reasons,guessedType:n.guessedType,detectedAt:Date.now()};t(r)}function X(t){l!==null&&clearTimeout(l),l=setTimeout(()=>E(t),G)}function W(t){E(t),new MutationObserver(e=>{e.some(r=>r.addedNodes.length>0||r.type==="attributes"&&["style","class","hidden","aria-hidden"].includes(r.attributeName??""))&&X(t)}).observe(document.body,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["style","class","hidden","aria-hidden","display"]})}const j="terms-ai-floating-host";let i=null,a=null;const z=`
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
`;function K(t){if(i){a=t;return}a=t,i=document.createElement("div"),i.id=j;const n=i.attachShadow({mode:"closed"});n.innerHTML=z;const e=n.getElementById("fab-btn");e==null||e.addEventListener("click",()=>{a==null||a()}),document.body.appendChild(i)}function V(){i&&(i.remove(),i=null,a=null)}function _(t){var n;if(!((n=chrome.runtime)!=null&&n.id))return Promise.resolve(void 0);try{return chrome.runtime.sendMessage(t)}catch(e){return Promise.reject(e)}}let d=null;function Y(t){console.log(`[TermsAI] detected score=${t.score} fp=${t.fingerprint}`),d=t,Q(t)}async function Q(t){try{await _({type:"TERMS_DETECTED",payload:{terms:t}})}catch(n){console.warn("[TermsAI] TERMS_DETECTED failed:",n)}finally{K(J)}}function J(){d&&_({type:"TOGGLE_PANEL",payload:{tabId:0}}).catch(t=>{console.warn("[TermsAI] TOGGLE_PANEL failed:",t)})}try{(b=chrome.runtime)!=null&&b.id&&chrome.runtime.onMessage.addListener(t=>{t.type==="HIDE_BUTTON"&&(V(),d=null)})}catch{}W(Y)})();
