import React, { useState, useEffect, useRef } from 'react';
import { useGame } from './GameEngine';
import { Menu, X, LayoutDashboard, Target, MessageSquare, CheckSquare, Key, Skull, Settings } from 'lucide-react';
import CameraTracker from './CameraTracker';
import CognitiveTracker from './CognitiveTracker';
import { generateColonelResponse, fetchAvailableModels } from './LLMService';

function App() {
  const { state, dispatch } = useGame();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'projects', 'colonel', 'tasks'
  
  // Api Gate State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiServiceInput, setApiServiceInput] = useState('gemini');

  // ------- GATES -------

  // 1. Check Daily Entry Toll Gate
  if (!state.entryTollPaidToday) {
     return (
       <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <Skull size={64} className="text-danger" style={{ marginBottom: '20px' }} />
          <h2 className="text-danger font-mono" style={{ textAlign: 'center' }}>DAILY ENTRY TOLL REQUIRED</h2>
          <p className="text-muted" style={{ textAlign: 'center', maxWidth: '400px', marginBottom: '30px' }}>
             Discipline is not automated. It is earned daily. You must pay the physical toll to unlock the application for the next 24 hours.
          </p>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
             <h3 className="text-danger font-mono" style={{ textAlign: 'center', marginBottom: '15px' }}>20 SQUATS + 20 PUSHUPS</h3>
             
             {/* Note: In Phase 3, we update CameraTracker to actually verify both. */}
             <CameraTracker 
                exercises={[{type: 'SQUATS', target: 20}, {type: 'PUSHUPS', target: 20}]} 
                onComplete={() => dispatch({ type: 'PAY_ENTRY_TOLL' })} 
             />
             
             <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button className="danger" onClick={() => dispatch({ type: 'PAY_ENTRY_TOLL' })}>
                  [DEV BYPASS: PAY TOLL]
                </button>
             </div>
          </div>
       </div>
     );
  }

  // 3. Penalty Protocol Gate (Missed Tasks)
  if (state.pendingPunishments && state.pendingPunishments.length > 0) {
      const activePenalty = state.pendingPunishments[0];
      return (
         <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px' }}>
            <h2 className="text-danger font-mono" style={{ textAlign: 'center' }}>PENALTY PROTOCOL ACTIVE</h2>
            <p className="text-muted" style={{ textAlign: 'center', maxWidth: '500px', marginBottom: '30px' }}>
               You failed to complete an assigned parameter within the 24-hour execution window: <br/><br/><strong style={{color:'var(--text-main)'}}>"{activePenalty.taskText}"</strong><br/><br/>
               Execute the required penalty to restore operating capabilities.
            </p>
            
            <div style={{ width: '100%', maxWidth: '500px' }}>
               {activePenalty.type === 'physical' ? (
                  <CameraTracker 
                     exercises={[
                         {type: 'SQUATS', target: activePenalty.amount},
                         {type: 'PUSHUPS', target: activePenalty.amount}
                     ]} 
                     onComplete={() => dispatch({ type: 'RESOLVE_PUNISHMENT', payload: activePenalty.id })} 
                  />
               ) : (
                  <CognitiveTracker 
                     amount={activePenalty.amount} 
                     onComplete={() => dispatch({ type: 'RESOLVE_PUNISHMENT', payload: activePenalty.id })} 
                  />
               )}
            </div>
         </div>
      );
  }

  // ------- MAIN APPLICATION -------

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const navTo = (view) => {
    setCurrentView(view);
    setSidebarOpen(false);
  };

  const NavItem = ({ view, icon: Icon, label }) => (
    <div 
      onClick={() => navTo(view)}
      style={{
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        background: currentView === view ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        borderRight: currentView === view ? '3px solid var(--color-primary)' : '3px solid transparent',
        color: currentView === view ? 'var(--text-main)' : 'var(--text-muted)',
        transition: 'all 0.2s ease'
      }}
    >
      <Icon size={20} className={currentView === view ? 'text-primary' : ''} />
      <span>{label}</span>
    </div>
  );

  return (
    <div className="app-layout">
      {/* SIDEBAR NAVIGATION */}
      <div className="sidebar" style={{ 
          position: 'absolute', 
          height: '100%', 
          zIndex: 50, 
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          width: '250px'
       }}>
         <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: 0 }} className="text-primary font-mono">IRON WILL</h3>
            <button onClick={toggleSidebar} style={{ padding: '4px', background: 'transparent', border: 'none' }}>
              <X size={24} className="text-muted" />
            </button>
         </div>
         <div style={{ flex: 1, paddingTop: '10px' }}>
            <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavItem view="projects" icon={Target} label="Projects" />
            <NavItem view="colonel" icon={MessageSquare} label="Colonel AI" />
            <NavItem view="tasks" icon={CheckSquare} label="Daily Tasks" />
            <NavItem view="settings" icon={Settings} label="AI Settings" />
         </div>
      </div>

      {/* CLICK-OUT OVERLAY */}
      {sidebarOpen && (
         <div 
           onClick={toggleSidebar} 
           style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
         />
      )}

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
         <div className="top-nav">
           <button onClick={toggleSidebar} style={{ padding: '4px', background: 'transparent', border: 'none', marginRight: '15px' }}>
              <Menu size={24} className="text-main" style={{ color: 'white' }} />
           </button>
           <h3 style={{ margin: 0, fontSize: '18px', textTransform: 'capitalize' }}>{currentView}</h3>
         </div>

         <div className="scrollable-area">
            {currentView === 'dashboard' && <DashboardView state={state} />}
            {currentView === 'projects' && <ProjectsView state={state} dispatch={dispatch} />}
            {currentView === 'colonel' && <ColonelView state={state} dispatch={dispatch} />}
            {currentView === 'tasks' && <TasksView state={state} dispatch={dispatch} />}
            {currentView === 'settings' && <SettingsView state={state} dispatch={dispatch} />}
         </div>
      </div>
    </div>
  );
}

