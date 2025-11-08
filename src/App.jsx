import React, { useState, useEffect } from "react";

// Cybernix — React Live Bugfix Challenge
// Intention: ~5-10 minute bugfix task. Includes functional + security bugs.
// trusting postMessage, and an exposed API key. Suggested fixes are commented at the end.

export default function App() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [query, setQuery] = useState("");
  const [resultsHtml, setResultsHtml] = useState(""); // intentionally storing HTML
  const [adminMessage, setAdminMessage] = useState("");
  const [rawData, setRawData] = useState("");

  // ---- Mock data and "API" ----
  // NOTE: This API key is intentionally placed here (bad practice)
  const API_KEY = "PUBLIC_API_KEY_12345"; // <-- insecurely exposed

  const mockUsers = [
    { id: 1, name: 'Alice <img src=x onerror="alert(\'pwned\')">', role: 'user' },
    { id: 2, name: 'Bob', role: 'admin' },
    { id: 3, name: 'Charlie', role: 'user' },
  ];


  function mockFetch(url) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const body = "({ users: " + JSON.stringify(mockUsers) + " })"; 
        resolve({ status: 200, text: () => Promise.resolve(body) });
      }, 200);
    });
  }

  // ---- Auth (insecure) ----
  const handleLogin = () => {
    
    const token = btoa(username + ":" + password);
    
    localStorage.setItem("auth_token", token);

    setLoggedIn(true);

    const statusHtml = `<strong>Welcome, ${username}!</strong>`;
    setResultsHtml(statusHtml);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    setLoggedIn(false);
    setResultsHtml("");
  };

  // ---- Search (vulnerable rendering) ----
  useEffect(() => {
    const q = query.toLowerCase();
    const filtered = mockUsers
      .filter((u) => u.name.toLowerCase().includes(q))
      .map((u) => `<li>${u.name} (${u.role})</li>`)
      .join("");
    setResultsHtml(filtered);
  }, [query]);

  // ---- Load data (uses eval unsafely) ----
  const loadData = async () => {
    const res = await mockFetch('/api/users');
    const text = await res.text();
    try {
      const parsed = eval(text); 
      setRawData(JSON.stringify(parsed, null, 2));
    } catch (e) {
      setRawData('Parse error: ' + e.message);
    }
  };

  // ---- postMessage trust issue ----
  useEffect(() => {
    function onMsg(e) {
      if (e.data && e.data.cmd === 'logout') {
        localStorage.removeItem('auth_token');
        alert('Logged out via postMessage from: ' + e.origin);
        setLoggedIn(false);
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <div style={{ fontFamily: 'Arial', padding: 20 }}>
      <h2>Cybernix React Bugfix — App.jsx</h2>

      <div style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}>
        <h3>Login (mock)</h3>
        <input placeholder="username" value={username} onChange={e => setUsername(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
        <button onClick={handleLogout}>Logout</button>
        <div style={{ marginTop: 8 }}>
          {/* vulnerable rendering of login status and search results */}
          <div dangerouslySetInnerHTML={{ __html: resultsHtml }} />
        </div>
      </div>

      <div style={{ border: '1px solid #ddd', padding: 12, marginBottom: 12 }}>
        <h3>Search Users</h3>
        <input placeholder="search by name" value={query} onChange={e => setQuery(e.target.value)} />
        <ul dangerouslySetInnerHTML={{ __html: resultsHtml }} />
      </div>

      <div style={{ border: '1px solid #f88', padding: 12 }}>
        <h3>Admin Panel (unsafe by design)</h3>
        <input placeholder="Admin message (can be HTML)" value={adminMessage} onChange={e => setAdminMessage(e.target.value)} />
        <button onClick={() => {
          // intentionally insecure: admin-set HTML shown directly
          document.getElementById('publicMsg').innerHTML = adminMessage;
        }}>Set Message</button>
        <div id="publicMsg" style={{ marginTop: 8 }}></div>

        <h4>Dangerous API load</h4>
        <button onClick={loadData}>Load Data</button>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{rawData}</pre>

        <p style={{ color: '#a00' }}>Exposed API key (insecure): {API_KEY}</p>
      </div>
    </div>
  );
}
