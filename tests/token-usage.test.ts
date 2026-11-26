import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenCost } from "../shared/token-usage";
import { createUsageFetch, tokenUsageScope, getTokenUsage } from "../server/services/tokenUsage";
import { pool } from "../server/db";

test("standard and long-context pricing account for cached input without adding reasoning twice", () => {
  assert.equal(tokenCost("gpt-6.2-sol", 1000000, 100000, 50000), (900000*4+100000*.2+50000*15)/1e6);
  assert.equal(tokenCost("gpt-6.2-sol-2026-11",10000,2000,5000), .0662);
  assert.equal(tokenCost("gpt-6.2-sol",272000,0,1000),.554);
  assert.equal(tokenCost("another-model",100,0,100),null);
});

test("concurrent and delayed work retains separate user and generation ownership", async () => {
  const recorded: any[] = [];
  const tracked = createUsageFetch(async () => {
    await new Promise(resolve=>setTimeout(resolve,5));
    return Response.json({model:"gpt-6.2-sol",usage:{prompt_tokens:10,completion_tokens:20}});
  }, async(scope,payload)=>{recorded.push({scope,payload});});
  await Promise.all(["one","two"].map(userId=>tokenUsageScope.run({
    userId,organisationId:`org-${userId}`,generationId:`generation-${userId}`,
  },async()=>{
    await new Promise(resolve=>setImmediate(resolve));
    const response=await tracked("https://example.invalid");
    assert.equal((await response.json()).usage.completion_tokens,20,"Observer must not consume SDK response");
  })));
  assert.deepEqual(recorded.map(row=>row.scope.userId).sort(),["one","two"]);
  recorded.forEach(({scope})=>assert.equal(scope.generationId,`generation-${scope.userId}`));
  await tracked("https://example.invalid");
  assert.equal(recorded.length,2,"Calls outside a signed-in scope must not be attributed to anyone");
});

test("accounting failures never reissue paid calls; network and provider failures retain unknown usage",async()=>{
  let calls=0;
  const scope={userId:"test-user",organisationId:"test-org",generationId:"generation"};
  await tokenUsageScope.run(scope,async()=>{
    const tracked=createUsageFetch(async()=>{calls++;return Response.json({usage:{completion_tokens:100}});},
      async()=>{throw Error("synthetic accounting failure");});
    assert.equal((await tracked("https://example.invalid")).status,200);
    assert.equal(calls,1);
    const records:any[]=[];
    const network=createUsageFetch(async()=>{throw Error("synthetic network failure");},
      async(_scope,payload,failed)=>{records.push({payload,failed});});
    await assert.rejects(network("https://example.invalid"),/network failure/);
    const provider=createUsageFetch(async()=>new Response("unavailable",{status:503}),
      async(_scope,payload,failed)=>{records.push({payload,failed});});
    await provider("https://example.invalid");
    assert.deepEqual(records,[{payload:{},failed:true},{payload:{},failed:true}]);
  });
});

test("persistence stores token metadata only and reads are scoped to both user and organisation",async()=>{
  const original=pool.query;
  const queries:{text:string;params:any[]}[]=[];
  (pool as any).query=async(text:string,params:any[]=[])=>{
    queries.push({text,params});
    return {rows:text.startsWith("SELECT")?[{
      generationId:"generation",startedAt:new Date().toISOString(),model:"unreported",
      calls:1,failedCalls:1,unreportedCalls:1,inputTokens:0,cachedTokens:0,outputTokens:0,reasoningTokens:0,estimatedUsd:null,
    }]:[]};
  };
  try{
    const tracked=createUsageFetch(async()=>Response.json({
      model:"gpt-6.2-sol",choices:[{message:{content:"SENSITIVE_RESPONSE"}}],
      usage:{prompt_tokens:10000,prompt_tokens_details:{cached_tokens:2000},completion_tokens:5000,completion_tokens_details:{reasoning_tokens:3000}},
    }));
    await tokenUsageScope.run({userId:"owner",organisationId:"org",generationId:"generation"},
      ()=>tracked("https://example.invalid",{body:"SENSITIVE_TRANSCRIPT"}));
    const insert=queries.find(q=>q.text.startsWith("INSERT"))!;
    assert.deepEqual(insert.params.slice(1),["owner","org","generation","gpt-6.2-sol",false,10000,2000,5000,3000,.0662]);
    assert.ok(!JSON.stringify(queries).includes("SENSITIVE"));
    const data=await getTokenUsage("owner","org");
    assert.equal(data.totals.estimatedUsd,null,"Unknown usage must not appear free");
    assert.deepEqual(queries.at(-1)!.params,["owner","org"]);
    assert.match(queries.at(-1)!.text,/user_id=\$1 AND organisation_id=\$2/);
  }finally{pool.query=original;}
});