// ---------------- VIEWS ----------------

function DashboardView({ state }) {
   return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto' }}>
         <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <h2 className="text-primary font-mono" style={{ fontSize: '48px', margin: '0 0 10px 0' }}>{state.xp} XP</h2>
            <p className="text-muted" style={{ margin: 0 }}>Total Cumulative Experience</p>
         </div>
         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
             <div className="card">
                <Target size={24} className="text-primary" style={{ marginBottom: '10px' }} />
                <h3>Active Projects</h3>
                <p className="text-muted" style={{ margin: 0 }}>You have {state.projects.length} operating projects.</p>
             </div>
             <div className="card">
                <CheckSquare size={24} className="text-primary" style={{ marginBottom: '10px' }} />
                <h3>Pending Tasks</h3>
                <p className="text-muted" style={{ margin: 0 }}>{state.dailyTasks.filter(t => !t.completed).length} tasks require completion before rotation.</p>
             </div>
         </div>
      </div>
   );
}

function ProjectsView({ state, dispatch }) {
   return (
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
         <div className="card">
            <h3 style={{ margin: '0 0 10px 0' }}>Operating Parameters</h3>
            <p className="text-muted" style={{ margin: 0 }}>Talk to the Colonel AI to formulate side-incomes and convert them into organized Projects.</p>
         </div>
         
         {state.projects.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
               <Target size={40} className="text-muted" style={{ marginBottom: '10px' }} />
               <p className="text-muted" style={{ margin: 0 }}>No active projects recorded.</p>
            </div>
         ) : (
            state.projects.map(p => (
               <div key={p.id} className="card">
                  <h4>{p.title}</h4>
                  <p className="text-muted" style={{ fontSize: '12px' }}>{p.description}</p>
               </div>
            ))
         )}
      </div>
   );
}

