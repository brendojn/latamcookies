const fs = require('fs');
require('dotenv').config();
const redis = require("redis");
const { v4 } = require("uuid");
const express = require("express");
const { FakeBrowser } = require('fakebrowser');
const setCookie = require('set-cookie-parser');

const app = express();
const port = process.env.PORT || "8888";

app.get("/", async (req, res) => {
    
    try {

        const fingerprintFolder = `./browser_data/${v4()}`;
        const startTime = new Date();
        const cookies = [];
        
        const builder = new FakeBrowser.Builder()
            .deviceDescriptor(require('./config/devices/macOS.json'))
            .vanillaLaunchOptions({
                headless: true,
            })
            .proxy({
                proxy: process.env.PROXY_HOST,
                username: process.env.PROXY_USER,
                password: process.env.PROXY_PASS,
            })
            .userDataDir(fingerprintFolder);

        const browser = await builder.launch();
        const page = await browser.vanillaBrowser.newPage();
        
        await page.setRequestInterception(true);
    
        page.on('request', (request) => {

            if (request.url() == 'https://www.latamairlines.com/br/pt') {

                request.continue();
            }
            else if (request.url().includes('xsO1g')) {

                request.continue();
            }
            else {
                request.abort();
            }
        });

        page.on('response', (response) => {
            
            if (response._headers['set-cookie'] && response._headers['set-cookie'].includes("_abck")) {
                
                cookies.push(
                    setCookie.parse(response._headers['set-cookie'], {
                        decodeValues: true
                    })
                );
            }
        });

        await page.goto('https://www.latamairlines.com/br/pt');

        const interval = await setInterval(async () => {

            let endTime = new Date();

            if (((endTime - startTime) / 1000) > 10 || cookies.length > 4) {
                
                await browser.shutdown();
                clearInterval(interval);
                fs.rmSync(fingerprintFolder, { recursive: true, force: true });
                res.status(200).send(
                    cookies
                );
            }
            
        }, 100);
    } catch (e) {

        res.status(400).send(
            "Erro ao gerar cookie"
        );
    }
});


app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});