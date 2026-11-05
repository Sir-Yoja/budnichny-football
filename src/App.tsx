import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, CircleUserRound, LayoutDashboard, LogIn, LogOut, Menu, Pencil, Plus, Shield, Trophy, Users, X, Trash2, RefreshCw, Image as ImageIcon, Zap } from 'lucide-react';
import { legacyHtml } from './legacyHtml';

type Tab = 'home' | 'rating' | 'admin' | 'account';
type AdminSection = 'overview' | 'players' | 'days' | 'accounts' | 'moderation';

type Engine = Window & {
  players?: any[]; days?: any[]; teams?: any[]; games?: any[]; dayPlayers?: any[];
  sb?: any; loadPlayers?: () => Promise<any>; loadDays?: () => Promise<any>;
  openDay?: (id:number)=>Promise<any>; openEditDay?: (id:number)=>Promise<any>; openPlayer?: (id:number)=>void;
  go?: (id:string)=>void; closeModal?: ()=>void; uploadGameDayImage?: (dayId:number,file:File,oldPath?:string|null)=>Promise<any>; removeGameDayImage?: (path:string)=>Promise<any>;
  playerTotals?: (p:any)=>any; playerRating?: (p:any)=>number; playerDayEntries?: (p:any)=>any[];
  hasNonZeroDayStats?:(rows:any[])=>boolean; matchStatsHaveConsistentTeams?:(rows:any[])=>boolean; dayTotalsMatchMatchStats?:(dayRows:any[],matchRows:any[])=>boolean; aggregateMatchStatRows?:(rows:any[],dayRows?:any[])=>any[]; inspectDayStatsSync?:(gameDayId:number)=>Promise<any>; isDayMatchStatsComplete?:(gameDayId:number,matchRows?:any[])=>Promise<boolean>; syncDayAggregateFromMatchStats?:(gameDayId:number,options?:any)=>Promise<any>;
  renderPlayers?: ()=>void; renderAdmin?: ()=>void;
  getLeagueState?: ()=>{players:any[];days:any[];teams:any[];games:any[];dayPlayers:any[]};
  __leagueIcons?: Record<string,string>;
  teamResultsForDay?:(gameDayId:number,teamId:number,gameList?:any[])=>any;dayRatingForEntry?:(entry:any,gameList?:any[])=>number;
};

const fmtDate=(v:string)=>{ if(!v)return '—'; const d=new Date(`${v}T00:00:00`); return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d); };
const dayName=(v:string)=>{ if(!v)return ''; const d=new Date(`${v}T00:00:00`); return new Intl.DateTimeFormat('ru-RU',{weekday:'long'}).format(d).toUpperCase(); };
const adminTeamName=(team:any)=>{const colors:Record<string,string>={'Пунктуальные':'Белые','Сообразительные':'Тёмные','Красивые':'Красные','Стильные':'Жёлтые'};const name=team?.name||'Команда';return colors[name]?`${name} (${colors[name]})`:name;};
const isNonNegativeInteger=(value:any)=>value!==''&&value!==null&&value!==undefined&&Number.isSafeInteger(Number(value))&&Number(value)>=0;
const dayStatsHaveValues=(rows:any[])=>rows.some(x=>['goals','assists','conceded','own_goals','saves'].some(k=>(Number(x[k])||0)!==0));

