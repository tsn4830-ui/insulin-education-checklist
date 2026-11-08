'use strict';
const ITEMS=globalThis.CHECKLIST_ITEMS;
const STATUS={pending:'未評估',pass:'符合',review:'需加強',na:'不適用'};
const META=['date','caseCode','educator','dmType','operator','device','prescription'];
const $=id=>document.getElementById(id);
const dateLocal=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function fresh(){return {meta:{date:dateLocal(),caseCode:'',educator:'',dmType:'',operator:'',device:'',prescription:''},responses:Object.fromEntries(ITEMS.map(x=>[x.id,{status:'pending',flags:[],note:'',naReason:''}])),conclusion:'',followUp:''};}
let state=fresh(),dirty=false,pendingImport=null;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function buildChecklist(){const groups=[...new Set(ITEMS.map(i=>i.group))];$('checklist').innerHTML=groups.map((group,index)=>`<section class="check-group" data-group="${index}"><div class="group-title"><h2>${esc(group)}</h2><span>${ITEMS.filter(i=>i.group===group).length} 項</span></div>${ITEMS.filter(i=>i.group===group).map(item=>{const n=ITEMS.indexOf(item)+1;return `<article class="item" id="item-${item.id}" data-status="pending"><div class="item-heading"><span class="item-number">${String(n).padStart(2,'0')}</span><h3 id="title-${item.id}">${esc(item.title)}</h3></div><p class="criterion">${esc(item.criterion)}</p><fieldset class="status-choices"><legend>${esc(item.title)}評估結果</legend>${['pass','review','pending','na'].map(v=>`<label><input type="radio" name="status-${item.id}" value="${v}" ${v==='pending'?'checked':''}>${STATUS[v]}</label>`).join('')}</fieldset><div class="na-reason" id="na-wrap-${item.id}" hidden><label>不適用原因<strong>（請說明，例如沒有空針混抽處方）</strong><input id="na-${item.id}" maxlength="300"></label></div><details id="details-${item.id}"><summary>補充發現與衛教紀錄</summary><p class="tip">${esc(item.tip)}</p><div class="flags" role="group" aria-label="${esc(item.title)}補充發現">${item.options.map((option,k)=>`<label><input type="checkbox" data-flag="${item.id}" value="${k}">${esc(option)}</label>`).join('')}</div><label>觀察、處置或回覆示教紀錄<textarea id="note-${item.id}" rows="3" maxlength="1500" placeholder="記錄本次發現與已完成的衛教。"></textarea></label></details><p class="consistency" id="consistency-${item.id}" hidden>這項仍有補充紀錄，請確認與評估結果一致。</p></article>`}).join('')}</section>`).join('');
  for(const item of ITEMS){document.querySelectorAll(`input[name="status-${item.id}"]`).forEach(input=>input.addEventListener('change',()=>{state.responses[item.id].status=input.value;dirty=true;if(input.value==='review')$('details-'+item.id).open=true;update();}));
    document.querySelectorAll(`[data-flag="${item.id}"]`).forEach(input=>input.addEventListener('change',()=>{state.responses[item.id].flags=Array.from(document.querySelectorAll(`[data-flag="${item.id}"]:checked`)).map(x=>item.options[+x.value]);dirty=true;update();}));
    $('note-'+item.id).addEventListener('input',e=>{state.responses[item.id].note=e.target.value;dirty=true;update();});$('na-'+item.id).addEventListener('input',e=>{state.responses[item.id].naReason=e.target.value;dirty=true;update();});
  }
}
function update(){const counts={pending:0,pass:0,review:0,na:0};let visible=0,missing=0;const filter=$('filter').value;
  for(const item of ITEMS){const r=state.responses[item.id];counts[r.status]++;const article=$('item-'+item.id);article.dataset.status=r.status;article.hidden=filter!=='all'&&r.status!==filter;if(!article.hidden)visible++;$('na-wrap-'+item.id).hidden=r.status!=='na';if(r.status==='na'&&!r.naReason.trim())missing++;$('consistency-'+item.id).hidden=!(r.status==='pass'&&(r.flags.length||r.note.trim()));}
  for(const section of document.querySelectorAll('.check-group'))section.hidden=!Array.from(section.querySelectorAll('.item')).some(x=>!x.hidden);
  $('empty-filter').hidden=visible>0;for(const k of Object.keys(counts))$('count-'+k).textContent=counts[k];$('done-count').textContent=15-counts.pending;$('progress').value=15-counts.pending;
  $('summary-note').textContent=counts.pending?`還有 ${counts.pending} 項未評估${counts.review?`，${counts.review} 項需加強`:''}。`:(counts.review?`已逐項核對，${counts.review} 項需加強。請補上結語與追蹤。`:'已逐項核對。請由衛教師完成整體評估。');
  $('na-note').hidden=!missing;$('na-note').textContent=`${missing} 項「不適用」尚未說明原因，PDF 會如實標示。`;
}
function applyState(next){state=next;for(const key of META)$('meta-'+key).value=state.meta[key]||'';$('conclusion').value=state.conclusion;$('followUp').value=state.followUp;
  for(const item of ITEMS){const r=state.responses[item.id];document.querySelector(`input[name="status-${item.id}"][value="${r.status}"]`).checked=true;document.querySelectorAll(`[data-flag="${item.id}"]`).forEach(x=>x.checked=r.flags.includes(item.options[+x.value]));$('note-'+item.id).value=r.note;$('na-'+item.id).value=r.naReason;$('details-'+item.id).open=r.status==='review';}
  $('filter').value='all';update();
}
function say(text){$('action-status').textContent=text;}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function snapshot(){return JSON.parse(JSON.stringify(state));}
function validateImport(raw){if(!raw||raw.format!=='ating-insulin-checklist'||raw.version!==1||!raw.state||typeof raw.state!=='object')throw Error('檔案格式不符。請選本工具匯出的 JSON 紀錄檔。');const source=raw.state,next=fresh();const str=(v,max)=>{if(typeof v!=='string'||v.length>max)throw Error('紀錄欄位格式或長度不符。');return v};
  if(!source.meta||!source.responses)throw Error('紀錄內容不完整。');for(const k of META)next.meta[k]=str(source.meta[k]??'',k==='prescription'?600:80);
  if(next.meta.date&&!/^\d{4}-\d{2}-\d{2}$/.test(next.meta.date))throw Error('日期格式不符。');for(const k of ['dmType','operator','device'])if(!Array.from($('meta-'+k).options).some(o=>o.value===next.meta[k]))throw Error('選項內容不符。');
  for(const item of ITEMS){const r=source.responses[item.id];if(!r||!Object.hasOwn(STATUS,r.status)||!Array.isArray(r.flags)||r.flags.length>item.options.length||r.flags.some(x=>!item.options.includes(x)))throw Error('核對項目格式不符。');next.responses[item.id]={status:r.status,flags:[...new Set(r.flags)],note:str(r.note??'',1500),naReason:str(r.naReason??'',300)};}
  next.conclusion=str(source.conclusion??'',100);if(!Array.from($('conclusion').options).some(o=>o.value===next.conclusion))throw Error('整體評估選項不符。');next.followUp=str(source.followUp??'',2000);return next;
}
let pdfReady=null,fontBytes=null;
function loadScript(path){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=path;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('PDF 元件讀取失敗'))};document.head.append(s)});}
async function readyPdf(){if(!pdfReady)pdfReady=(async()=>{if(!globalThis.PDFLib)await loadScript('vendor/pdf-lib.min.js');if(!globalThis.fontkit)await loadScript('vendor/fontkit.umd.min.js');if(!fontBytes){const r=await fetch('vendor/NotoSansTC.ttf');if(!r.ok)throw Error('中文字型讀取失敗');fontBytes=await r.arrayBuffer();}})().catch(e=>{pdfReady=null;throw e});await pdfReady;}
$('download-pdf').addEventListener('click',async()=>{const button=$('download-pdf'),copy=snapshot();button.disabled=true;button.textContent='準備 PDF…';say('正在產生本次紀錄，請稍候。');try{await readyPdf();const bytes=await globalThis.ChecklistPDF.build({items:ITEMS,state:copy,fontBytes,PDFLib:globalThis.PDFLib,fontkit:globalThis.fontkit});download(new Blob([bytes],{type:'application/pdf'}),'注射衛教核對紀錄-'+dateLocal()+'.pdf');say('已產生 PDF。請確認檔案下載完成後再清空紀錄。');}catch(e){say('PDF 產生失敗，內容仍保留。可使用「列印／另存 PDF」，或先匯出紀錄檔。');}finally{button.disabled=false;button.textContent='下載本次 PDF';}});
$('export-json').addEventListener('click',()=>{const record={format:'ating-insulin-checklist',version:1,exportedAt:new Date().toISOString(),state:snapshot()};download(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}),'注射衛教紀錄-'+dateLocal()+'.json');say('已匯出紀錄檔。到另一台電腦開啟本工具後選「匯入紀錄檔」。');});
$('import-json').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>1024*1024||!file.name.toLowerCase().endsWith('.json')){say('請選小於 1 MB 的 JSON 紀錄檔。');return}try{const next=validateImport(JSON.parse(await file.text()));if(dirty){pendingImport=next;$('confirm-import').showModal();}else{applyState(next);dirty=true;say('已匯入紀錄，請確認個案代碼與內容。');}}catch(error){say(error instanceof SyntaxError?'檔案不是有效的 JSON 紀錄，原內容保留。':error.message);}});
$('cancel-import').onclick=()=>{pendingImport=null;$('confirm-import').close()};$('do-import').onclick=()=>{if(pendingImport){applyState(pendingImport);dirty=true;pendingImport=null;say('已匯入紀錄，請確認個案代碼與內容。');}$('confirm-import').close()};
$('reset').onclick=()=>$('confirm-reset').showModal();$('cancel-reset').onclick=()=>$('confirm-reset').close();$('do-reset').onclick=()=>{applyState(fresh());dirty=false;$('print-report').replaceChildren();$('confirm-reset').close();say('已清空本次內容，可以開始下一位。');};
function report(){const host=$('print-report');host.replaceChildren();const add=(parent,tag,text,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;parent.append(e);return e};add(host,'h1','胰島素注射衛教核對紀錄');const m=state.meta;add(host,'p',`填寫日期：${m.date||'未填'}　個案代碼：${m.caseCode||'未填'}　衛教師代稱：${m.educator||'未填'}`,'print-meta');add(host,'p',`糖尿病類型：${m.dmType||'未填'}　執行者：${m.operator||'未填'}　針具：${m.device||'未填'}`,'print-meta');add(host,'p','藥物／處方劑量／時間：'+(m.prescription||'未填'),'print-line');const counts={pending:0,pass:0,review:0,na:0};ITEMS.forEach(i=>counts[state.responses[i.id].status]++);add(host,'p',`完成 ${15-counts.pending}/15 項；符合 ${counts.pass}、需加強 ${counts.review}、未評估 ${counts.pending}、不適用 ${counts.na}`);add(host,'p','未評估不代表符合；完成數包含不適用。項目計數不是臨床分數。','print-meta');let group='';ITEMS.forEach((i,n)=>{if(i.group!==group){add(host,'h2',i.group,'print-section');group=i.group;}const a=document.createElement('article');a.className='print-item';host.append(a);add(a,'h3',`${n+1}. ${i.title}`);add(a,'p',i.criterion);const r=state.responses[i.id];add(a,'p','本次：'+STATUS[r.status]);if(r.flags.length)add(a,'p','補充發現：'+r.flags.join('、'),'print-line');if(r.note)add(a,'p','觀察與衛教紀錄：'+r.note,'print-line');if(r.status==='na')add(a,'p','不適用原因：'+(r.naReason||'尚未填寫'),'print-line');});add(host,'h2','衛教結語與追蹤','print-section');add(host,'p','整體評估：'+(state.conclusion||'尚未填寫'));add(host,'p','後續計畫：'+(state.followUp||'尚未填寫'),'print-line');add(host,'p','來源：中華民國糖尿病衛教學會，《2026 臺灣糖尿病注射藥物注射指引》p.72，操作補充 p.20-67。摘要改寫與原創排版，非學會官方表單。阿婷醫師的讀書筆記。','print-source');}
$('preview-print').onclick=()=>{report();window.print()};window.addEventListener('beforeprint',report);
for(const key of META)$('meta-'+key).addEventListener('input',e=>{state.meta[key]=e.target.value;dirty=true;});for(const key of ['conclusion','followUp'])$(key).addEventListener('input',e=>{state[key]=e.target.value;dirty=true;});$('filter').addEventListener('change',update);$('assessment').addEventListener('submit',e=>e.preventDefault());window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
buildChecklist();applyState(state);

