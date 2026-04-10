import React, { createContext, useContext, useReducer, useEffect } from 'react';

const initialState = {
  apiKey: '',
  apiService: 'gemini', // 'openai' or 'gemini'
  selectedModel: '',
  
  projects: [], // { id, title, description, createdAt, status }
  dailyTasks: [], // { id, projectId, text, createdAt, completed: false, punished: false }
  
  chatHistory: [
    { sender: 'colonel', text: "Welcome to the Command Center. To proceed, I require an API Uplink." }
  ],
  
  // Gamification & Enforcement
  xp: 0,
  lastEntryToll: 0, // timestamp of last toll payment
  entryTollPaidToday: false,
  pendingPunishments: [] // Tasks that missed the 24h window
};

const GameContext = createContext();

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload.key, apiService: action.payload.service, selectedModel: action.payload.model || '' };
      
    case 'ADD_MESSAGE':
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
      
    case 'REPLACE_LAST_MESSAGE':
      const newHistory = [...state.chatHistory];
      newHistory[newHistory.length - 1] = action.payload;
      return { ...state, chatHistory: newHistory };
      
    case 'CREATE_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
      
    case 'ADD_DAILY_TASK':
      return { ...state, dailyTasks: [...state.dailyTasks, action.payload] };
      
    case 'TOGGLE_TASK':
      return { 
        ...state, 
        dailyTasks: state.dailyTasks.map(t => {
           if (t.id === action.payload) {
              return { ...t, completed: !t.completed };
           }
           return t;
        }),
        xp: state.xp + 10 // Gain XP
      };
      
    case 'CHECK_ROUTINES':
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;
      let needToll = false;
      
      // 1. Entry Toll Logic
      if (!state.lastEntryToll || (now - state.lastEntryToll) > ONE_DAY) {
         needToll = true;
      }
      
      // 2. Punishments Logic for missed Tasks
      const newPunishments = [...state.pendingPunishments];
      const updatedTasks = state.dailyTasks.map(t => {
         // Check if 24h passed since creation, it's NOT completed, and NOT already punished
         if (!t.completed && !t.punished && (now - t.createdAt > ONE_DAY)) {
             newPunishments.push({
               id: Date.now() + Math.random(),
               taskId: t.id,
               taskText: t.text,
               type: Math.random() > 0.5 ? 'physical' : 'cognitive', 
               amount: 20
             });
             return { ...t, punished: true };
         }
         return t;
      });
      
      return {
        ...state,
        entryTollPaidToday: !needToll,
        dailyTasks: updatedTasks,
        pendingPunishments: newPunishments
      };
      
    case 'PAY_ENTRY_TOLL':
      return {
        ...state,
        lastEntryToll: Date.now(),
        entryTollPaidToday: true
      };
      
    case 'RESOLVE_PUNISHMENT':
      return {
        ...state,
        pendingPunishments: state.pendingPunishments.filter(p => p.id !== action.payload)
      };

    default:
      return state;
  }
}

export function GameProvider({ children }) {
  // Try to load state
  const savedStr = localStorage.getItem('ironWillV2');
  let loadedState = null;
  if(savedStr) {
      try {
          loadedState = JSON.parse(savedStr);
      } catch (e) { console.error("Corrupted state"); }
  }

  const [state, dispatch] = useReducer(gameReducer, loadedState || initialState);
  
  // Heartbeat check for routines
  useEffect(() => {
    if (state.apiKey) {
       dispatch({ type: 'CHECK_ROUTINES' });
       
       const interval = setInterval(() => {
         dispatch({ type: 'CHECK_ROUTINES' });
       }, 60000); // Check every minute
       
       return () => clearInterval(interval);
    }
  }, [state.apiKey]);
  
  // Save engine
  useEffect(() => {
    localStorage.setItem('ironWillV2', JSON.stringify(state));
  }, [state]);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