export default function App(){
  const frame=useRef<HTMLIFrameElement>(null);
  const [tab,setTab]=useState<Tab>('home');
  const [adminSection,setAdminSection]=useState<AdminSection>('overview');
  const [players,setPlayers]=useState<any[]>([]);
  const [playerAccountBadges,setPlayerAccountBadges]=useState<any[]>([]);
  const [days,setDays]=useState<any[]>([]);
  const [teams,setTeams]=useState<any[]>([]);
  const [games,setGames]=useState<any[]>([]);
  const [dayPlayers,setDayPlayers]=useState<any[]>([]);
  const [session,setSession]=useState<any>(null);
  const [adminVerified,setAdminVerified]=useState(false);
  const [ready,setReady]=useState(false);
  const [loginOpen,setLoginOpen]=useState(false);
  const [editingPlayer,setEditingPlayer]=useState<any|null>(null);
  const [playerProfile,setPlayerProfile]=useState<any|null>(null);
  const [newPlayerOpen,setNewPlayerOpen]=useState(false);
  const [newDayOpen,setNewDayOpen]=useState(false);
  const [dayModal,setDayModal]=useState<number|null>(null);
  const [editDayId,setEditDayId]=useState<number|null>(null);
  const [menu,setMenu]=useState(false);
  const [legacyBackground,setLegacyBackground]=useState<string>('');
  const [icons,setIcons]=useState<Record<string,string>>({});
  const [ratingSort,setRatingSort]=useState('rating');
  const [quickEntryOpen,setQuickEntryOpen]=useState(false);

  const getEngine=()=>frame.current?.contentWindow as Engine|null;
  const refresh=useCallback(async()=>{
    const w=getEngine(); if(!w)return;
    try{
      const bg=w.document ? getComputedStyle(w.document.body).backgroundImage : '';
      if(bg && bg!=='none') setLegacyBackground(bg);
    }catch{}
    try{ await w.loadPlayers?.(); await w.loadDays?.(); }
    catch(e){ console.error(e); }
    try{ if(!w.__leagueIcons) w.renderPlayers?.(); }catch{}
    const state=w.getLeagueState?.();
    setPlayers([...(state?.players||w.players||[])]); setDays([...(state?.days||w.days||[])]); setTeams([...(state?.teams||w.teams||[])]); setGames([...(state?.games||w.games||[])]); setDayPlayers([...(state?.dayPlayers||w.dayPlayers||[])]);
    setIcons({...((w.__leagueIcons||{}) as Record<string,string>)});
    try{const badgeResult=await w.sb?.rpc('get_player_account_badges');if(!badgeResult?.error)setPlayerAccountBadges(badgeResult?.data||[]);else console.warn('Не удалось загрузить отметки аккаунтов игроков:',badgeResult.error);}catch(error){console.warn('Не удалось загрузить отметки аккаунтов игроков:',error);}
    try{
      const current=(await w.sb?.auth.getSession())?.data?.session||null;
      setSession(current);
      if(current){const check=await w.sb?.rpc('is_site_admin');const allowed=!check?.error&&check?.data===true;setAdminVerified(allowed);const legacyButton=w.document?.getElementById('heroAdminBtn');legacyButton?.classList.toggle('admin-visible',allowed);}
      else setAdminVerified(false);
    }catch{setAdminVerified(false)}
    setReady(true);
  },[]);

  const onLoad=()=>{
    const w=getEngine();
    if(w?.sb && !(w as any).__oauthBridgeInstalled){
      (w as any).__oauthBridgeInstalled=true;
      // OAuth returns to the top-level document, while Supabase lives inside srcDoc.
      // Forward the callback payload to the iframe's Supabase client so it can persist the session.
      const restoreOAuthSession=async()=>{
        try{
          const callbackUrl=new URL(window.location.href);
          const hash=new URLSearchParams(callbackUrl.hash.replace(/^#/,''));
          const access_token=hash.get('access_token');
          const refresh_token=hash.get('refresh_token');
          const code=callbackUrl.searchParams.get('code');
          let result:any=null;
          if(access_token&&refresh_token){
            result=await w.sb.auth.setSession({access_token,refresh_token});
          }else if(code){
            result=await w.sb.auth.exchangeCodeForSession(code);
          }
          if(result?.error)throw result.error;
          if(access_token||refresh_token||code){
            callbackUrl.hash='';
            callbackUrl.searchParams.delete('code');
            window.history.replaceState({},document.title,callbackUrl.pathname+callbackUrl.search);
            await refresh();
          }
        }catch(error){console.error('Не удалось восстановить сессию после OAuth:',error);}
      };
      const hasOAuthPayload=window.location.hash.includes('access_token=')||new URLSearchParams(window.location.search).has('code');
      if(hasOAuthPayload)void restoreOAuthSession();
      const authListener=w.sb.auth.onAuthStateChange((_event:any,nextSession:any)=>{
        setSession(nextSession||null);
        if(!nextSession)setAdminVerified(false);
        window.setTimeout(()=>{void refresh();},0);
      });
      (w as any).__authSubscription=authListener?.data?.subscription;
    }
    if(w?.document && !(w as any).__compactDayPlayersInstalled){
      const doc=w.document;
      const originalRenderTeams=(w as any).renderTeamEditors;
      if(typeof originalRenderTeams==='function'){
        (w as any).renderTeamEditors=function(...args:any[]){
          const previous=Array.from(doc.querySelectorAll('#teamEditors .team-editor')).map((card:any,index:number)=>{
            const name=(card.querySelector('.team-name') as HTMLInputElement|null)?.value||String(index);
            const selected=Array.from(card.querySelectorAll('input[type="checkbox"][data-player]:checked')).map((x:any)=>String(x.dataset.player));
            return {name,selected};
          });
          const result=originalRenderTeams.apply(this,args);
          const cards=Array.from(doc.querySelectorAll('#teamEditors .team-editor')) as HTMLElement[];
          cards.forEach((card,index)=>{
            const name=(card.querySelector('.team-name') as HTMLInputElement|null)?.value||String(index);
            const saved=previous.find((x:any)=>x.name===name)||previous[index];
            if(!saved)return;
            card.querySelectorAll('input[type="checkbox"][data-player]').forEach((x:any)=>{x.checked=saved.selected.includes(String(x.dataset.player));});
          });
          const refreshPickers=()=>{
            const all=Array.from(doc.querySelectorAll('#teamEditors .team-editor')) as HTMLElement[];
            const assigned=new Set<string>();
            all.forEach(card=>card.querySelectorAll('input[type="checkbox"][data-player]:checked').forEach((x:any)=>assigned.add(String(x.dataset.player))));
            all.forEach(card=>{
              const list=card.querySelector('.players-list') as HTMLElement|null;
              if(!list)return;
              const checks=Array.from(list.querySelectorAll('input[type="checkbox"][data-player]')) as HTMLInputElement[];
              if(!checks.length)return;
              list.style.display='none';
              card.querySelector('.compact-player-picker')?.remove();
              const picker=doc.createElement('div');
              picker.className='compact-player-picker';
              picker.style.cssText='display:grid;gap:9px;margin:10px 0 2px;';
              const label=doc.createElement('label');
              label.textContent='Добавить игрока в команду';
              label.style.cssText='display:block;font-size:13px;color:#aebdc7;';
              const select=doc.createElement('select');
              select.style.cssText='width:100%;min-height:44px;padding:10px 12px;border:1px solid rgba(255,255,255,.14);border-radius:9px;background:#0b1118;color:#edf2f5;font:inherit;';
              const placeholder=doc.createElement('option');
              placeholder.value='';
              placeholder.textContent='Выбрать игрока…';
              select.appendChild(placeholder);
              checks.forEach(input=>{
                const id=String(input.dataset.player);
                const labelText=(input.closest('label')?.textContent||'').trim();
                const option=doc.createElement('option');
                option.value=id;
                option.textContent=labelText;
                option.disabled=assigned.has(id);
                if(input.checked)option.disabled=true;
                select.appendChild(option);
              });
              select.onchange=()=>{
                const id=select.value;
                if(!id)return;
                const target=checks.find(x=>String(x.dataset.player)===id);
                if(target){target.checked=true;target.dispatchEvent(new w.Event('change',{bubbles:true}));}
                refreshPickers();
              };
              picker.appendChild(label);
              picker.appendChild(select);
              const selected=doc.createElement('div');
              selected.style.cssText='display:flex;flex-wrap:wrap;gap:7px;';
              checks.filter(x=>x.checked).forEach(input=>{
                const item=doc.createElement('span');
                item.style.cssText='display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid rgba(255,255,255,.13);border-radius:8px;background:rgba(255,255,255,.045);font-size:13px;color:#edf2f5;';
                const name=(input.closest('label')?.textContent||'').trim();
                const text=doc.createElement('span');text.textContent=name;
                const remove=doc.createElement('button');
                remove.type='button';remove.textContent='×';
                remove.title='Убрать из команды';
                remove.style.cssText='border:0;background:transparent;color:#f0a3a3;font-size:18px;line-height:1;cursor:pointer;padding:0 2px;';
                remove.onclick=()=>{input.checked=false;input.dispatchEvent(new w.Event('change',{bubbles:true}));refreshPickers();};
                item.append(text,remove);selected.appendChild(item);
              });
              picker.appendChild(selected);
              card.insertBefore(picker,list);
            });
            // Подписываем цвета только в административных списках; значения команд не меняются.
            const colorNames:Record<string,string>={'Пунктуальные':'Белые','Сообразительные':'Тёмные','Красивые':'Красные','Стильные':'Жёлтые'};
            ['#teamEditors','#gameEditors'].forEach(selector=>{
              doc.querySelectorAll(selector+' select option').forEach((option:any)=>{
                const extra=colorNames[String(option.value)];
                if(extra&&!String(option.textContent).includes('('))option.textContent=String(option.textContent).trim()+' ('+extra+')';
              });
            });
          };
          refreshPickers();
          return result;
        };
      }
      (w as any).__compactDayPlayersInstalled=true;
    }
    if(w?.sb && !(w as any).__secureAdminUi){
      const requireAdmin=async()=>{
        const check=await w.sb.rpc('is_site_admin');
        if(check.error||check.data!==true)throw new Error('Для этого действия нужна подтверждённая сессия администратора.');
      };
      // Gate legacy iframe entry points as a second UI layer. Supabase RLS remains the security boundary.
      if(w.renderAdmin){
        const original=w.renderAdmin.bind(w);
        w.renderAdmin=async()=>{
          try{await requireAdmin();}catch{
            const box=w.document?.getElementById('adminContent');
            if(box)box.innerHTML='<h2>Доступ ограничен</h2><p>Требуется подтверждённая учётная запись администратора.</p>';
            return;
          }
          return original();
        };
      }
      for(const name of ['saveDay','saveEditDay','deletePlayer','deleteGameDay','saveQuickEntry','quickSave']){
        const fn=(w as any)[name];
        if(typeof fn==='function' && !(fn as any).__adminGuarded){
          const guarded=async(...args:any[])=>{
            await requireAdmin();
            if(name!=='saveDay')return fn(...args);
            // saveDay historically navigated the iframe to the legacy "days" screen
            // before notifying React. Keep the iframe on the modal until the parent refreshes.
            const originalGo=(w as any).go;
            (w as any).go=function(id:string,...goArgs:any[]){
              if(String(id)==='days')return;
              return originalGo?.call(w,id,...goArgs);
            };
            try{return await fn(...args);}
            finally{(w as any).go=originalGo;}
          };
          (guarded as any).__adminGuarded=true;
          (w as any)[name]=guarded;
        }
      }
      (w as any).__secureAdminUi=true;
    }
    setTimeout(refresh,250);
  };
  useEffect(()=>{const handler=(event:MessageEvent)=>{if(event.source!==frame.current?.contentWindow)return;if(event.data?.type==="budnichny-day-created"){setDayModal(null);setAdminSection("days");refresh();}else if(event.data?.type==="budnichny-edit-day"){const id=Number(event.data.id);if(Number.isSafeInteger(id)&&id>0){setPlayerProfile(null);setDayModal(null);setTab("admin");setAdminSection("days");setEditDayId(id);}}};window.addEventListener("message",handler);return()=>window.removeEventListener("message",handler);},[refresh]);
  // Не опрашиваем Supabase каждые 2,5 секунды: это создавало постоянную сетевую
  // нагрузку и лишние перерисовки. Обновляем данные при возвращении пользователя
  // на вкладку, но не чаще одного раза в 30 секунд. Действия записи по-прежнему
  // вызывают refresh() напрямую и не зависят от этого ограничения.
  const lastAutoRefresh=useRef(0);
  useEffect(()=>{
    const refreshIfStale=()=>{
      if(document.visibilityState!=='visible')return;
      const now=Date.now();
      if(now-lastAutoRefresh.current<30000)return;
      lastAutoRefresh.current=now;
      if(getEngine()?.getLeagueState && getEngine()?.sb)void refresh();
    };
    document.addEventListener('visibilitychange',refreshIfStale);
    window.addEventListener('pageshow',refreshIfStale);
    window.addEventListener('focus',refreshIfStale);
    return()=>{
      document.removeEventListener('visibilitychange',refreshIfStale);
      window.removeEventListener('pageshow',refreshIfStale);
      window.removeEventListener('focus',refreshIfStale);
    };
  },[refresh]);

  const openDay=(id:number)=>{ setPlayerProfile(null); setDayModal(id); setTimeout(()=>getEngine()?.openDay?.(id),80); };
  const openEdit=(id:number)=>{ setPlayerProfile(null); setDayModal(null); setEditDayId(id); };
  const openProfile=(id:number)=>{ const p=players.find(x=>x.id===id); if(p) setPlayerProfile(p); };
  const closeLegacyModal=()=>{ getEngine()?.closeModal?.(); setDayModal(null); refresh(); };
  const closeEditModal=()=>{ setEditDayId(null); document.body.style.overflow=''; };
  const openAddGameDay=()=>{setNewDayOpen(true);};

  useEffect(()=>{
    const w=getEngine(); const doc=w?.document; if(!doc)return;
    const id='modern-editor-bridge';
    doc.getElementById(id)?.remove();
    if(dayModal!==null){
      document.body.style.overflow='hidden';
      const style=doc.createElement('style'); style.id=id;
      const bg = (()=>{try{return getComputedStyle(doc.body).backgroundImage}catch{return ''}})();
      style.textContent=`
        html,body{margin:0!important;padding:0!important;background:transparent!important;overflow:hidden!important;font-family:'Manrope',Arial,sans-serif!important;color:#eef3f7!important;} body:before{content:'';position:fixed;inset:0;z-index:-1;background-image:${bg && bg!=='none' ? bg : 'none'};background-size:cover;background-position:center top;background-attachment:fixed;opacity:1;pointer-events:none!important;}
        body>header,body>main{display:none!important;}
        #modal{display:flex!important;position:fixed!important;inset:0!important;z-index:99999!important;background:rgba(2,9,14,.86)!important;backdrop-filter:blur(8px)!important;align-items:flex-start!important;justify-content:center!important;padding:20px!important;overflow-y:auto!important;overflow-x:hidden!important;box-sizing:border-box!important;}
        #modal.hidden{display:flex!important;}
        #modal .modalbox{width:min(1180px,100%)!important;max-width:1180px!important;min-width:0!important;max-height:calc(100dvh - 40px)!important;overflow-y:auto!important;overflow-x:hidden!important;margin:0 auto!important;background:#0d1e28!important;border:1px solid rgba(255,255,255,.13)!important;border-radius:18px!important;padding:26px!important;color:#edf2f5!important;box-sizing:border-box!important;scrollbar-gutter:stable!important;}
        #modal .modalbox>.close{display:none!important;}
        #modal .player-stats-line{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important;}
        #modal .stat-chip{min-width:0!important;padding:13px!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:12px!important;background:rgba(255,255,255,.035)!important;font-size:15px!important;display:flex!important;align-items:center!important;gap:7px!important;}
        #modal .history-table{min-width:900px!important;}
        @media(max-width:700px){#modal .player-stats-line{grid-template-columns:repeat(2,minmax(0,1fr))!important;}#modal .stat-chip{font-size:14px!important;padding:10px!important;}#modal .history-table{min-width:760px!important;}}

        #modalContent,#modalContent>.form{width:100%!important;max-width:none!important;min-width:0!important;box-sizing:border-box!important;}
        #modalContent{font-family:'Manrope',Arial,sans-serif!important;font-size:16px!important;}
        #modalContent h2{font-size:30px!important;line-height:1.15!important;margin:0!important;}
        #modalContent h3{font-size:20px!important;line-height:1.25!important;}
        #modalContent .note{font-size:15px!important;line-height:1.5!important;}
        #modalContent .field label,#modalContent .section-block>h3{font-size:15px!important;}
        #modal input,#modal select,#modal textarea{max-width:100%!important;min-width:0!important;width:100%!important;box-sizing:border-box!important;font-family:'Manrope',Arial,sans-serif!important;font-size:15px!important;}
        #modal input,#modal select{min-height:44px!important;padding:10px 12px!important;}
        #modal img{max-width:100%!important;height:auto!important;}
        #modal .image-preview{width:100%!important;max-width:100%!important;overflow:hidden!important;border-radius:12px!important;}
        #modal .image-preview img{display:block!important;width:100%!important;max-width:100%!important;height:auto!important;object-fit:contain!important;}
        #modal .section-block{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important;overflow:visible!important;}
        #modal .edit-day-form{display:grid!important;gap:18px!important;width:100%!important;min-width:0!important;}
        #modal .edit-day-form>.grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;width:100%!important;min-width:0!important;}
        #modal .team-editor{width:100%!important;min-width:0!important;box-sizing:border-box!important;padding:12px!important;}
        #modal .team-editor-head{display:grid!important;grid-template-columns:minmax(0,1fr) 64px!important;gap:10px!important;width:100%!important;min-width:0!important;}
        #modal .team-editor-head input[type=color]{width:64px!important;padding:3px!important;}
        #modal .game-head{display:grid!important;grid-template-columns:minmax(0,1fr) 78px 78px minmax(0,1fr) 42px!important;gap:8px!important;align-items:center!important;font-size:12px!important;color:#8fa1ad!important;}
        #modal .game-row{display:grid!important;grid-template-columns:minmax(0,1fr) 78px 78px minmax(0,1fr) 42px!important;gap:8px!important;align-items:center!important;width:100%!important;min-width:0!important;box-sizing:border-box!important;}
        #modal .game-row select,#modal .game-row input{width:100%!important;min-width:0!important;}
        #modal .game-row .btn{min-width:42px!important;width:42px!important;padding:9px 4px!important;}
        #modal #editDayPlayers{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;width:100%!important;min-width:0!important;overflow:visible!important;}
        #modal #editDayPlayers .player-edit-row{display:grid!important;grid-template-columns:minmax(260px,300px) minmax(0,1fr)!important;gap:14px!important;align-items:stretch!important;width:100%!important;min-width:0!important;padding:12px 0!important;margin:0!important;box-sizing:border-box!important;}
        #modal #editDayPlayers .player-edit-main{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(150px,1fr)!important;gap:10px!important;align-items:center!important;min-width:0!important;width:100%!important;}
        #modal #editDayPlayers .player-edit-name{font-size:16px!important;line-height:1.25!important;color:#f4f7fa!important;min-width:0!important;overflow-wrap:anywhere!important;}
        #modal #editDayPlayers .player-edit-main select{font-size:15px!important;min-height:44px!important;}
        #modal #editDayPlayers .edit-stats-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(2,76px)!important;gap:8px!important;width:100%!important;min-width:0!important;box-sizing:border-box!important;}
        #modal #editDayPlayers .edit-stats-grid>*{width:100%!important;min-width:0!important;min-height:76px!important;height:76px!important;box-sizing:border-box!important;}
        #modal #editDayPlayers .stat-input{display:grid!important;grid-template-rows:22px 44px!important;gap:6px!important;min-width:0!important;}
        #modal #editDayPlayers .stat-input .ui-label,#modal #editDayPlayers .gp-box>span{display:flex!important;align-items:center!important;gap:5px!important;font-size:13px!important;line-height:1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:#aebbc7!important;}
        #modal #editDayPlayers .ui-label img,#modal #editDayPlayers .ui-label svg{width:20px!important;height:20px!important;flex:0 0 auto!important;}
        #modal #editDayPlayers .stat-input input[type=number]{width:100%!important;height:44px!important;min-height:44px!important;font-size:17px!important;font-weight:700!important;}
        #modal #editDayPlayers .gp-box{display:grid!important;grid-template-rows:22px 44px!important;gap:6px!important;padding:9px 10px!important;background:#0b1016!important;border:1px solid var(--line)!important;border-radius:8px!important;box-sizing:border-box!important;align-content:stretch!important;}
        #modal #editDayPlayers .gp-box>b{display:flex!important;align-items:center!important;height:44px!important;font-size:20px!important;line-height:1!important;color:#f3f6fa!important;transform:none!important;margin:0!important;}
        #modal #editDayPlayers .rating-preview>b{color:#f0c74d!important;}
        #modal #editDayPlayers .gk-stat{display:block!important;min-width:0!important;}
        #modal #editDayPlayers .gk-stat .gk-toggle{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;width:100%!important;min-height:44px!important;padding:9px 12px!important;border:1px solid rgba(212,168,74,.45)!important;border-radius:10px!important;background:rgba(207,184,66,.06)!important;color:#dfe8ec!important;font:700 14px 'Manrope',Arial,sans-serif!important;cursor:pointer!important;box-sizing:border-box!important;transition:.16s ease!important;}
        #modal #editDayPlayers .gk-stat .gk-toggle:hover{border-color:rgba(212,168,74,.75)!important;background:rgba(207,184,66,.10)!important;}
        #modal #editDayPlayers .gk-stat .gk-toggle.active{border-color:#cfb842!important;background:rgba(207,184,66,.16)!important;box-shadow:0 0 0 1px rgba(207,184,66,.15)!important;color:#fff!important;}
        #modal #editDayPlayers .gk-stat .gk-toggle .gk-toggle-icon{width:22px!important;height:22px!important;object-fit:contain!important;display:block!important;flex:0 0 22px!important;}
        #modal #editDayPlayers .gk-stat input[type=checkbox]{position:absolute!important;opacity:0!important;width:1px!important;height:1px!important;pointer-events:none!important;}
        #modal .save-panel{position:sticky!important;bottom:0!important;z-index:30!important;display:flex!important;align-items:center!important;gap:12px!important;padding:12px!important;margin-top:6px!important;background:linear-gradient(180deg,rgba(13,30,40,.82),rgba(13,30,40,1))!important;border-top:1px solid rgba(255,255,255,.10)!important;backdrop-filter:blur(8px)!important;}
        #modal .save-panel .btn{min-height:46px!important;font-size:15px!important;}
        #modal .save-panel span{font-size:13px!important;color:#91a1ad!important;line-height:1.35!important;}
        @media(max-width:900px){
          #modal{padding:12px!important;}
          #modal .modalbox{max-height:calc(100dvh - 24px)!important;border-radius:16px!important;padding:20px!important;}
          #modal .edit-day-form>.grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;}
          #modal #editDayPlayers .player-edit-row{grid-template-columns:1fr!important;gap:10px!important;}
          #modal #editDayPlayers .edit-stats-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(2,72px)!important;}
          #modal #editDayPlayers .edit-stats-grid>*{min-height:72px!important;height:72px!important;}
          #modal #editDayPlayers .stat-input{grid-template-rows:20px 42px!important;}
          #modal #editDayPlayers .stat-input input[type=number]{height:42px!important;min-height:42px!important;}
          #modal #editDayPlayers .gp-box{grid-template-rows:20px 42px!important;}
          #modal #editDayPlayers .gp-box>b{height:42px!important;}
        }
        @media(max-width:600px){
          #modal{padding:7px!important;}
          #modal .modalbox{width:100%!important;max-width:none!important;max-height:calc(100dvh - 14px)!important;border-radius:14px!important;padding:16px 12px 18px!important;}
          #modalContent h2{font-size:25px!important;}
          #modalContent h3{font-size:18px!important;}
          #modalContent .note{font-size:14px!important;}
          #modal .edit-day-form>.grid{grid-template-columns:1fr!important;gap:9px!important;}
          #modal .team-editor-head{grid-template-columns:minmax(0,1fr) 56px!important;}
          #modal .team-editor-head input[type=color]{width:56px!important;}
          #modal .game-head{display:none!important;}
          #modal .game-row{grid-template-columns:minmax(0,1fr) 48px 48px minmax(0,1fr) 38px!important;gap:5px!important;}
          #modal .game-row select,#modal .game-row input{font-size:13px!important;padding:8px 5px!important;min-height:42px!important;}
          #modal #editDayPlayers .player-edit-main{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px!important;}
          #modal #editDayPlayers .edit-stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-rows:repeat(4,68px)!important;gap:8px!important;}
          #modal #editDayPlayers .edit-stats-grid>*{min-height:68px!important;height:68px!important;}
          #modal #editDayPlayers .stat-input{grid-template-rows:19px 41px!important;gap:5px!important;}
          #modal #editDayPlayers .stat-input .ui-label,#modal #editDayPlayers .gp-box>span{font-size:12px!important;}
          #modal #editDayPlayers .stat-input input[type=number]{height:41px!important;min-height:41px!important;font-size:16px!important;}
          #modal #editDayPlayers .gp-box{grid-template-rows:19px 41px!important;gap:5px!important;padding:8px!important;}
          #modal #editDayPlayers .gp-box>b{height:41px!important;font-size:19px!important;}
          #modal .save-panel{align-items:flex-start!important;flex-direction:column!important;}
          #modal .save-panel .btn{width:100%!important;}
          #modal .save-panel span{font-size:12px!important;}
        }
        @media(max-width:430px){
          #modal{padding:4px!important;}
          #modal .modalbox{max-height:calc(100dvh - 8px)!important;padding:13px 9px 16px!important;}
          #modal #editDayPlayers .player-edit-main{grid-template-columns:1fr!important;}
          #modal .game-row{grid-template-columns:minmax(0,1fr) 48px 48px minmax(0,1fr) 34px!important;gap:4px!important;}
        }

        /* V7 mobile hard-fix: редактор не должен иметь горизонтального скролла или обрезанных колонок. */
        @media(max-width:700px){
          #modal, #modalContent, #modalContent *{max-width:100%!important;}
          #modalContent{overflow-x:hidden!important;overscroll-behavior-x:none!important;}
          #modal #editDayPlayers{overflow-x:hidden!important;overflow-y:visible!important;width:100%!important;max-width:100%!important;}
          #modal #editDayPlayers .player-edit-row{
            display:grid!important;
            grid-template-columns:1fr!important;
            grid-template-rows:auto!important;
            width:100%!important;
            max-width:100%!important;
            min-width:0!important;
            overflow:hidden!important;
          }
          #modal #editDayPlayers .player-edit-row > *{
            grid-column:1!important;
            grid-row:auto!important;
            width:100%!important;
            max-width:100%!important;
            min-width:0!important;
          }
          #modal #editDayPlayers .player-edit-main{
            display:grid!important;
            grid-template-columns:minmax(0,1fr)!important;
            width:100%!important;
            max-width:100%!important;
            min-width:0!important;
          }
          #modal #editDayPlayers .edit-stats-grid{
            display:grid!important;
            grid-template-columns:repeat(2,minmax(0,1fr))!important;
            grid-auto-flow:row!important;
            grid-template-rows:none!important;
            width:100%!important;
            max-width:100%!important;
            min-width:0!important;
            overflow:visible!important;
          }
          #modal #editDayPlayers .edit-stats-grid > *{
            grid-column:auto!important;
            grid-row:auto!important;
            width:100%!important;
            max-width:100%!important;
            min-width:0!important;
          }
          #modal #editDayPlayers .stat-input,
          #modal #editDayPlayers .gp-box{
            width:100%!important;
            max-width:100%!important;
            min-width:0!important;
            overflow:hidden!important;
          }
          #modal #editDayPlayers .ui-label,
          #modal #editDayPlayers .gp-box span{
            white-space:normal!important;
            overflow-wrap:anywhere!important;
            word-break:break-word!important;
          }
          #modal #editDayPlayers input,
          #modal #editDayPlayers select{
            width:100%!important;
            max-width:100%!important;
            min-width:0!important;
          }
        }
        @media(max-width:360px){
          #modal #editDayPlayers .edit-stats-grid{grid-template-columns:1fr!important;}
        }
      `;
      doc.head.appendChild(style);
    }else{
      document.body.style.overflow='';
    }
    return ()=>{ doc.getElementById(id)?.remove(); document.body.style.overflow=''; };
  },[dayModal]);

  const waitForEngine=async(timeoutMs=10000)=>{
    const started=Date.now();
    while(Date.now()-started<timeoutMs){
      const w=getEngine();
      if(w?.sb?.auth) return w;
      await new Promise(r=>setTimeout(r,150));
    }
    throw new Error('Модуль авторизации ещё не загрузился. Обновите страницу и попробуйте снова.');
  };

  const login=async(email:string,password:string)=>{
    const cleanEmail=email.trim();
    if(!cleanEmail || !password) throw new Error('Введите email и пароль.');
    const w=await waitForEngine();
    const r=await w.sb!.auth.signInWithPassword({email:cleanEmail,password});
    if(r.error){
      const msg=String(r.error.message||'');
      if(/invalid login credentials/i.test(msg)) throw new Error('Неверный email или пароль.');
      if(/email not confirmed/i.test(msg)) throw new Error('Email администратора не подтверждён в Supabase.');
      throw new Error(msg||'Не удалось войти в админку.');
    }
    setSession(r.data?.session||null);setAdminVerified(false);
    const sent=await w.sb!.functions.invoke('admin-email-code',{body:{action:'send'}});
    if(sent.error||sent.data?.error)throw new Error(sent.data?.error||sent.error?.message||'Не удалось отправить код на Email.');
    setAdminSection('overview');
  };
  const verifyAdminCode=async(code:string)=>{
    const w=await waitForEngine();
    const result=await w.sb!.functions.invoke('admin-email-code',{body:{action:'verify',code}});
    if(result.error||result.data?.error)throw new Error(result.data?.error||result.error?.message||'Не удалось подтвердить код.');
    const check=await w.sb!.rpc('is_site_admin');
    if(check.error||check.data!==true)throw new Error('Код принят, но база не подтвердила права администратора. Обнови страницу и попробуй снова.');
    setAdminVerified(true);setLoginOpen(false);await refresh();
  };
  const logout=async()=>{await getEngine()?.sb?.auth.signOut();setSession(null);setAdminVerified(false);};
  const addPlayer=async(name:string,position:string='',gk:boolean=false)=>{const w=getEngine(); const r=await w?.sb?.from('players').insert({name,position:position||null,is_goalkeeper:gk}).select().single(); if(r?.error)throw r.error; await refresh();setNewPlayerOpen(false);};
  const updatePlayer=async(p:any)=>{const w=getEngine();const r=await w?.sb?.from('players').update({name:p.name,position:p.position||null,is_goalkeeper:!!p.is_goalkeeper}).eq('id',p.id).select().single();if(r?.error)throw r.error;await refresh();setEditingPlayer(null);};
  const deletePlayer=async(id:number)=>{
    if(!confirm('Удалить игрока и всю его статистику, в том числе по отдельным матчам?'))return;
    const w=getEngine();if(!w?.sb){alert('Нет подключения к базе данных.');return;}
    try{
      const m=await w.sb.from('game_player_stats').delete().eq('player_id',id);if(m.error)throw m.error;
      const a=await w.sb.from('game_day_players').delete().eq('player_id',id);if(a.error)throw a.error;
      const r=await w.sb.from('players').delete().eq('id',id);if(r.error)throw r.error;
      await refresh();
    }catch(e:any){try{await refresh();}catch{}alert(`Не удалось полностью удалить игрока: ${e?.message||'ошибка базы данных'}. Проверь связанные записи — операции удаления в базе не являются одной транзакцией.`);}
  };
  const deleteGameDay=async(id:number)=>{
    const day=days.find((d:any)=>String(d.id)===String(id));
    if(!day)return;
    if(!confirm(`Удалить игровой день ${fmtDate(day.game_date)}${day.place?' · '+day.place:''}? Все матчи, команды и статистика этого дня будут удалены. Это действие нельзя отменить.`))return;
    const w=getEngine(); if(!w?.sb) { alert('Нет подключения к базе данных.'); return; }
    try{
      let r=await w.sb.from('game_player_stats').delete().eq('game_day_id',id); if(r.error)throw r.error;
      r=await w.sb.from('game_day_players').delete().eq('game_day_id',id); if(r.error)throw r.error;
      r=await w.sb.from('games').delete().eq('game_day_id',id); if(r.error)throw r.error;
      r=await w.sb.from('teams').delete().eq('game_day_id',id); if(r.error)throw r.error;
      r=await w.sb.from('game_days').delete().eq('id',id); if(r.error)throw r.error;
      await refresh();
      if(day.image_path){try{await w.removeGameDayImage?.(day.image_path);}catch(e:any){alert('Игровой день удалён, но файл изображения остался в хранилище: '+(e?.message||'ошибка удаления файла'));}}
    }catch(e:any){try{await refresh();}catch{}alert('Не удалось полностью удалить игровой день: '+(e?.message||'неизвестная ошибка')+'. Проверь состояние связанных записей перед повторной попыткой.');}
  };

  const stats=useMemo(()=>({players:players.length,days:days.length,games:games.length,participants:dayPlayers.length}),[players,days,games,dayPlayers]);
  const rating=useMemo(()=>players.map(p=>{
    const w=getEngine();
    const totals=w?.playerTotals?.(p);
    const entries=dayPlayers.filter((x:any)=>String(x.player_id)===String(p.id));
    // Count distinct played dates, not match count or duplicate stat rows.
    const playedDays=new Set(entries.map((x:any)=>String(x.game_day_id))).size;
    const s={...(totals||{goals:0,assists:0,gp:0,saves:0,conceded:0,ownGoals:0,rating:5}),days:playedDays};
    return {p,s};
  }).sort((a,b)=>(b.s.rating||0)-(a.s.rating||0)),[players,dayPlayers,games,teams,days,ready]);

  return <div className="app" style={legacyBackground ? {backgroundImage: legacyBackground} : undefined}>
    <iframe ref={frame} onLoad={onLoad} className={dayModal!==null ? "engine editor-visible" : "engine"} title="data-engine" srcDoc={legacyHtml}/>
    <header className="topbar">
      <div className="brand" onClick={()=>{setTab('home');setMenu(false)}}><span className="brand-ball">⚽</span><div><b>БУДНИЧНЫЙ ФУТБОЛ</b><small>Панель лиги</small></div></div>
      <nav className={menu?'nav open':'nav'}>
        <button className={tab==='home'?'active':''} onClick={()=>{setTab('home');setMenu(false)}}>Игровые дни</button>
        <button className={tab==='rating'?'active':''} onClick={()=>{setTab('rating');setMenu(false)}}>Рейтинг</button>
         <button className={tab==='account'?'active':''} onClick={()=>{setTab('account');setMenu(false)}}><CircleUserRound size={16}/> {session?'Кабинет':'Войти'}</button>
        <button className={tab==='admin'?'active':''} onClick={()=>{setTab('admin');setMenu(false)}}><Shield size={16}/> Админка</button>
      </nav>
      <button className="mobile-menu" onClick={()=>setMenu(v=>!v)}><Menu/></button>
    </header>

    <main className="content">
      {tab==='home' && <Home days={days} teams={teams} dayPlayers={dayPlayers} games={games} onOpen={openDay} ready={ready}/>} 
      {tab==='rating' && <Rating rows={rating} icons={icons} playerBadges={playerAccountBadges} sort={ratingSort} setSort={setRatingSort} onPlayer={openProfile}/>}
      {tab==='account' && <AccountPage session={session} adminVerified={adminVerified} players={players} days={days} games={games} teams={teams} dayPlayers={dayPlayers} icons={icons} engine={getEngine()} onLoginSocial={async(provider)=>{const w=await waitForEngine();const result=await w.sb!.auth.signInWithOAuth({provider:provider as any,options:{redirectTo:window.location.origin+window.location.pathname,skipBrowserRedirect:true}});if(result.error)throw result.error;const authUrl=result.data?.url;if(!authUrl)throw new Error('Supabase не вернул ссылку для входа через Telegram.');window.location.assign(authUrl);}} onRefresh={refresh}/>} 
      {tab==='admin' && <Admin session={session} verified={adminVerified} stats={stats} section={adminSection} setSection={setAdminSection} onLogin={()=>setLoginOpen(true)} onLogout={logout} players={players} days={days} teams={teams} games={games} dayPlayers={dayPlayers} onAdd={()=>setNewPlayerOpen(true)} onEdit={setEditingPlayer} onDelete={deletePlayer} onOpenDay={openDay} onEditDay={openEdit} onQuickEntry={()=>setQuickEntryOpen(true)} onRefresh={refresh} onAddDay={openAddGameDay} onDeleteDay={deleteGameDay} engine={getEngine()}/>} 
    </main>

    {loginOpen && <LoginModal onClose={()=>setLoginOpen(false)} onLogin={login} onVerify={verifyAdminCode}/>} 
    {newPlayerOpen && <PlayerModal onClose={()=>setNewPlayerOpen(false)} onSave={addPlayer}/>}
    {newDayOpen && <CreateGameDayModal engine={getEngine()} onClose={()=>setNewDayOpen(false)} onSaved={async(createdDay)=>{setDays(prev=>[createdDay,...prev.filter(d=>String(d.id)!==String(createdDay.id))]);setTab('home');await refresh();setDays(prev=>[createdDay,...prev.filter(d=>String(d.id)!==String(createdDay.id))]);}}/>}
    {editingPlayer && <PlayerModal player={editingPlayer} onClose={()=>setEditingPlayer(null)} onSave={updatePlayer}/>}
    {playerProfile && <PlayerProfileModal player={playerProfile} days={days} teams={teams} dayPlayers={dayPlayers} icons={icons} engine={getEngine()} onClose={()=>setPlayerProfile(null)}/>}
    {dayModal!==null && <div className="legacy-modal-shell"><button className="shell-close" onClick={closeLegacyModal} aria-label="Закрыть окно"><X/></button></div>}
    {quickEntryOpen && session && <QuickEntryModal players={players} days={days} teams={teams} games={games} dayPlayers={dayPlayers} icons={icons} engine={getEngine()} onClose={()=>setQuickEntryOpen(false)} onSaved={async()=>{await refresh();}}/>}
    {editDayId!==null && <EditDayModal dayId={editDayId} players={players} days={days} teams={teams} games={games} dayPlayers={dayPlayers} icons={icons} engine={getEngine()} onClose={closeEditModal} onSaved={async()=>{setEditDayId(null);await refresh();}}/>}
  </div>;
}

function Home({days,teams,dayPlayers,games,onOpen,ready}:{days:any[];teams:any[];dayPlayers:any[];games:any[];onOpen:(id:number)=>void;ready:boolean}){
 return <section className="page">
   <div className="hero hero-public"><div className="hero-inner">
     <h1 className="hero-main-title" data-text="БУДНИЧНЫЙ ФУТБОЛ"><span>БУДНИЧНЫЙ</span><span>ФУТБОЛ</span></h1>
     <p className="hero-tagline">Не важно, какой уровень. Главное — чтобы соперник был хуже.</p>
   </div></div>
   {!ready?<div className="loading">Загружаем данные…</div>:<div className="day-grid">{days.map(d=>{
      const ts=teams.filter(t=>t.game_day_id===d.id),ps=dayPlayers.filter(p=>p.game_day_id===d.id),gs=games.filter(g=>g.game_day_id===d.id);
      return <article className="day-card-new" key={d.id} onClick={()=>onOpen(d.id)}>
        <div className="day-card-top"><div><span className="day-kicker">{dayName(d.game_date)}</span><h3>{fmtDate(d.game_date)} <em>·</em> {d.place||'Без места'}</h3><span className="muted">{d.game_time||'Время не указано'} · {ts.length} команд</span></div>
        {d.image_url?<img src={d.image_url} alt="Состав"/>:<div className="thumb-empty"><ImageIcon/></div>}</div>
        <div className="team-list">{ts.map(t=><span key={t.id} style={{'--team':t.color} as any}><i/> {t.name}</span>)}</div>
        <div className="day-card-bottom"><span><Users size={15}/> {ps.length} участников</span><span><Trophy size={15}/> {gs.length} игр</span><ChevronRight size={18}/></div>
      </article>
   })}</div>}
 </section>
}

function Rating({rows,icons,playerBadges,sort,setSort,onPlayer}:{rows:any[];icons:Record<string,string>;playerBadges:any[];sort:string;setSort:(v:string)=>void;onPlayer:(p:any)=>void}){
  const badgesByPlayer=new Map(playerBadges.map((badge:any)=>[String(badge.player_id),badge]));
  const items=[...rows].sort((a,b)=>{
    const name=(a.p.name||'').localeCompare(b.p.name||'','ru',{sensitivity:'base'});
    if(sort==='name') return name;
    const get=(x:any)=>sort==='days'?x.s.days:sort==='goals'?x.s.goals:sort==='assists'?x.s.assists:sort==='gp'?x.s.gp:sort==='saves'?x.s.saves:sort==='conceded'?x.s.conceded:sort==='ownGoals'?x.s.ownGoals:x.s.rating;
    return (Number(get(b))||0)-(Number(get(a))||0)||name;
  });
  const confirmed=items.filter(x=>(Number(x.s.days)||0)>=3);
  const preliminary=items.filter(x=>(Number(x.s.days)||0)>0&&(Number(x.s.days)||0)<3);
  const inactive=items.filter(x=>(Number(x.s.days)||0)===0);
  const filters=[
    ['name','Имя','player'],['days','Игровые дни','day'],['goals','Забил','goal'],['assists','Пас','pass'],['gp','Г+П','gp'],
    ['saves','Сейвы','saves'],['conceded','Пропустил','conceded'],['ownGoals','Автоголы','own'],['rating','Общий рейтинг','rating']
  ] as const;
  const Icon=({name,size=44}:{name:string;size?:number})=>icons[name]?<img className="rating-icon-img" src={icons[name]} style={{width:size,height:size}} alt="" aria-hidden="true"/>:<span className="rating-icon-fallback"/>;
  const renderTable=(list:any[],showRank=true)=><div className="rating-table">
    <div className="rating-head rating-head-icons">
      <span>#</span><span>Игрок</span><span>Позиция</span><span>Игровые дни</span>
      <span className="rating-col-icon"><Icon name="goal"/><em>Гол</em></span>
      <span className="rating-col-icon"><Icon name="pass"/><em>Пас</em></span>
      <span className="rating-col-icon"><Icon name="gp"/><em>Г+П</em></span>
      <span className="rating-col-icon"><Icon name="saves"/><em>Сейвы</em></span>
      <span className="rating-col-icon"><Icon name="conceded"/><em>Пропустил</em></span>
      <span className="rating-col-icon"><Icon name="own"/><em>Автогол</em></span>
      <span className="rating-col-icon"><Icon name="rating"/><em>Рейтинг</em></span>
    </div>
    {list.map((x,i)=><button className="rating-row rating-row-11" key={x.p.id} onClick={()=>onPlayer(x.p.id)}>
      <span className="rank">{showRank?i+1:'—'}</span>
      <span className="player-name"><strong><span className="player-name-text">{x.p.name}</span>{(()=>{const badge:any=badgesByPlayer.get(String(x.p.id));return <span className="player-account-badges">{badge?.is_admin&&<span className="player-account-alpha-omega" title="Администратор лиги — Альфа и Омега" aria-label="Администратор лиги — Альфа и Омега">ΑΩ</span>}{badge?.telegram_connected&&<span className="player-account-telegram" title="Аккаунт Telegram привязан" aria-label="Аккаунт Telegram привязан"><Zap size={14} strokeWidth={3}/></span>}</span>})()}</strong><small>{x.p.position||'Игрок'}{x.p.is_goalkeeper?' · Вратарь':''}</small></span>
      <span>{x.p.position||'Игрок'}</span>
      <span>{x.s.days}</span><span>{x.s.goals}</span><span>{x.s.assists}</span><strong>{x.s.gp}</strong>
      <span>{x.s.saves}</span><span>{x.s.conceded}</span><span>{x.s.ownGoals}</span><b className="rating-value">{x.s.days?Number(x.s.rating).toFixed(2):'—'}</b>
    </button>)}
    {!list.length&&<div className="rating-empty-state">В этой категории пока нет игроков.</div>}
  </div>;
  return <section className="page rating-page">
    <div className="section-head"><div><div className="eyebrow">СТАТИСТИКА</div><h2>Рейтинг игроков</h2><p>В основном рейтинге участвуют игроки, сыгравшие минимум 3 разных игровых дня. После 1–2 дней рейтинг предварительный и не влияет на места в основном зачёте. Общий рейтинг — среднее рейтингов игровых дней; сейвы и пропущенные влияют только на профильных вратарей.</p></div></div>
    <div className="rating-filters">{filters.map(([key,label,icon])=><button key={key} className={sort===key?'rating-filter active':'rating-filter'} onClick={()=>setSort(key)}><Icon name={icon} size={22}/><span>{label}</span></button>)}</div>

    <div className="rating-group-head"><div><h3>Подтверждённый рейтинг</h3><p>3 и более игровых дней · игроки ранжируются в основном зачёте</p></div><span className="rating-group-count">{confirmed.length} игроков</span></div>
    {renderTable(confirmed,true)}

    <div className="rating-group-head rating-group-preliminary"><div><h3>Предварительный рейтинг</h3><p>1–2 игровых дня · оценки видны, но игроки не занимают места в основном рейтинге</p></div><span className="rating-group-count">{preliminary.length} игроков</span></div>
    {renderTable(preliminary,false)}

    {inactive.length>0&&<><div className="rating-group-head rating-group-inactive"><div><h3>Пока без игровых дней</h3><p>Игроки есть в базе, но ещё не участвовали в сохранённых игровых днях</p></div><span className="rating-group-count">{inactive.length} игроков</span></div>{renderTable(inactive,false)}</>}
  </section>
}
function Admin({session,verified,stats,section,setSection,onLogin,onLogout,players,days,teams,games,dayPlayers,onAdd,onEdit,onDelete,onOpenDay,onEditDay,onQuickEntry,onRefresh,onAddDay,onDeleteDay,engine}:{session:any;verified:boolean;stats:any;section:AdminSection;setSection:(s:AdminSection)=>void;onLogin:()=>void;onLogout:()=>void;players:any[];days:any[];teams:any[];games:any[];dayPlayers:any[];onAdd:()=>void;onEdit:(p:any)=>void;onDelete:(id:number)=>void;onOpenDay:(id:number)=>void;onEditDay:(id:number)=>void;onQuickEntry:()=>void;onRefresh:()=>Promise<void>;onAddDay:()=>void;onDeleteDay:(id:number)=>void;engine:Engine|null}){
 const getEngine=()=>engine;
 if(!session || !verified)return <section className="admin-login"><div className="admin-lock"><Shield size={32}/></div><div className="eyebrow">ЗАКРЫТЫЙ РАЗДЕЛ</div><h2>Панель управления</h2><p>Здесь управляются игроки, игровые дни, составы и статистика лиги.</p><button className="primary-btn" onClick={onLogin}><LogIn size={17}/> Войти в админку</button></section>;
 return <section className="admin-page"><aside className="admin-side"><div className="admin-title"><Shield/><div><b>Панель управления</b><small>{session.user?.email}</small></div></div><button className={section==='overview'?'sel':''} onClick={()=>setSection('overview')}><LayoutDashboard/> Обзор</button><button className={section==='players'?'sel':''} onClick={()=>setSection('players')}><Users/> Игроки</button><button className={section==='days'?'sel':''} onClick={()=>setSection('days')}><CalendarDays/> Игровые дни</button><button className={section==='accounts'?'sel':''} onClick={()=>setSection('accounts')}><CircleUserRound/> Аккаунты и заявки</button><button className={section==='moderation'?'sel':''} onClick={()=>setSection('moderation')}><Trophy/> Проверка статистики</button><div className="side-bottom"><button onClick={onRefresh}><RefreshCw/> Обновить</button><button onClick={onLogout}><LogOut/> Выйти</button></div></aside><div className="admin-main">{section==='overview'&&<><div className="admin-header"><div><div className="eyebrow">АДМИНИСТРИРОВАНИЕ</div><h1>Обзор</h1><p>Контроль текущего состояния лиги.</p></div></div><div className="metrics"><Metric icon={<Users/>} label="Игроки" value={stats.players}/><Metric icon={<CalendarDays/>} label="Игровые дни" value={stats.days}/><Metric icon={<Trophy/>} label="Матчи" value={stats.games}/><Metric icon={<CircleUserRound/>} label="Участия" value={stats.participants}/></div><div className="quick-grid"><button className="quick-action" onClick={onQuickEntry}><Trophy/><b>Быстрое заполнение</b><span>Выбрать игру и внести статистику во время паузы</span></button><button onClick={onAdd}><Plus/><b>Добавить игрока</b><span>Создать новую карточку игрока</span></button><button onClick={()=>setSection('players')}><Users/><b>Управление игроками</b><span>Редактирование и статистика</span></button><button onClick={()=>setSection('days')}><CalendarDays/><b>Игровые дни</b><span>Редактирование и составы</span></button></div></>}{section==='players'&&<PlayersAdmin players={players} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}/>} {section==='days'&&<DaysAdmin days={days} teams={teams} games={games} dayPlayers={dayPlayers} onOpen={onOpenDay} onEdit={onEditDay} onAddDay={onAddDay} onDeleteDay={onDeleteDay} />}{section==='accounts'&&<AccountRequestsAdmin engine={getEngine()} players={players} onRefresh={onRefresh}/>} {section==='moderation'&&<MatchStatsModeration engine={getEngine()} players={players} days={days} games={games} teams={teams} dayPlayers={dayPlayers} onRefresh={onRefresh}/>}</div></section>
}

function AccountPage({session,adminVerified,players,days,games,teams,dayPlayers,icons,engine,onLoginSocial,onRefresh}:{session:any;adminVerified:boolean;players:any[];days:any[];games:any[];teams:any[];dayPlayers:any[];icons:Record<string,string>;engine:any;onLoginSocial:(provider:string)=>Promise<void>;onRefresh:()=>Promise<void>}){
 const [profile,setProfile]=useState<any>(null),[requests,setRequests]=useState<any[]>([]),[myStats,setMyStats]=useState<any[]>([]),[selected,setSelected]=useState(''),[token,setToken]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [authMode,setAuthMode]=useState<'login'|'register'>('login'),[authEmail,setAuthEmail]=useState(''),[authPassword,setAuthPassword]=useState(''),[authBusy,setAuthBusy]=useState(false),[authMessage,setAuthMessage]=useState('');
 const [selectedDay,setSelectedDay]=useState(''),[selectedGame,setSelectedGame]=useState(''),[reportedScoreA,setReportedScoreA]=useState(''),[reportedScoreB,setReportedScoreB]=useState(''),[playerComment,setPlayerComment]=useState(''),[statDraft,setStatDraft]=useState({goals:0,assists:0,own_goals:0,saves:0,conceded:0,goalkeeper:false});
 const load=async()=>{
  if(!session?.user?.id||!engine?.sb){setProfile(null);setRequests([]);setMyStats([]);return;}
  const [p,r,s]=await Promise.all([
   engine.sb.from('user_profiles').select('user_id,role,linked_player_id').eq('user_id',session.user.id).maybeSingle(),
   engine.sb.from('player_link_requests').select('id,player_id,status,note,review_note,created_at,reviewed_at').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(10),
   engine.sb.from('game_player_stats').select('id,game_id,game_day_id,player_id,status,moderation_note,reported_score_a,reported_score_b,player_comment,goals,assists,own_goals,saves,conceded,goalkeeper,created_at').eq('submitted_by',session.user.id).order('created_at',{ascending:false}).limit(30)
  ]);
  if(p.error)throw p.error;if(r.error)throw r.error;if(s.error)throw s.error;setProfile(p.data);setRequests(r.data||[]);setMyStats(s.data||[]);
 };
 useEffect(()=>{let alive=true;load().catch(e=>alive&&setError(e.message||'Не удалось загрузить кабинет'));return()=>{alive=false}},[session?.user?.id,engine]);
 const eligibleGames=games.filter(g=>dayPlayers.some(dp=>String(dp.player_id)===String(profile?.linked_player_id)&&String(dp.game_day_id)===String(g.game_day_id)&&(String(dp.team_id)===String(g.team_a_id)||String(dp.team_id)===String(g.team_b_id)))&&!myStats.some(row=>String(row.game_id)===String(g.id)&&row.status!=='needs_correction'));
 const eligibleDays=days.filter(d=>eligibleGames.some(g=>String(g.game_day_id)===String(d.id))).sort((a,b)=>String(b.game_date).localeCompare(String(a.game_date)));
 const dayGames=eligibleGames.filter(g=>String(g.game_day_id)===String(selectedDay));
 const selectedMatch=dayGames.find(g=>String(g.id)===String(selectedGame));
 const selectedMatchTeams=selectedMatch?{a:teams.find(t=>String(t.id)===String(selectedMatch.team_a_id)),b:teams.find(t=>String(t.id)===String(selectedMatch.team_b_id))}:null;
 const statFields=[{key:'goals',label:'Голы',icon:'goal'},{key:'assists',label:'Передачи',icon:'pass'},{key:'own_goals',label:'Автоголы',icon:'own'},{key:'saves',label:'Сейвы',icon:'saves'},{key:'conceded',label:'Пропущено',icon:'conceded'}] as const;
 const submitMatchStats=async()=>{
  if(!profile?.linked_player_id||!selectedGame){setError('Выбери матч.');return;}
  if(!isNonNegativeInteger(reportedScoreA)||!isNonNegativeInteger(reportedScoreB)){setError('Укажи счёт обеих команд целыми неотрицательными числами.');return;}
  const game=games.find(g=>String(g.id)===String(selectedGame));if(!game)return;
  const roster=dayPlayers.find(dp=>String(dp.player_id)===String(profile.linked_player_id)&&String(dp.game_day_id)===String(game.game_day_id)&&(String(dp.team_id)===String(game.team_a_id)||String(dp.team_id)===String(game.team_b_id)));
  if(!roster){setError('Ты не найден в составе выбранного матча.');return;}
  for(const [k,v] of Object.entries(statDraft)){if(k!=='goalkeeper'&&(!Number.isSafeInteger(Number(v))||Number(v)<0)){setError('Все числовые показатели должны быть целыми и неотрицательными.');return;}}
  setBusy(true);setError('');setMessage('');
  try{
   const existing=await engine.sb.from('game_player_stats').select('id,status').eq('game_id',game.id).eq('player_id',profile.linked_player_id).maybeSingle();
   if(existing.error)throw existing.error;
   const payload={game_id:game.id,game_day_id:game.game_day_id,player_id:profile.linked_player_id,team_id:roster.team_id,goals:Number(statDraft.goals),assists:Number(statDraft.assists),own_goals:Number(statDraft.own_goals),saves:Number(statDraft.saves),conceded:Number(statDraft.conceded),goalkeeper:!!statDraft.goalkeeper,reported_score_a:Number(reportedScoreA),reported_score_b:Number(reportedScoreB),player_comment:playerComment.trim()||null};
   if(existing.data?.status==='needs_correction'){
    const saved=await engine.sb.rpc('resubmit_match_stat',{p_stat_id:existing.data.id,p_payload:payload});if(saved.error)throw saved.error;
   }else{
    if(existing.data)throw new Error('Статистика уже отправлена или сохранена. Если администратор вернул её на исправление, можно отправить исправленную версию.');
    const saved=await engine.sb.from('game_player_stats').insert({...payload,status:'pending',submitted_by:session.user.id});if(saved.error)throw saved.error;
   }
   setMessage('Статистика и счёт отправлены на проверку. В рейтинг они попадут после подтверждения администратором.');setSelectedGame('');setReportedScoreA('');setReportedScoreB('');setPlayerComment('');setStatDraft({goals:0,assists:0,own_goals:0,saves:0,conceded:0,goalkeeper:false});await load();
  }catch(e:any){setError(e?.message||'Не удалось отправить статистику.');}finally{setBusy(false);}
 };
 const submit=async()=>{
  if(!selected||!token.trim()){setError('Выбери себя в списке и введи код приглашения.');return;}
  setBusy(true);setError('');setMessage('');
  try{const r=await engine.sb.rpc('request_player_link',{p_player_id:Number(selected),p_invitation_token:token.trim(),p_note:note.trim()||null});if(r.error)throw r.error;setMessage('Заявка отправлена администратору. После проверки привязка появится в кабинете.');setToken('');setNote('');await load();}
  catch(e:any){setError(e?.message||'Не удалось отправить заявку.');}finally{setBusy(false);}
 };
 const authenticateSocial=async(provider:string)=>{setAuthBusy(true);setError('');setAuthMessage('');try{await onLoginSocial(provider);}catch(e:any){setError(e?.message||'Не удалось войти через выбранный сервис.');}finally{setAuthBusy(false);}};
 const authenticateEmail=async(e:React.FormEvent)=>{e.preventDefault();if(authBusy)return;const email=authEmail.trim();if(!email||!authPassword){setError('Укажи email и пароль.');return;}if(authMode==='register'&&authPassword.length<8){setError('Пароль должен содержать не менее 8 символов.');return;}setAuthBusy(true);setError('');setAuthMessage('');try{if(!engine?.sb)throw new Error('Модуль авторизации ещё не загрузился. Обнови страницу.');if(authMode==='register'){const r=await engine.sb.auth.signUp({email,password:authPassword,options:{emailRedirectTo:window.location.origin+window.location.pathname}});if(r.error)throw r.error;if(r.data?.session){setAuthMessage('Аккаунт создан. Выполняю вход…');await onRefresh();}else{setAuthMessage('Аккаунт создан. Проверь почту и подтверди адрес, затем войди.');setAuthMode('login');}}else{const r=await engine.sb.auth.signInWithPassword({email,password:authPassword});if(r.error)throw r.error;setAuthMessage('Вход выполнен. Загружаю кабинет…');await onRefresh();}}catch(e:any){const msg=String(e?.message||'');setError(/already registered/i.test(msg)?'Этот email уже зарегистрирован. Войди в аккаунт.':/invalid login credentials/i.test(msg)?'Неверный email или пароль.':msg||'Не удалось выполнить вход.');}finally{setAuthBusy(false);}};
 const linkedPlayer=profile?.linked_player_id?players.find(p=>String(p.id)===String(profile.linked_player_id)):null;
 const accountPlayerName=profile?.linked_player_id?(linkedPlayer?.name||'Игрок #'+profile.linked_player_id):'Аккаунт игрока';
 const authProviders=[...(Array.isArray(session?.user?.app_metadata?.providers)?session.user.app_metadata.providers:[]),session?.user?.app_metadata?.provider,...(Array.isArray(session?.user?.identities)?session.user.identities.map((identity:any)=>identity.provider):[])].filter(Boolean).map((provider:any)=>String(provider).toLowerCase());
 const telegramConnected=authProviders.some((provider:string)=>provider.includes('telegram'))||!!(session?.user?.user_metadata?.telegram_username||session?.user?.user_metadata?.telegram_id);
 return <section className="page">
  {!session?<div className="admin-login"><div className="admin-lock"><CircleUserRound size={32}/></div><h2>{authMode==='login'?'Войти в кабинет':'Создать аккаунт'}</h2><p>Выбери удобный способ входа. Администратор входит отдельно через раздел «Админка».</p>
   <div className="quick-grid"><button type="button" onClick={()=>authenticateSocial('custom:telegram')} disabled={authBusy}>Войти через Telegram</button></div>
   <div className="account-auth-divider"><span>или по email</span></div>
   <form onSubmit={authenticateEmail} className="account-auth-form">
    <label>Email<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} autoComplete="email" required placeholder="name@example.com"/></label>
    <label>Пароль<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} autoComplete={authMode==='login'?'current-password':'new-password'} minLength={8} required placeholder="Не менее 8 символов"/></label>
    <button className="primary-btn full" type="submit" disabled={authBusy}>{authBusy?'Подождите…':authMode==='login'?'Войти по email':'Зарегистрироваться'}</button>
   </form>
   <button className="account-auth-switch" type="button" onClick={()=>{setAuthMode(v=>v==='login'?'register':'login');setError('');setAuthMessage('');}}>{authMode==='login'?'Нет аккаунта? Зарегистрироваться':'Уже есть аккаунт? Войти'}</button>
   {authMessage&&<p className="success">{authMessage}</p>}{error&&<p className="error">{error}</p>}
  </div>:<div className="admin-card account-card" style={{maxWidth:760,margin:'0 auto'}}>
   <div className="admin-header account-profile-header"><div className="account-identity"><div className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</div><div className="account-player-title"><h2>{accountPlayerName}</h2><span className={adminVerified?'account-role-badge account-role-admin':'account-role-badge'}>{adminVerified?'Администратор':profile?.role==='participant'?'Игрок':'Гость'}</span></div><p className="account-player-subtitle">{profile?.linked_player_id?'Личная статистика и активность в лиге':'Карточка игрока пока не привязана'}</p><div className="account-contact-details"><span className="account-contact-caption">ДАННЫЕ АККАУНТА</span>{session.user.email&&<span className="account-contact-row"><span aria-hidden="true">✉</span>{session.user.email}</span>}{session.user.phone&&<span className="account-contact-row"><span aria-hidden="true">☎</span>{session.user.phone}</span>}{telegramConnected&&<span className="account-contact-row"><span aria-hidden="true">➤</span>Telegram подключён</span>}{!session.user.email&&!session.user.phone&&!telegramConnected&&<span className="account-contact-row account-contact-muted">Данные способа входа не предоставлены</span>}</div></div><button className="secondary-btn account-logout-btn" onClick={async()=>{await engine.sb.auth.signOut();await onRefresh()}}>Выйти</button></div>
   {!profile?.linked_player_id&&<section className="account-link-panel">
    <div className="account-link-heading"><span className="account-link-kicker">ПРИВЯЗКА АККАУНТА</span><h3>Привязать карточку игрока</h3><p>Выбери свою карточку в лиге и подтверди её персональным кодом приглашения от администратора.</p></div>
    <div className="account-link-fields">
     <label className="account-link-field"><span className="account-link-step">01 <b>Твоя карточка</b></span><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Выбрать игрока из списка</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}{p.position?' — '+p.position:''}</option>)}</select></label>
     <label className="account-link-field"><span className="account-link-step">02 <b>Код приглашения</b></span><input value={token} onChange={e=>setToken(e.target.value)} placeholder="Вставь персональный код" autoComplete="off" spellCheck={false}/><small>Код выдаёт администратор. Он нужен для подтверждения, что карточка принадлежит тебе.</small></label>
     <label className="account-link-field account-link-note"><span className="account-link-step">03 <b>Комментарий</b> <i>Необязательно</i></span><textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} placeholder="Дополнительная информация для администратора"/></label>
    </div>
    <button className="primary-btn account-link-submit" onClick={submit} disabled={busy||!selected||!token.trim()}>{busy?'Отправляем заявку…':'Отправить заявку'}</button>
   </section>}
   {message&&<p className="success">{message}</p>}{error&&<p className="error">{error}</p>}
   {profile?.role==='participant'&&<div className="account-stat-submit">
    <div className="account-stat-heading"><h3>Отправить статистику</h3><p>Сначала выбери игровой день, затем матч. Статистика появится в рейтинге после проверки.</p></div>
    <div className="account-match-selectors">
     <label><span>1. Игровой день</span><select value={selectedDay} onChange={e=>{setSelectedDay(e.target.value);setSelectedGame('');setStatDraft({goals:0,assists:0,own_goals:0,saves:0,conceded:0,goalkeeper:false});setError('');setMessage('');}}><option value="">Выбрать игровой день</option>{eligibleDays.map(d=><option key={d.id} value={d.id}>{new Date(d.game_date+'T00:00:00').toLocaleDateString('ru-RU')}{d.game_time?' · '+String(d.game_time).slice(0,5):''}{d.place?' · '+d.place:''}</option>)}</select></label>
     <label><span>2. Матч</span><select value={selectedGame} disabled={!selectedDay||!dayGames.length} onChange={e=>{setSelectedGame(e.target.value);setReportedScoreA('');setReportedScoreB('');setPlayerComment('');setStatDraft({goals:0,assists:0,own_goals:0,saves:0,conceded:0,goalkeeper:false});setError('');setMessage('');}}><option value="">{!selectedDay?'Сначала выбери игровой день':dayGames.length?'Выбрать матч':'В этот день нет доступных матчей'}</option>{dayGames.map(g=>{const a=teams.find(x=>String(x.id)===String(g.team_a_id));const b=teams.find(x=>String(x.id)===String(g.team_b_id));return <option key={g.id} value={g.id}>{a?.name||'Команда'} — {b?.name||'Команда'}</option>})}</select></label>
    </div>
    {!eligibleDays.length&&<p className="account-stat-empty">Пока нет игровых дней с матчами, в которых ты участвовал.</p>}
    {selectedMatch&&<div className="account-selected-match"><span>Выбранный матч</span><b>{selectedMatchTeams?.a?.name||'Команда A'} <i>—</i> {selectedMatchTeams?.b?.name||'Команда B'}</b><small>{new Date((days.find(d=>String(d.id)===String(selectedDay))?.game_date||'')+'T00:00:00').toLocaleDateString('ru-RU')}</small></div>}
    {selectedMatch&&<div className="account-reported-score"><div className="account-form-section-title"><b>Счёт матча</b><small>Укажи итоговый счёт, который ты запомнил</small></div><div className="account-score-inputs"><label><span>{selectedMatchTeams?.a?.name||'Команда A'}</span><input type="number" min="0" step="1" inputMode="numeric" value={reportedScoreA} onChange={e=>setReportedScoreA(e.target.value)} placeholder="0"/></label><strong>:</strong><label><span>{selectedMatchTeams?.b?.name||'Команда B'}</span><input type="number" min="0" step="1" inputMode="numeric" value={reportedScoreB} onChange={e=>setReportedScoreB(e.target.value)} placeholder="0"/></label></div></div>}
    {selectedMatch&&<div className="account-stat-fields">{statFields.map(field=><label className="account-stat-field" key={field.key}><span className="account-stat-icon">{icons[field.icon]?<img src={icons[field.icon]} alt="" />:<span className="account-stat-fallback">{field.icon==='goal'?'⚽':field.icon==='pass'?'↗':field.icon==='own'?'⚽':'•'}</span>}{field.label}</span><input type="number" min="0" step="1" value={statDraft[field.key]} onChange={e=>setStatDraft(v=>({...v,[field.key]:e.target.value===''?0:Number(e.target.value)}))}/></label>)}</div>}
    {selectedMatch&&<label className="account-player-comment"><span>Комментарий к матчу <small>Необязательно · до 1000 символов</small></span><textarea value={playerComment} onChange={e=>setPlayerComment(e.target.value)} maxLength={1000} placeholder="Например: кто отдал голевую передачу, кто забил, спорные моменты…"/></label>}
    {selectedMatch&&<label className="account-goalkeeper-check"><input type="checkbox" checked={statDraft.goalkeeper} onChange={e=>setStatDraft(v=>({...v,goalkeeper:e.target.checked}))}/> Играл вратарём</label>}
    <button className="primary-btn account-submit-btn" onClick={submitMatchStats} disabled={busy||!selectedMatch}>{busy?'Отправляю…':'Отправить на проверку'}</button>
   <section className="account-stat-history"><h3>Моя статистика на проверке</h3>
   {myStats.length?<div className="account-stat-history-list">{myStats.map(row=>{const day=days.find(d=>String(d.id)===String(row.game_day_id));const statusLabel=row.status==='pending'?'На проверке':row.status==='approved'?'Подтверждена':row.status==='rejected'?'Отклонена':'Нужно исправить';return <article className="account-stat-history-item" key={row.id}><div className="account-stat-history-main"><b>{day?new Date(day.game_date+'T00:00:00').toLocaleDateString('ru-RU'):'Игровой день'}</b><span>Матч №{row.game_id} · Счёт {row.reported_score_a??'—'}:{row.reported_score_b??'—'}</span><small>Г {row.goals||0} · П {row.assists||0} · АГ {row.own_goals||0} · С {row.saves||0} · Пр {row.conceded||0}</small></div><div className="account-stat-history-meta"><span className={`account-stat-status account-stat-status-${row.status}`}>{statusLabel}</span></div>{row.player_comment&&<div className="account-stat-moderation-note"><b>Твой комментарий</b><p>{row.player_comment}</p></div>}{row.moderation_note&&<div className="account-stat-moderation-note"><b>Комментарий администратора</b><p>{row.moderation_note}</p></div>}</article>})}</div>:<p className="account-stat-history-empty">Отправленных записей пока нет.</p>}</section>
  </div>}
   <section className={`account-requests-section ${!profile?.linked_player_id?'account-requests-guest':''}`}><h3>Мои заявки</h3>{requests.length?<div className="admin-list">{requests.map(r=><div className="admin-day" key={r.id}><div><b>{players.find(p=>String(p.id)===String(r.player_id))?.name||'Игрок #'+r.player_id}</b><small>{new Date(r.created_at).toLocaleString('ru-RU')}</small></div><span className={`account-request-status account-request-${r.status}`}>{r.status==='pending'?'На проверке':r.status==='approved'?'Подтверждена':r.status==='rejected'?'Отклонена':'Нужно исправить'}</span>{r.note&&<small>{r.note}</small>}{r.review_note&&<small>Ответ администратора: {r.review_note}</small>}</div>)}</div>:<div className="account-requests-empty"><span className="account-requests-empty-icon">⌁</span><b>Пока нет заявок</b><p>После отправки заявки на привязку карточки здесь появится её статус.</p></div>}</section>
  </div>}
 </section>;
}
function AccountRequestsAdmin({engine,players,onRefresh}:{engine:any;players:any[];onRefresh:()=>Promise<void>}){
 const [rows,setRows]=useState<any[]>([]),[maxUses,setMaxUses]=useState('1'),[ttl,setTtl]=useState('14'),[busy,setBusy]=useState(false),[invite,setInvite]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=async()=>{const r=await engine.sb.from('player_link_requests').select('id,user_id,player_id,status,note,review_note,created_at').eq('status','pending').order('created_at',{ascending:true});if(r.error)throw r.error;setRows(r.data||[])};
 useEffect(()=>{load().catch(e=>setError(e.message||'Ошибка загрузки'))},[engine]);
 const create=async()=>{setBusy(true);setError('');setInvite('');try{const r=await engine.sb.rpc('create_invitation',{p_max_uses:Number(maxUses),p_ttl_days:Number(ttl)});if(r.error)throw r.error;setInvite(r.data);setMessage('Код создан. Скопируй и отправь его игроку лично.');}catch(e:any){setError(e.message||'Не удалось создать приглашение')}finally{setBusy(false)}};
 const decide=async(id:number,decision:string)=>{const note=decision==='needs_correction'?prompt('Что нужно исправить?')||'Нужно уточнить данные':null;setBusy(true);try{const r=await engine.sb.rpc('review_player_link_request',{p_request_id:id,p_decision:decision,p_note:note});if(r.error)throw r.error;await load();await onRefresh()}catch(e:any){setError(e.message||'Не удалось обработать заявку')}finally{setBusy(false)}};
 return <><div className="admin-header"><div><div className="eyebrow">АККАУНТЫ</div><h1>Приглашения и привязки</h1><p>{rows.length} заявок ожидают проверки.</p></div></div>
  <div className="admin-card" style={{padding:20,marginBottom:20}}><h3>Создать приглашение</h3><div className="quick-grid"><label>Использований<select value={maxUses} onChange={e=>setMaxUses(e.target.value)}>{[1,2,3,5,10].map(v=><option key={v}>{v}</option>)}</select></label><label>Срок действия<select value={ttl} onChange={e=>setTtl(e.target.value)}><option value="1">1 день</option><option value="7">7 дней</option><option value="14">14 дней</option><option value="30">30 дней</option></select></label></div><button className="primary-btn" onClick={create} disabled={busy}>Создать код</button>{invite&&<p><code>{invite}</code> <button onClick={()=>navigator.clipboard?.writeText(invite)}>Копировать</button></p>}{message&&<p>{message}</p>}{error&&<p className="error">{error}</p>}</div>
  <h3>Заявки на привязку</h3>{rows.length?<div className="admin-list">{rows.map(r=><div className="admin-day" key={r.id}><div><b>{players.find(p=>String(p.id)===String(r.player_id))?.name||'Игрок #'+r.player_id}</b><small>{r.user_id} · {new Date(r.created_at).toLocaleString('ru-RU')}</small>{r.note&&<small>{r.note}</small>}{r.review_note&&<small>Комментарий: {r.review_note}</small>}</div><div className="day-actions"><button className="primary-mini" disabled={busy} onClick={()=>decide(r.id,'approved')}>Подтвердить</button><button disabled={busy} onClick={()=>decide(r.id,'needs_correction')}>Уточнить</button><button disabled={busy} onClick={()=>decide(r.id,'rejected')}>Отклонить</button></div></div>)}</div>:<p>Новых заявок нет.</p>}
 </>;
}


