const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    
    await page.goto('http://localhost:3000/auth.html');
    await page.type('#username', 'admin');
    await page.type('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    await page.goto('http://localhost:3000/dashboard.html');
    await new Promise(r => setTimeout(r, 2000));
    
    const faceLandmarkerType = await page.evaluate(() => typeof window.FaceLandmarker);
    console.log('FaceLandmarker type:', faceLandmarkerType);
    
    await page.click('#startCameraBtn');
    await new Promise(r => setTimeout(r, 3000));
    
    // Check video dimensions
    const dims = await page.evaluate(() => {
        const v = document.getElementById('cameraFeed');
        const overlay = document.getElementById('overlayCanvas');
        return { 
            videoOffsetWidth: v.offsetWidth, 
            videoOffsetHeight: v.offsetHeight, 
            videoWidth: v.videoWidth, 
            videoHeight: v.videoHeight,
            overlayWidth: overlay.width,
            overlayHeight: overlay.height
        };
    });
    console.log('Dims:', dims);
    
    // Check if face was detected
    const isDetected = await page.evaluate(() => window.isFaceDetected || document.getElementById('scanHud').style.display === 'none');
    console.log('Is face detected:', isDetected);
    
    await browser.close();
})();
