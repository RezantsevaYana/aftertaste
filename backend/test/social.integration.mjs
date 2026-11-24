// Run against an isolated local deployment. Three synthetic accounts are recorded
// in a private temporary fixture so only these accounts can be cleaned up later.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const base=process.env.SOCIAL_TEST_URL||'http://localhost:8080',stamp=Date.now();
const users=[];
async function request(user,path,method='GET',body,status=200){const res=await fetch(`${base}/api${path}`,{method,headers:{'Content-Type':'application/json','X-Aftertaste-Request':'1',...(user?{Cookie:user.cookie}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});const data=await res.text();assert.equal(res.status,status,`${method} ${path}: ${data.slice(0,300)}`);return data?JSON.parse(data):null;}
async function register(label){const email=`social-${label}-${stamp}@example.com`,password=`Social-${randomUUID()}`;const res=await fetch(`${base}/api/auth/register`,{method:'POST',headers:{'Content-Type':'application/json','X-Aftertaste-Request':'1'},body:JSON.stringify({email,password,firstName:`Social ${label}`,lastName:'Test'})});assert.equal(res.status,201,await res.clone().text());const person=await res.json();const user={...person,email,password,cookie:res.headers.get('set-cookie').split(';')[0]};users.push(user);await writeFile(process.env.SOCIAL_FIXTURE_PATH||'/private/tmp/aftertaste-social-fixture.json',JSON.stringify(users),{mode:0o600});return user;}
function draft(title,type='book'){return{id:randomUUID(),type,title,author:type==='book'?'Автор':undefined,status:'done',rating:9,review:'PRIVATE_REVIEW',month:'2026-11',date:'2026-11-01',reviewVisibility:'inherit'};}
const [a,b,c]=[await register('a'),await register('b'),await register('c')];
await request(null,'/social/people','GET',undefined,401);
const entry=await request(a,'/entries','POST',draft(`Книга ${stamp}`),201);
await request(a,`/social/entries/${entry.id}/companions`,'PUT',{companions:[{userId:b.id,name:'spoofed'},{userId:null,name:'PRIVATE_COMPANION'}]});
let profile=await request(b,`/social/people/${a.id}`);assert.equal(profile.entries[0].review,'');assert.equal(profile.entries[0].rating,9);assert.equal(profile.canViewPlans,false);assert.ok(!JSON.stringify(profile).includes('PRIVATE_COMPANION'));assert.ok(!JSON.stringify(profile).includes('PRIVATE_REVIEW'));assert.ok(!JSON.stringify(profile).includes(a.email));
await request(a,'/account/privacy','PATCH',{plansVisible:true});await request(a,'/account/categories/book','PATCH',{reviewVisibility:'friends'});
await request(b,`/social/following/${a.id}`,'PUT',undefined,204);profile=await request(b,`/social/people/${a.id}`);assert.equal(profile.canViewPlans,false);assert.equal(profile.entries[0].review,'');
await request(a,'/social/recommendations','POST',{recipientId:b.id,entryId:entry.id,note:'СОВЕТ'},403);
await request(a,`/social/friends/${b.id}`,'POST',undefined,204);await request(a,`/social/friends/${b.id}/accept`,'POST',undefined,400);
await request(b,`/social/friends/${a.id}/accept`,'POST',undefined,204);profile=await request(b,`/social/people/${a.id}`);assert.equal(profile.person.friend,true);assert.equal(profile.entries[0].review,'PRIVATE_REVIEW');assert.equal(profile.canViewPlans,true);
await request(b,`/social/following/${a.id}`,'DELETE',undefined,204);profile=await request(b,`/social/people/${a.id}`);assert.equal(profile.person.friend,true);assert.equal(profile.person.following,false);
let safeEntry=await request(a,`/entries/${entry.id}`,'PUT',{...entry,reviewVisibility:'private'});profile=await request(b,`/social/people/${a.id}`);assert.equal(profile.entries[0].review,'');
const rec=await request(a,'/social/recommendations','POST',{recipientId:b.id,entryId:entry.id,note:'Совет другу'},201);await request(a,'/social/recommendations','POST',{recipientId:b.id,entryId:entry.id,note:'Повтор'},409);
let inbox=await request(b,'/social/recommendations');assert.equal(inbox.incoming.length,1);assert.ok(!JSON.stringify(inbox).includes('PRIVATE_REVIEW'));assert.ok(!JSON.stringify(inbox).includes('PRIVATE_COMPANION'));assert.ok(!JSON.stringify(inbox).includes(a.email));
await request(c,`/social/recommendations/${rec.id}/accept`,'POST',undefined,404);await request(c,`/social/entries/${entry.id}/companions`,'PUT',{companions:[]},404);
// Concurrent copy and accept must produce one plan and consume one recommendation.
const concurrent=await Promise.all([request(b,`/social/people/${a.id}/entries/${entry.id}/plan`,'POST',undefined,201),request(b,`/social/recommendations/${rec.id}/accept`,'POST',undefined,201)]);assert.equal(concurrent[0].id,concurrent[1].id);
let plans=await request(b,'/entries');assert.equal(plans.length,1);assert.equal(plans[0].status,'plan');assert.equal(plans[0].review,'');assert.deepEqual(plans[0].companions,[]);assert.equal(plans[0].source.userId,a.id);assert.ok(!plans[0].date);assert.ok(!plans[0].photos);
inbox=await request(b,'/social/recommendations');assert.equal(inbox.incoming.length,0);await request(b,`/social/recommendations/${rec.id}/accept`,'POST',undefined,409);
// A deleted source still has a safe recommendation snapshot.
const second=await request(a,'/entries','POST',draft(`Другая книга ${stamp}`),201);const rec2=await request(a,'/social/recommendations','POST',{recipientId:b.id,entryId:second.id,note:''},201);await request(a,`/entries/${second.id}`,'DELETE',undefined,204);await request(b,`/social/recommendations/${rec2.id}/accept`,'POST',undefined,201);
// Dismissal is an empty 204 response and immediately leaves the inbox.
const dismissedEntry=await request(a,'/entries','POST',draft(`Совет убрать ${stamp}`),201);
const dismissed=await request(a,'/social/recommendations','POST',{recipientId:b.id,entryId:dismissedEntry.id,note:''},201);
await request(b,`/social/recommendations/${dismissed.id}`,'DELETE',undefined,204);
assert.ok(!(await request(b,'/social/recommendations')).incoming.some(item=>item.id===dismissed.id));
await request(b,`/social/recommendations/${dismissed.id}/accept`,'POST',undefined,409);
// Own companions survive normal editing and remain absent from foreign data.
const own=await request(a,'/entries');assert.equal(own.find(item=>item.id===entry.id).companions[0].name,b.firstName+' '+b.lastName);assert.equal(own.find(item=>item.id===entry.id).companions[1].name,'PRIVATE_COMPANION');safeEntry=await request(a,`/entries/${entry.id}`,'PUT',{...safeEntry,title:entry.title+' edited'});assert.equal(safeEntry.companions.length,2);
// A foreign plan is unavailable without friendship even if its owner enabled plans.
const aPlan=await request(a,'/entries','POST',{id:randomUUID(),type:'book',title:'PRIVATE_PLAN',status:'plan',rating:null,month:null,review:'PRIVATE_PLAN_NOTE'},201);
await request(c,`/social/people/${a.id}/entries/${aPlan.id}/plan`,'POST',undefined,404);profile=await request(c,`/social/people/${a.id}`);assert.ok(!JSON.stringify(profile).includes('PRIVATE_PLAN'));
// Unfriending revokes access and incoming advice, subscriptions remain independent.
const third=await request(a,'/social/recommendations','POST',{recipientId:b.id,entryId:aPlan.id,note:'plan'},201);await request(b,`/social/friends/${a.id}`,'DELETE',undefined,204);profile=await request(b,`/social/people/${a.id}`);assert.equal(profile.canViewPlans,false);assert.equal(profile.entries[0].review,'');inbox=await request(b,'/social/recommendations');assert.equal(inbox.incoming.length,0);await request(b,`/social/recommendations/${third.id}/accept`,'POST',undefined,409);
const people=await request(a,`/social/people?q=${encodeURIComponent(b.handle)}`);assert.equal(people.users.length,1);assert.ok(!JSON.stringify(people).includes(b.email));await request(a,'/social/people?q=a&q=b','GET',undefined,400);
const changed=await request(a,'/auth/profile','PATCH',{firstName:a.firstName,lastName:a.lastName,avatar:null,handle:`social-a-${stamp}`});assert.equal(changed.handle,`social-a-${stamp}`);await request(b,'/auth/profile','PATCH',{firstName:b.firstName,lastName:b.lastName,avatar:null,handle:changed.handle},409);
// Custom categories are copied into the recipient's own namespace.
const categories=await request(a,'/account/categories','POST',{name:`Новая категория ${stamp}`},201);
const custom=categories.categories.find(category=>category.custom&&category.name===`Новая категория ${stamp}`);
const customEntry=await request(a,'/entries','POST',{...draft('Своя находка','custom'),customCategoryId:custom.customCategoryId},201);
const copiedCustom=await request(c,`/social/people/${a.id}/entries/${customEntry.id}/plan`,'POST',undefined,201);
const customOwned=(await request(c,'/entries')).find(entry=>entry.id===copiedCustom.id);assert.notEqual(customOwned.customCategoryId,custom.customCategoryId);assert.equal(customOwned.customCategoryName,custom.name);
const foreignCustom=await request(a,`/social/people/${c.id}`);assert.equal(foreignCustom.entries.length,0,'private plan stays hidden');
await request(a,'/account/categories/book','PATCH',{enabled:false});await request(c,`/social/people/${a.id}/entries/${entry.id}/plan`,'POST',undefined,404);
await request(a,`/social/friends/${a.id}`,'POST',undefined,400);await request(a,`/social/following/${a.id}`,'PUT',undefined,400);
console.log('Social integration passed: three isolated users, privacy, relationships, concurrent deduplication, recommendations, companions, handles.');