function MatchStatsModeration({engine,players,days,games,teams,dayPlayers,onRefresh}:{engine:any;players:any[];days:any[];games:any[];teams:any[];dayPlayers:any[];onRefresh:()=>Promise<void>}){
 const [rows,setRows]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [dayFilter,setDayFilter]=useState(''),[gameFilter,setGameFilter]=useState(''),[teamFilter,setTeamFilter]=useState(''),[statusFilter,setStatusFilter]=useState('pending');
 const load=async()=>{if(!engine?.sb)throw new Error('Нет подключения к базе данных.');const r=await engine.sb.from('game_player_stats').select('*').order('created_at',{ascending:false}).limit(1000);if(r.error)throw r.error;setRows(r.data||[]);};
 useEffect(()=>{load().catch(e=>setError(e.message||'Не удалось загрузить очередь'))},[engine]);
 const review=async(id:number,decision:string)=>{const note=decision==='approved'?null:(prompt(decision==='needs_correction'?'Что игроку нужно исправить?':'Причина отклонения (необязательно)')||null);setBusy(true);setError('');setMessage('');try{const r=await engine.sb.rpc('review_match_stat',{p_stat_id:id,p_decision:decision,p_note:note});if(r.error)throw r.error;await load();await onRefresh();setMessage('Решение сохранено.');}catch(e:any){setError(e?.message||'Не удалось обработать запись.');}finally{setBusy(false);}};
 const saveConsensusScore=async(game:any,score:any)=>{if(!game||!score)return;if(!window.confirm(`Зафиксировать официальный счёт матча ${score.label}?`))return;setBusy(true);setError('');setMessage('');try{const r=await engine.sb.from('games').update({score_a:score.a,score_b:score.b}).eq('id',game.id);if(r.error)throw r.error;await onRefresh();setMessage('Официальный счёт матча обновлён. Заявки игроков при этом не изменены.');}catch(e:any){setError(e?.message||'Не удалось обновить счёт матча.');}finally{setBusy(false);}};
 const filteredRows=rows.filter(r=>(!dayFilter||String(r.game_day_id)===dayFilter)&&(!gameFilter||String(r.game_id)===gameFilter)&&(!teamFilter||String(r.team_id)===teamFilter)&&(!statusFilter||statusFilter==='all'||r.status===statusFilter));
 const groups=new Map<string,any[]>();filteredRows.forEach(r=>{const key=String(r.game_day_id)+'-'+String(r.game_id);groups.set(key,[...(groups.get(key)||[]),r]);});
 const statusLabel=(s:string)=>s==='pending'?'Ожидает':s==='approved'?'Подтверждено':s==='rejected'?'Отклонено':'На исправление';
 const statusTone=(s:string)=>s==='approved'?'success':s==='rejected'?'danger':s==='needs_correction'?'warning':'pending';
 const selectedDayGames=games.filter(g=>!dayFilter||String(g.game_day_id)===dayFilter);
 const countPending=rows.filter(r=>r.status==='pending').length,countApproved=rows.filter(r=>r.status==='approved').length,countRejected=rows.filter(r=>r.status==='rejected').length;
 return <div className="moderation-workspace">
  <div className="admin-header moderation-header"><div><div className="eyebrow">МОДЕРАЦИЯ · СВЕРКА ДАННЫХ</div><h1>Статистика на проверке</h1><p>Заявки сгруппированы по матчам и командам. Расхождения счёта подсвечиваются автоматически.</p></div><button className="moderation-refresh" onClick={()=>{setError('');load().catch(e=>setError(e.message||'Не удалось обновить данные'));}} disabled={busy}><RefreshCw size={16}/> Обновить данные</button></div>
  <div className="moderation-summary"><div><strong>{countPending}</strong><span>Ожидают проверки</span></div><div><strong>{countApproved}</strong><span>Подтверждено</span></div><div><strong>{countRejected}</strong><span>Отклонено</span></div><div><strong>{rows.length}</strong><span>Всего заявок</span></div></div>
  <div className="moderation-filters">
   <label>Игровой день<select value={dayFilter} onChange={e=>{setDayFilter(e.target.value);setGameFilter('');}}><option value="">Все игровые дни</option>{days.map(d=><option key={d.id} value={d.id}>{fmtDate(d.game_date)} · {d.place||'Без места'}</option>)}</select></label>
   <label>Матч<select value={gameFilter} onChange={e=>setGameFilter(e.target.value)}><option value="">Все матчи</option>{selectedDayGames.map(g=>{const a=teams.find(t=>String(t.id)===String(g.team_a_id)),b=teams.find(t=>String(t.id)===String(g.team_b_id));return <option key={g.id} value={g.id}>{adminTeamName(a)} — {adminTeamName(b)}</option>})}</select></label>
   <label>Команда<select value={teamFilter} onChange={e=>setTeamFilter(e.target.value)}><option value="">Все команды</option>{teams.filter(t=>!dayFilter||String(t.game_day_id)===dayFilter).map(t=><option key={t.id} value={t.id}>{adminTeamName(t)}</option>)}</select></label>
   <label>Статус<select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="pending">Ожидают проверки</option><option value="needs_correction">На исправление</option><option value="approved">Подтверждено</option><option value="rejected">Отклонено</option><option value="all">Все статусы</option></select></label>
  </div>
  {error&&<p className="error">{error}</p>}{message&&<p className="success">{message}</p>}
  {groups.size?Array.from(groups.entries()).map(([key,list])=>{const first=list[0],day=days.find(d=>String(d.id)===String(first.game_day_id)),game=games.find(g=>String(g.id)===String(first.game_id)),a=teams.find(t=>String(t.id)===String(game?.team_a_id)),b=teams.find(t=>String(t.id)===String(game?.team_b_id));
   const scoreMap=new Map<string,{a:number;b:number;count:number;label:string}>();list.forEach(r=>{if(r.reported_score_a==null||r.reported_score_b==null)return;const sa=Number(r.reported_score_a),sb=Number(r.reported_score_b),label=`${sa}:${sb}`;const prev=scoreMap.get(label)||{a:sa,b:sb,count:0,label};prev.count++;scoreMap.set(label,prev);});
   const scoreOptions=Array.from(scoreMap.values()).sort((x,y)=>y.count-x.count),consensus=scoreOptions[0]||null,scoreConflict=scoreOptions.length>1,scoreTie=scoreOptions.length>1&&scoreOptions[0].count===scoreOptions[1].count,allSame=scoreOptions.length===1&&scoreOptions[0].count===list.length&&list.length>0;
   const teamGroups=[{team:a,teamId:game?.team_a_id},{team:b,teamId:game?.team_b_id}].map(x=>({...x,entries:list.filter(r=>String(r.team_id)===String(x.teamId))})).filter(x=>x.entries.length);
   const rosterCount=game?dayPlayers.filter(dp=>String(dp.game_day_id)===String(game.game_day_id)&&(String(dp.team_id)===String(game.team_a_id)||String(dp.team_id)===String(game.team_b_id))).length:list.length,submittedPlayers=new Set(list.map(r=>String(r.player_id))).size;
   return <article className="moderation-match-card" key={key}>
    <div className="moderation-match-head"><div><span className="moderation-kicker">{day?fmtDate(day.game_date):'Игровой день'}{day?.place?' · '+day.place:''}{day?.game_time?' · '+String(day.game_time).slice(0,5):''}</span><h2>{adminTeamName(a)} <i>—</i> {adminTeamName(b)}</h2><small>{submittedPlayers} заявок · {rosterCount} игроков в составе</small></div><div className="moderation-match-score"><span>Официальный счёт</span><b>{game?game.score_a+' : '+game.score_b:'—'}</b></div></div>
    <div className="moderation-score-check"><div><span>Сверка счёта игроков</span><strong>{consensus?consensus.label:'Нет данных о счёте'}</strong><small>{consensus?`${consensus.count} из ${list.length} заявок указали этот счёт`:'Новые заявки будут содержать счёт матча'}</small></div><span className={allSame?'moderation-flag good':scoreConflict?'moderation-flag bad':'moderation-flag warn'}>{allSame?'Полное совпадение':scoreTie?'Нет большинства':scoreConflict?'Есть расхождения':'Нужно больше заявок'}</span>{scoreOptions.length>0&&<div className="moderation-score-options">{scoreOptions.map(s=><span key={s.label} className={s===consensus?'top-score':''}>{s.label} · {s.count}</span>)}</div>}{consensus&&!scoreTie&&<button className="moderation-score-accept" disabled={busy} onClick={()=>saveConsensusScore(game,consensus)}>Зафиксировать счёт {consensus.label}</button>}</div>
    {teamGroups.map(group=><section className="moderation-team-group" key={String(group.teamId)}><header><span className="moderation-team-dot" style={{background:group.team?.color||'#cfb842'}}/><h3>{adminTeamName(group.team)||'Команда'}</h3><small>{group.entries.length} заявок</small></header><div className="moderation-table-wrap"><table className="moderation-table"><thead><tr><th>Игрок</th><th>Г</th><th>П</th><th>АГ</th><th>С</th><th>Пр</th><th>ВР</th><th>Счёт</th><th>Статус</th><th>Действия</th></tr></thead><tbody>
     {group.entries.map(r=>{const p=players.find(x=>String(x.id)===String(r.player_id)),score=r.reported_score_a==null?'—':`${r.reported_score_a}:${r.reported_score_b}`,differs=consensus&&score!=='—'&&score!==consensus.label;return <tr key={r.id} className={differs?'moderation-row-conflict':''}><td><b>{p?.name||'Игрок #'+r.player_id}</b>{r.player_comment&&<p className="moderation-player-comment">{r.player_comment}</p>}{r.moderation_note&&<p className="moderation-admin-note">Ответ: {r.moderation_note}</p>}</td><td>{r.goals||0}</td><td>{r.assists||0}</td><td>{r.own_goals||0}</td><td>{r.saves||0}</td><td>{r.conceded||0}</td><td>{r.goalkeeper?'Да':'—'}</td><td><span className={differs?'moderation-cell-conflict':''}>{score}</span></td><td><span className={`moderation-status moderation-status-${statusTone(r.status)}`}>{statusLabel(r.status)}</span></td><td>{r.status==='pending'?<div className="moderation-actions"><button className="moderation-approve" disabled={busy} onClick={()=>review(r.id,'approved')}>Принять</button><button className="moderation-correction" disabled={busy} onClick={()=>review(r.id,'needs_correction')}>Уточнить</button><button className="moderation-reject" disabled={busy} onClick={()=>review(r.id,'rejected')}>Отклонить</button></div>:<span className="moderation-readonly">—</span>}</td></tr>})}
    </tbody></table></div></section>)}
   </article>;
  }):<div className="moderation-empty"><Trophy size={30}/><b>По выбранным фильтрам заявок нет</b><span>Измени фильтры или обнови данные.</span></div>}
 </div>;
}

