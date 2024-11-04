import { useState, useEffect } from 'react';

function App() {
    const [url, setUrl] = useState('');
    const [result, setResult] = useState([]);
    const [error, setError] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');
    const [ws, setWs] = useState(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:5000');

        socket.onopen = () => {
            console.log('Connected to WebSocket server');
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.visiting) {
                console.log('Currently visiting:', data.visiting);
                setCurrentUrl(data.visiting);
            } else if (data.scrapedData) {
                console.log('Scraped data received:', data.scrapedData);
                setResult(data.scrapedData);
                setCurrentUrl('');
            } else if (data.error) {
                console.error('Error:', data.error);
                setError(data.error);
                setCurrentUrl('');
            }
        };

        socket.onclose = () => {
            console.log('Disconnected from WebSocket server');
        };

        setWs(socket);

        return () => {
            socket.close();
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setCurrentUrl('');
        setResult([]);

        if (ws) {
            ws.send(JSON.stringify({ url }));
        }
    };

    const renderContent = (sectionContent) => {
        return sectionContent.map((element, index) => {
            switch (element.tag) {
                case 'p':
                    return <p key={index} className="text-white mb-2">{element.text}</p>;
                case 'li':
                    return <li key={index} className="text-white ml-4 list-disc">{element.text}</li>;
                case 'pre':
                    return <pre key={index} className="bg-gray-100 p-2 rounded white text-wrap">{element.text}</pre>;
                default:
                    return null;
            }
        });
    };

    const renderSection = (section, index) => (
        <div key={index} className="mb-6">
            <h3 className="text-white text-xl font-bold mb-2">{section.title}</h3>
            <div className="ml-4">
                {renderContent(section.content)}
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-r from-black via-zinc-700 to-zinc-600 container mx-auto p-4">
            <h1 className="text-white text-5xl font-bold text-center m-4 mb-14">up2date</h1>
            {!currentUrl && (
                <form onSubmit={handleSubmit} className="text-center flex items-center justify-center mb-4">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter URL"
                        className="text-white bg-zinc-700 rounded text-center p-2 mr-2"
                    />
                    <button type="submit" className="bg-white text-black p-2 rounded">Scrape</button>
                </form>
            )}

            {currentUrl && (
                <p className="text-white text-center">Currently visiting: {currentUrl}</p>
            )}

            {error && <p className="text-red-500">{error}</p>}

            {!error && result.length > 0 && (
                <div>
                    {result.map((page, pageIndex) => (
                        <div key={pageIndex} className="mb-8">
                            <h3 className="text-white text-2xl font-bold mb-4 text-center mt-4">{page.url}</h3>
                            {page.data.map(renderSection)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;