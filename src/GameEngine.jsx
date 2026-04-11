import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const GameContext = createContext();

export function GameProvider({ children, user }) {
  const [state, setState] = useState({
    isPremium: false,
    apiKey: '',
    apiService: 'gemini',
    selectedModel: '',
    projects: [],
    dailyTasks: [],
    chatHistory: [],
    xp: 0,
    lastEntryToll: 0,
    entryTollPaidToday: false,
    pendingPunishments: []
  });
  const [loading, setLoading] = useState(true);

  // 1. Fetch live data from Supabase on mount
  useEffect(() => {
    if (!user) return;
    async function loadData() {
       setLoading(true);
       
       let { data: gs } = await supabase.from('game_state').select('*').eq('user_id', user.id).single();
       if (!gs) {
          gs = { user_id: user.id, xp: 0, last_entry_toll: 0, api_service: 'gemini', api_key: '', selected_model: '', is_premium: false };
          await supabase.from('game_state').insert([gs]);
       }
       
       const [
           { data: projs }, 
           { data: tasks }, 
           { data: chat },
           { data: punishes }
       ] = await Promise.all([
           supabase.from('projects').select('*').eq('user_id', user.id).order('created_at'),
           supabase.from('daily_tasks').select('*').eq('user_id', user.id).order('created_at'),
           supabase.from('chat_messages').select('*').eq('user_id', user.id).order('created_at'),
           supabase.from('punishments').select('*').eq('user_id', user.id)
       ]);

       const now = Date.now();
       const ONE_DAY = 24 * 60 * 60 * 1000;
       
       setState({
          isPremium: gs.is_premium || false,
          apiKey: gs.api_key || '',
          apiService: gs.api_service || 'gemini',
          selectedModel: gs.selected_model || '',
          xp: gs.xp,
          lastEntryToll: gs.last_entry_toll,
          entryTollPaidToday: (now - gs.last_entry_toll) <= ONE_DAY,
          projects: projs || [],
          dailyTasks: tasks || [],
          chatHistory: (chat && chat.length > 0) ? chat : [{ sender: 'colonel', text: "Welcome to the Command Center. Connect your AI core to proceed." }],
          pendingPunishments: punishes || []
       });
       setLoading(false);
    }
    loadData();
  }, [user]);

  // 2. Dispatch intercepts to update Supabase in real-time
  const dispatch = async (action) => {
    if (!user) return;
    const { type, payload } = action;

    switch (type) {
      case 'TOGGLE_PREMIUM':
        const newPrem = !state.isPremium;
        setState(s => ({ ...s, isPremium: newPrem }));
        await supabase.from('game_state').update({ is_premium: newPrem }).eq('user_id', user.id);
        break;

      case 'SET_API_KEY':
        setState(s => ({ ...s, apiKey: payload.key, apiService: payload.service, selectedModel: payload.model || '' }));
        await supabase.from('game_state').update({ api_key: payload.key, api_service: payload.service, selected_model: payload.model || '' }).eq('user_id', user.id);
        break;

      case 'ADD_MESSAGE':
        const newMsg = { user_id: user.id, sender: payload.sender, text: payload.text, created_at: Date.now() };
        setState(s => ({ ...s, chatHistory: [...s.chatHistory, newMsg] }));
        await supabase.from('chat_messages').insert([newMsg]);
        break;

      case 'REPLACE_LAST_MESSAGE':
        const { data: latestChat } = await supabase.from('chat_messages').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
        if (latestChat && latestChat[0]) {
           await supabase.from('chat_messages').update({ text: payload.text }).eq('id', latestChat[0].id);
        }
        setState(s => {
           const nh = [...s.chatHistory];
           nh[nh.length - 1] = { ...nh[nh.length - 1], text: payload.text };
           return { ...s, chatHistory: nh };
        });
        break;

      case 'CREATE_PROJECT':
        const newProj = { id: payload.id, user_id: user.id, title: payload.title, description: payload.description, created_at: Date.now() };
        setState(s => ({ ...s, projects: [...s.projects, newProj] }));
        await supabase.from('projects').insert([newProj]);
        break;

      case 'ADD_DAILY_TASK':
        const newTask = { id: payload.id, user_id: user.id, project_id: payload.projectId, text: payload.text, created_at: payload.createdAt, completed: false, punished: false };
        setState(s => ({ ...s, dailyTasks: [...s.dailyTasks, newTask] }));
        await supabase.from('daily_tasks').insert([newTask]);
        break;

      case 'TOGGLE_TASK':
        const taskTarget = state.dailyTasks.find(t => t.id === payload);
        if(!taskTarget) break;
        const newStatus = !taskTarget.completed;
        const newXp = state.xp + 10;
        
        setState(s => ({ 
           ...s, 
           dailyTasks: s.dailyTasks.map(t => t.id === payload ? { ...t, completed: newStatus } : t),
           xp: newXp
        }));
        await supabase.from('daily_tasks').update({ completed: newStatus }).eq('id', payload);
        await supabase.from('game_state').update({ xp: newXp }).eq('user_id', user.id);
        break;

      case 'CHECK_ROUTINES':
        const now = Date.now();
        const ONE_DAY = 24 * 60 * 60 * 1000;
        let needToll = false;
        
        if (!state.lastEntryToll || (now - state.lastEntryToll) > ONE_DAY) {
           needToll = true;
        }
        
        const newPuns = [];
        const taskUpdates = [];
        
        const updatedTasks = state.dailyTasks.map(t => {
           if (!t.completed && !t.punished && (now - t.created_at > ONE_DAY)) {
               const pObj = {
                 user_id: user.id,
                 task_id: t.id,
                 task_text: t.text,
                 type: Math.random() > 0.5 ? 'physical' : 'cognitive',
                 amount: 20
               };
               newPuns.push(pObj);
               taskUpdates.push(t.id);
               return { ...t, punished: true };
           }
           return t;
        });

        setState(s => ({
          ...s,
          entryTollPaidToday: !needToll,
          dailyTasks: updatedTasks,
          pendingPunishments: [...s.pendingPunishments, ...newPuns.map(p => ({ ...p, id: Date.now() + Math.random() }))]
        }));

        if (newPuns.length > 0) {
           await supabase.from('punishments').insert(newPuns);
           for (let tid of taskUpdates) {
               await supabase.from('daily_tasks').update({ punished: true }).eq('id', tid);
           }
           const { data: dbPuns } = await supabase.from('punishments').select('*').eq('user_id', user.id);
           if (dbPuns) {
               setState(s => ({ ...s, pendingPunishments: dbPuns }));
           }
        }
        break;

      case 'PAY_ENTRY_TOLL':
        const nTpll = Date.now();
        setState(s => ({ ...s, lastEntryToll: nTpll, entryTollPaidToday: true }));
        await supabase.from('game_state').update({ last_entry_toll: nTpll }).eq('user_id', user.id);
        break;

      case 'RESOLVE_PUNISHMENT':
        setState(s => ({ ...s, pendingPunishments: s.pendingPunishments.filter(p => p.id !== payload) }));
        await supabase.from('punishments').delete().eq('id', payload);
        break;
    }
  };

  useEffect(() => {
    if (!loading && (state.apiKey || state.isPremium)) {
       dispatch({ type: 'CHECK_ROUTINES' });
       const interval = setInterval(() => {
         dispatch({ type: 'CHECK_ROUTINES' });
       }, 60000);
       return () => clearInterval(interval);
    }
  }, [loading, state.apiKey, state.isPremium]);
  
  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><span className="text-primary font-mono animate-pulse">SYNCING DATABANKS...</span></div>;
  }

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
