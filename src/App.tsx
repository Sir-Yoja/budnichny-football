import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, CircleUserRound, LayoutDashboard, LogIn, LogOut, Menu, Pencil, Plus, Shield, Trophy, Users, X, Trash2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { legacyHtml } from './legacyHtml';

type Tab = 'home' | 'rating' | 'admin';
type AdminSection = 'overview' | 'players' | 'days';

type Engine = Window & {
  players?: any[]; days?: any[]; teams?: any[]; games?: any[]; dayPlayers?: any[];
  sb?: any; loadPlayers?: () => Promise<any>; loadDays?: () => Promise<any>;
  openDay?: (id:number)=>Promise<any>; openEditDay?: (id:number)=>Promise<any>; openPlayer?: (id:number)=>void;
  go?: (id:string)=>void; closeModal?: ()=>void; uploadGameDayImage?: (dayId:number,file:File,oldPath?:string|null)=>Promise<any>; removeGameDayImage?: (path:string)=>Promise<any>;
  playerTotals?: (p:any)=>any; playerRating?: (p:any)=>number;
  renderPlayers?: ()=>void; renderAdmin?: ()=>void;
  getLeagueState?: ()=>{players:any[];days:any[];teams:any[];games:any[];dayPlayers:any[]};
  __leagueIcons?: Record<string,string>;
  teamResultsForDay?:(gameDayId:number,teamId:number,gameList?:any[])=>any;dayRatingForEntry?:(entry:any,gameList?:any[])=>number;
};

const fmtDate=(v:string)=>{ if(!v)return '—'; const d=new Date(`${v}T00:00:00`); return new Intl.DateTimeFormat('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d); };
const dayName=(v:string)=>{ if(!v)return ''; const d=new Date(`${v}T00:00:00`); return new Intl.DateTimeFormat('ru-RU',{weekday:'long'}).format(d).toUpperCase(); };

export default function App(){
  const frame=useRef<HTMLIFrameElement>(null);
  const [tab,setTab]=useState<Tab>('home');
  const [adminSection,setAdminSection]=useState<AdminSection>('overview');
  const [players,setPlayers]=useState<any[]>([]);
  const [days,setDays]=useState<any[]>([]);
  const [teams,setTeams]=useState<any[]>([]);
  const [games,setGames]=useState<any[]>([]);
  const [dayPlayers,setDayPlayers]=useState<any[]>([]);
  const [session,setSession]=useState<any>(null);
  const [ready,setReady]=useState(false);
  const [loginOpen,setLoginOpen]=useState(false);
  const [editingPlayer,setEditingPlayer]=useState<any|null>(null);
  const [playerProfile,setPlayerProfile]=useState<any|null>(null);
  const [newPlayerOpen,setNewPlayerOpen]=useState(false);
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
    try{setSession((await w.sb?.auth.getSession())?.data?.session||null)}catch{}
    setReady(true);
  },[]);

  const onLoad=()=>{ setTimeout(refresh,250); };
  useEffect(()=>{ const t=setInterval(()=>{ if(getEngine()?.getLeagueState && getEngine()?.sb) refresh(); },2500); return()=>clearInterval(t); },[refresh]);

  const openDay=(id:number)=>{ setPlayerProfile(null); setDayModal(id); setTimeout(()=>getEngine()?.openDay?.(id),80); };
  const openEdit=(id:number)=>{ setPlayerProfile(null); setDayModal(null); setEditDayId(id); };
  const openProfile=(id:number)=>{ const p=players.find(x=>x.id===id); if(p) setPlayerProfile(p); };
  const closeLegacyModal=()=>{ getEngine()?.closeModal?.(); setDayModal(null); refresh(); };
  const closeEditModal=()=>{ setEditDayId(null); document.body.style.overflow=''; };

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
    setSession(r.data?.session||null);
    setLoginOpen(false);
    setAdminSection('overview');
    await refresh();
  };
  const logout=async()=>{await getEngine()?.sb?.auth.signOut();setSession(null);};
  const addPlayer=async(name:string,position:string='',gk:boolean=false)=>{const w=getEngine(); const r=await w?.sb?.from('players').insert({name,position:position||null,is_goalkeeper:gk}).select().single(); if(r?.error)throw r.error; await refresh();setNewPlayerOpen(false);};
  const updatePlayer=async(p:any)=>{const w=getEngine();const r=await w?.sb?.from('players').update({name:p.name,position:p.position||null,is_goalkeeper:!!p.is_goalkeeper}).eq('id',p.id).select().single();if(r?.error)throw r.error;await refresh();setEditingPlayer(null);};
  const deletePlayer=async(id:number)=>{if(!confirm('Удалить игрока и его статистику?'))return;const w=getEngine();const a=await w?.sb?.from('game_day_players').delete().eq('player_id',id);if(a?.error)throw a.error;const r=await w?.sb?.from('players').delete().eq('id',id);if(r?.error)throw r.error;await refresh();};

  const stats=useMemo(()=>({players:players.length,days:days.length,games:games.length,participants:dayPlayers.length}),[players,days,games,dayPlayers]);
  const rating=useMemo(()=>players.map(p=>{const w=getEngine();const s=w?.playerTotals?.(p);return {p,s:s||{days:0,goals:0,assists:0,gp:0,saves:0,conceded:0,ownGoals:0,rating:5}}}).sort((a,b)=>(b.s.rating||0)-(a.s.rating||0)),[players,ready]);

  return <div className="app" style={legacyBackground ? {backgroundImage: legacyBackground} : undefined}>
    <iframe ref={frame} onLoad={onLoad} className={dayModal!==null ? "engine editor-visible" : "engine"} title="data-engine" srcDoc={legacyHtml}/>
    <header className="topbar">
      <div className="brand" onClick={()=>{setTab('home');setMenu(false)}}><span className="brand-ball">⚽</span><div><b>БУДНИЧНЫЙ ФУТБОЛ</b><small>Панель лиги</small></div></div>
      <nav className={menu?'nav open':'nav'}>
        <button className={tab==='home'?'active':''} onClick={()=>{setTab('home');setMenu(false)}}>Игровые дни</button>
        <button className={tab==='rating'?'active':''} onClick={()=>{setTab('rating');setMenu(false)}}>Рейтинг</button>
        <button className={tab==='admin'?'active':''} onClick={()=>{setTab('admin');setMenu(false)}}><Shield size={16}/> Админка</button>
      </nav>
      <button className="mobile-menu" onClick={()=>setMenu(v=>!v)}><Menu/></button>
    </header>

    <main className="content">
      {tab==='home' && <Home days={days} teams={teams} dayPlayers={dayPlayers} games={games} onOpen={openDay} ready={ready}/>} 
      {tab==='rating' && <Rating rows={rating} icons={icons} sort={ratingSort} setSort={setRatingSort} onPlayer={openProfile}/>} 
      {tab==='admin' && <Admin session={session} stats={stats} section={adminSection} setSection={setAdminSection} onLogin={()=>setLoginOpen(true)} onLogout={logout} players={players} days={days} teams={teams} games={games} dayPlayers={dayPlayers} onAdd={()=>setNewPlayerOpen(true)} onEdit={setEditingPlayer} onDelete={deletePlayer} onOpenDay={openDay} onEditDay={openEdit} onQuickEntry={()=>setQuickEntryOpen(true)} onRefresh={refresh}/>} 
    </main>

    {loginOpen && <LoginModal onClose={()=>setLoginOpen(false)} onLogin={login}/>} 
    {newPlayerOpen && <PlayerModal onClose={()=>setNewPlayerOpen(false)} onSave={addPlayer}/>}
    {editingPlayer && <PlayerModal player={editingPlayer} onClose={()=>setEditingPlayer(null)} onSave={updatePlayer}/>}
    {playerProfile && <PlayerProfileModal player={playerProfile} days={days} teams={teams} dayPlayers={dayPlayers} icons={icons} onClose={()=>setPlayerProfile(null)}/>}
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

