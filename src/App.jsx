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
            setResult(data.scrapedData); 
        } else {
            const errorData = await response.json();
            setError(errorData.error || 'Failed to scrape the website');
            setResult([]);
        }
    };

    const renderContent = (sectionContent) => {
        return sectionContent.map((element, index) => {
            switch (element.tag) {
                case 'p':
                    return <p key={index} className="mb-2">{element.text}</p>;
                case 'span':
                    return <span key={index} className="block mb-2">{element.text}</span>;
                case 'li':
                    return <li key={index} className="ml-4 list-disc">{element.text}</li>;
                case 'pre':
                    return <pre key={index} className="bg-gray-100 p-2 rounded">{element.text}</pre>;
                case 'code':
                    return <code key={index} className="bg-gray-200 p-1 rounded">{element.text}</code>;
                default:
                    return null;
            }
        });
    };

    const renderSection = (section, index) => (
        <div key={index} className="mb-6">
            <h3 className="text-xl font-bold mb-2">{section.title}</h3>
            <div className="ml-4">
                {renderContent(section.content)}
            </div>
        </div>
    );

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
                    {result.map((page, pageIndex) => (
                        <div key={pageIndex} className="mb-8">
                            <h3 className="text-2xl font-bold mb-4">{page.url}</h3>
                            {page.data.map(renderSection)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default App;
