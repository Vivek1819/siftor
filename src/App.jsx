import { useState } from 'react'

function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('http://localhost:5000/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
    const data = await response.json();
    setResult(data.content);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className='text-center flex items-center'>
        <input 
          type="text" 
          value={url} 
          onChange={(e) => setUrl(e.target.value)} 
          placeholder="Enter URL to scrape" 
        />
        <button type="submit">Scrape</button>
      </form>
      <p>{result}</p>
    </>
  )
}

export default App