function Rating({rows,icons,sort,setSort,onPlayer}:{rows:any[];icons:Record<string,string>;sort:string;setSort:(v:string)=>void;onPlayer:(p:any)=>void}){
  const items=[...rows].sort((a,b)=>{
    const name=(a.p.name||'').localeCompare(b.p.name||'','ru',{sensitivity:'base'});
    if(sort==='name') return name;
    const get=(x:any)=>sort==='days'?x.s.days:sort==='goals'?x.s.goals:sort==='assists'?x.s.assists:sort==='gp'?x.s.gp:sort==='saves'?x.s.saves:sort==='conceded'?x.s.conceded:sort==='ownGoals'?x.s.ownGoals:x.s.rating;
    return (Number(get(b))||0)-(Number(get(a))||0)||name;
  });
  const filters=[
    ['name','Имя','player'],['days','Игровые дни','day'],['goals','Забил','goal'],['assists','Пас','pass'],['gp','Г+П','gp'],
    ['saves','Сейвы','saves'],['conceded','Пропустил','conceded'],['ownGoals','Автоголы','own'],['rating','Общий рейтинг','rating']
  ] as const;
  const Icon=({name,size=44}:{name:string;size?:number})=>icons[name]?<img className="rating-icon-img" src={icons[name]} style={{width:size,height:size}} alt="" aria-hidden="true"/>:<span className="rating-icon-fallback"/>;
  return <section className="page rating-page">
    <div className="section-head"><div><div className="eyebrow">СТАТИСТИКА</div><h2>Рейтинг игроков</h2><p>Расчёт рейтинга не изменён — изменён только интерфейс.</p></div></div>
    <div className="rating-filters">{filters.map(([key,label,icon])=><button key={key} className={sort===key?'rating-filter active':'rating-filter'} onClick={()=>setSort(key)}><Icon name={icon} size={22}/><span>{label}</span></button>)}</div>
    <div className="rating-table">
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
      {items.map((x,i)=><button className="rating-row rating-row-11" key={x.p.id} onClick={()=>onPlayer(x.p.id)}>
        <span className="rank">{i+1}</span>
        <span className="player-name"><strong>{x.p.name}</strong><small>{x.p.position||'Игрок'}{x.p.is_goalkeeper?' · Вратарь':''}</small></span>
        <span>{x.p.position||'Игрок'}</span>
        <span>{x.s.days}</span><span>{x.s.goals}</span><span>{x.s.assists}</span><strong>{x.s.gp}</strong>
        <span>{x.s.saves}</span><span>{x.s.conceded}</span><span>{x.s.ownGoals}</span><b className="rating-value">{x.s.days?Number(x.s.rating).toFixed(2):'—'}</b>
      </button>)}
    </div>
  </section>
}

