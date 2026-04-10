export async function fetchAvailableModels(service, key) {
   if (!key) throw new Error("API Key required");
   
   if (service === 'gemini') {
       const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
       const res = await fetch(url);
       const data = await res.json();
       if (data.error) throw new Error(data.error.message);
       
       return data.models
           .filter(m => m.supportedGenerationMethods.includes('generateContent'))
           .map(m => m.name.replace('models/', '')); 
   }
   if (service === 'openai') {
       const url = 'https://api.openai.com/v1/models';
       const res = await fetch(url, { headers: { 'Authorization': `Bearer ${key}` }});
       const data = await res.json();
       if (data.error) throw new Error(data.error.message);
       
       // Filter to only GPT chat models to avoid embedding/dall-e clutter
       return data.data
           .map(m => m.id)
           .filter(id => id.includes('gpt'));
   }
   return [];
}

export async function generateColonelResponse(state, userMessage) {
   const { apiKey, apiService, selectedModel, chatHistory } = state;
   
   const systemPrompt = `You are "The Colonel", a brutally strict, no-nonsense AI life coach and project manager. 
The user is speaking with you to formalize their goals, side-incomes, or life projects.
Your standing orders: Interrogate them, figure out a concrete plan, and break it down into daily actionable tasks. 
Speak in a military, assertive, direct tone. Do not use pleasantries. Do not coddle them.

CRITICAL DIRECTIVE: 
If you have gathered enough information to formalize a project, you MUST end your response exactly with this JSON format block so the system can parse it into the database:
\`\`\`json
{
  "newProject": { "title": "Project Name", "description": "Short description of the tactical objective" },
  "newTasks": ["First specific daily requirement", "Second physical or research task"]
}
\`\`\``;

   const modelToUse = selectedModel || (apiService === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini');

   if (apiService === 'gemini') {
      // Ensure the model format is correct (sometimes gemini requires 'models/' prefix, sometimes just the name works in the URL path)
      const formattedModel = modelToUse.startsWith('models/') ? modelToUse.replace('models/', '') : modelToUse;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${formattedModel}:generateContent?key=${apiKey}`;
      
      const contents = chatHistory.slice(1).map(m => ({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
      }));
      contents.push({ role: 'user', parts: [{ text: userMessage }] });
      
      const payload = {
         systemInstruction: { parts: [{ text: systemPrompt }] },
         contents: contents
      };
      
      const response = await fetch(url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.candidates[0].content.parts[0].text;
   } 
   
   if (apiService === 'openai') {
      const url = 'https://api.openai.com/v1/chat/completions';
      const messages = [
         { role: 'system', content: systemPrompt },
         ...chatHistory.map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text })),
         { role: 'user', content: userMessage }
      ];
      
      const response = await fetch(url, {
         method: 'POST',
         headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
         },
         body: JSON.stringify({
            model: modelToUse,
            messages: messages
         })
      });
      
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content;
   }
}