function makeHisSummary(record) {
  const lines = ['胰島素注射衛教紀錄'];
  const fields = [
    ['填寫日期', 'date'], ['個案代碼', 'caseCode'], ['衛教師', 'educator'],
    ['糖尿病類型', 'dmType'], ['注射執行者', 'operator'], ['針具', 'device'],
    ['用藥、處方劑量與實際注射時間', 'prescription'],
  ];
  for (const [label, key] of fields) {
    const value = record.meta[key].trim();
    if (value) lines.push(label + '：' + value);
  }

  lines.push('', '核對結果');
  for (const status of ['pass', 'review', 'pending', 'na']) {
    const titles = ITEMS.filter(item => record.responses[item.id].status === status)
      .map(item => item.title);
    lines.push(STATUS[status] + ' ' + titles.length + ' 項' +
      (titles.length ? '：' + titles.join('、') : ''));
  }

  const details = [];
  for (const item of ITEMS) {
    const response = record.responses[item.id];
    const notes = [];
    if (response.flags.length) notes.push('發現：' + response.flags.join('、'));
    if (response.note.trim()) notes.push('觀察與衛教：' + response.note.trim());
    if (response.status === 'na') {
      notes.push('不適用原因：' + (response.naReason.trim() || '尚未填寫'));
    }
    if (notes.length) {
      details.push(item.title + '（' + STATUS[response.status] + '）');
      details.push(...notes);
    }
  }
  if (details.length) lines.push('', '補充紀錄', ...details);

  lines.push('', '整體評估：' + (record.conclusion.trim() || '尚未填寫'));
  lines.push('後續計畫：' + (record.followUp.trim() || '尚未填寫'));
  return lines.join('\n');
}

$('open-his').addEventListener('click', () => {
  $('his-text').value = makeHisSummary(snapshot());
  $('his-status').textContent = '';
  $('his-dialog').showModal();
});
$('close-his').addEventListener('click', () => $('his-dialog').close());
$('his-dialog').addEventListener('close', () => {
  $('his-text').value = '';
  $('his-status').textContent = '';
});
$('copy-his').addEventListener('click', async () => {
  const preview = $('his-text');
  try {
    await navigator.clipboard.writeText(preview.value);
    if ($('his-dialog').open) $('his-status').textContent = '已複製摘要，可貼到 HIS。';
  } catch {
    if (!$('his-dialog').open) return;
    preview.focus();
    preview.select();
    $('his-status').textContent = '已選取摘要，請按 Ctrl+C 或 ⌘C 複製。';
  }
});
