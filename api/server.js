const express = require('express');
const cors = require('cors');
const { PlaywrightCrawler, RequestQueue } = require('crawlee');
const lockfile = require('proper-lockfile'); // Added proper-lockfile for forced unlock
const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

let requestQueue = null; // Declare requestQueue at a higher scope
const visitedUrls = new Set(); // Set to track visited URLs

const fs = require('fs');
const path = require('path');

// Cleanup function to remove old lock files
function cleanupLockFiles(lockFilePath) {
    fs.readdir(lockFilePath, (err, files) => {
        if (err) {
            console.error('Error reading lock file directory:', err);
            return;
        }
        files.forEach(file => {
            if (file.endsWith('.lock')) { // Check for lock files
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

// Function to forcefully unlock a lockfile if it is stuck
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
    const delayBetweenRetries = 1000; // 1 second
    const lockFilePath = 'D:\\Hackatron\\up2date\\api\\storage\\request_queues\\default'; // Update this to your lock file directory
    cleanupLockFiles(lockFilePath); // Clean up old lock files

    for (let attempts = 0; attempts < maxRetries; attempts++) {
        try {
            return await RequestQueue.open();
        } catch (error) {
            if (error.code === 'ELOCKED') {
                console.warn(`Lock file is already being held. Attempt ${attempts + 1}/${maxRetries}. Retrying in ${delayBetweenRetries / 1000} seconds...`);
                await forceUnlockFile(lockFilePath); // Attempt to force unlock
                await new Promise(resolve => setTimeout(resolve, delayBetweenRetries)); // Wait before retrying
            } else {
                console.error('Failed to create RequestQueue:', error);
                throw error; // Rethrow unexpected errors
            }
        }
    }
    throw new Error('Unable to create RequestQueue after multiple attempts due to lock.'); // Throw an error after retries
}

app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Prevent scraping GitHub URLs
    if (url.includes('github.com')) {
        return res.status(400).json({ error: 'Scraping GitHub websites is not allowed.' });
    }

    // Create a new instance of RequestQueue
    try {
        requestQueue = await createRequestQueue();
        if (!requestQueue) {
            return res.status(500).json({ error: 'Could not open RequestQueue due to lock.' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Error creating request queue.' });
    }

    await requestQueue.addRequest({ url }); // Add the initial URL to the request queue

    // Create a new instance of PlaywrightCrawler
    const crawler = new PlaywrightCrawler({
        requestQueue,
        requestHandler: async ({ request, page }) => {
            console.log(`Crawling: ${request.url}`);

            // Check if the URL has already been visited
            if (visitedUrls.has(request.url)) {
                console.log(`Already visited: ${request.url}`);
                return; // Skip processing
            }

            visitedUrls.add(request.url); // Mark the URL as visited

            // The code to handle the page scraping
            const content = await page.content(); // Get the full HTML content
            const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements => elements.map(el => el.innerText));
            const paragraphs = await page.$$eval('p', elements => elements.map(el => el.innerText));

            // Send back the result for the first URL only
            if (request.id === '0') {
                res.json({ content, headings, paragraphs });
            }

            // Extract links from the page and enqueue them for crawling
            const links = await page.$$eval('a', anchors => anchors.map(anchor => anchor.href));
            links.forEach(link => {
                if (isSameDomain(url, link) && !visitedUrls.has(link)) {
                    console.log(`Adding URL to queue: ${link}`);
                    requestQueue.addRequest({ url: link });
                } else {
                    console.log(`Invalid URL skipped: ${link}`);
                }
            });
        },
        failedRequestHandler: async ({ request }) => {
            console.log(`Request ${request.url} failed.`);
        },
        maxConcurrency: 10, // Increase concurrency for faster crawling
        navigationTimeoutSecs: 60, // Increase timeout to handle slow pages
        requestHandlerTimeoutSecs: 300, // Increase timeout to handle slow requests
    });

    try {
        // Start the crawler
        await crawler.run(); // Run the crawler
    } catch (error) {
        console.error('Crawler encountered an error:', error);
        return res.status(500).json({ error: 'Crawler encountered an error.' });
    }
});

// Function to check if the link belongs to the same domain
function isSameDomain(base, link) {
    try {
        const baseUrl = new URL(base);
        const linkUrl = new URL(link);
        return baseUrl.hostname === linkUrl.hostname && linkUrl.href.startsWith(baseUrl.origin);
    } catch (_) {
        return false;
    }
}


// Forcefully unlock lockfiles on app shutdown
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
