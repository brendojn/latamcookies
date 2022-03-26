const fs = require('fs');
require('dotenv').config();
var axios = require('axios');
const Redis = require("./infrastructure/Redis");
const { v4 } = require("uuid");
const { FakeBrowser } = require('fakebrowser');
const setCookie = require('set-cookie-parser');
const utils = require('./utils/utils');

const urls = [
    'https://www.latamairlines.com/co/es',
    'https://www.latamairlines.com/br/pt',
    'https://www.latamairlines.com/us/en',
    'https://www.latamairlines.com/py/es',
];

const devices = [
    './config/devices/macOS.json',
    './config/devices/windows.json',
    './config/devices/chrome_ubuntu_20_04.json'
];

async function getBrowser(browserDataFolder) {
    
    const device = utils.getRandItem(devices);
    
    const builder = new FakeBrowser.Builder()
        .deviceDescriptor(require(device))
        .displayUserActionLayer(true)
        .vanillaLaunchOptions({
            headless: true,
            executablePath: "/usr/bin/microsoft-edge",
        })
        .proxy({
            proxy: process.env.PROXY_HOST,
            username: process.env.PROXY_USER,
            password: process.env.PROXY_PASS,
        })
        .userDataDir(browserDataFolder);

    return builder.launch();
}

async function testCookie(cookie) {

    try {

        var config = {
            method: 'get',
            timeout: 10000,
            proxy: {
                host: '127.0.0.1',
                port: '8888',
            },
            url: 'https://www.latamairlines.com/bff/air-offers/offers/search?sort=RECOMMENDED&cabinType=Economy&origin=SAO&destination=RIO&inFlightDate=null&inFrom=2022-05-18&inOfferId=null&outFlightDate=null&outFrom=2022-05-11&outOfferId=null&adult=1&child=0&infant=0&redemption=true&skyscanner_redirectid=U8RzwK6KR2SM1G8ujrjoLg&utm_campaign=br_latam_skyscanner_metasearch_perf_aon&utm_medium=metasearch&utm_source=skyscanner&utm_content=br_latam_perf_skyscanner_aon_nn_SAO-RIO_domestico_conversion_core_desktop',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36', 
                'Accept': '*/*', 
                'Accept-Language': 'pt-BR,pt;q=0.8,en-US;q=0.5,en;q=0.3', 
                'Accept-Encoding': 'gzip, deflate, br', 
                'X-latam-App-Session-Id': v4(), 
                'Content-Type': 'application/json', 
                'X-latam-Action-Name': 'search-result.flightselection.offers-search', 
                'X-latam-Application-Name': 'web-air-offers', 
                'X-latam-Client-Name': 'web-air-offers', 
                'X-latam-Track-Id': v4(), 
                'X-latam-Request-Id': v4(), 
                'X-latam-Application-Country': 'BR', 
                'X-latam-Application-Oc': 'br', 
                'X-latam-Application-Lang': 'pt', 
                'Connection': 'keep-alive', 
                'Cookie': `_abck=${cookie}`, 
                'Sec-Fetch-Dest': 'empty', 
                'Sec-Fetch-Mode': 'cors', 
                'Sec-Fetch-Site': 'same-origin', 
                'TE': 'trailers'
            }
        };
    
        const response = await axios(config);
        console.log("STATUS CODE", response.status)
        return response.status == 200;

    } catch(e) {
        console.log("ERROR ", e.message)
        return false;
    }
}

function rand() {
    return Math.floor(Math.random() * (1000 - 1 + 1) + 1)
}

(async() => {

    for (let i = 0; i < 100; i++){

        try {
            
            const cookies = [];
            const startTime = new Date();
            const url = utils.getRandItem(urls);
            const browserDataFolder = `./browser_data/${v4()}`;
        
            const browser = await getBrowser(browserDataFolder);

            const context = await browser.vanillaBrowser.createIncognitoBrowserContext();
            const page = await context.newPage();
    
            await page.setRequestInterception(true);
        
            page.on('request', (request) => {
    
                if (request.url() == url) {
    
                    request.continue();
                }
                else if (request.url().includes(process.env.AKAMAR_PART_URL)) {
                    
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
    
            await page.goto(url);
            
            for (let i = 0; i < 2; i++) {

                await page.mouse.down();
                await page.mouse.move(rand(), rand());
                await page.mouse.move(rand(), rand());
                await page.mouse.move(rand(), rand());
                await page.mouse.click(rand(), rand(), {delay: 100, button: 'right'});
                await page.mouse.move(rand(), rand());
                await page.mouse.move(rand(), rand());
                await page.mouse.move(rand(), rand());
                await page.mouse.click(rand(), rand(), {delay: 100, button: 'right'});
                await page.mouse.move(rand(), rand());
                await page.mouse.move(rand(), rand());
                await page.mouse.move(rand(), rand());
                await page.mouse.down();
            }


            await page.setBypassCSP(true);
    
            const interval = await setInterval(async () => {
    
                const totalTime = (new Date - startTime) / 1000;
    
                if (totalTime > 10 || cookies.length > 4) {
                    
                    await browser.shutdown();
                    clearInterval(interval);
                    fs.rmSync(browserDataFolder, { recursive: true, force: true });

                    const acbk = cookies.slice().reverse().find((cookie) => {
                        return cookie[0].name == '_abck';
                    });
    
                    console.log("TEMPO BUSCA COOKIE", totalTime);
                    console.log("TESTANDO COOKIE....");
                    const res = await testCookie(acbk[0].value)

                    if (res) {

                        console.log("COOKIE VALIDO");
                        console.log(acbk[0]);

                    } else {

                        console.log("COOKIE INVALIDO");
                    }
    
                }
                
            }, 100);
            
        
        } catch (e) {
            console.log("ERROR P", e.message)
            console.log(e)
        }
    } 

})();