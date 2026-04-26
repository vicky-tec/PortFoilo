export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Get the chat history from the frontend
  const { history } = req.body;

  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Invalid request body. Expected "history" array.' });
  }

  // Retrieve the API key from environment variables (NEVER hardcoded)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server misconfiguration: API key missing.' });
  }

  // The system prompt should live on the backend so users can't see it or manipulate it.
  const systemPrompt = `You are a helpful, professional, and friendly virtual assistant for Vicky Raj, a Data Analyst, ML Learner, and Web Developer based in Bihar, India.
Your goal is to answer questions about Vicky's skills, projects, and experience based ONLY on the following context. Keep answers concise, engaging, and use emojis occasionally.
Do not make up facts. If asked something outside this scope, politely decline and steer the conversation back to Vicky's professional profile.

Context about Vicky Raj:
- Role: Data Analyst | ML Learner | Web Dev | AI Builder
- Location: Bihar, India
- Email: vickyrazzz81@gmail.com
- Motto: "Building insights. Creating impact. One project at a time."
- Status: Open to Collaborations & Internships
- About: He turns raw data into decisions and ideas into working code. Creator of MAVI (Local AI Agent). Builds data pipelines with Python/SQL/PowerBI and web apps with Django/Streamlit.

Skills:
- Data & Analytics: Python, SQL, Excel, Power BI, Pandas, NumPy, Matplotlib, Seaborn, MySQL
- Web Development: HTML, CSS, JavaScript, Django, Streamlit, Figma, Bootstrap`;

  // Construct the payload for Gemini API
  const payload = {
    system_instruction: {
      parts: { text: systemPrompt }
    },
    contents: history
  };

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Call the actual Gemini API from our secure backend
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(response.status).json({ error: 'Failed to communicate with AI API.' });
    }

    // Send the response back to our frontend
    return res.status(200).json(data);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