function ColonelView({ state, dispatch }) {
   const [val, setVal] = useState('');
   const scrollRef = useRef(null);

   useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
   }, [state.chatHistory]);

   const handleSend = async (e) => {
      e.preventDefault();
      if(!val.trim()) return;
      
      const userText = val;
      setVal('');
      dispatch({ type: 'ADD_MESSAGE', payload: { sender: 'user', text: userText } });
      
      if (state.apiKey === 'demo') {
          setTimeout(() => {
              dispatch({ type: 'ADD_MESSAGE', payload: { sender: 'colonel', text: "You are running in DEMO mode. Supply a real API key to establish neural uplink." } });
          }, 1000);
          return;
      }
      
      try {
         // Add a loading message
         dispatch({ type: 'ADD_MESSAGE', payload: { sender: 'colonel', text: "Analyzing parameters..." } });
         
         const reply = await generateColonelResponse(state, userText);
         
         // Parse if there is a JSON block for new projects
         let cleanedReply = reply;
         let projData = null;
         
         if (reply.includes('```json')) {
             try {
                const jsonStr = reply.split('```json')[1].split('```')[0];
                projData = JSON.parse(jsonStr);
                cleanedReply = reply.split('```json')[0].trim() || "Project formalized. Check your dashboard.";
             } catch(e) {}
         }
         
         // Swap the "..." message
         dispatch({ type: 'REPLACE_LAST_MESSAGE', payload: { sender: 'colonel', text: cleanedReply }});
         
         if (projData && projData.newProject) {
             const pId = Date.now();
             dispatch({ type: 'CREATE_PROJECT', payload: { id: pId, title: projData.newProject.title, description: projData.newProject.description }});
             
             if (projData.newTasks && Array.isArray(projData.newTasks)) {
                projData.newTasks.forEach((t, i) => {
                   dispatch({ type: 'ADD_DAILY_TASK', payload: { id: Date.now() + i + 1, projectId: pId, text: t, createdAt: Date.now(), completed: false, punished: false }});
                });
             }
         }
         
      } catch (err) {
         console.error(err);
         dispatch({ type: 'REPLACE_LAST_MESSAGE', payload: { sender: 'colonel', text: "API FAILURE: " + err.message }});
      }
   };
   
   return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '800px', margin: '0 auto' }}>
         <div ref={scrollRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', marginBottom: '20px', gap: '15px', paddingRight: '10px' }}>
            {state.chatHistory.map((m, i) => (
               <div key={i} style={{ alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                  <span className="text-muted font-mono" style={{ fontSize: '11px', display: 'block', marginBottom: '4px', textAlign: m.sender === 'user' ? 'right' : 'left' }}>
                    {m.sender.toUpperCase()}
                  </span>
                  <div style={{ 
                     background: m.sender === 'user' ? 'var(--border-subtle)' : 'rgba(59, 130, 246, 0.1)', 
                     padding: '12px 16px', 
                     borderRadius: '8px',
                     border: m.sender === 'colonel' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                     color: m.sender === 'user' ? 'var(--text-main)' : 'var(--color-primary)'
                  }}>
                     {m.text}
                  </div>
               </div>
            ))}
         </div>
         <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
            <input value={val} onChange={e => setVal(e.target.value)} placeholder="Discuss your side income ideas..." />
            <button type="submit" className="primary">SEND</button>
         </form>
      </div>
   );
}

function TasksView({ state, dispatch }) {
   return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '800px', margin: '0 auto' }}>
         <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
               <h3 style={{ margin: '0 0 5px 0' }}>Daily Operations</h3>
               <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>Complete before the 24 hour reset to avoid severe physical/cognitive penalization.</p>
            </div>
            {/* Dev helper to spawn tasks */}
            <button style={{ fontSize: '12px' }} onClick={() => dispatch({ type: 'ADD_DAILY_TASK', payload: { id: Date.now(), text: "Draft architectural mockup for YouTube channel", createdAt: Date.now(), completed: false, punished: false }})}>
               [DEV] + Spawn Task
            </button>
         </div>
         
         {state.dailyTasks.length === 0 && (
             <p className="text-muted" style={{ textAlign: 'center', margin: '40px 0' }}>No daily tasks. Engage the Colonel to extract tasks.</p>
         )}

         {state.dailyTasks.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', borderColor: t.completed ? 'var(--color-success)' : 'var(--border-subtle)' }}>
               <span style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--text-muted)' : 'var(--text-main)' }}>
                 {t.text}
               </span>
               <button 
                 onClick={() => dispatch({ type: 'TOGGLE_TASK', payload: t.id })}
                 style={{ padding: '6px', background: t.completed ? 'rgba(16, 185, 129, 0.1)' : 'transparent', borderColor: t.completed ? 'var(--color-success)' : 'var(--border-subtle)', color: t.completed ? 'var(--color-success)' : 'var(--text-muted)' }}
               >
                 <CheckSquare size={18} />
               </button>
            </div>
         ))}
      </div>
   );
}

