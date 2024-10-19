import { useState } from 'react';

function App() {
    const [url, setUrl] = useState('');
    const [result, setResult] = useState([]);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); 
        const response = await fetch('http://localhost:5000/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        if (response.ok) {
            const data = await response.json();
            setResult(data); 
        } else {
            const errorData = await response.json();
            setError(errorData.error || 'Failed to scrape the website');
            setResult([]); 
        }
    };

    const renderElement = (item, index) => {
        if (item.type === 'heading') {
            const HeadingTag = item.tag.toLowerCase(); 
            return <HeadingTag key={index} className="font-bold">{item.content}</HeadingTag>;
        }
        if (item.type === 'paragraph') {
            return <p key={index} className="mb-2">{item.content}</p>;
        }
        if (item.type === 'code') {
            return (
                <pre key={index} className="bg-gray-100 p-2 mb-4 rounded">
                    <code>{item.content}</code>
                </pre>
            );
        }
        return null;
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="text-center flex items-center">
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter URL to scrape"
                    className="border p-2 mr-2"
                />
                <button type="submit" className="bg-blue-500 text-white p-2 rounded">Scrape</button>
            </form>

            {error && <p className="text-red-500">{error}</p>}

            {!error && result.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold mb-4">Scraped Content</h2>
                    {result.map(renderElement)}
                </div>
            )}
        </>
    );
}

export default App;
