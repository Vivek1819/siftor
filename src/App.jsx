import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
    const [url, setUrl] = useState('');
    const [result, setResult] = useState([]);
    const [error, setError] = useState('');
    const [currentUrl, setCurrentUrl] = useState('');
    const [ws, setWs] = useState(null);
    const [isScraping, setIsScraping] = useState(false);
    const [isInitial, setIsInitial] = useState(true);
    const [visitedUrls, setVisitedUrls] = useState([]); // State to manage the list of visited URLs

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
                setIsScraping(true);
                setIsInitial(false);
                updateVisitedUrls(data.visiting);
            } else if (data.scrapedData) {
                console.log('Scraped data received:', data.scrapedData);
                setResult(data.scrapedData);
                setCurrentUrl('');
                setIsScraping(false);
            } else if (data.error) {
                console.error('Error:', data.error);
                setError(data.error);
                setCurrentUrl('');
                setIsScraping(false);
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

    const updateVisitedUrls = (newUrl) => {
        setVisitedUrls((prevUrls) => {
            const updatedUrls = [...prevUrls, newUrl];
            if (updatedUrls.length > 3) {
                updatedUrls.shift(); // Remove the oldest URL if the list exceeds 3 items
            }
            return updatedUrls;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setCurrentUrl('');
        setResult([]);
        setIsInitial(false);

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
        <div className={`bg-custom-diagonal bg-[length:200%_200%] animate-gradient-flow container mx-auto p-4 ${isInitial || isScraping ? 'h-screen flex flex-col justify-center items-center' : ''}`}>
            {(!isScraping && result.length === 0) && (
                <h1 className="text-white text-5xl font-bold text-center mb-14">up2date</h1>
            )}
            
            {isInitial && (
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

            {isScraping && (
                <div className="flex flex-col justify-center items-center h-screen">
                    <h1 className="text-white text-5xl font-bold text-center p-10 relative">up2date</h1>
                    <ul className="text-zinc-400 text-center">
                    <AnimatePresence>
                        {visitedUrls.map((url, index) => (
                            <motion.li
                                key={url}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.5 }}
                                className="mb-2"
                            >
                                {url}
                            </motion.li>
                        ))}
                    </AnimatePresence>
                </ul>
                </div>
            )}

            {error && <p className="text-red-500">{error}</p>}

            {!error && result.length > 0 && (
                <div>
                    <h1 className="text-white text-5xl font-bold text-center mb-14">up2date</h1>
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