import express from 'express';
import cors from 'cors';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio'; 
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { URL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

const MAX_PAGES = 1000; 

app.post('/scrape', async (req, res) => {
    const { url } = req.body;

    console.log('Scraping URL:', url);

    if (!url) {
        console.log('No URL provided');
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        const visitedUrls = new Set();
        const urlQueue = [url];
        const scrapedData = [];

        const baseUrl = new URL(url).origin;
        console.log('Base URL:', baseUrl);

        while (urlQueue.length > 0 && visitedUrls.size < MAX_PAGES) {
            const currentUrl = urlQueue.shift();
            if (visitedUrls.has(currentUrl)) {
                continue;
            }

            console.log(`Visiting URL: ${currentUrl}`);
            await page.goto(currentUrl, { waitUntil: 'networkidle2' });
            const content = await page.content();
            const $ = cheerio.load(content);

            const pageData = [];
            let currentSection = { title: "", content: [] };

            $('h1, h2, h3, h4, h5, h6, p, span, li, pre, code').each((_, element) => {
                const tag = $(element).prop('tagName').toLowerCase();
                const text = $(element).text().trim();

                if (text) {
                    if (tag.startsWith('h')) {
                        if (currentSection.content.length > 0) {
                            pageData.push(currentSection);
                        }
                        currentSection = { title: text, content: [] };
                    } else {
                        
                        currentSection.content.push({ tag, text });
                    }
                }
            });

            if (currentSection.content.length > 0) {
                pageData.push(currentSection);
            }

            scrapedData.push({ url: currentUrl, data: pageData });

            $('a[href]').each((_, element) => {
                const link = $(element).attr('href');
                if (link && !visitedUrls.has(link)) {
                    try {
                        const absoluteLink = new URL(link, baseUrl).href;
                        if (absoluteLink.startsWith(baseUrl)) {
                            urlQueue.push(absoluteLink);
                        }
                    } catch (e) {
                        // Ignore invalid URLs
                    }
                }
            });

            visitedUrls.add(currentUrl);
        }

        console.log('Closing Puppeteer...');
        await browser.close();

        res.json({ scrapedData });

    } catch (error) {
        console.error('Unexpected Error:', error);
        return res.status(500).json({ error: 'An unexpected error occurred.' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});