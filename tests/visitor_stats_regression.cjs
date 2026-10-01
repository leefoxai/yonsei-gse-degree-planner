const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('visitor-stats.js', 'utf8');
function boot(responses, path = '/yonsei-gse-degree-planner/') {
  const nodes = new Map(); const timers = []; const requests = []; const scripts = [];
  const element = () => ({ textContent:'', hidden:false, disabled:false, setAttribute(){},
    addEventListener(event, cb){ this[event] = cb; },
    appendChild(child){ if(child.id) nodes.set(child.id, child); if(child.src) scripts.push(child.src); },
    set innerHTML(html){ for(const [,id] of html.matchAll(/id="([^"]+)"/g)) nodes.set(id, element()); }
  });
  const doc = {readyState:'complete', getElementById:id=>nodes.get(id), createElement:element,
    querySelector:()=>null, head:element(), body:element()};
  const context = {document:doc, location:{hostname:'leefoxai.github.io',pathname:path}, AbortController,
    localStorage:{getItem(){return null;},setItem(){}},crypto:require("node:crypto").webcrypto,
    console:{warn(){}}, window:{setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){}},
    fetch:async(url,options)=>{requests.push({url,options});const response=responses.shift();if(response==='timeout')return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('abort'))));if(response instanceof Error)throw response;return response;}
  };
  vm.runInNewContext(source,context);
  return {nodes,timers,requests,scripts, refresh:()=>timers.find(t=>t.ms===1600).fn()};
}
const ok = data => ({ok:true,json:async()=>data});
(async()=>{
 let b=boot([ok({total:{uv:1234},today:{uv:0}})]);await b.refresh();
 assert.equal(b.nodes.get('visitorTotal').textContent,'1,234');assert.equal(b.nodes.get('visitorDaily').textContent,'0');
 await b.timers.find(t=>t.ms===12000).fn();assert.equal(b.requests.length,1);
 b=boot([new Error('Failed to fetch'),ok({total:{uv:10},today:{uv:2}})]);await b.refresh();
 assert.equal(b.nodes.get('visitorStatsStatus').textContent,'통계 조회 불가');assert.equal(b.nodes.get('visitorStatsRetry').hidden,false);
 await b.nodes.get('visitorStatsRetry').click();assert.equal(b.nodes.get('visitorTotal').textContent,'10');assert.equal(b.scripts.length,0);assert.equal(b.requests[0].options.body,b.requests[1].options.body);
 for(const data of [{total:{uv:null},today:{uv:1}},{total:{pv:100},today:{uv:2}},{total:{uv:-1},today:{uv:1}}]) {
  b=boot([ok(data)]);await b.refresh();assert.equal(b.nodes.get('visitorStatsStatus').textContent,'통계 조회 불가');
 }
 b=boot([{ok:false,status:403}]);await b.refresh();assert.equal(b.nodes.get('visitorStatsStatus').textContent,'통계 조회 불가');
 b=boot(['timeout']);const pending=b.refresh();await b.refresh();assert.equal(b.requests.length,1);b.timers.find(t=>t.ms===8000).fn();await pending;assert.equal(b.nodes.get('visitorStatsRetry').disabled,false);
 b=boot([ok({total:{uv:10},today:{uv:2}}),new Error('offline')]);await b.refresh();await b.refresh();assert.equal(b.nodes.get('visitorTotal').textContent,'10');assert.match(b.nodes.get('visitorStatsStatus').textContent,/마지막 조회값/);
 b=boot([], '/preview/');assert.equal(b.timers.length,0);assert.equal(b.scripts.length,0);
 console.log('PASS visitor stats: success/zero, retry, no third-party tracker, idempotent retry, invalid data, HTTP 403, timeout, overlap, stale value, production guard');
})().catch(e=>{console.error(e);process.exitCode=1;});
