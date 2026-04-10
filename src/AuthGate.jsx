import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Target } from 'lucide-react';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      if (isLogin) {
        const { Math, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        else setErrorMsg('Success! If no confirmation email hit your inbox, you can log in immediately.');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !session) {
    return (
       <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <span className="text-primary font-mono animate-pulse">CONNECTING TO SUPABASE CLOUD...</span>
       </div>
    );
  }

  if (!session) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <Target size={48} className="text-primary" style={{ marginBottom: '20px' }} />
          <h2 className="font-mono text-main" style={{ marginBottom: '10px' }}>IRON WILL V2</h2>
          <p className="text-muted" style={{ marginBottom: '30px' }}>
             Identify yourself. Unauthorized access is strictly prohibited.
          </p>
          
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="Password (Min 6 chars)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            
            <button className="primary" type="submit" disabled={loading}>
              {loading ? 'PROCESSING...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
            </button>
          </form>
          
          {errorMsg && <p className={errorMsg.includes('Success') ? "text-success font-mono" : "text-danger font-mono"} style={{ fontSize: '12px', marginTop: '15px' }}>{errorMsg}</p>}
          
          <div style={{ marginTop: '20px' }}>
              <button 
                 onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
                 style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                 {isLogin ? "Need to enlist? Sign Up" : "Already an operative? Login"}
              </button>
          </div>
        </div>
      </div>
    );
  }

  return React.cloneElement(children, { user: session.user });
}