function SettingsView({ state, dispatch }) {
   const [apiServiceInput, setApiServiceInput] = useState(state.apiService || 'gemini');
   const [apiKeyInput, setApiKeyInput] = useState(state.apiKey || '');
   
   const [models, setModels] = useState([]);
   const [loading, setLoading] = useState(false);
   const [errorMsg, setErrorMsg] = useState('');
   const [selectedModel, setSelectedModel] = useState(state.selectedModel || '');

   const verifyAndFetchModels = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
         const list = await fetchAvailableModels(apiServiceInput, apiKeyInput);
         setModels(list);
         if (list.length > 0) {
             setSelectedModel(list[0]);
             dispatch({ type: 'SET_API_KEY', payload: { key: apiKeyInput, service: apiServiceInput, model: list[0] } });
         } else {
             dispatch({ type: 'SET_API_KEY', payload: { key: apiKeyInput, service: apiServiceInput, model: '' } });
         }
      } catch (err) {
         setErrorMsg(err.message);
      }
      setLoading(false);
   };
   
   const handleModelChange = (e) => {
       const m = e.target.value;
       setSelectedModel(m);
       dispatch({ type: 'SET_API_KEY', payload: { key: apiKeyInput, service: apiServiceInput, model: m } });
   };

   return (
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
         <div className="card">
            <h2 className="text-primary font-mono" style={{ margin: '0 0 10px 0' }}>Cognitive Configuration</h2>
            <p className="text-muted" style={{ margin: '0 0 20px 0' }}>Connect the Colonel's brain to an external LLM provider.</p>
            
            <label className="font-mono text-muted" style={{ fontSize: '11px', marginBottom: '5px', display: 'block' }}>PROVIDER</label>
            <select 
               value={apiServiceInput} 
               onChange={(e) => { setApiServiceInput(e.target.value); setModels([]); }}
               style={{ marginBottom: '20px' }}
            >
               <option value="gemini">Google Gemini</option>
               <option value="openai">OpenAI</option>
            </select>
            
            <label className="font-mono text-muted" style={{ fontSize: '11px', marginBottom: '5px', display: 'block' }}>API KEY</label>
            <input 
               type="password" 
               placeholder="Paste API Key here..." 
               value={apiKeyInput}
               onChange={(e) => setApiKeyInput(e.target.value)}
               style={{ marginBottom: '20px' }}
            />
            
            <button className="primary" onClick={verifyAndFetchModels} disabled={loading} style={{ width: '100%', marginBottom: '20px' }}>
               {loading ? 'SYNCING...' : 'VERIFY & FETCH MODELS'}
            </button>
            
            {errorMsg && <p className="text-danger font-mono" style={{ fontSize: '12px', marginBottom: '20px' }}>ERR: {errorMsg}</p>}
            
            {models.length > 0 && (
               <>
                  <label className="font-mono text-muted" style={{ fontSize: '11px', marginBottom: '5px', display: 'block' }}>AVAILABLE MODELS</label>
                  <select value={selectedModel} onChange={handleModelChange}>
                     {models.map(m => (
                        <option key={m} value={m}>{m}</option>
                     ))}
                  </select>
                  <p className="text-success font-mono" style={{ fontSize: '11px', margin: '15px 0 0 0' }}>Uplink established. Brain configured.</p>
               </>
            )}
            
            {state.apiKey && models.length === 0 && !errorMsg && (
               <p className="text-success font-mono" style={{ fontSize: '11px', margin: '15px 0 0 0' }}>Legacy Uplink Active. Click 'Verify' to load specific models.</p>
            )}
         </div>
      </div>
   );
}

export default App;
