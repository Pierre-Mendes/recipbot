import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
    const outputDir = path.join(__dirname, 'storage/app/browser-validation');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Abrir app deslogado -> deve ir para /login
    console.log('1. Navegando para raiz deslogado...');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, '01-redirect-login.png') });

    // 2. Registrar novo usuário
    console.log('2. Registrando novo usuário...');
    // Verificar se está na tela de login e navegar para registro se necessário
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
        // Tentar clicar no link de registro
        const registerLink = await page.$('a[href*="register"]');
        if (registerLink) {
            await registerLink.click();
            await page.waitForTimeout(1000);
        }
    }

    // Preencher registro
    const email = `validador_${Date.now()}@exemplo.com`;
    const nameInput = await page.$('input[name="name"], input[id="name"]');
    if (nameInput) await nameInput.fill('Validador QA');

    const emailInput = await page.$('input[name="email"], input[id="email"], input[type="email"]');
    if (emailInput) await emailInput.fill(email);

    const passwordInputs = await page.$$('input[type="password"]');
    if (passwordInputs.length >= 2) {
        await passwordInputs[0].fill('SenhaForte123!');
        await passwordInputs[1].fill('SenhaForte123!');
    } else if (passwordInputs.length === 1) {
        await passwordInputs[0].fill('SenhaForte123!');
    }

    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(outputDir, '02-pos-registro-dashboard.png') });

    // Fechar
    await browser.close();
    console.log('Finalizado script inicial');
})();
