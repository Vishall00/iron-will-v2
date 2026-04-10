import React, { useState, useEffect } from 'react';

const REFLECTIONS = [
  "I failed to execute my operational parameters. I allowed weakness to compromise my sequence. Discipline is not a part-time engagement. I alone am responsible for this failure.",
  "Excuses are the language of the undisciplined. I defaulted on my commitment and betrayed my roadmap. I will reconstruct my focus immediately. Hesitation has been eliminated.",
  "My objective was clear, yet my action was absent. By missing this task, I have prolonged my own success. I accept this cognitive penalty to engrave the cost of failure."
];

export default function CognitiveTracker({ amount, onComplete }) {
  const [targetText, setTargetText] = useState('');
  const [inputText, setInputText] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
     // Pick random reflection
     setTargetText(REFLECTIONS[Math.floor(Math.random() * REFLECTIONS.length)]);
     setStartTime(Date.now());
  }, []);

  const handleChange = (e) => {
     const value = e.target.value;
     
     // Validate it matches exactly up to current length
     if (targetText.startsWith(value)) {
        setInputText(value);
        setErrorVisible(false);
        
        if (value === targetText) {
           const timeTaken = (Date.now() - startTime) / 1000;
           // Ensure they didn't just paste it somehow (typing speed check - rough)
           if (timeTaken < (targetText.length / 15)) {
               alert("Typing speeds detected beyond human capacity. Copy-pasting is a violation of the Penitence Protocol. Start over.");
               setInputText('');
               setStartTime(Date.now());
           } else {
               onComplete();
           }
        }
     } else {
        // Did not match
        setErrorVisible(true);
     }
  };

  const handlePaste = (e) => {
     e.preventDefault();
     alert("Copying and pasting is fundamentally undisciplined. You must type the words.");
  };

  return (
    <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
       <h3 className="text-primary font-mono" style={{ marginBottom: '15px' }}>COGNITIVE AFTER ACTION REPORT</h3>
       <p className="text-muted" style={{ fontSize: '13px', marginBottom: '20px' }}>
         You missed a 24-hour execution parameter. You must type the following reflection exactly as written. Case-sensitive. Punctuation matters.
       </p>
       
       <div style={{ userSelect: 'none', padding: '15px', background: 'var(--bg-dark)', borderRadius: '6px', marginBottom: '20px', fontFamily: 'monospace', lineHeight: '1.6', color: 'var(--text-muted)' }}>
          {targetText.split('').map((char, i) => {
             let color = 'var(--text-muted)';
             if (i < inputText.length) {
                color = 'var(--color-success)'; // typed correct
             }
             return <span key={i} style={{ color }}>{char}</span>;
          })}
       </div>

       <textarea 
          value={inputText}
          onChange={handleChange}
          onPaste={handlePaste}
          style={{ 
             width: '100%', 
             height: '100px', 
             fontFamily: 'monospace',
             borderColor: errorVisible ? 'var(--color-danger)' : 'var(--border-subtle)'
          }}
          placeholder="Begin typing here..."
          autoFocus
       />
       {errorVisible && <p className="text-danger" style={{ fontSize: '12px', marginTop: '10px' }}>Typo detected. You must fix the error before proceeding.</p>}
       
       <div style={{ textAlign: 'center', marginTop: '20px' }}>
           <button style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px'}} onClick={() => onComplete()}>[DEV BYPASS]</button>
       </div>
    </div>
  );
}