function Metric({icon,label,value}:{icon:any;label:string;value:number}){return <div className="metric"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>}
function PlayersAdmin({players,onAdd,onEdit,onDelete}:{players:any[];onAdd:()=>void;onEdit:(p:any)=>void;onDelete:(id:number)=>void}){return <><div className="admin-header row"><div><div className="eyebrow">УПРАВЛЕНИЕ</div><h1>Игроки</h1><p>{players.length} игроков в базе.</p></div><button className="primary-btn" onClick={onAdd}><Plus/> Добавить игрока</button></div><div className="admin-list">{players.map(p=><div className="admin-player" key={p.id}><div className="avatar">{p.name?.slice(0,1)||'?'}</div><div className="ap-main"><b>{p.name}</b><small>{p.position||'Позиция не указана'}{p.is_goalkeeper?' · Вратарь':''}</small></div><button className="icon-btn" onClick={()=>onEdit(p)}><Pencil/></button><button className="icon-btn danger-icon" onClick={()=>onDelete(p.id)}><Trash2/></button></div>)}</div></>}
function DaysAdmin({days,teams,games,dayPlayers,onOpen,onEdit,onAddDay,onDeleteDay}:{days:any[];teams:any[];games:any[];dayPlayers:any[];onOpen:(id:number)=>void;onEdit:(id:number)=>void;onAddDay:()=>void;onDeleteDay:(id:number)=>void}){return <><div className="admin-header row"><div><div className="eyebrow">УПРАВЛЕНИЕ</div><h1>Игровые дни</h1><p>Редактирование дат, команд, матчей, составов и статистики.</p></div><button className="primary-btn" onClick={onAddDay}><Plus/> Добавить игровой день</button></div><div className="admin-list">{days.map(d=>{const ts=teams.filter(t=>t.game_day_id===d.id),gs=games.filter(g=>g.game_day_id===d.id),ps=dayPlayers.filter(p=>p.game_day_id===d.id);return <div className="admin-day" key={d.id}><div><span className="day-kicker">{dayName(d.game_date)}</span><h3>{fmtDate(d.game_date)} · {d.place||'Без места'}</h3><small>{d.game_time||'—'} · {ts.length} команд · {gs.length} матчей · {ps.length} участников</small></div><div className="day-actions"><button onClick={()=>onOpen(d.id)}>Открыть</button><button className="primary-mini" onClick={()=>onEdit(d.id)}><Pencil size={15}/> Редактировать</button><button className="icon-btn danger-icon" onClick={()=>onDeleteDay(d.id)} title="Удалить игровой день" aria-label={`Удалить игровой день ${fmtDate(d.game_date)}`}><Trash2 size={17}/></button></div></div>})}</div></>}
function QuickEntryModal({players,days,teams,games,dayPlayers,icons,engine,onClose,onSaved}:{players:any[];days:any[];teams:any[];games:any[];dayPlayers:any[];icons:Record<string,string>;engine:any;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [dayId,setDayId]=useState<number|string>('');
  const [gameId,setGameId]=useState<number|string>('');
  const [newTeamA,setNewTeamA]=useState<number|string>('');
  const [newTeamB,setNewTeamB]=useState<number|string>('');
  const [creatingGame,setCreatingGame]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [scoreA,setScoreA]=useState<any>(0);
  const [scoreB,setScoreB]=useState<any>(0);
  const day=days.find(d=>String(d.id)===String(dayId));
  const dayTeams=teams.filter(t=>String(t.game_day_id)===String(dayId));
  const dayGames=games.filter(g=>String(g.game_day_id)===String(dayId));
  const game=dayGames.find(g=>String(g.id)===String(gameId));
  const teamA=dayTeams.find(t=>String(t.id)===String(game?.team_a_id));
  const teamB=dayTeams.find(t=>String(t.id)===String(game?.team_b_id));
  const rosterA=dayPlayers.filter(x=>String(x.game_day_id)===String(dayId)&&String(x.team_id)===String(teamA?.id)).map(x=>({...x,player:players.find(p=>String(p.id)===String(x.player_id))})).filter(x=>x.player);
  const rosterB=dayPlayers.filter(x=>String(x.game_day_id)===String(dayId)&&String(x.team_id)===String(teamB?.id)).map(x=>({...x,player:players.find(p=>String(p.id)===String(x.player_id))})).filter(x=>x.player);
  const [draft,setDraft]=useState<Record<string,any>>({});
  const [statsLoading,setStatsLoading]=useState(false);
  const icon=(name:string,size=22)=>icons[name]?<img src={icons[name]} style={{width:size,height:size,objectFit:'contain'}} alt=""/>:<span>•</span>;
  useEffect(()=>{
    let cancelled=false;
    const loadMatch=async()=>{
      if(!game){setDraft({});return;}
      setScoreA(Number(game.score_a)||0);setScoreB(Number(game.score_b)||0);setError('');
      const rosterNow=[...rosterA,...rosterB];
      const empty:any={};
      rosterNow.forEach(x=>{empty[String(x.player_id)]={goals:0,assists:0,conceded:0,own_goals:0,saves:0,goalkeeper:!!x.goalkeeper};});
      setDraft(empty);setStatsLoading(true);
      try{
        const result=await engine?.sb?.from('game_player_stats').select('*').eq('game_id',game.id);
        if(result?.error)throw result.error;
        if(cancelled)return;
        const rows=result?.data||[];
        const next={...empty};
        rows.forEach((x:any)=>{next[String(x.player_id)]={goals:+x.goals||0,assists:+x.assists||0,conceded:+x.conceded||0,own_goals:+x.own_goals||0,saves:+x.saves||0,goalkeeper:!!x.goalkeeper};});
        setDraft(next);
      }catch(e:any){if(!cancelled)setError('Не удалось загрузить статистику матча. Проверь SQL-миграцию game_player_stats.');}
      finally{if(!cancelled)setStatsLoading(false);}
    };
    loadMatch();return()=>{cancelled=true;};
  },[gameId,dayId,dayPlayers.length]);
  const setStat=(pid:any,key:string,value:any)=>setDraft(d=>({...d,[String(pid)]:{...(d[String(pid)]||{}),[key]:key==='goalkeeper'?!!value:(value===''?'':Number(value))}}));
  const rating=(entry:any,teamId:any,playerId:any)=>engine?.dayRatingForEntry?Number(engine.dayRatingForEntry({game_day_id:Number(dayId),team_id:Number(teamId),player_id:Number(playerId),goals:+entry.goals||0,assists:+entry.assists||0,conceded:+entry.conceded||0,own_goals:+entry.own_goals||0,saves:+entry.saves||0,goalkeeper:!!entry.goalkeeper},dayGames)).toFixed(1):'5.0';
  useEffect(()=>{
    if(dayTeams.length>=2){
      setNewTeamA(String(dayTeams[0].id));
      setNewTeamB(String(dayTeams[1].id));
    }else{setNewTeamA('');setNewTeamB('');}
  },[dayId,teams.length]);
  const createGame=async()=>{
    if(!day || !engine?.sb){setError('Не удалось подключиться к базе данных.');return;}
    if(!newTeamA||!newTeamB||String(newTeamA)===String(newTeamB)){setError('Выбери две разные команды.');return;}
    setCreatingGame(true);setError('');
    try{
      const result=await engine.sb.from('games').insert({game_day_id:Number(dayId),team_a_id:Number(newTeamA),team_b_id:Number(newTeamB),score_a:0,score_b:0,game_order:dayGames.length+1}).select('*').single();
      if(result.error)throw result.error;
      await onSaved();
      setGameId(String(result.data.id));
      setScoreA(0);setScoreB(0);
      setError('Игра создана. Можно заполнять статистику.');
    }catch(e:any){setError(e?.message||'Не удалось создать игру.');}
    finally{setCreatingGame(false);}
  };
  const save=async()=>{
    if(!engine?.sb||!game)return;
    if(!teamA||!teamB||String(teamA.id)===String(teamB.id)){setError('В выбранной игре должны быть две разные действующие команды.');return;}
    if(!isNonNegativeInteger(scoreA)||!isNonNegativeInteger(scoreB)){setError('Счёт должен быть целым неотрицательным числом.');return;}
    const currentRoster=[...rosterA,...rosterB];
    for(const item of currentRoster){
      const d=draft[String(item.player_id)]||{};
      for(const key of ['goals','assists','own_goals','saves','conceded']){
        if(!isNonNegativeInteger(d[key]??0)){setError(`Проверь статистику игрока ${item.player?.name||item.player_id}: все значения должны быть целыми числами не меньше нуля.`);return;}
      }
    }
    const rows=currentRoster.map(item=>{const d=draft[String(item.player_id)]||{};return {game_id:game.id,game_day_id:Number(dayId),player_id:item.player_id,team_id:Number(item.team_id),goals:Number(d.goals)||0,assists:Number(d.assists)||0,conceded:Number(d.conceded)||0,own_goals:Number(d.own_goals)||0,saves:Number(d.saves)||0,goalkeeper:!!d.goalkeeper};});
    const actualGoals=Number(scoreA)+Number(scoreB);const enteredGoals=rows.reduce((s,r)=>s+r.goals+r.own_goals,0);
    if(actualGoals!==enteredGoals&&!window.confirm(`Проверка счёта: по табло ${actualGoals} голов, а в статистике игроков ${enteredGoals} (включая автоголы). Продолжить сохранение?`))return;
    setSaving(true);setError('');
    let matchAndScoreSaved=false;
    try{
      const [dayRes,matchRes]=await Promise.all([
        engine.sb.from('game_day_players').select('*').eq('game_day_id',Number(dayId)),
        engine.sb.from('game_player_stats').select('*').eq('game_day_id',Number(dayId))
      ]);
      if(dayRes.error)throw dayRes.error;if(matchRes.error)throw matchRes.error;
      const dayRowsBefore=dayRes.data||[],matchRowsBefore=matchRes.data||[];
      const oldDailyValues=engine.hasNonZeroDayStats?engine.hasNonZeroDayStats(dayRowsBefore):dayStatsHaveValues(dayRowsBefore);
      const oldStatsMatch=engine.dayTotalsMatchMatchStats?engine.dayTotalsMatchMatchStats(dayRowsBefore,matchRowsBefore):false;
      const prospective=matchRowsBefore.filter((x:any)=>String(x.game_id)!==String(game.id)).concat(rows);
      const completeAfter=engine.isDayMatchStatsComplete?await engine.isDayMatchStatsComplete(Number(dayId),prospective):false;
      let syncDaily=completeAfter&&(!oldDailyValues||oldStatsMatch);
      if(oldDailyValues&&!oldStatsMatch&&completeAfter){
        const message='Все матчи этого игрового дня имеют поматчевые записи, но их сумма отличается от текущих дневных итогов. Если продолжить, дневная статистика игроков будет заменена суммой записей по всем матчам. Проверь, что статистика каждого матча заполнена полностью. Продолжить?';
        if(!window.confirm(message)){setSaving(false);return;}
        syncDaily=true;
      }else if(oldDailyValues&&!oldStatsMatch&&!completeAfter){syncDaily=false;}
      const previousGameStats=matchRowsBefore.filter((x:any)=>String(x.game_id)===String(game.id));
      const ur=await engine.sb.from('game_player_stats').upsert(rows,{onConflict:'game_id,player_id'});
      if(ur.error)throw ur.error;
      const sr=await engine.sb.from('games').update({score_a:Number(scoreA),score_b:Number(scoreB)}).eq('id',game.id);
      if(sr.error){
        try{
          const previousIds=new Set(previousGameStats.map((x:any)=>String(x.player_id)));
          const newPlayerIds=rows.filter((x:any)=>!previousIds.has(String(x.player_id))).map((x:any)=>x.player_id);
          if(newPlayerIds.length){const rollbackDelete=await engine.sb.from('game_player_stats').delete().eq('game_id',game.id).in('player_id',newPlayerIds);if(rollbackDelete.error)throw rollbackDelete.error;}
          if(previousGameStats.length){const rollbackRows=await engine.sb.from('game_player_stats').upsert(previousGameStats,{onConflict:'game_id,player_id'});if(rollbackRows.error)throw rollbackRows.error;}
        }catch(rollbackError:any){throw new Error(`Не удалось обновить счёт (${sr.error.message}) и восстановить прежние записи статистики (${rollbackError?.message||'ошибка отката'}).`);}
        throw sr.error;
      }
      matchAndScoreSaved=true;
      let status='Сохранено. Можно выбрать следующую игру.';
      if(syncDaily){
        const sync=await engine.syncDayAggregateFromMatchStats?.(Number(dayId),{force:true});
        if(sync&&sync.synced===false){status='Матч и счёт сохранены, но дневные итоги не синхронизированы: '+(sync.reason==='player_team_conflict'?'у игрока указаны разные команды в разных матчах.':'найдено расхождение статистики. Проверь данные вручную.');}
        else status='Сохранено и синхронизировано с итогами игрового дня.';
      }else{
        status='Матч сохранён. Старые дневные итоги оставлены без изменений, чтобы не потерять статистику: не все матчи этого дня ещё заполнены. После заполнения всех матчей сайт предложит синхронизацию.';
      }
      await onSaved();setSaving(false);setError(status);
    }catch(e:any){
      setSaving(false);
      if(matchAndScoreSaved){try{await onSaved();}catch{}setError(`Матч и счёт сохранены, но не удалось обновить дневные итоги: ${e?.message||'ошибка синхронизации'}. Проверь синхронизацию перед повторным редактированием.`);}
      else setError(`Не удалось сохранить матч: ${e?.message||'ошибка базы данных'}. Проверь данные и повтори попытку.`);
    }
  };
  const roster=(arr:any[],team:any)=><div className="quick-roster"><div className="quick-team-title"><span className="team-dot" style={{'--team':team?.color||'#cfb842'} as any}></span><b>{adminTeamName(team)}</b><small>{arr.length} игроков</small></div>{arr.length?arr.map(item=>{const p=item.player,d=draft[String(p.id)]||{};return <div className="quick-player" key={p.id}><div className="quick-player-name"><b>{p.name}</b><small>{p.position||'Игрок'}</small></div><label>{icon('goal',20)}<span>Г</span><input type="number" min="0" step="1" value={d.goals??0} onChange={e=>setStat(p.id,'goals',e.target.value)}/></label><label>{icon('pass',20)}<span>П</span><input type="number" min="0" step="1" value={d.assists??0} onChange={e=>setStat(p.id,'assists',e.target.value)}/></label><label>{icon('own',20)}<span>АГ</span><input type="number" min="0" step="1" value={d.own_goals??0} onChange={e=>setStat(p.id,'own_goals',e.target.value)}/></label><label>{icon('saves',20)}<span>С</span><input type="number" min="0" step="1" value={d.saves??0} onChange={e=>setStat(p.id,'saves',e.target.value)}/></label><label>{icon('conceded',20)}<span>Пр</span><input type="number" min="0" step="1" value={d.conceded??0} onChange={e=>setStat(p.id,'conceded',e.target.value)}/></label><button type="button" className={d.goalkeeper?'quick-gk active':'quick-gk'} onClick={()=>setStat(p.id,'goalkeeper',!d.goalkeeper)}>{icon('saves',20)}<span>В воротах</span></button><strong className="quick-rating">{rating(d,item.team_id,p.id)}</strong></div>;}):<div className="quick-empty">В этой команде пока нет назначенных игроков.</div>}</div>;
  return <div className="modal-backdrop quick-backdrop"><div className="modal-card quick-card"><button className="modal-x" onClick={onClose}><X/></button><div className="eyebrow">АДМИН · БЫСТРАЯ СТАТИСТИКА</div><h2>Заполнение во время паузы</h2><p className="muted">Выбери игровой день, создай игру из двух команд или открой существующую. Статистика сохраняется отдельно для каждой игры, затем суммируется в рейтинг дня и общий рейтинг.</p><div className="quick-selects"><label>Игровой день<select value={dayId} onChange={e=>{setDayId(e.target.value);setGameId('');}}><option value="">Выбрать игровой день</option>{days.map(d=><option key={d.id} value={d.id}>{fmtDate(d.game_date)} · {d.place||'Без места'}</option>)}</select></label>{day&&<label>Игра<select value={gameId} onChange={e=>setGameId(e.target.value)}><option value="">Выбрать игру</option>{dayGames.map(g=>{const a=dayTeams.find(t=>String(t.id)===String(g.team_a_id));const b=dayTeams.find(t=>String(t.id)===String(g.team_b_id));return <option key={g.id} value={g.id}>№{g.game_order||dayGames.findIndex(x=>String(x.id)===String(g.id))+1}: {adminTeamName(a)} — {adminTeamName(b)}</option>})}</select></label>}</div>{day&&<div className="quick-create-game"><h3>Создать игру</h3><div className="quick-selects"><label>Команда 1<select value={newTeamA} onChange={e=>setNewTeamA(e.target.value)}><option value="">Выбрать команду</option>{dayTeams.map(t=><option key={t.id} value={t.id}>{adminTeamName(t)}</option>)}</select></label><label>Команда 2<select value={newTeamB} onChange={e=>setNewTeamB(e.target.value)}><option value="">Выбрать команду</option>{dayTeams.map(t=><option key={t.id} value={t.id}>{adminTeamName(t)}</option>)}</select></label></div><button type="button" className="primary-btn" onClick={createGame} disabled={creatingGame||dayTeams.length<2}>{creatingGame?'Создаём…':'+ Создать игру'}</button>{dayTeams.length<2&&<small>Для создания игры нужно минимум две команды в выбранном игровом дне.</small>}</div>}{day&&<div className="quick-day-rating"><h3>Общий рейтинг игрового дня</h3><p>Рейтинг учитывает статистику всего дня; ниже — не рейтинг отдельного матча.</p><div className="quick-day-rating-list">{dayPlayers.filter(x=>String(x.game_day_id)===String(dayId)).map(x=>{const player=players.find(p=>String(p.id)===String(x.player_id));const team=dayTeams.find(t=>String(t.id)===String(x.team_id));const value=engine?.dayRatingForEntry?Number(engine.dayRatingForEntry(x,dayGames)):5;return player?<div key={x.player_id}><span>{player.name}<small>{adminTeamName(team)}</small></span><b>{Number.isFinite(value)?value.toFixed(1):'5.0'}</b></div>:null;})}</div></div>}{game&&<><div className="quick-score"><div><b>{adminTeamName(teamA)}</b><input type="number" min="0" step="1" value={scoreA} onChange={e=>setScoreA(e.target.value)}/></div><span>:</span><div><input type="number" min="0" step="1" value={scoreB} onChange={e=>setScoreB(e.target.value)}/><b>{adminTeamName(teamB)}</b></div></div><div className="quick-rosters">{roster(rosterA,teamA)}{roster(rosterB,teamB)}</div><div className="quick-footer"><span>{error||(statsLoading?'Загружаем статистику выбранного матча…':'Статистика сохраняется отдельно для каждой игры. После сохранения можно выбрать следующую игру.')}</span><button className="primary-btn" onClick={save} disabled={saving||statsLoading}>{saving?'Сохраняем…':'💾 Сохранить'}</button></div></>}</div></div>;
}


function CreateGameDayModal({engine,onClose,onSaved}:{engine:any;onClose:()=>void;onSaved:(day:any)=>Promise<void>}){
  const localToday=()=>{const d=new Date();const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;};
  const [date,setDate]=useState(localToday);
  const [time,setTime]=useState('20:00');
  const [place,setPlace]=useState('Царицыно');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';};},[]);
  const save=async()=>{
    if(saving)return;
    setError('');
    if(!date||!time||!place){setError('Заполни дату, время и место игрового дня.');return;}
    if(!engine?.sb){setError('Нет подключения к Supabase. Обнови страницу и попробуй снова.');return;}
    setSaving(true);
    try{
      const sessionResult=await engine.sb.auth.getSession();
      if(sessionResult.error)throw sessionResult.error;
      if(!sessionResult.data?.session)throw new Error('Сессия администратора не найдена. Войди в админку заново.');
      const adminCheck=await engine.sb.rpc('is_site_admin');
      if(adminCheck.error)throw adminCheck.error;
      if(adminCheck.data!==true)throw new Error('Supabase не подтвердил права администратора. Повторно войди в админку.');
      const result=await engine.sb.from('game_days').insert({game_date:date,game_time:time,place}).select('*').single();
      if(result.error)throw result.error;
      if(!result.data?.id)throw new Error('Supabase не вернул созданную запись игрового дня.');
      await onSaved(result.data);
      onClose();
    }catch(e:any){
      console.error('Ошибка создания игрового дня:',e);
      const message=e?.message||e?.details||e?.hint||'Неизвестная ошибка Supabase.';
      setError(`Не удалось создать игровой день: ${message}`);
    }finally{setSaving(false);}
  };
  return <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={e=>{if(e.target===e.currentTarget&&!saving)onClose();}}>
    <div className="modal-card small">
      <button type="button" className="modal-x" onClick={onClose} disabled={saving} aria-label="Закрыть"><X/></button>
      <div className="eyebrow">АДМИН · НОВАЯ ЗАПИСЬ</div>
      <h2>Новый игровой день</h2>
      <p className="muted">Создай день отдельно. Команды, матчи и игроки можно добавить позже.</p>
      <label>Дата игрового дня<input type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label>
      <label>Время начала<input type="time" value={time} onChange={e=>setTime(e.target.value)} required/></label>
      <label>Место<select value={place} onChange={e=>setPlace(e.target.value)} required><option value="Царицыно">Царицыно</option><option value="Металлург">Металлург</option></select></label>
      {error&&<div className="error" role="alert">{error}</div>}
      <button type="button" className="primary-btn full" onClick={save} disabled={saving||!date||!time||!place}>{saving?'Сохраняем…':'Сохранить игровой день'}</button>
    </div>
  </div>;
}

function EditDayModal({dayId,players,days,teams,games,dayPlayers,icons,engine,onClose,onSaved}:{dayId:number;players:any[];days:any[];teams:any[];games:any[];dayPlayers:any[];icons:Record<string,string>;engine:any;onClose:()=>void;onSaved:()=>Promise<void>}){
  const day=days.find(d=>String(d.id)===String(dayId));
  const [date,setDate]=useState(day?.game_date||'');
  const [time,setTime]=useState((day?.game_time||'').slice(0,5));
  const [place,setPlace]=useState(day?.place||'');
  const [teamDraft,setTeamDraft]=useState(()=>{const current=teams.filter(t=>String(t.game_day_id)===String(dayId)).map(t=>({...t}));const presets=[['Пунктуальные','#FFFFFF'],['Сообразительные','#383838'],['Красивые','#E53935'],['Стильные','#FDD835']];while(current.length<2){const i=current.length;current.push({id:-(i+1),game_day_id:dayId,name:presets[i][0],color:presets[i][1],sort_order:i+1});}return current;});
  const [teamMode,setTeamMode]=useState(()=>Math.max(2,Math.min(4,teams.filter(t=>String(t.game_day_id)===String(dayId)).length||2)));
  const [gameDraft,setGameDraft]=useState(()=>games.filter(g=>String(g.game_day_id)===String(dayId)).map(g=>({...g})));
  const [playerDraft,setPlayerDraft]=useState(()=>{
    const current=dayPlayers.filter(x=>String(x.game_day_id)===String(dayId));
    return players.map(p=>{const x=current.find(v=>String(v.player_id)===String(p.id));return {playerId:p.id,teamId:x?.team_id?Number(x.team_id):'',goals:Number(x?.goals||0),assists:Number(x?.assists||0),conceded:Number(x?.conceded||0),ownGoals:Number(x?.own_goals||0),saves:Number(x?.saves||0),goalkeeper:!!x?.goalkeeper};});
  });
  const [imageFile,setImageFile]=useState<File|null>(null);
  const [removeImage,setRemoveImage]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const currentImagePath=day?.image_path||null;

  useEffect(()=>{document.body.style.overflow='hidden';return()=>{document.body.style.overflow='';};},[]);
  if(!day) return null;
  const icon=(name:string,size=24)=>icons[name]?<img className="editor-ui-icon" src={icons[name]} style={{width:size,height:size}} alt=""/>:<span className="editor-ui-fallback">•</span>;
  const updatePlayer=(id:number,patch:any)=>setPlayerDraft(prev=>prev.map(x=>x.playerId===id?{...x,...patch}:x));
  const addPlayerToTeam=(teamId:number,playerId:number)=>{
    if(!Number.isSafeInteger(playerId)||!players.some(p=>Number(p.id)===playerId))return;
    setPlayerDraft(prev=>prev.map(x=>Number(x.playerId)===playerId?{...x,teamId}:x));
  };
  const removePlayerFromDay=(playerId:number)=>{
    setPlayerDraft(prev=>prev.map(x=>Number(x.playerId)===playerId?{...x,teamId:''}:x));
  };
  const playerStats=(p:any,x:any)=>{
    const gp=Number(x.goals||0)+Number(x.assists||0);
    return <div className="editor-player" key={p.id}>
      <div className="editor-player-head">
        <div className="editor-player-name">{p.name}<small>{p.position||'Позиция не указана'}{p.is_goalkeeper?' · Вратарь':''}</small></div>
        <button type="button" className="editor-remove-player" onClick={()=>removePlayerFromDay(p.id)} aria-label={`Убрать ${p.name} из состава`}>Убрать из состава ×</button>
      </div>
      <div className="editor-player-stats">
        <label>{icon('goal',22)}<span>Забил</span><input type="number" min="0" step="1" value={x.goals} onChange={e=>updatePlayer(p.id,{goals:e.target.value===''?'':Number(e.target.value)})}/></label>
        <label>{icon('pass',22)}<span>Пас</span><input type="number" min="0" step="1" value={x.assists} onChange={e=>updatePlayer(p.id,{assists:e.target.value===''?'':Number(e.target.value)})}/></label>
        <div className="editor-stat-read"><span>{icon('gp',22)} Г+П</span><b>{gp}</b></div>
        <label>{icon('own',22)}<span>Автогол</span><input type="number" min="0" step="1" value={x.ownGoals} onChange={e=>updatePlayer(p.id,{ownGoals:e.target.value===''?'':Number(e.target.value)})}/></label>
        <label>{icon('saves',22)}<span>Сейвы</span><input type="number" min="0" step="1" value={x.saves} onChange={e=>updatePlayer(p.id,{saves:e.target.value===''?'':Number(e.target.value)})}/></label>
        <label>{icon('conceded',22)}<span>Пропустил</span><input type="number" min="0" step="1" value={x.conceded} onChange={e=>updatePlayer(p.id,{conceded:e.target.value===''?'':Number(e.target.value)})}/></label>
        <button type="button" className={x.goalkeeper?'gk-button active':'gk-button'} onClick={()=>updatePlayer(p.id,{goalkeeper:!x.goalkeeper})}>{icon('saves',22)} <span>В воротах</span></button>
        <div className="editor-stat-read rating"><span>{icon('rating',22)} Рейтинг дня</span><b>{ratingFor(x).toFixed(1)}</b></div>
      </div>
    </div>;
  };
  const ratingFor=(x:any)=>{ if(!x.teamId || !engine?.dayRatingForEntry) return 5; const value=Number(engine.dayRatingForEntry({game_day_id:dayId,team_id:Number(x.teamId),player_id:Number(x.playerId),goals:Number(x.goals)||0,assists:Number(x.assists)||0,conceded:Number(x.conceded)||0,own_goals:Number(x.ownGoals)||0,saves:Number(x.saves)||0,goalkeeper:!!x.goalkeeper},gameDraft)); return Number.isFinite(value)?value:5; };
  const save=async()=>{
    if(!engine?.sb){setError('Нет подключения к базе данных.');return;}
    if(!date){setError('Укажи дату игрового дня.');return;}
    if(gameDraft.some(g=>!g.team_a_id||!g.team_b_id||String(g.team_a_id)===String(g.team_b_id)||!teamDraft.some(t=>String(t.id)===String(g.team_a_id))||!teamDraft.some(t=>String(t.id)===String(g.team_b_id)))){setError('В каждой игре должны быть две разные существующие команды.');return;}
    for(let i=0;i<gameDraft.length;i++){const g=gameDraft[i];if(!isNonNegativeInteger(g.score_a)||!isNonNegativeInteger(g.score_b)){setError(`Проверь счёт в игре №${i+1}: нужны целые неотрицательные числа.`);return;}}
    const statFields:Array<['goals'|'assists'|'conceded'|'ownGoals'|'saves',string]>=[['goals','голы'],['assists','передачи'],['conceded','пропущенные мячи'],['ownGoals','автоголы'],['saves','сейвы']];
    for(const x of playerDraft){if(!x.teamId)continue;for(const [key,label] of statFields){if(!isNonNegativeInteger(x[key]??0)){setError(`У игрока ${players.find(p=>p.id===x.playerId)?.name||x.playerId} поле «${label}» должно быть целым неотрицательным числом.`);return;}}}
    if(teamDraft.length!==teamMode||teamMode<2||teamMode>4){setError('Выбери режим игрового дня: 2, 3 или 4 команды.');return;}
    const dayCurrent=dayPlayers.filter(x=>String(x.game_day_id)===String(dayId));
    const dailyRows=playerDraft.filter(x=>x.teamId).map(x=>({game_day_id:dayId,player_id:x.playerId,team_id:Number(x.teamId),goals:Number(x.goals)||0,assists:Number(x.assists)||0,conceded:Number(x.conceded)||0,own_goals:Number(x.ownGoals)||0,saves:Number(x.saves)||0,goalkeeper:!!x.goalkeeper}));
    const oldByPlayer=new Map<string,any>(dayCurrent.map(x=>[String(x.player_id),x]));
    const newByPlayer=new Map<string,any>(dailyRows.map(x=>[String(x.player_id),x]));
    const changedIds=new Set<string>([...oldByPlayer.keys(),...newByPlayer.keys()]);
    const dayStatsChanged=[...changedIds].some(id=>{
      const a=oldByPlayer.get(id)||{};const b=newByPlayer.get(id)||{};
      return ['team_id','goals','assists','conceded','own_goals','saves','goalkeeper'].some((k)=>{
        const keyMap:any={team_id:'team_id',goals:'goals',assists:'assists',conceded:'conceded',own_goals:'own_goals',saves:'saves',goalkeeper:'goalkeeper'};
        const bk=keyMap[k];const av=k==='team_id'?(a.team_id??''):k==='goalkeeper'?!!a.goalkeeper:Number(a[k])||0;const bv=k==='team_id'?(b[bk]??''):k==='goalkeeper'?!!b[bk]:Number(b[bk])||0;return String(av)!==String(bv);
      });
    });
    const scoreGoals=gameDraft.reduce((s,g)=>s+Number(g.score_a)+Number(g.score_b),0);
    const playerGoals=dailyRows.reduce((s,x)=>s+x.goals+x.own_goals,0);
    const originalGamesForValidation=games.filter(g=>String(g.game_day_id)===String(dayId));
    const scoresChanged=gameDraft.length!==originalGamesForValidation.length||gameDraft.some(g=>{const old=originalGamesForValidation.find(v=>String(v.id)===String(g.id));return !old||String(old.team_a_id)!==String(g.team_a_id)||String(old.team_b_id)!==String(g.team_b_id)||Number(old.score_a)!==Number(g.score_a)||Number(old.score_b)!==Number(g.score_b);});
    if((scoresChanged||dayStatsChanged)&&scoreGoals!==playerGoals&&!window.confirm(`Проверка игрового дня: по табло ${scoreGoals} голов, в статистике игроков ${playerGoals} (включая автоголы). Сохранить несмотря на расхождение?`))return;
    setSaving(true);setError('');
    let postSaveWarning='';
    try{
      const [matchRes,dayRes]=await Promise.all([
        engine.sb.from('game_player_stats').select('*').eq('game_day_id',dayId),
        engine.sb.from('game_day_players').select('*').eq('game_day_id',dayId)
      ]);
      if(matchRes.error)throw matchRes.error;if(dayRes.error)throw dayRes.error;
      const matchRowsBefore:any[]=matchRes.data||[];const dayRowsBefore:any[]=dayRes.data||[];
      let clearMatchDetails=false;
      if(dayStatsChanged&&matchRowsBefore.length){
        const ok=window.confirm('В этом дне есть статистика по отдельным матчам. Ты изменяешь итоговую статистику дня вручную. Чтобы данные не конфликтовали, поматчевые записи этого дня будут удалены, а дневная статистика сохранится как итоговая. Продолжить?');
        if(!ok){setSaving(false);return;}
        clearMatchDetails=true;
      }
      const originalGames=games.filter(g=>String(g.game_day_id)===String(dayId));
      const originalTeams=teams.filter(t=>String(t.game_day_id)===String(dayId));
      const removedTeamIds=originalTeams.filter(t=>!teamDraft.some(x=>String(x.id)===String(t.id))).map(t=>t.id);
      let r:any;
      const insertedTeams:any[]=[];
      for(let i=0;i<teamDraft.length;i++){
        const t=teamDraft[i];
        if(Number(t.id)>0){r=await engine.sb.from('teams').update({name:t.name,color:t.color,sort_order:i+1}).eq('id',t.id);if(r.error)throw r.error;}
        else {const created=await engine.sb.from('teams').insert({game_day_id:dayId,name:t.name,color:t.color,sort_order:i+1}).select('*').single();if(created.error)throw created.error;insertedTeams.push({temporaryId:t.id,team:created.data});}
      }
      const teamIdMap=new Map<string,number>(insertedTeams.map(x=>[String(x.temporaryId),Number(x.team.id)]));
      const savedTeamId=(id:any)=>teamIdMap.get(String(id))??Number(id);
      const savedGameDraft=gameDraft.map(g=>({...g,team_a_id:savedTeamId(g.team_a_id),team_b_id:savedTeamId(g.team_b_id)}));
      const originalIds=new Set(originalGames.map(g=>String(g.id)));
      const keptIds=new Set(gameDraft.filter(g=>g.id!=null).map(g=>String(g.id)));
      const removedIds=originalGames.filter(g=>!keptIds.has(String(g.id))).map(g=>g.id);
      const changedTeamGameIds=gameDraft.filter(g=>{
        if(g.id==null||!originalIds.has(String(g.id)))return false;
        const before=originalGames.find(v=>String(v.id)===String(g.id));
        return !!before&&(String(before.team_a_id)!==String(g.team_a_id)||String(before.team_b_id)!==String(g.team_b_id));
      }).map(g=>g.id);
      let clearChangedGameStats=false;
      if(!dayStatsChanged&&matchRowsBefore.length&&changedTeamGameIds.length){
        const ok=window.confirm('Ты меняешь состав команд в уже заполненных матчах. Поматчевая статистика только этих игр будет удалена, чтобы не привязать голы и сейвы к неправильной команде. После сохранения её нужно будет внести заново. Продолжить?');
        if(!ok){setSaving(false);return;}
        clearChangedGameStats=true;
      }
      r=await engine.sb.from('game_days').update({game_date:date,game_time:time||null,place:place||null}).eq('id',dayId);if(r.error)throw r.error;
      // Update retained games and create new games first. Existing IDs are kept so per-match stats remain linked.
      for(let i=0;i<savedGameDraft.length;i++){
        const g=savedGameDraft[i];const payload={game_day_id:dayId,team_a_id:Number(g.team_a_id),team_b_id:Number(g.team_b_id),score_a:Number(g.score_a),score_b:Number(g.score_b),game_order:i+1};
        if(g.id!=null&&originalIds.has(String(g.id))){r=await engine.sb.from('games').update(payload).eq('id',g.id);if(r.error)throw r.error;}
        else {r=await engine.sb.from('games').insert(payload);if(r.error)throw r.error;}
      }
      if(dayStatsChanged||!matchRowsBefore.length){
        const mappedDailyRows=dailyRows.map(x=>({...x,team_id:savedTeamId(x.team_id)}));
        if(mappedDailyRows.length){r=await engine.sb.from('game_day_players').upsert(mappedDailyRows,{onConflict:'game_day_id,player_id'});if(r.error)throw r.error;}
        const selectedIds=new Set(dailyRows.map(x=>String(x.player_id)));const removedPlayerIds=dayRowsBefore.filter(x=>!selectedIds.has(String(x.player_id))).map(x=>x.player_id);
        if(removedPlayerIds.length){r=await engine.sb.from('game_day_players').delete().eq('game_day_id',dayId).in('player_id',removedPlayerIds);if(r.error)throw r.error;}
      }
      // Only remove detailed match rows after game metadata and any replacement day totals saved successfully.
      if(clearMatchDetails){r=await engine.sb.from('game_player_stats').delete().eq('game_day_id',dayId);if(r.error)throw r.error;}
      else {
        const statGameIds=[...new Set([...removedIds,...(clearChangedGameStats?changedTeamGameIds:[])].map(Number))];
        if(statGameIds.length){r=await engine.sb.from('game_player_stats').delete().in('game_id',statGameIds);if(r.error)throw r.error;}
      }
      if(removedIds.length){r=await engine.sb.from('games').delete().in('id',removedIds);if(r.error)throw r.error;}
      if(removedTeamIds.length){r=await engine.sb.from('teams').delete().in('id',removedTeamIds);if(r.error)throw r.error;}
      if(!dayStatsChanged&&matchRowsBefore.length){
        const teamsConsistent=!!engine.matchStatsHaveConsistentTeams?.(matchRowsBefore);
        const safe=teamsConsistent&&(!engine.hasNonZeroDayStats?.(dayRowsBefore)||!!engine.dayTotalsMatchMatchStats?.(dayRowsBefore,matchRowsBefore));
        const completeNow=engine.isDayMatchStatsComplete?await engine.isDayMatchStatsComplete(Number(dayId)):false;
        if(safe&&completeNow){
          const zeroIds=matchRowsBefore.filter(x=>removedIds.some((id:any)=>String(id)===String(x.game_id))).map(x=>x.player_id);
          const sync=await engine.syncDayAggregateFromMatchStats?.(Number(dayId),{force:true,zeroPlayerIds:zeroIds});
          if(sync?.synced===false)postSaveWarning='Матчи обновлены, но дневные итоги не синхронизированы из-за конфликта команды или статистики. Проверь данные вручную.';
        }else if(!safe){
          postSaveWarning='Матчи и команды обновлены. Дневные итоги оставлены без изменений, потому что они не совпадают с поматчевой статистикой.';
        }else{
          postSaveWarning='Матчи обновлены, но дневные итоги оставлены без изменений: не все текущие матчи имеют полную поматчевую статистику. Заполни оставшиеся игры, затем синхронизируй итоги.';
        }
      }
      // Изображение игрового дня загружается напрямую из нового интерфейса через Supabase Storage.
      // Ошибка картинки не отменяет сохранение даты, команд, матчей и статистики.
      if(!imageFile&&removeImage&&currentImagePath){
        const cleared=await engine.sb.from('game_days').update({image_url:null,image_path:null}).eq('id',dayId);
        if(cleared.error) postSaveWarning=(postSaveWarning?postSaveWarning+' ':'')+'Не удалось отвязать старую картинку: '+cleared.error.message;
        else {
          const removed=await engine.sb.storage.from('game-day-images').remove([currentImagePath]);
          if(removed.error) postSaveWarning=(postSaveWarning?postSaveWarning+' ':'')+'Ссылка на картинку удалена, но файл в хранилище остался: '+removed.error.message;
        }
      } else if(imageFile){
        try{
          const mimeToExt:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
          const ext=mimeToExt[imageFile.type];
          if(!ext) throw new Error('Поддерживаются JPG, PNG, WEBP и GIF.');
          if(imageFile.size>10*1024*1024) throw new Error('Размер изображения превышает 10 МБ.');
          const path=`game-days/${dayId}-${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
          const uploaded=await engine.sb.storage.from('game-day-images').upload(path,imageFile,{upsert:false,contentType:imageFile.type,cacheControl:'3600'});
          if(uploaded.error) throw uploaded.error;
          const publicUrl=engine.sb.storage.from('game-day-images').getPublicUrl(path).data.publicUrl;
          const linked=await engine.sb.from('game_days').update({image_url:publicUrl,image_path:path}).eq('id',dayId);
          if(linked.error){
            await engine.sb.storage.from('game-day-images').remove([path]);
            throw linked.error;
          }
          if(currentImagePath){
            const removed=await engine.sb.storage.from('game-day-images').remove([currentImagePath]);
            if(removed.error) postSaveWarning=(postSaveWarning?postSaveWarning+' ':'')+'Новая картинка сохранена, но старая осталась в хранилище: '+removed.error.message;
          }
        }catch(imageError:any){
          postSaveWarning=(postSaveWarning?postSaveWarning+' ':'')+'Игровой день сохранён, но картинка не загрузилась: '+(imageError?.message||'неизвестная ошибка');
        }
      }
      await onSaved();
    }catch(e:any){try{await engine.loadPlayers?.();await engine.loadDays?.();}catch{}setError(`Не удалось полностью завершить сохранение: ${e?.message||'ошибка базы данных'}. Часть изменений могла сохраниться; проверь игровой день перед повторной попыткой.`);setSaving(false);return;}
    setSaving(false);
    onClose();
    if(postSaveWarning)window.alert(postSaveWarning);
  };
  const setMode=(count:number)=>{const next=teamDraft.slice(0,count);for(let i=next.length;i<count;i++){const presets=[['Пунктуальные','#FFFFFF'],['Сообразительные','#383838'],['Красивые','#E53935'],['Стильные','#FDD835']];const [name,color]=presets[i];next.push({id:-(i+1),game_day_id:dayId,name,color,sort_order:i+1});}const removed=teamDraft.slice(count);const blocked=removed.some(t=>Number(t.id)>0&&(games.some(g=>String(g.game_day_id)===String(dayId)&&(String(g.team_a_id)===String(t.id)||String(g.team_b_id)===String(t.id)))||dayPlayers.some(p=>String(p.game_day_id)===String(dayId)&&String(p.team_id)===String(t.id))));if(blocked){window.alert('Нельзя уменьшить число команд: у удаляемой команды уже есть матчи или игроки. Сначала убери их из состава и матчей.');return;}const removedIds=removed.map(t=>String(t.id));setTeamMode(count);setTeamDraft(next);setGameDraft(prev=>prev.filter(g=>!removedIds.includes(String(g.team_a_id))&&!removedIds.includes(String(g.team_b_id))));setPlayerDraft(prev=>prev.map(x=>removedIds.includes(String(x.teamId))?{...x,teamId:''}:x));};
  const addGame=()=>{if(teamDraft.length<2)return;setGameDraft(prev=>[...prev,{game_day_id:dayId,team_a_id:teamDraft[0].id,team_b_id:teamDraft[1].id,score_a:0,score_b:0,game_order:prev.length+1}]);};
  return <div className="native-editor-backdrop" role="dialog" aria-modal="true">
    <div className="native-editor-modal">
      <div className="native-editor-top"><div><div className="eyebrow">АДМИНКА · РЕДАКТИРОВАНИЕ</div><h2>Игровой день {fmtDate(date)}</h2><p>Дата, команды, счёт, состав и статистика. Здесь список игроков загружается напрямую из текущих данных сайта.</p></div><button className="native-editor-close" onClick={onClose} aria-label="Закрыть"><X/></button></div>
      <div className="editor-fields"><label><span>📅 Дата игрового дня</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label><span>🕐 Время</span><input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label><span>🏟 Место</span><select value={place||"Металлург"} onChange={e=>setPlace(e.target.value)}><option value="Металлург">Металлург</option><option value="Царицыно">Царицыно</option></select></label></div>
      <section className="editor-section"><div className="editor-section-head"><div><h3>📷 Картинка составов</h3><p>Можно оставить текущую, заменить её или удалить.</p></div></div>{day.image_url?<img className="editor-image-preview" src={day.image_url} alt="Составы команд"/>:<div className="editor-image-empty">Картинка составов не загружена.</div>}<div className="editor-image-actions"><label className="file-btn">Выбрать файл<input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0]||null)}/></label>{day.image_url&&<label className="editor-check"><input type="checkbox" checked={removeImage} onChange={e=>setRemoveImage(e.target.checked)}/> Удалить текущую</label>} {imageFile&&<span className="muted">{imageFile.name}</span>}</div></section>
      <section className="editor-section"><div className="editor-section-head"><div><h3>{icon('team',26)} Команды</h3><p>Выбери режим дня и назначь названия командам. Составы и игры можно заполнить позже.</p></div></div><div className="editor-mode-picker"><span>Режим игрового дня</span><div>{[2,3,4].map(n=><button type="button" key={n} className={teamMode===n?'active':''} onClick={()=>setMode(n)}>{n} команды</button>)}</div></div><div className="editor-team-grid">{teamDraft.map((t,i)=><div className="editor-team-card" key={t.id}><span>Команда {i+1}</span><select value={t.name||'Пунктуальные'} onChange={e=>{const palette:Record<string,string>={'Пунктуальные':'#FFFFFF','Сообразительные':'#383838','Красивые':'#E53935','Стильные':'#FDD835'};const name=e.target.value;setTeamDraft(prev=>prev.map(x=>x.id===t.id?{...x,name,color:palette[name]}:x))}}><option value="Пунктуальные">Пунктуальные (Белые)</option><option value="Сообразительные">Сообразительные (Тёмные)</option><option value="Красивые">Красивые (Красные)</option><option value="Стильные">Стильные (Жёлтые)</option></select><input className="editor-color" type="color" value={({'Пунктуальные':'#FFFFFF','Сообразительные':'#383838','Красивые':'#E53935','Стильные':'#FDD835'} as Record<string,string>)[t.name]||t.color||'#ffffff'} disabled aria-label="Цвет команды"/></div>)}</div></section>
      <section className="editor-section"><div className="editor-section-head"><div><h3>{icon('goal',26)} Игры</h3><p>Матчи и счёт.</p></div><button className="editor-secondary-btn" onClick={addGame}>+ Добавить игру</button></div><div className="editor-games">{gameDraft.map((g,i)=><div className="editor-game-row" key={i}><select value={g.team_a_id} onChange={e=>setGameDraft(prev=>prev.map((x,j)=>j===i?{...x,team_a_id:Number(e.target.value)}:x))}>{teamDraft.map(t=><option key={t.id} value={t.id}>{adminTeamName(t)}</option>)}</select><input type="number" min="0" step="1" value={g.score_a??0} onChange={e=>setGameDraft(prev=>prev.map((x,j)=>j===i?{...x,score_a:e.target.value===''?'':Number(e.target.value)}:x))}/><span>:</span><input type="number" min="0" step="1" value={g.score_b??0} onChange={e=>setGameDraft(prev=>prev.map((x,j)=>j===i?{...x,score_b:e.target.value===''?'':Number(e.target.value)}:x))}/><select value={g.team_b_id} onChange={e=>setGameDraft(prev=>prev.map((x,j)=>j===i?{...x,team_b_id:Number(e.target.value)}:x))}>{teamDraft.map(t=><option key={t.id} value={t.id}>{adminTeamName(t)}</option>)}</select><button type="button" className="editor-delete-btn" onClick={()=>setGameDraft(prev=>prev.filter((_,j)=>j!==i))} aria-label={`Удалить игру ${i+1}`} title="Удалить эту игру">🗑️</button></div>)}</div></section>
      <section className="editor-section">
        <div className="editor-section-head"><div><h3>👥 Состав и статистика игроков</h3><p>Добавляй участников отдельно в каждую команду. Статистика показывается только у выбранных игроков.</p></div></div>
        <div className="editor-legend">{icon('goal',22)} Гол · {icon('pass',22)} Пас · {icon('saves',22)} Сейвы · {icon('conceded',22)} Пропустил · {icon('own',22)} Автогол · {icon('rating',22)} Рейтинг дня</div>
        <div className="editor-roster-teams">
          {teamDraft.map((team,i)=>{
            const members=playerDraft.filter(x=>String(x.teamId)===String(team.id));
            const available=players.filter(p=>!playerDraft.some(x=>String(x.playerId)===String(p.id)&&!!x.teamId));
            return <div className="editor-roster-team" key={team.id}>
              <div className="editor-roster-team-head"><div><h4><span className="editor-team-dot" style={{background:team.color||'#cfb842'}}/> {adminTeamName(team)||`Команда ${i+1}`}</h4><small>Игроков в составе: {members.length}</small></div></div>
              <label className="editor-add-player-label" htmlFor={`editor-add-player-${team.id}`}>Добавить игрока в команду</label>
              <select id={`editor-add-player-${team.id}`} className="editor-add-player-select" value="" onChange={e=>{if(e.target.value)addPlayerToTeam(Number(team.id),Number(e.target.value));}}>
                <option value="">+ Выбрать игрока из базы</option>
                {available.map(p=><option key={p.id} value={p.id}>{p.name}{p.position?` — ${p.position}`:''}</option>)}
              </select>
              <div className="editor-players">
                {members.length===0?<div className="editor-roster-empty">Пока никто не добавлен.</div>:members.map(x=>{
                  const p=players.find(p=>String(p.id)===String(x.playerId));
                  return p?playerStats(p,x):null;
                })}
              </div>
            </div>;
          })}
        </div>
      </section>
      {error&&<div className="editor-error">{error}</div>}
      <div className="native-editor-footer"><button className="editor-cancel-btn" onClick={onClose} disabled={saving}>Отмена</button><button className="editor-save-btn" onClick={save} disabled={saving}>{saving?'Сохраняем…':'💾 Сохранить ВСЁ'}</button></div>
    </div>
  </div>;
}

function PlayerProfileModal({player,days,teams,dayPlayers,icons,onClose,engine}:{player:any;days:any[];teams:any[];dayPlayers:any[];icons:Record<string,string>;onClose:()=>void;engine:any}){
  const icon=(name:string,size=28)=>icons[name]?<img className="profile-icon" src={icons[name]} style={{width:size,height:size}} alt=""/>:<span className="profile-icon-fallback">•</span>;
  const getEngine=()=>engine;
  const entries:any[]=getEngine()?.playerDayEntries?.(player)||dayPlayers.filter(x=>String(x.player_id)===String(player.id)).filter((x,i,a)=>a.findIndex(y=>String(y.game_day_id)===String(x.game_day_id))===i);
  const playedDays=entries.length;
  const canonicalTotals=getEngine()?.playerTotals?.(player);
  const totals={
    goals:canonicalTotals?.goals??entries.reduce((s,x)=>s+(+x.goals||0),0),
    assists:canonicalTotals?.assists??entries.reduce((s,x)=>s+(+x.assists||0),0),
    saves:canonicalTotals?.saves??entries.reduce((s,x)=>s+(+x.saves||0),0),
    conceded:canonicalTotals?.conceded??entries.reduce((s,x)=>s+(+x.conceded||0),0),
    ownGoals:canonicalTotals?.ownGoals??entries.reduce((s,x)=>s+(+x.own_goals||0),0),
  };
  const history=entries.map(x=>{
    const d=days.find(v=>v.id===x.game_day_id); const t=teams.find(v=>v.id===x.team_id);
    const r=getEngine()?.teamResultsForDay?.(x.game_day_id,x.team_id,undefined)||{wins:0,draws:0,losses:0,played:0};
    const rawRating=Number(getEngine()?.dayRatingForEntry?.(x)); const rating=Number.isFinite(rawRating)?rawRating:(player.is_goalkeeper?5.5:5);
    return {x,d,t,r,rating};
  }).sort((a,b)=>(b.d?.game_date||'').localeCompare(a.d?.game_date||''));
  const savedOverall=Number(getEngine()?.playerTotals?.(player)?.rating); const overall=Number.isFinite(savedOverall)?savedOverall:(history.length?history.reduce((s,x)=>s+x.rating,0)/history.length:(player.is_goalkeeper?5.5:5));
  return <div className="modal-backdrop profile-backdrop">
    <div className="modal-card profile-card">
      <button className="modal-x" onClick={onClose} aria-label="Закрыть"><X/></button>
      <div className="eyebrow">ПРОФИЛЬ ИГРОКА</div>
      <div className="profile-title-row"><div><h2>{player.name}</h2><p className="muted">{player.position||'Игрок'}{player.is_goalkeeper?' · Вратарь':''}</p></div><div className="profile-rating"><span>{icon('rating',38)}</span><small>Общий рейтинг</small><b>{overall.toFixed(2)}</b><em className={playedDays>=3?'profile-rating-status confirmed':'profile-rating-status preliminary'}>{playedDays>=3?'Подтверждённый рейтинг':`Предварительный · ещё ${3-playedDays} ${playedDays===2?'игровой день':'игровых дня'} до подтверждения`}</em></div></div>
      <div className="profile-stat-grid">
        <div className="profile-stat">{icon('goal',30)}<small>Голы</small><b>{totals.goals}</b></div>
        <div className="profile-stat">{icon('pass',30)}<small>Пасы</small><b>{totals.assists}</b></div>
        <div className="profile-stat">{icon('gp',30)}<small>Г+П</small><b>{totals.goals+totals.assists}</b></div>
        <div className="profile-stat">{icon('saves',30)}<small>Сейвы</small><b>{totals.saves}</b></div>
        <div className="profile-stat">{icon('conceded',30)}<small>Пропущено</small><b>{totals.conceded}</b></div>
        <div className="profile-stat">{icon('own',30)}<small>Автоголы</small><b>{totals.ownGoals}</b></div>
        <div className="profile-stat">{icon('day',30)}<small>Игровые дни</small><b>{playedDays}</b></div>
      </div>
      <div className="profile-section-title"><div><div className="eyebrow">ИСТОРИЯ</div><h3>Выступления</h3></div></div>
      {history.length?<div className="profile-history-wrap"><table className="stats-table history-table profile-history"><thead><tr><th>Дата</th><th>Команда</th><th>Результат</th><th>Г</th><th>П</th><th>Г+П</th><th>С</th><th>Пр</th><th>АГ</th><th>Рейтинг дня</th></tr></thead><tbody>{history.map(h=><tr key={h.x.id||`${h.x.game_day_id}-${h.x.player_id}`}><td>{h.d?fmtDate(h.d.game_date):'—'}</td><td><span className="team-dot" style={{'--team':h.t?.color||'#fff'} as any}></span>{h.t?.name||'—'}</td><td><span className="result-line"><span>🏆 {h.r.wins}</span><span>➖ {h.r.draws}</span><span>✕ {h.r.losses}</span></span></td><td>{+h.x.goals||0}</td><td>{+h.x.assists||0}</td><td><b>{(+h.x.goals||0)+(+h.x.assists||0)}</b></td><td>{+h.x.saves||0}</td><td>{+h.x.conceded||0}</td><td>{+h.x.own_goals||0}</td><td><b className="profile-day-rating">{h.rating.toFixed(1)}</b></td></tr>)}</tbody></table></div>:<div className="profile-empty">Статистика по игровым дням пока не заполнена.</div>}
    </div>
  </div>;
}

function LoginModal({onClose,onLogin,onVerify}:{onClose:()=>void;onLogin:(e:string,p:string)=>Promise<void>;onVerify:(code:string)=>Promise<void>}){
  const[e,setE]=useState(''),[p,setP]=useState(''),[code,setCode]=useState(''),[stage,setStage]=useState<'password'|'code'>('password'),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  const submit=async()=>{if(busy)return;setErr('');setBusy(true);try{await onLogin(e,p);setStage('code')}catch(x:any){setErr(x?.message||'Не удалось войти в админку.')}finally{setBusy(false)}};
  const verify=async()=>{if(busy)return;setErr('');setBusy(true);try{await onVerify(code)}catch(x:any){setErr(x?.message||'Не удалось подтвердить код.')}finally{setBusy(false)}};
  return <div className="modal-backdrop" onMouseDown={x=>{if(x.target===x.currentTarget)onClose()}}><div className="modal-card small">
    <button className="modal-x" onClick={onClose}><X/></button><div className="modal-icon"><Shield/></div><div className="eyebrow">АДМИНИСТРАТОР</div><h2>{stage==='password'?'Вход в панель':'Подтверждение входа'}</h2>
    {stage==='password'?<form onSubmit={x=>{x.preventDefault();submit()}}>
      <label>Email<input value={e} onChange={x=>setE(x.target.value)} type="email" autoComplete="username" autoFocus placeholder="Email администратора"/></label>
      <label>Пароль<input value={p} onChange={x=>setP(x.target.value)} type="password" autoComplete="current-password" placeholder="Введите пароль"/></label>
      {err&&<div className="error">{err}</div>}
      <button className="primary-btn full" type="submit" disabled={busy}>{busy?'Выполняю вход…':'Продолжить'}</button>
    </form>:<form onSubmit={x=>{x.preventDefault();verify()}}>
      <p>Отправила шестизначный код на Email администратора. Он действует 5 минут.</p>
      <label>Код подтверждения<input value={code} onChange={x=>setCode(x.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="000000" maxLength={6}/></label>
      {err&&<div className="error">{err}</div>}
      <button className="primary-btn full" type="submit" disabled={busy||code.length!==6}>{busy?'Проверяю…':'Подтвердить и открыть админку'}</button>
    </form>}
  </div></div>
}
function PlayerModal({player,onClose,onSave}:{player?:any;onClose:()=>void;onSave:(x:any,y?:string,z?:boolean)=>Promise<void>}){const[p,setP]=useState({...player});const[n,setN]=useState('');const[pos,setPos]=useState('');const[gk,setGk]=useState(false);const isEdit=!!player;return <div className="modal-backdrop"><div className="modal-card"><button className="modal-x" onClick={onClose}><X/></button><div className="eyebrow">ИГРОК</div><h2>{isEdit?'Редактирование игрока':'Новый игрок'}</h2>{isEdit?<><label>Имя<input value={p.name||''} onChange={e=>setP({...p,name:e.target.value})}/></label><label>Позиция<input value={p.position||''} onChange={e=>setP({...p,position:e.target.value})}/></label><label className="check"><input type="checkbox" checked={!!p.is_goalkeeper} onChange={e=>setP({...p,is_goalkeeper:e.target.checked})}/> Вратарь</label><button className="primary-btn full" onClick={()=>onSave(p)}>Сохранить</button></>:<><label>Имя<input value={n} onChange={e=>setN(e.target.value)} placeholder="Иван Иванов"/></label><label>Позиция<input value={pos} onChange={e=>setPos(e.target.value)} placeholder="Защитник"/></label><label className="check"><input type="checkbox" checked={gk} onChange={e=>setGk(e.target.checked)}/> Вратарь</label><button className="primary-btn full" onClick={()=>onSave(n,pos,gk)}>Добавить</button></>}</div></div>}