function Admin({session,stats,section,setSection,onLogin,onLogout,players,days,teams,games,dayPlayers,onAdd,onEdit,onDelete,onOpenDay,onEditDay,onQuickEntry,onRefresh}:{session:any;stats:any;section:AdminSection;setSection:(s:AdminSection)=>void;onLogin:()=>void;onLogout:()=>void;players:any[];days:any[];teams:any[];games:any[];dayPlayers:any[];onAdd:()=>void;onEdit:(p:any)=>void;onDelete:(id:number)=>void;onOpenDay:(id:number)=>void;onEditDay:(id:number)=>void;onQuickEntry:()=>void;onRefresh:()=>void}){
 if(!session)return <section className="admin-login"><div className="admin-lock"><Shield size={32}/></div><div className="eyebrow">ЗАКРЫТЫЙ РАЗДЕЛ</div><h2>Панель управления</h2><p>Здесь управляются игроки, игровые дни, составы и статистика лиги.</p><button className="primary-btn" onClick={onLogin}><LogIn size={17}/> Войти в админку</button></section>;
 return <section className="admin-page"><aside className="admin-side"><div className="admin-title"><Shield/><div><b>Панель управления</b><small>{session.user?.email}</small></div></div><button className={section==='overview'?'sel':''} onClick={()=>setSection('overview')}><LayoutDashboard/> Обзор</button><button className={section==='players'?'sel':''} onClick={()=>setSection('players')}><Users/> Игроки</button><button className={section==='days'?'sel':''} onClick={()=>setSection('days')}><CalendarDays/> Игровые дни</button><div className="side-bottom"><button onClick={onRefresh}><RefreshCw/> Обновить</button><button onClick={onLogout}><LogOut/> Выйти</button></div></aside><div className="admin-main">{section==='overview'&&<><div className="admin-header"><div><div className="eyebrow">АДМИНИСТРИРОВАНИЕ</div><h1>Обзор</h1><p>Контроль текущего состояния лиги.</p></div></div><div className="metrics"><Metric icon={<Users/>} label="Игроки" value={stats.players}/><Metric icon={<CalendarDays/>} label="Игровые дни" value={stats.days}/><Metric icon={<Trophy/>} label="Матчи" value={stats.games}/><Metric icon={<CircleUserRound/>} label="Участия" value={stats.participants}/></div><div className="quick-grid"><button className="quick-action" onClick={onQuickEntry}><Trophy/><b>Быстрое заполнение</b><span>Выбрать игру и внести статистику во время паузы</span></button><button onClick={onAdd}><Plus/><b>Добавить игрока</b><span>Создать новую карточку игрока</span></button><button onClick={()=>setSection('players')}><Users/><b>Управление игроками</b><span>Редактирование и статистика</span></button><button onClick={()=>setSection('days')}><CalendarDays/><b>Игровые дни</b><span>Редактирование и составы</span></button></div></>}{section==='players'&&<PlayersAdmin players={players} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}/>} {section==='days'&&<DaysAdmin days={days} teams={teams} games={games} dayPlayers={dayPlayers} onOpen={onOpenDay} onEdit={onEditDay}/>}</div></section>
}
function Metric({icon,label,value}:{icon:any;label:string;value:number}){return <div className="metric"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>}
function PlayersAdmin({players,onAdd,onEdit,onDelete}:{players:any[];onAdd:()=>void;onEdit:(p:any)=>void;onDelete:(id:number)=>void}){return <><div className="admin-header row"><div><div className="eyebrow">УПРАВЛЕНИЕ</div><h1>Игроки</h1><p>{players.length} игроков в базе.</p></div><button className="primary-btn" onClick={onAdd}><Plus/> Добавить игрока</button></div><div className="admin-list">{players.map(p=><div className="admin-player" key={p.id}><div className="avatar">{p.name?.slice(0,1)||'?'}</div><div className="ap-main"><b>{p.name}</b><small>{p.position||'Позиция не указана'}{p.is_goalkeeper?' · Вратарь':''}</small></div><button className="icon-btn" onClick={()=>onEdit(p)}><Pencil/></button><button className="icon-btn danger-icon" onClick={()=>onDelete(p.id)}><Trash2/></button></div>)}</div></>}
function DaysAdmin({days,teams,games,dayPlayers,onOpen,onEdit}:{days:any[];teams:any[];games:any[];dayPlayers:any[];onOpen:(id:number)=>void;onEdit:(id:number)=>void}){return <><div className="admin-header"><div><div className="eyebrow">УПРАВЛЕНИЕ</div><h1>Игровые дни</h1><p>Редактирование дат, команд, матчей, составов и статистики.</p></div></div><div className="admin-list">{days.map(d=>{const ts=teams.filter(t=>t.game_day_id===d.id),gs=games.filter(g=>g.game_day_id===d.id),ps=dayPlayers.filter(p=>p.game_day_id===d.id);return <div className="admin-day" key={d.id}><div><span className="day-kicker">{dayName(d.game_date)}</span><h3>{fmtDate(d.game_date)} · {d.place||'Без места'}</h3><small>{d.game_time||'—'} · {ts.length} команд · {gs.length} матчей · {ps.length} участников</small></div><div className="day-actions"><button onClick={()=>onOpen(d.id)}>Открыть</button><button className="primary-mini" onClick={()=>onEdit(d.id)}><Pencil size={15}/> Редактировать</button></div></div>})}</div></>}
function QuickEntryModal({players,days,teams,games,dayPlayers,icons,engine,onClose,onSaved}:{players:any[];days:any[];teams:any[];games:any[];dayPlayers:any[];icons:Record<string,string>;engine:any;onClose:()=>void;onSaved:()=>Promise<void>}){
  const [dayId,setDayId]=useState<number|string>('');
  const [gameId,setGameId]=useState<number|string>('');
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const day=days.find(d=>String(d.id)===String(dayId));
  const dayTeams=teams.filter(t=>String(t.game_day_id)===String(dayId));
  const dayGames=games.filter(g=>String(g.game_day_id)===String(dayId));
  const game=dayGames.find(g=>String(g.id)===String(gameId));
  const teamA=dayTeams.find(t=>String(t.id)===String(game?.team_a_id));
  const teamB=dayTeams.find(t=>String(t.id)===String(game?.team_b_id));
  const rosterA=dayPlayers.filter(x=>String(x.game_day_id)===String(dayId)&&String(x.team_id)===String(teamA?.id)).map(x=>({...x,player:players.find(p=>String(p.id)===String(x.player_id))})).filter(x=>x.player);
  const rosterB=dayPlayers.filter(x=>String(x.game_day_id)===String(dayId)&&String(x.team_id)===String(teamB?.id)).map(x=>({...x,player:players.find(p=>String(p.id)===String(x.player_id))})).filter(x=>x.player);
  const [draft,setDraft]=useState<Record<string,any>>({});
  const icon=(name:string,size=22)=>icons[name]?<img src={icons[name]} style={{width:size,height:size,objectFit:'contain'}} alt=""/>:<span>•</span>;
  useEffect(()=>{
    if(!game)return;
    const next:any={};
    [...rosterA,...rosterB].forEach(x=>{next[String(x.player_id)]={goals:+x.goals||0,assists:+x.assists||0,conceded:+x.conceded||0,own_goals:+x.own_goals||0,saves:+x.saves||0,goalkeeper:!!x.goalkeeper};});
    setDraft(next);setError('');
  },[gameId,dayId,dayPlayers.length]);
  const setStat=(pid:any,key:string,value:any)=>setDraft(d=>({...d,[String(pid)]:{...(d[String(pid)]||{}),[key]:key==='goalkeeper'?!!value:Math.max(0,Number(value)||0)}}));
  const rating=(entry:any,teamId:any)=>engine?.dayRatingForEntry?Number(engine.dayRatingForEntry({game_day_id:Number(dayId),team_id:Number(teamId),goals:+entry.goals||0,assists:+entry.assists||0,conceded:+entry.conceded||0,own_goals:+entry.own_goals||0,saves:+entry.saves||0,goalkeeper:!!entry.goalkeeper},dayGames)).toFixed(1):'5.0';
  const save=async()=>{
    if(!engine?.sb||!game)return;
    setSaving(true);setError('');
    try{
      const sr=await engine.sb.from('games').update({score_a:Math.max(0,Number(game.score_a)||0),score_b:Math.max(0,Number(game.score_b)||0)}).eq('id',game.id);
      if(sr.error)throw sr.error;
      for(const item of [...rosterA,...rosterB]){
        const d=draft[String(item.player_id)]||{};
        const payload={goals:Math.max(0,+d.goals||0),assists:Math.max(0,+d.assists||0),conceded:Math.max(0,+d.conceded||0),own_goals:Math.max(0,+d.own_goals||0),saves:Math.max(0,+d.saves||0),goalkeeper:!!d.goalkeeper};
        const ur=await engine.sb.from('game_day_players').update(payload).eq('id',item.id);
        if(ur.error)throw ur.error;
      }
      await onSaved();
      setSaving(false);
      setError('Сохранено. Можно сразу выбрать следующую игру.');
    }catch(e:any){setSaving(false);setError(e?.message||'Не удалось сохранить данные.');}
  };
  const roster=(arr:any[],team:any)=><div className="quick-roster"><div className="quick-team-title"><span className="team-dot" style={{'--team':team?.color||'#cfb842'} as any}></span><b>{team?.name||'Команда'}</b><small>{arr.length} игроков</small></div>{arr.length?arr.map(item=>{const p=item.player,d=draft[String(p.id)]||{};return <div className="quick-player" key={p.id}><div className="quick-player-name"><b>{p.name}</b><small>{p.position||'Игрок'}</small></div><label>{icon('goal',20)}<span>Г</span><input type="number" min="0" value={d.goals??0} onChange={e=>setStat(p.id,'goals',e.target.value)}/></label><label>{icon('pass',20)}<span>П</span><input type="number" min="0" value={d.assists??0} onChange={e=>setStat(p.id,'assists',e.target.value)}/></label><label>{icon('own',20)}<span>АГ</span><input type="number" min="0" value={d.own_goals??0} onChange={e=>setStat(p.id,'own_goals',e.target.value)}/></label><label>{icon('saves',20)}<span>С</span><input type="number" min="0" value={d.saves??0} onChange={e=>setStat(p.id,'saves',e.target.value)}/></label><label>{icon('conceded',20)}<span>Пр</span><input type="number" min="0" value={d.conceded??0} onChange={e=>setStat(p.id,'conceded',e.target.value)}/></label><button type="button" className={d.goalkeeper?'quick-gk active':'quick-gk'} onClick={()=>setStat(p.id,'goalkeeper',!d.goalkeeper)}>{icon('saves',20)}<span>В воротах</span></button><strong className="quick-rating">{rating(d,item.team_id)}</strong></div>;}):<div className="quick-empty">В этой команде пока нет назначенных игроков.</div>}</div>;
  return <div className="modal-backdrop quick-backdrop"><div className="modal-card quick-card"><button className="modal-x" onClick={onClose}><X/></button><div className="eyebrow">АДМИН · БЫСТРАЯ СТАТИСТИКА</div><h2>Заполнение во время паузы</h2><p className="muted">Выбери игровой день, затем любую пару команд. Нумерации игр нет — показываются только реальные вариации из добавленных команд.</p><div className="quick-selects"><label>Игровой день<select value={dayId} onChange={e=>{setDayId(e.target.value);setGameId('');}}><option value="">Выбрать игровой день</option>{days.map(d=><option key={d.id} value={d.id}>{fmtDate(d.game_date)} · {d.place||'Без места'}</option>)}</select></label>{day&&<label>Игра<select value={gameId} onChange={e=>setGameId(e.target.value)}><option value="">Выбрать игру</option>{dayGames.map(g=>{const a=dayTeams.find(t=>String(t.id)===String(g.team_a_id));const b=dayTeams.find(t=>String(t.id)===String(g.team_b_id));return <option key={g.id} value={g.id}>{a?.name||'Команда'} — {b?.name||'Команда'}</option>})}</select></label>}</div>{game&&<><div className="quick-score"><div><b>{teamA?.name}</b><input type="number" min="0" value={game.score_a??0} onChange={e=>{game.score_a=Math.max(0,Number(e.target.value)||0);}}/></div><span>:</span><div><input type="number" min="0" value={game.score_b??0} onChange={e=>{game.score_b=Math.max(0,Number(e.target.value)||0);}}/><b>{teamB?.name}</b></div></div><div className="quick-rosters">{roster(rosterA,teamA)}{roster(rosterB,teamB)}</div><div className="quick-footer"><span>{error||'Введи статистику и нажми «Сохранить». После сохранения можно сразу выбрать другую игру.'}</span><button className="primary-btn" onClick={save} disabled={saving}>{saving?'Сохраняем…':'💾 Сохранить'}</button></div></>}</div></div>;
}

