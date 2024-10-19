const express = require('express');
const cors = require('cors');
const { PlaywrightCrawler, RequestQueue } = require('crawlee');
const lockfile = require('proper-lockfile'); 
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

let requestQueue = null;
const visitedUrls = new Set();
const scrapedData = [];

const fs = require('fs');
const path = require('path');

async function forceUnlockFile(lockFilePath) {
    try {
        if (await lockfile.check(lockFilePath)) {
            await lockfile.unlock(lockFilePath, { realpath: false, force: true });
            console.log(`Forcefully unlocked: ${lockFilePath}`);
        }
    } catch (err) {
        console.error(`Error forcefully unlocking ${lockFilePath}:`, err);
    }
}

async function createRequestQueue() {
    const lockFilePath = 'D:\\Hackatron\\up2date\\api\\storage\\request_queues\\default';
    await forceUnlockFile(lockFilePath);

    try {
        return await RequestQueue.open();
    } catch (error) {
        console.error('Failed to create RequestQueue:', error);
        throw error;
    }
}

app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    if (url.includes('github.com')) {
        return res.status(400).json({ error: 'Scraping GitHub websites is not allowed.' });
    }

    try {
        requestQueue = await createRequestQueue();
        if (!requestQueue) {
            return res.status(500).json({ error: 'Could not open RequestQueue.' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Error creating request queue.' });
    }

    await requestQueue.addRequest({ url });

    const crawler = new PlaywrightCrawler({
        requestQueue,
        requestHandler: async ({ request, page }) => {
            console.log(`Crawling: ${request.url}`);

            if (visitedUrls.has(request.url)) {
                console.log(`Already visited: ${request.url}`);
                return;
            }

            visitedUrls.add(request.url);

            const content = await page.content();
            const elements = await page.$$eval('h1, h2, h3, h4, h5, h6, p, pre, code', nodes =>
                nodes.map(node => {
                    if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.tagName)) {
                        return { type: 'heading', content: node.innerText, tag: node.tagName };
                    } else if (node.tagName === 'P') {
                        return { type: 'paragraph', content: node.innerText };
                    } else if (['PRE', 'CODE'].includes(node.tagName)) {
                        return { type: 'code', content: node.innerText };
                    }
                    return null;
                }).filter(el => el !== null)
            );

            console.log(`Scraped data from ${request.url}:`, elements);
            scrapedData.push({ url: request.url, elements });

            const links = await page.$$eval('a', anchors => anchors.map(anchor => anchor.href));
            links.forEach(link => {
                if (isSameDomain(url, link) && !visitedUrls.has(link)) {
                    console.log(`Adding URL to queue: ${link}`);
                    requestQueue.addRequest({ url: link });
                } else {
                    console.log(`Invalid or already visited URL skipped: ${link}`);
                }
            });
        },
        failedRequestHandler: async ({ request }) => {
            console.log(`Request ${request.url} failed.`);
        },
        maxConcurrency: 10,
        navigationTimeoutSecs: 60,
        requestHandlerTimeoutSecs: 300,
    });

    try {
        await crawler.run();
        console.log('Crawling completed. Sending response...');

        const finalData = scrapedData.flatMap(data => data.elements);
        res.json(finalData);
    } catch (error) {
        console.error('Crawler encountered an error:', error);
        return res.status(500).json({ error: 'Crawler encountered an error.' });
    }
});

function isSameDomain(base, link) {
    try {
        const baseUrl = new URL(base);
        const linkUrl = new URL(link);
        return baseUrl.hostname === linkUrl.hostname && linkUrl.href.startsWith(baseUrl.origin);
    } catch (_) {
        return false;
    }
}

process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    process.exit();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
