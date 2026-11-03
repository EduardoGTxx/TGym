// @vitest-environment happy-dom
import React, {act} from 'react'
import {createRoot} from 'react-dom/client'
import {beforeEach,afterEach,it,expect,vi} from 'vitest'
import HistoryExerciseRow, {HistoryExerciseDetail,historySetGroups,historyResultUnit} from './HistoryExerciseDetail.jsx'
import {workoutDetailSheet} from '../sheets.jsx'
import {useStore,DEF} from '../store/useStore.js'
import {useUI} from '../store/useUI.js'
import {_setLangState} from '../lib/i18n-core.js'
import {bindUI} from './ui.jsx'

vi.mock('./Media.jsx',()=>({default:({ex})=><div data-media-id={ex.id} data-media-src={ex.img}/>,Thumb:({ex})=><span className="thumb" data-media-id={ex.id}/>}))
let host,root,initialState,initialStored,initialFlush
const entry=()=>({id:'history-custom',n:'Original snapshot',target:{mode:'reps',setScheme:'topback'},sets:[
  {phase:'warmup',w:30,r:6,done:true},{role:'top',w:90.25,r:5,rir:0,done:true},
  {role:'backoff',w:80,r:8,rpe:8.5,done:false},{role:'backoff',w:75,r:7,done:true,type:'dropset',drops:[{w:60,r:6}]},
  {w:70,r:12,done:true,type:'restpause',clusters:[{r:6,restSec:15},{r:4,restSec:15},{r:2,restSec:15}]},
]})
const workout=()=>({id:'history-one',d:'2026-11-02',name:'History routine',unit:'lb',vol:900,bw:185,bwUnit:'lb',entries:[entry()],prs:['history-custom']})
function Sheets(){return useUI(s=>s.sheets).map(sheet=><div role="dialog" key={sheet.id}>{sheet.render(()=>useUI.getState().closeSheet(sheet.id))}</div>)}
const pointer=(type,options={},target=host.querySelector('.history-exercise-row'))=>act(()=>target.dispatchEvent(new PointerEvent(type,{bubbles:true,button:0,pointerId:1,isPrimary:true,clientX:20,clientY:20,...options})))
const advance=ms=>act(()=>vi.advanceTimersByTime(ms))
const state=()=>useStore.getState().S
const mountRow=()=>act(()=>root.render(<><HistoryExerciseRow entry={state().workouts[0].entries[0]} workout={state().workouts[0]} pr/><Sheets/></>))
beforeEach(()=>{
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;vi.useFakeTimers();_setLangState('en');bindUI(useUI)
  initialState=useStore.getState().S;initialStored=localStorage.getItem('gym_state_v1');initialFlush=useStore.getState().flushPersistence
  const S={...structuredClone(DEF),unit:'kg',workouts:[workout()],customEx:[{id:'history-custom',n:'My original exercise',custom:true,img:'data:image/png;base64,eA=='}],exerciseAliases:{'history-custom':'My saved alias'},routines:[{id:'routine',ex:[{id:'history-custom',sets:40,setScheme:'straight'}]}]}
  useStore.setState({S});localStorage.setItem('gym_state_v1',JSON.stringify(S));useUI.setState({sheets:[],toastMsg:''})
  host=document.createElement('div');document.body.append(host);root=createRoot(host)
})
afterEach(()=>{
  act(()=>{root.unmount();useUI.getState().closeAll()});host.remove();vi.restoreAllMocks();useStore.setState({S:initialState,flushPersistence:initialFlush})
  if(initialStored==null)localStorage.removeItem('gym_state_v1');else localStorage.setItem('gym_state_v1',initialStored)
  vi.clearAllTimers();vi.useRealTimers()
})
it('opens only after a full two-second hold and preserves every saved field and storage byte',()=>{
  const before=JSON.stringify(state()),stored=localStorage.getItem('gym_state_v1');mountRow()
  expect(host.querySelector('.history-exercise-row').textContent).toContain('My saved alias')
  expect(host.querySelector('.history-exercise-row').textContent).not.toMatch(/90|Back-off|Set 1/)
  pointer('pointerdown');advance(1999);expect(useUI.getState().sheets).toHaveLength(0)
  advance(1);expect(useUI.getState().sheets).toHaveLength(1)
  expect(host.querySelector('.history-exercise-detail [data-media-id]').dataset.mediaId).toBe('history-custom')
  expect(host.querySelector('.history-exercise-detail h3').textContent).toBe('My saved alias')
  expect([...host.querySelectorAll('[data-set-kind]')].map(group=>group.dataset.setKind)).toEqual(['warmup','top','backoff','work'])
  expect([...host.querySelectorAll('[data-set-index]')].map(row=>row.dataset.setIndex)).toEqual(['0','1','2','3','4'])
  expect(host.querySelector('[data-set-index="2"]').textContent).toContain('Pending')
  expect(host.querySelector('[data-set-index="1"]').textContent).toContain('Failure')
  expect(host.querySelector('[data-set-index="1"]').textContent).toContain('90 lb')
  expect(host.querySelector('[data-set-index="3"]').textContent).toContain('60 lb × 6 reps')
  expect(host.querySelector('[data-set-index="4"]').textContent).toContain('Burst 3')
  expect(host.querySelector('.history-exercise-detail').textContent).not.toContain('kg')
  pointer('pointerup');advance(3000);expect(useUI.getState().sheets).toHaveLength(1)
  act(()=>useUI.getState().closeAll());expect(host.querySelector('.history-exercise-detail')).toBeNull()
  expect(JSON.stringify(state())).toBe(before);expect(localStorage.getItem('gym_state_v1')).toBe(stored)
})
it.each(['pointerup','pointercancel','pointerleave','pointermove','scroll','blur','touchcancel','multitouch','secondary-pointer'])('cancels an incomplete hold on %s without opening another sheet',kind=>{
  mountRow();pointer('pointerdown');advance(1500)
  if(kind==='scroll')act(()=>document.dispatchEvent(new Event('scroll')))
  else if(kind==='blur')act(()=>window.dispatchEvent(new Event('blur')))
  else if(kind==='multitouch'){const event=new Event('touchstart',{bubbles:true});Object.defineProperty(event,'touches',{value:[{},{}]});act(()=>document.dispatchEvent(event))}
  else if(kind==='secondary-pointer')pointer('pointerdown',{pointerId:2,isPrimary:false},window)
  else if(kind==='touchcancel')act(()=>host.querySelector('.history-exercise-row').dispatchEvent(new Event('touchcancel',{bubbles:true})))
  else if(kind==='pointerleave')pointer('pointerout',{relatedTarget:document.body})
  else pointer(kind,kind==='pointermove'?{clientX:29}:{})
  advance(3000);expect(useUI.getState().sheets).toHaveLength(0)
})
it('ignores a short pointer click and permits immediate keyboard/assistive activation exactly once',()=>{
  mountRow();pointer('pointerdown');advance(100);pointer('pointerup')
  act(()=>host.querySelector('.history-exercise-row').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1})))
  expect(useUI.getState().sheets).toHaveLength(0)
  act(()=>host.querySelector('.history-exercise-row').click());expect(useUI.getState().sheets).toHaveLength(1)
  act(()=>host.querySelector('.history-exercise-row').click());expect(useUI.getState().sheets).toHaveLength(1)
})
it('cancels native image dragging even when no pointerup or pointercancel follows',()=>{
  mountRow();const row=host.querySelector('.history-exercise-row'),image=document.createElement('img');row.querySelector('.thumb').append(image)
  pointer('pointerdown');advance(1500)
  const drag=new Event('dragstart',{bubbles:true,cancelable:true});act(()=>image.dispatchEvent(drag))
  expect(drag.defaultPrevented).toBe(true);advance(3000);expect(useUI.getState().sheets).toHaveLength(0)
  // Ordinary pointer movement still belongs to scrolling, without prevention.
  const move=new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:1,clientX:40,clientY:60})
  pointer('pointerdown');act(()=>row.dispatchEvent(move));expect(move.defaultPrevented).toBe(false)
  advance(3000);expect(useUI.getState().sheets).toHaveLength(0)
})
it('also cancels a pending hold when a drag starts outside that exercise row',()=>{
  mountRow();pointer('pointerdown');advance(1500)
  const drag=new Event('dragstart',{bubbles:true,cancelable:true});act(()=>document.dispatchEvent(drag))
  expect(drag.defaultPrevented).toBe(false);advance(3000);expect(useUI.getState().sheets).toHaveLength(0)
})
it('cancels on unmount or when the source sheet becomes inert',()=>{
  mountRow();pointer('pointerdown');advance(1500);act(()=>root.render(null));advance(3000)
  expect(useUI.getState().sheets).toHaveLength(0)
  mountRow();pointer('pointerdown');host.setAttribute('inert','');advance(2000)
  expect(useUI.getState().sheets).toHaveLength(0);host.removeAttribute('inert')
})
it('uses only historical row roles in their saved order, including a phase that overrides legacy warmup',()=>{
  const saved={sets:[{role:'backoff'},{role:'top'},{warmup:true,phase:'work'},{warmup:true},{role:'top'}]}
  expect(historySetGroups(saved).map(group=>group.kind)).toEqual(['backoff','top','work','warmup','top'])
  expect(historySetGroups({sets:[]})).toEqual([])
  expect(historyResultUnit({unit:'kg'},{unit:'lb'},{unit:'lb'},{unit:'lb'})).toBe('kg')
  expect(historyResultUnit({}, {target:{unit:'kg'}}, {unit:'lb'}, {unit:'kg'})).toBe('lb')
})
it('preserves legacy per-side repetitions, partial confirmations, times and cardio without a current target',()=>{
  const saved={id:'deleted',n:'Saved deleted exercise',target:{side:true},sets:[
    {r:16,w:20,unit:'kg',done:false,leftDone:true,rightDone:false},
    {sec:90,leftSec:85,rightSec:92,w:0,done:true},
    {mode:'cardio',min:12.5,speed:8.25,done:true},
  ]}
  const before=structuredClone(saved);act(()=>root.render(<HistoryExerciseDetail entry={saved} workout={state().workouts[0]}/>))
  const rows=host.querySelectorAll('[data-set-index]')
  expect(rows[0].textContent).toContain('20 kg');expect(rows[0].textContent).toContain('Reps8')
  expect(rows[0].textContent).toContain('Left: Completed');expect(rows[0].textContent).toContain('Right: Pending')
  expect(rows[1].textContent).toContain('1:30');expect(rows[1].textContent).toContain('1:25');expect(rows[1].textContent).toContain('1:32')
  expect(rows[2].textContent).toContain('12.5');expect(rows[2].textContent).toContain('8.25')
  expect(host.querySelector('h3').textContent).toBe('Saved deleted exercise');expect(saved).toEqual(before)
})
it('keeps the workout list compact and preserves historical units while editing and cancelling',()=>{
  act(()=>root.render(<Sheets/>));act(()=>workoutDetailSheet(state().workouts[0]))
  const before=JSON.stringify(state()),stored=localStorage.getItem('gym_state_v1')
  expect(host.querySelector('.history-exercise-row')).not.toBeNull()
  expect(host.textContent).toContain('900 lb');expect(host.textContent).toContain('185 lb')
  expect(host.querySelector('.ss')).toBeNull()
  const button=label=>[...host.querySelectorAll('button')].find(node=>node.textContent===label)
  act(()=>button('Edit workout').click())
  expect(host.querySelector('.history-exercise-row')).toBeNull()
  expect(host.querySelector('input[aria-label="Weight (lb)"]')).not.toBeNull()
  expect(host.querySelector('input[aria-label="Weight (kg)"]')).toBeNull()
  act(()=>button('Cancel').click());expect(JSON.stringify(state())).toBe(before);expect(localStorage.getItem('gym_state_v1')).toBe(stored)
})
const exactButton=label=>[...host.querySelectorAll('button')].filter(node=>node.textContent===label).at(-1)
const openEditor=async()=>{
  await act(()=>root.render(<Sheets/>));await act(()=>workoutDetailSheet(state().workouts[0]));await act(()=>exactButton('Edit workout').click())
}
const enterNote=async value=>act(()=>{
  const textarea=host.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(textarea,value);textarea.dispatchEvent(new Event('input',{bubbles:true}))
})
const confirmEdit=async()=>{await act(()=>exactButton('Save changes').click());await act(()=>exactButton('Save changes').click())}
it('refuses to overwrite a workout changed by another source after editing started',async()=>{
  await openEditor();await enterNote('My local draft')
  const external=structuredClone(state());external.workouts[0].entries[0].sets[1].r=9;external.workouts[0].note='Externally saved note'
  await act(()=>useStore.setState({S:external}));localStorage.setItem('gym_state_v1',JSON.stringify(external));const stored=localStorage.getItem('gym_state_v1')
  await confirmEdit()
  expect(state()).toEqual(external);expect(localStorage.getItem('gym_state_v1')).toBe(stored)
  expect(host.querySelector('[role="alert"]').textContent).toContain('changed while you were editing')
  expect(host.querySelector('textarea').value).toBe('My local draft');expect(exactButton('Save changes')).not.toBeNull()
  expect(useUI.getState().toastMsg).not.toBe('Workout updated')
})
it('keeps a quota-failed edit visible and permits one successful retry without false success or duplication',async()=>{
  await openEditor();await enterNote('Quota retry note')
  const before=structuredClone(state()),stored=localStorage.getItem('gym_state_v1'),original=localStorage.setItem.bind(localStorage)
  const failed=vi.spyOn(localStorage,'setItem').mockImplementation((key,value)=>{if(key==='gym_state_v1')throw new DOMException('Quota exceeded','QuotaExceededError');return original(key,value)})
  await confirmEdit()
  expect(state()).toEqual(before);expect(localStorage.getItem('gym_state_v1')).toBe(stored)
  expect(host.querySelector('[role="alert"]').textContent).toContain('Could not save')
  expect(host.querySelector('textarea').value).toBe('Quota retry note');expect(useUI.getState().toastMsg).not.toBe('Workout updated')
  failed.mockRestore();await confirmEdit()
  expect(state().workouts).toHaveLength(1);expect(state().workouts[0].note).toBe('Quota retry note')
  expect(host.querySelector('.history-exercise-row')).not.toBeNull();expect(useUI.getState().toastMsg).toBe('Workout updated')
})
it('waits for the durable mirror, locks the draft during saving, and retries a mirror failure safely',async()=>{
  let rejectMirror
  const first=new Promise((_,reject)=>{rejectMirror=reject}),flush=vi.fn().mockReturnValueOnce(first).mockResolvedValue()
  useStore.setState({flushPersistence:flush});await openEditor();await enterNote('Durable note')
  await confirmEdit()
  expect(state().workouts[0].note).toBe('Durable note');expect(host.querySelector('fieldset').disabled).toBe(true)
  expect(useUI.getState().toastMsg).not.toBe('Workout updated')
  await act(async()=>{rejectMirror(new Error('Native storage unavailable'));await first.catch(()=>{})})
  expect(host.querySelector('fieldset').disabled).toBe(false);expect(host.querySelector('[role="alert"]').textContent).toContain('Could not save')
  await confirmEdit()
  expect(flush).toHaveBeenCalledTimes(2);expect(state().workouts).toHaveLength(1);expect(state().workouts[0].note).toBe('Durable note')
  expect(host.querySelector('.history-exercise-row')).not.toBeNull();expect(useUI.getState().toastMsg).toBe('Workout updated')
})
it('seeds the editor from the latest record at Edit instead of an obsolete mounted draft',async()=>{
  await act(()=>root.render(<Sheets/>));await act(()=>workoutDetailSheet(state().workouts[0]))
  const latest=structuredClone(state());latest.workouts[0].note='Saved before editing';latest.workouts[0].entries[0].sets[1].r=11
  await act(()=>useStore.setState({S:latest}));await act(()=>exactButton('Edit workout').click())
  expect(host.querySelector('textarea').value).toBe('Saved before editing');await confirmEdit()
  expect(state().workouts[0].entries[0].sets[1].r).toBe(11);expect(state().workouts[0].note).toBe('Saved before editing')
})