function EditDayModal({dayId,players,days,teams,games,dayPlayers,icons,engine,onClose,onSaved}:{dayId:number;players:any[];days:any[];teams:any[];games:any[];dayPlayers:any[];icons:Record<string,string>;engine:any;onClose:()=>void;onSaved:()=>Promise<void>}){
  const day=days.find(d=>String(d.id)===String(dayId));
  const [date,setDate]=useState(day?.game_date||'');
  const [time,setTime]=useState((day?.game_time||'').slice(0,5));
  const [place,setPlace]=useState(day?.place||'');
  const [teamDraft,setTeamDraft]=useState(()=>teams.filter(t=>String(t.game_day_id)===String(dayId)).map(t=>({...t})));
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
  const ratingFor=(x:any)=>{ if(!x.teamId || !engine?.dayRatingForEntry) return 5; return Number(engine.dayRatingForEntry({game_day_id:dayId,team_id:Number(x.teamId),goals:Number(x.goals)||0,assists:Number(x.assists)||0,conceded:Number(x.conceded)||0,own_goals:Number(x.ownGoals)||0,saves:Number(x.saves)||0,goalkeeper:!!x.goalkeeper},gameDraft))||5; };
  const save=async()=>{
    if(!engine?.sb){setError('Нет подключения к базе данных.');return;}
    if(gameDraft.some(g=>!g.team_a_id||!g.team_b_id||String(g.team_a_id)===String(g.team_b_id))){setError('В каждой игре должны быть две разные команды.');return;}
    setSaving(true);setError('');
    try{
      let r=await engine.sb.from('game_days').update({game_date:date,game_time:time||null,place:place||null}).eq('id',dayId); if(r.error)throw r.error;
      for(const t of teamDraft){r=await engine.sb.from('teams').update({name:t.name,color:t.color}).eq('id',t.id);if(r.error)throw r.error;}
      r=await engine.sb.from('games').delete().eq('game_day_id',dayId); if(r.error)throw r.error;
      if(gameDraft.length){r=await engine.sb.from('games').insert(gameDraft.map((g,i)=>({game_day_id:dayId,team_a_id:Number(g.team_a_id),team_b_id:Number(g.team_b_id),score_a:Math.max(0,Number(g.score_a)||0),score_b:Math.max(0,Number(g.score_b)||0),game_order:i+1})));if(r.error)throw r.error;}
      r=await engine.sb.from('game_day_players').delete().eq('game_day_id',dayId); if(r.error)throw r.error;
      const rows=playerDraft.filter(x=>x.teamId).map(x=>({game_day_id:dayId,player_id:x.playerId,team_id:Number(x.teamId),goals:Math.max(0,Number(x.goals)||0),assists:Math.max(0,Number(x.assists)||0),conceded:Math.max(0,Number(x.conceded)||0),own_goals:Math.max(0,Number(x.ownGoals)||0),saves:Math.max(0,Number(x.saves)||0),goalkeeper:!!x.goalkeeper}));
      if(rows.length){r=await engine.sb.from('game_day_players').insert(rows);if(r.error)throw r.error;}
      if(removeImage && currentImagePath){await engine.removeGameDayImage?.(currentImagePath);r=await engine.sb.from('game_days').update({image_url:null,image_path:null}).eq('id',dayId);if(r.error)throw r.error;}
      if(imageFile && engine.uploadGameDayImage){const uploaded=await engine.uploadGameDayImage(dayId,imageFile,currentImagePath);if(!uploaded)throw new Error('Не удалось загрузить картинку состава.');r=await engine.sb.from('game_days').update({image_url:uploaded.url,image_path:uploaded.path}).eq('id',dayId);if(r.error)throw r.error;}
      await onSaved();
    }catch(e:any){setError(e?.message||'Не удалось сохранить изменения.');setSaving(false);return;}
    setSaving(false);
    onClose();
  };
  const addGame=()=>{if(teamDraft.length<2)return;setGameDraft(prev=>[...prev,{game_day_id:dayId,team_a_id:teamDraft[0].id,team_b_id:teamDraft[1].id,score_a:0,score_b:0,game_order:prev.length+1}]);};
  return <div className="native-editor-backdrop" role="dialog" aria-modal="true">
    <div className="native-editor-modal">
      <div className="native-editor-top"><div><div className="eyebrow">АДМИНКА · РЕДАКТИРОВАНИЕ</div><h2>Игровой день {fmtDate(date)}</h2><p>Дата, команды, счёт, состав и статистика. Здесь список игроков загружается напрямую из текущих данных сайта.</p></div><button className="native-editor-close" onClick={onClose} aria-label="Закрыть"><X/></button></div>
      <div className="editor-fields"><label><span>📅 Дата игрового дня</span><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label><span>🕐 Время</span><input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label><span>🏟 Место</span><input value={place} onChange={e=>setPlace(e.target.value)} /></label></div>
      <section className="editor-section"><div className="editor-section-head"><div><h3>📷 Картинка составов</h3><p>Можно оставить текущую, заменить её или удалить.</p></div></div>{day.image_url?<img className="editor-image-preview" src={day.image_url} alt="Составы команд"/>:<div className="editor-image-empty">Картинка составов не загружена.</div>}<div className="editor-image-actions"><label className="file-btn">Выбрать файл<input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0]||null)}/></label>{day.image_url&&<label className="editor-check"><input type="checkbox" checked={removeImage} onChange={e=>setRemoveImage(e.target.checked)}/> Удалить текущую</label>} {imageFile&&<span className="muted">{imageFile.name}</span>}</div></section>
      <section className="editor-section"><div className="editor-section-head"><div><h3>{icon('team',26)} Команды</h3><p>Название и цвет сохраняются как раньше.</p></div></div><div className="editor-team-grid">{teamDraft.map((t,i)=><div className="editor-team-card" key={t.id}><span>Команда {i+1}</span><input value={t.name||''} onChange={e=>setTeamDraft(prev=>prev.map(x=>x.id===t.id?{...x,name:e.target.value}:x))}/><input className="editor-color" type="color" value={t.color||'#ffffff'} onChange={e=>setTeamDraft(prev=>prev.map(x=>x.id===t.id?{...x,color:e.target.value}:x))}/></div>)}</div></section>
      <section className="editor-section"><div className="editor-section-head"><div><h3>{icon('goal',26)} Игры</h3><p>Матчи и счёт.</p></div><button className="editor-secondary-btn" onClick={addGame}>+ Добавить игру</button></div><div className="editor-games">{gameDraft.map((g,i)=><div className="editor-game-row" key={i}><select value={g.team_a_id} onChange={e=>setGameDraft(prev=>prev.map((x,j)=>j===i?{...x,team_a_id:Number(e.target.value)}:x))}>{teamDraft.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><input type="number" min="0" value={g.score_a??0} onChange={e=>setGameDraft(prev=>prev.map((x,j)=>j===i?{...x,score_a:Number(e.target.value)||0}:x))}/><span>:</span><input type="number" min="0" value={g.score_b??0} onChange={e=>setGameDraft(prev=>prev.map((x,j)=>j===i?{...x,score_b:Number(e.target.value)||0}:x))}/><select value={g.team_b_id} onChange={e=>setGameDraft(prev=>prev.map((x,j)=>j===i?{...x,team_b_id:Number(e.target.value)}:x))}>{teamDraft.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><button className="editor-delete-btn" onClick={()=>setGameDraft(prev=>prev.filter((_,j)=>j!==i))} aria-label="Удалить игру">×</button></div>)}</div></section>
      <section className="editor-section"><div className="editor-section-head"><div><h3>👥 Состав и статистика игроков</h3><p>Все игроки из базы отображаются здесь. Выбери команду для участника.</p></div></div><div className="editor-legend">{icon('goal',22)} Гол · {icon('pass',22)} Пас · {icon('saves',22)} Сейвы · {icon('conceded',22)} Пропустил · {icon('own',22)} Автогол · {icon('rating',22)} Рейтинг дня</div><div className="editor-players">{players.map(p=>{const x=playerDraft.find(v=>v.playerId===p.id)!;const gp=Number(x.goals||0)+Number(x.assists||0);return <div className="editor-player" key={p.id}><div className="editor-player-head"><div className="editor-player-name">{p.name}<small>{p.position||'Позиция не указана'}{p.is_goalkeeper?' · Вратарь':''}</small></div><select value={x.teamId||''} onChange={e=>updatePlayer(p.id,{teamId:e.target.value?Number(e.target.value):''})}><option value="">Не участвует</option>{teamDraft.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div><div className="editor-player-stats"><label>{icon('goal',22)}<span>Забил</span><input type="number" min="0" value={x.goals} onChange={e=>updatePlayer(p.id,{goals:Number(e.target.value)||0})}/></label><label>{icon('pass',22)}<span>Пас</span><input type="number" min="0" value={x.assists} onChange={e=>updatePlayer(p.id,{assists:Number(e.target.value)||0})}/></label><div className="editor-stat-read"><span>{icon('gp',22)} Г+П</span><b>{gp}</b></div><label>{icon('own',22)}<span>Автогол</span><input type="number" min="0" value={x.ownGoals} onChange={e=>updatePlayer(p.id,{ownGoals:Number(e.target.value)||0})}/></label><label>{icon('saves',22)}<span>Сейвы</span><input type="number" min="0" value={x.saves} onChange={e=>updatePlayer(p.id,{saves:Number(e.target.value)||0})}/></label><label>{icon('conceded',22)}<span>Пропустил</span><input type="number" min="0" value={x.conceded} onChange={e=>updatePlayer(p.id,{conceded:Number(e.target.value)||0})}/></label><button type="button" className={x.goalkeeper?'gk-button active':'gk-button'} onClick={()=>updatePlayer(p.id,{goalkeeper:!x.goalkeeper})}>{icon('saves',22)} <span>В воротах</span></button><div className="editor-stat-read rating"><span>{icon('rating',22)} Рейтинг дня</span><b>{ratingFor(x).toFixed(1)}</b></div></div></div>})}</div></section>
      {error&&<div className="editor-error">{error}</div>}
      <div className="native-editor-footer"><button className="editor-cancel-btn" onClick={onClose} disabled={saving}>Отмена</button><button className="editor-save-btn" onClick={save} disabled={saving}>{saving?'Сохраняем…':'💾 Сохранить ВСЁ'}</button></div>
    </div>
  </div>;
}

function PlayerProfileModal({player,days,teams,dayPlayers,icons,onClose}:{player:any;days:any[];teams:any[];dayPlayers:any[];icons:Record<string,string>;onClose:()=>void}){
  const icon=(name:string,size=28)=>icons[name]?<img className="profile-icon" src={icons[name]} style={{width:size,height:size}} alt=""/>:<span className="profile-icon-fallback">•</span>;
  const entries=dayPlayers.filter(x=>x.player_id===player.id);
  const totals={
    goals:entries.reduce((s,x)=>s+(+x.goals||0),0),
    assists:entries.reduce((s,x)=>s+(+x.assists||0),0),
    saves:entries.reduce((s,x)=>s+(+x.saves||0),0),
    conceded:entries.reduce((s,x)=>s+(+x.conceded||0),0),
    ownGoals:entries.reduce((s,x)=>s+(+x.own_goals||0),0),
  };
  const getEngine=()=>window.parent?.frames?.[0] as any;
  const history=entries.map(x=>{
    const d=days.find(v=>v.id===x.game_day_id); const t=teams.find(v=>v.id===x.team_id);
    const r=getEngine()?.teamResultsForDay?.(x.game_day_id,x.team_id,undefined)||{wins:0,draws:0,losses:0,played:0};
    const rating=Number(getEngine()?.dayRatingForEntry?.(x))||5;
    return {x,d,t,r,rating};
  }).sort((a,b)=>(b.d?.game_date||'').localeCompare(a.d?.game_date||''));
  const overall=history.length?history.reduce((s,x)=>s+x.rating,0)/history.length:5;
  return <div className="modal-backdrop profile-backdrop">
    <div className="modal-card profile-card">
      <button className="modal-x" onClick={onClose} aria-label="Закрыть"><X/></button>
      <div className="eyebrow">ПРОФИЛЬ ИГРОКА</div>
      <div className="profile-title-row"><div><h2>{player.name}</h2><p className="muted">{player.position||'Игрок'}{player.is_goalkeeper?' · Вратарь':''}</p></div><div className="profile-rating"><span>{icon('rating',38)}</span><small>Общий рейтинг</small><b>{overall.toFixed(2)}</b></div></div>
      <div className="profile-stat-grid">
        <div className="profile-stat">{icon('goal',30)}<small>Голы</small><b>{totals.goals}</b></div>
        <div className="profile-stat">{icon('pass',30)}<small>Пасы</small><b>{totals.assists}</b></div>
        <div className="profile-stat">{icon('gp',30)}<small>Г+П</small><b>{totals.goals+totals.assists}</b></div>
        <div className="profile-stat">{icon('saves',30)}<small>Сейвы</small><b>{totals.saves}</b></div>
        <div className="profile-stat">{icon('conceded',30)}<small>Пропущено</small><b>{totals.conceded}</b></div>
        <div className="profile-stat">{icon('own',30)}<small>Автоголы</small><b>{totals.ownGoals}</b></div>
        <div className="profile-stat">{icon('day',30)}<small>Игровые дни</small><b>{entries.length}</b></div>
      </div>
      <div className="profile-section-title"><div><div className="eyebrow">ИСТОРИЯ</div><h3>Выступления</h3></div></div>
      {history.length?<div className="profile-history-wrap"><table className="stats-table history-table profile-history"><thead><tr><th>Дата</th><th>Команда</th><th>Результат</th><th>Г</th><th>П</th><th>Г+П</th><th>С</th><th>Пр</th><th>АГ</th><th>Рейтинг дня</th></tr></thead><tbody>{history.map(h=><tr key={h.x.id||`${h.x.game_day_id}-${h.x.player_id}`}><td>{h.d?fmtDate(h.d.game_date):'—'}</td><td><span className="team-dot" style={{'--team':h.t?.color||'#fff'} as any}></span>{h.t?.name||'—'}</td><td><span className="result-line"><span>🏆 {h.r.wins}</span><span>➖ {h.r.draws}</span><span>✕ {h.r.losses}</span></span></td><td>{+h.x.goals||0}</td><td>{+h.x.assists||0}</td><td><b>{(+h.x.goals||0)+(+h.x.assists||0)}</b></td><td>{+h.x.saves||0}</td><td>{+h.x.conceded||0}</td><td>{+h.x.own_goals||0}</td><td><b className="profile-day-rating">{h.rating.toFixed(1)}</b></td></tr>)}</tbody></table></div>:<div className="profile-empty">Статистика по игровым дням пока не заполнена.</div>}
    </div>
  </div>;
}

function LoginModal({onClose,onLogin}:{onClose:()=>void;onLogin:(e:string,p:string)=>Promise<void>}){
  const[e,setE]=useState(''),[p,setP]=useState(''),[err,setErr]=useState(''),[busy,setBusy]=useState(false);
  const submit=async()=>{if(busy)return;setErr('');setBusy(true);try{await onLogin(e,p)}catch(x:any){setErr(x?.message||'Не удалось войти в админку.')}finally{setBusy(false)}};
  return <div className="modal-backdrop" onMouseDown={x=>{if(x.target===x.currentTarget)onClose()}}><div className="modal-card small">
    <button className="modal-x" onClick={onClose}><X/></button><div className="modal-icon"><Shield/></div><div className="eyebrow">АДМИНИСТРАТОР</div><h2>Вход в панель</h2>
    <form onSubmit={x=>{x.preventDefault();submit()}}>
      <label>Email<input value={e} onChange={x=>setE(x.target.value)} type="email" autoComplete="username" autoFocus placeholder="admin@example.com"/></label>
      <label>Пароль<input value={p} onChange={x=>setP(x.target.value)} type="password" autoComplete="current-password" placeholder="Введите пароль"/></label>
      {err&&<div className="error">{err}</div>}
      <button className="primary-btn full" type="submit" disabled={busy}>{busy?'Выполняю вход…':'Войти в админку'}</button>
    </form>
  </div></div>
}
function PlayerModal({player,onClose,onSave}:{player?:any;onClose:()=>void;onSave:(x:any,y?:string,z?:boolean)=>Promise<void>}){const[p,setP]=useState({...player});const[n,setN]=useState('');const[pos,setPos]=useState('');const[gk,setGk]=useState(false);const isEdit=!!player;return <div className="modal-backdrop"><div className="modal-card"><button className="modal-x" onClick={onClose}><X/></button><div className="eyebrow">ИГРОК</div><h2>{isEdit?'Редактирование игрока':'Новый игрок'}</h2>{isEdit?<><label>Имя<input value={p.name||''} onChange={e=>setP({...p,name:e.target.value})}/></label><label>Позиция<input value={p.position||''} onChange={e=>setP({...p,position:e.target.value})}/></label><label className="check"><input type="checkbox" checked={!!p.is_goalkeeper} onChange={e=>setP({...p,is_goalkeeper:e.target.checked})}/> Вратарь</label><button className="primary-btn full" onClick={()=>onSave(p)}>Сохранить</button></>:<><label>Имя<input value={n} onChange={e=>setN(e.target.value)} placeholder="Иван Иванов"/></label><label>Позиция<input value={pos} onChange={e=>setPos(e.target.value)} placeholder="Защитник"/></label><label className="check"><input type="checkbox" checked={gk} onChange={e=>setGk(e.target.checked)}/> Вратарь</label><button className="primary-btn full" onClick={()=>onSave(n,pos,gk)}>Добавить</button></>}</div></div>}
