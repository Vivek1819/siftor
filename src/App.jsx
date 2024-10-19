import { useState } from 'react';

function App() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState({ content: '', headings: [], paragraphs: [] });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('http://localhost:5000/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      setResult(data); // Ensure this correctly sets the result
    } else {
      setResult({ content: '', headings: [], paragraphs: [], error: 'Failed to scrape the website' });
    }
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
      {result.error ? (
        <p>{result.error}</p>
      ) : (
        <>
          <h2>Headings</h2>
          <ul>
            {result.headings.map((heading, index) => (
              <li key={index}>{heading}</li>
            ))}
          </ul>
          <h2>Paragraphs</h2>
          <ul>
            {result.paragraphs.map((paragraph, index) => (
              <li key={index}>{paragraph}</li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default App;
