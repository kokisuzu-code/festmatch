import test from 'node:test'
import assert from 'node:assert/strict'
import { allocateBoothBids, boothMaximums, boothBidSchema, boothConfigSchema, bidFingerprint } from '../src/lib/booth-bidding.ts'
const ids=[1,2,3].map(n=>`00000000-0000-4000-8000-00000000000${n}`)
const spaces=ids.map((id,i)=>({id,label:`A${i+1}`,genre:'フード',minimum_fee_yen:20000,map_x:20,map_y:30}))
const bid=(id,amount,time,prefs=ids)=>({id,vendor_id:id,genre:'フード',amount_yen:amount,amount_submitted_at:time,preferences:prefs,status:'pending',message:null,version:1,application_id:null})
const bids=[bid('z-first',35000,'2026-11-01T10:00:00.000001Z'),bid('a-later',35000,'2026-11-01T10:00:00.000002Z'),bid('highest',42000,'2026-11-01T12:00:00Z')]
test('allocation uses amount then actual bid timestamp including microseconds',()=>{
 const out=allocateBoothBids(bids,spaces,[{genre:'フード',capacity:3}],3)
 assert.deepEqual(out.map(b=>[b.id,b.spaceId]),[['highest',ids[0]],['z-first',ids[1]],['a-later',ids[2]]])
 assert.equal(new Set(out.map(b=>b.spaceId)).size,3)
})
test('allocation respects preferences, genre, price and zero capacity',()=>{
 const out=allocateBoothBids([bid('one',35000,'2026-11-01T00:00:00Z',[ids[2],ids[0]])],spaces,[{genre:'フード',capacity:1}],1)
 assert.equal(out[0].spaceId,ids[2])
 for(const [b,s,c] of [[bids,spaces,[{genre:'フード',capacity:0}]],[bids,spaces.map(s=>({...s,genre:'ドリンク'})),[{genre:'フード',capacity:3}]],[bids,spaces.map(s=>({...s,minimum_fee_yen:50000})),[{genre:'フード',capacity:3}]]]) assert.ok(allocateBoothBids(b,s,c,3).every(row=>row.spaceId===null))
})
test('maximums expose amounts without identity and include lower preferences',()=>{
 assert.deepEqual(boothMaximums(bids,spaces),Object.fromEntries(ids.map(id=>[id,42000])))
 assert.equal(Object.keys(boothMaximums(bids,spaces)).length,3)
})
test('bid request rejects forged identity, clock, duplicate preferences and invalid prices',()=>{
 const valid={amount:35000,preferences:ids,message:'test',version:0,accepted:true}
 assert.ok(boothBidSchema.safeParse(valid).success)
 for(const patch of [{amount:35500},{amount:0},{amount:1001000},{preferences:[ids[0],ids[0]]},{preferences:[]},{accepted:false},{version:-1},{vendor_id:'other'},{amount_submitted_at:'earlier'}]) assert.equal(boothBidSchema.safeParse({...valid,...patch}).success,false)
})
test('configuration requires bounded image positions and integer minimum amounts',()=>{
 const valid={version:0,enabled:true,mapPath:'event/booth-map.png',spaces:spaces.map(({id,...space})=>space),slots:[{genre:'フード',capacity:3}]}
 assert.ok(boothConfigSchema.safeParse(valid).success)
 for(const patch of [{map_x:101},{map_y:-1},{minimum_fee_yen:0},{minimum_fee_yen:20500}]) assert.equal(boothConfigSchema.safeParse({...valid,spaces:[{...valid.spaces[0],...patch}]}).success,false)
})
test('preview fingerprint detects any concurrent bid version change',()=>{
 assert.equal(bidFingerprint([{id:'b',version:2},{id:'a',version:1}]),'a:1,b:2')
 assert.notEqual(bidFingerprint([{id:'a',version:1}]),bidFingerprint([{id:'a',version:2}]))
})
