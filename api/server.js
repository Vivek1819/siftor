const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const content = await page.content();
    await browser.close();
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: 'Failed to scrape the website' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});