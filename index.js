const fs = require('fs');
require('dotenv').config();
const Redis = require("./infrastructure/Redis");
const { v4 } = require("uuid");
const express = require("express");
const { FakeBrowser } = require('fakebrowser');
const setCookie = require('set-cookie-parser');



const app = express();
const port = process.env.PORT || "8888";

const url = [
    'https://www.latamairlines.com/co/es',
    'https://www.latamairlines.com/br/pt',
    'https://www.latamairlines.com/us/en',
    'https://www.latamairlines.com/py/es'
];

app.get("/", async (req, res) => {
    
    try {

        const fingerprintFolder = `./browser_data/${v4()}`;
        await Redis.save(v4());
        const startTime = new Date();
        const cookies = [];
        
        const builder = new FakeBrowser.Builder()
            .deviceDescriptor(require('./config/devices/windows.json'))
            .displayUserActionLayer(true)
            .vanillaLaunchOptions({
                //executablePath: "/usr/bin/google-chrome-stable",
                //executablePath: "/usr/bin/microsoft-edge",
                headless: false,
                incognito: true,
            })
            // .proxy({
            //     proxy: process.env.PROXY_HOST,
            //     username: process.env.PROXY_USER,
            //     password: process.env.PROXY_PASS,
            // })
            // .proxy({
            //     proxy: 'http://127.0.0.1:8888',
            // })
            .userDataDir(fingerprintFolder);

        const browser = await builder.launch();
        const page = await browser.vanillaBrowser.newPage();
        
        await page.setRequestInterception(true);
    
        page.on('request', (request) => {

            if (request.url() == url[2]) {

                request.continue();
            }
            else if (request.url().includes('QEyg')) {
                
                request.continue();
            }
            else {
                request.abort();
            }
        });

        page.on('response', (response) => {
        

            if (response._headers['set-cookie'] && response._headers['set-cookie'].includes("_abck")) {
                console.log(response._headers['set-cookie'])
                cookies.push(
                    setCookie.parse(response._headers['set-cookie'], {
                        decodeValues: true
                    })
                );
            }
        });

        await page.goto(url[2]);

        // const interval = await setInterval(async () => {

        //     let endTime = new Date();

        //     if (((endTime - startTime) / 1000) > 10 || cookies.length > 4) {
                
        //         await browser.shutdown();
        //         clearInterval(interval);
        //         fs.rmSync(fingerprintFolder, { recursive: true, force: true });

                
        //         const acbk = cookies.slice().reverse().find((cookie) => {
        //             return cookie[0].name == '_abck';
        //         });
                
        //         res.status(200).send(
        //             cookies
        //         );
        //     }
            
        // }, 100);


    } catch (e) {
        console.log(e)
        res.status(400).send(
            "Erro ao gerar cookie"
        );
    }
});


app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
});