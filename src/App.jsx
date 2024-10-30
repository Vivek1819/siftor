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
            setResult(data.scrapedData); // Update to use data.scrapedData
        } else {
            const errorData = await response.json();
            setError(errorData.error || 'Failed to scrape the website');
            setResult([]); 
        }
    };

    const renderElement = (item, index) => {
        return (
            <div key={index} className="mb-4">
                <h3 className="font-bold">{item.url}</h3>
                <p>{item.data}</p>
            </div>
        );
    };

    return (
        <div className="container mx-auto p-4">
            <form onSubmit={handleSubmit} className="text-center flex items-center justify-center mb-4">
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
        </div>
    );
}

export default App;