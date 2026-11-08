/* Original PDF layout for this project; source checklist summarized from TADE 2026 p.72. */
(function(root){
  const LABELS={pass:'符合',review:'需加強',pending:'未評估',na:'不適用'};
  async function build({items,state,fontBytes,PDFLib,fontkit,blank=false}){
    const {PDFDocument,rgb}=PDFLib,doc=await PDFDocument.create();doc.registerFontkit(fontkit);
    const font=await doc.embedFont(fontBytes,{subset:true});
    const chars=new Set(font.getCharacterSet());const safe=text=>Array.from(String(text??'')).map(c=>c==='\n'||chars.has(c.codePointAt(0))?c:`[U+${c.codePointAt(0).toString(16).toUpperCase()}]`).join('').replace(/\r/g,'').replace(/\t/g,' ');
    const C={ink:rgb(.094,.196,.282),teal:rgb(.086,.49,.5),muted:rgb(.32,.4,.45),line:rgb(.79,.84,.82),pale:rgb(.91,.95,.92)};
    const W=595.28,H=841.89,M=42,content=W-2*M;let page,y;const pages=[];
    function add(){page=doc.addPage([W,H]);pages.push(page);y=H-42;page.drawText('胰島素注射衛教核對紀錄',{x:M,y,size:17,font,color:C.ink});y-=22;page.drawText(blank?'空白紙本版 · 依指引整理，非官方表單':'本次核對結果 · 由衛教師評估與填寫',{x:M,y,size:9,font,color:C.muted});y-=18;page.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:1,color:C.teal});y-=20;}
    function ensure(n){if(y-n<65)add();}
    function lines(text,size=10.5,width=content){const out=[];for(const para of safe(text).split('\n')){let row='';for(const c of para){if(font.widthOfTextAtSize(row+c,size)>width&&row){out.push(row);row='';}row+=c;}out.push(row);}return out;}
    function para(text,{size=10.5,color=C.ink,gap=4,indent=0}={}){for(const line of lines(text,size,content-indent)){ensure(size*1.45);page.drawText(line,{x:M+indent,y,size,font,color});y-=size*1.45;}y-=gap;}
    add();const meta=state.meta||{};
    para('填寫日期：'+(blank?'____________':meta.date||'未填')+'    個案代碼：'+(blank?'____________':meta.caseCode||'未填')+'    衛教師代稱：'+(blank?'____________':meta.educator||'未填'));
    para('糖尿病類型：'+(blank?'____________':meta.dmType||'未填')+'    執行者：'+(blank?'____________':meta.operator||'未填')+'    針具：'+(blank?'____________':meta.device||'未填'));
    para('藥物／處方劑量／時間：'+(blank?'________________________________________________':meta.prescription||'未填'));
    if(!blank){const counts={pass:0,review:0,pending:0,na:0};items.forEach(i=>counts[state.responses?.[i.id]?.status||'pending']++);para(`完成 ${items.length-counts.pending}/${items.length} 項；符合 ${counts.pass}、需加強 ${counts.review}、未評估 ${counts.pending}、不適用 ${counts.na}`,{color:C.teal});}
    para('本表以胰島素注射為主。未評估不代表符合；不適用須有原因。項目計數不是經驗證的臨床分數。',{size:9,color:C.muted,gap:9});
    let last='';items.forEach((item,index)=>{const r=state.responses?.[item.id]||{};const head=(index+1)+'. '+item.title;const criterionLines=lines(item.criterion,10).length;ensure(48+criterionLines*14+(item.group!==last?28:0));if(item.group!==last){y-=5;page.drawRectangle({x:M,y:y-5,width:content,height:23,color:C.pale});page.drawText(item.group,{x:M+8,y:y+2,size:11,font,color:C.teal});y-=27;last=item.group;}
      para(head,{size:12,gap:2});para(item.criterion,{size:10,color:C.muted,gap:3});
      para(blank?'結果：□符合　□需加強　□未評估　□不適用':'本次：'+LABELS[r.status||'pending'],{size:10.5,color:(r.status==='review'?C.teal:C.ink),gap:2});
      if(blank){para('發現／衛教／不適用原因：________________________________________________',{size:9,color:C.muted,gap:9});}
      else{if(r.flags?.length)para('補充發現：'+r.flags.join('、'),{size:10,gap:2});if(r.note)para('觀察與衛教紀錄：'+r.note,{size:10,gap:2});if(r.status==='na')para('不適用原因：'+(r.naReason||'尚未填寫'),{size:10,gap:2});y-=10;}
    });
    ensure(100);para('本次衛教結語與追蹤',{size:13,color:C.teal});
    para('整體評估：'+(blank?'________________________________':state.conclusion||'尚未填寫'));
    para('後續計畫：'+(blank?'________________________________________________':state.followUp||'尚未填寫'));
    para('參考：中華民國糖尿病衛教學會，《2026 臺灣糖尿病注射藥物注射指引》，p.72；操作補充 p.20-67。此為摘要改寫與原創排版，非學會官方電子表單。',{size:8.5,color:C.muted,gap:6});
    pages.forEach((p,i)=>{p.drawLine({start:{x:M,y:45},end:{x:W-M,y:45},thickness:.5,color:C.line});p.drawText('阿婷醫師的讀書筆記 · 衛教核對工具',{x:M,y:30,size:8,font,color:C.muted});p.drawText(`${i+1} / ${pages.length}`,{x:W-M-30,y:30,size:8,font,color:C.muted});});
    doc.setTitle(blank?'胰島素注射衛教空白核對表':'胰島素注射衛教核對紀錄');doc.setAuthor('阿婷醫師的讀書筆記');doc.setSubject('依 TADE 2026 p.72 摘要改寫的衛教核對工具，非官方表單');return doc.save();
  }
  root.ChecklistPDF={build};
})(globalThis);
