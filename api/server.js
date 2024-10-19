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

function cleanupLockFiles(lockFilePath) {
    fs.readdir(lockFilePath, (err, files) => {
        if (err) {
            console.error('Error reading lock file directory:', err);
            return;
        }
        files.forEach(file => {
            if (file.endsWith('.lock')) { 
                fs.unlink(path.join(lockFilePath, file), (unlinkErr) => {
                    if (unlinkErr) {
                        console.error('Error deleting lock file:', unlinkErr);
                    } else {
                        console.log(`Deleted old lock file: ${file}`);
                    }
                });
            }
        });
    });
}

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
    const maxRetries = 5;
    const delayBetweenRetries = 1000; 
    const lockFilePath = 'D:\\Hackatron\\up2date\\api\\storage\\request_queues\\default'; 
    cleanupLockFiles(lockFilePath); 

    for (let attempts = 0; attempts < maxRetries; attempts++) {
        try {
            return await RequestQueue.open();
        } catch (error) {
            if (error.code === 'ELOCKED') {
                console.warn(`Lock file is already being held. Attempt ${attempts + 1}/${maxRetries}. Retrying in ${delayBetweenRetries / 1000} seconds...`);
                await forceUnlockFile(lockFilePath); 
                await new Promise(resolve => setTimeout(resolve, delayBetweenRetries)); 
            } else {
                console.error('Failed to create RequestQueue:', error);
                throw error; 
            }
        }
    }
    throw new Error('Unable to create RequestQueue after multiple attempts due to lock.'); 
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
            return res.status(500).json({ error: 'Could not open RequestQueue due to lock.' });
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
            const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements => elements.map(el => el.innerText));
            const paragraphs = await page.$$eval('p', elements => elements.map(el => el.innerText));
            const codes = await page.$$eval('pre, code', elements => elements.map(el => el.innerText)); // Scraping code components

            console.log(`Scraped data from ${request.url}:`, { headings, paragraphs, codes });

            scrapedData.push({ url: request.url, content, headings, paragraphs, codes });

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

        const combinedData = {
            content: scrapedData.map(data => data.content).join('\n'), 
            headings: scrapedData.flatMap(data => data.headings),
            paragraphs: scrapedData.flatMap(data => data.paragraphs),
            codes: scrapedData.flatMap(data => data.codes), // Collecting code snippets
        };

        res.json(combinedData);
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
    try {
        const lockFilePath = 'D:\\Hackatron\\up2date\\api\\storage\\request_queues\\default';
        if (await lockfile.check(lockFilePath)) {
            await lockfile.unlock(lockFilePath, { force: true });
            console.log(`Forcefully unlocked: ${lockFilePath}`);
        }
    } catch (err) {
        console.error('Error during unlocking:', err);
    }
    process.exit();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
