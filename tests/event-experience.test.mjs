import test from 'node:test'
import assert from 'node:assert/strict'
import { parseTokyoDate, tokyoDateTime, eventImageUrl } from '../src/lib/event-presentation.ts'
import { parseBoothImport } from '../src/lib/booth-layout.ts'
import { allocateBoothBids, boothMaximums } from '../src/lib/booth-bidding.ts'

test('event inputs retain Japan time independently of the server timezone',()=>{
 assert.equal(parseTokyoDate('2027-05-22T15:00'),'2027-05-22T06:00:00.000Z')
 assert.equal(tokyoDateTime('2027-05-22T06:00:00.000Z'),'2027-05-22T15:00')
 assert.throws(()=>parseTokyoDate('2027-02-30T10:00'))
 assert.throws(()=>parseTokyoDate('invalid'))
})
test('diagram import validates positions and duplicates before replacing the layout',()=>{
 const result=parseBoothImport({spaces:[{label:'S01',map_x:25,map_y:70}]},33000,false)
 assert.equal(result[0].genre,null);assert.equal(result[0].minimum_fee_yen,33000)
 assert.match(result[0].id,/^[a-f0-9-]{36}$/)
 for(const spaces of [[],[{label:'S01',map_x:101,map_y:70}],[{label:'S01',map_x:25,map_y:70},{label:'S01',map_x:55,map_y:70}]]) assert.throws(()=>parseBoothImport({spaces},33000,false))
})
test('unrestricted booths rank amounts across genres and show maximum across genres',()=>{
 const spaces=[{id:'a',label:'A',genre:null,minimum_fee_yen:20000,map_x:50,map_y:50}]
 const bids=[{id:'1',genre:'唐揚げ・揚げ物',amount_yen:35000,amount_submitted_at:'2026-11-01T00:00:00Z',preferences:['a']},{id:'2',genre:'クレープ・スイーツ',amount_yen:42000,amount_submitted_at:'2026-11-02T00:00:00Z',preferences:['a']}]
 assert.deepEqual(allocateBoothBids(bids,spaces,[],1).map(b=>[b.id,b.spaceId]),[['2','a'],['1',null]])
 assert.deepEqual(boothMaximums(bids,spaces),{a:42000})
 assert.equal(allocateBoothBids(bids,spaces,[{genre:'唐揚げ・揚げ物',capacity:1}],1).find(b=>b.id==='2').spaceId,null)
})
test('event artwork supports stored paths, absolute artwork URLs and demo assets',()=>{
 assert.equal(eventImageUrl(null),null)
 assert.equal(eventImageUrl('https://example.com/poster.png'),'https://example.com/poster.png')
 assert.equal(eventImageUrl('/event-maps/demo.png'),'/event-maps/demo.png')
})
