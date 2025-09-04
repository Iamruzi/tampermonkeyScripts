// ==UserScript==
// @name         通用铭文SAT计算器
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  铭文成本计算与通用单位转换器。
// @author       Iamruzi (Fixed by Gemini)
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @connect      api.coingecko.com
// @connect      api.binance.com
// @connect      www.okx.com
// @connect      mempool.space
// @connect      blockstream.info
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // =================================================================================
    // 1. 全局常量和变量定义
    // =================================================================================

    const SATS_PER_BTC = 100_000_000;
    let btcToUsdtRate = 0, recommendedFees = {}, isUpdatingConverter = false;
    let allElements = {}; // 集中存储所有DOM元素, 主要用于事件绑定和UI切换

    // =================================================================================
    // 2. UI界面注入 (HTML 和 CSS)
    // =================================================================================

    function injectUI() {
        // --- CSS样式 ---
        GM_addStyle(`
            :root { --brand-orange: #f7931a; --bg-main: #ffffff; --bg-panel: #f8f9fa; --text-primary: #212529; --text-secondary: #6c757d; --border-color: #dee2e6; --success-color: #28a745; --danger-color: #dc3545; }
            #sat-calc-trigger { position: fixed !important; display: flex !important; justify-content: center !important; align-items: center !important; width: 55px !important; height: 55px !important; background-color: var(--brand-orange) !important; color: white !important; border-radius: 50% !important; border: none !important; cursor: grab !important; font-size: 28px !important; box-shadow: 0 5px 15px rgba(0,0,0,0.25) !important; z-index: 2147483646 !important; transition: transform 0.2s ease !important; opacity: 1 !important; visibility: visible !important; }
            #sat-calc-trigger:hover { transform: scale(1.1); } #sat-calc-trigger:active { cursor: grabbing; }
            #sat-calc-container { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; max-width: 480px; box-sizing: border-box; background-color: var(--bg-main); border-radius: 16px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15); z-index: 2147483647; display: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: var(--text-primary); border: 1px solid var(--border-color); overflow: hidden; }
            .sat-calc-header { padding: 12px 20px; background-color: var(--bg-panel); border-bottom: 1px solid var(--border-color); cursor: move; display: flex; justify-content: space-between; align-items: center; } .sat-calc-header:active { cursor: grabbing; }
            .sat-calc-header h1 { font-size: 18px; margin: 0; color: var(--text-primary); font-weight: 600; } .sat-calc-close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #888; }
            .sat-calc-body { padding: 10px 25px 25px 25px; max-height: 80vh; overflow-y: auto; } .sat-calc-body h2 { font-size: 1.2em; font-weight: 600; margin-top: 25px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; display: flex; align-items: center;}
            .info-panel { text-align: center; font-size: 0.85em; padding: 12px; background: var(--bg-panel); border-radius: 8px; margin-bottom: 20px; color: var(--text-secondary); }
            .input-group { margin-bottom: 18px; } .input-group label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 0.95em; color: #495057; }
            .input-group input { width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; box-sizing: border-box; font-size: 1em; background-color: #fff; }
            .input-group input:focus { outline: none; border-color: var(--brand-orange); box-shadow: 0 0 0 3px rgba(247, 147, 26, 0.2); }
            .fee-buttons { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px; } .fee-buttons button { padding: 10px; font-size: 0.9em; border: 1px solid var(--border-color); background-color: #fff; border-radius: 6px; cursor: pointer; transition: all 0.2s; } .fee-buttons button:hover { background-color: #f1f3f5; }
            .output-group { background: var(--bg-panel); border-left: 4px solid var(--brand-orange); padding: 15px; border-radius: 6px; margin-top: 10px; cursor: pointer; }
            .output-group p { margin: 0; font-size: 1.1em; color: var(--text-primary); } .output-group span { font-weight: 700; }
            .output-group-detailed { background: var(--bg-panel); border-radius: 6px; padding: 15px; margin-top: 10px; font-size: 0.95em; }
            .cost-line { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #e9ecef; }
            .cost-line:last-child { border-bottom: none; font-weight: 700; font-size: 1.1em; cursor: pointer; }
            .cost-label { color: var(--text-primary); } .cost-value { text-align: right; } .cost-value .sats { color: var(--text-primary); font-weight: 700; } .cost-value .converted { font-size: 0.85em; color: var(--text-secondary); display: block; }
            #cost-info-trigger { margin-left: 8px; cursor: pointer; font-size: 16px; color: #888; border: 1px solid #ccc; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; justify-content: center; align-items: center; font-style: normal; user-select: none;}
            #tutorial-modal { display: none; position: fixed; z-index: 2147483647; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.7); justify-content: center; align-items: center; }
            #tutorial-modal img { max-width: 90%; max-height: 90%; border-radius: 8px; }
            #manual-rate-input { width: 50%; margin: 5px auto; display: block; padding: 5px; text-align: center; border: 1px solid var(--brand-orange); border-radius: 4px; }
            .refresh-btn { cursor: pointer; display: inline-block; margin-left: 8px; font-size: 1.2em; vertical-align: middle; }
            #pl-panel { text-align: center; padding: 20px; margin-top: 20px; border-radius: 8px; } #pl-panel .pl-value { font-size: 2.2em; font-weight: 700; display: block; margin-bottom: 5px; } #pl-panel .pl-label { font-size: 0.9em; color: var(--text-secondary); }
            .profit { background-color: rgba(40, 167, 69, 0.1); color: var(--success-color); } .loss { background-color: rgba(220, 53, 69, 0.1); color: var(--danger-color); } .neutral { background-color: var(--bg-panel); color: var(--text-secondary); }
        `);

        // --- HTML内容 ---
        const tutorialImageUrl = ''; // You can add your base64 image data here
        const panelHTML = `
            <div id="sat-calc-container">
                <div class="sat-calc-header"><h1>通用铭文SAT计算器</h1><button class="sat-calc-close-btn">&times;</button></div>
                <div class="sat-calc-body">
                    <div class="info-panel"><div id="rate-display">正在加载汇率...</div><div id="fees-display">正在加载费率...</div></div>
                    <h2>1. 铭文铸造成本 <i id="cost-info-trigger">i</i></h2>
                    <div class="input-group"><label>网络费率 (sat/vB)</label><input type="number" id="fee-rate" placeholder="e.g., 10"><div class="fee-buttons"><button id="btn-low">低</button><button id="btn-medium">中</button><button id="btn-high">高</button></div></div>
                    <div class="input-group"><label>单张交易大小 (vB)</label><input type="number" id="tx-size" value="200"></div>
                    <div class="input-group"><label>单张保留聪 (Postage)</label><input type="number" id="reserved-sats" value="330"><div class="fee-buttons" style="grid-template-columns: 1fr 1fr; margin-top: 8px;"><button id="btn-sats-330">330 sats</button><button id="btn-sats-546">546 sats</button></div></div>
                    <div class="input-group"><label>铸造张数</label><input type="number" id="mint-count" value="1"></div>
                    <div class="output-group-detailed">
                        <div class="cost-line" id="cost-breakdown-fee"><span class="cost-label">⛽ 总手续费</span><span class="cost-value"><span class="sats">0 SAT</span><span class="converted"></span></span></div>
                        <div class="cost-line" id="cost-breakdown-postage"><span class="cost-label">📦 总保留聪</span><span class="cost-value"><span class="sats">0 SAT</span><span class="converted"></span></span></div>
                        <div class="cost-line" id="cost-breakdown-total" title="点击将总成本填入换算器"><span class="cost-label">💰 总成本</span><span class="cost-value"><span class="sats">0 SAT</span><span class="converted"></span></span></div>
                    </div>
                    <h2>2. 铭文市场价值</h2>
                    <div class="input-group"><label>单Token市价 (sats)</label><input type="number" id="market-price-per-token" value="1"></div>
                    <div class="input-group"><label>每张含Token数</label><input type="number" id="market-tokens-per-sheet" value="8888"></div>
                    <div class="input-group"><label>持有张数</label><input type="number" id="market-sheet-count" value="1"></div>
                    <div class="output-group" title="点击将总价值填入换算器"><p>总价值: <span id="total-market-value">0</span> SAT</p></div>
                    <h2>3. 投资回报 (P/L)</h2>
                    <div id="pl-panel" class="neutral"><span id="pl-value">---</span><span class="pl-label">输入成本和价值后自动计算</span></div>
                    <h2>4. 通用换算器</h2>
                    <div class="input-group"><label>SAT (聪)</label><input type="number" id="sat-input"></div>
                    <div class="input-group"><label>BTC (比特币)</label><input type="number" id="btc-input"></div>
                    <div class="input-group"><label>USDT (Tether)</label><input type="number" id="usdt-input"></div>
                </div>
            </div>`;
        const triggerHTML = `<button id="sat-calc-trigger" title="打开铭文计算器"><svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.93,13.32a4.24,4.24,0,0,0-4.14-4.57H13.68v9.13h3.11a4.24,4.24,0,0,0,4.14-4.56ZM17.65,15.7a1.32,1.32,0,0,1-1.28,1.4H15V11.66h1.37a1.32,1.32,0,0,1,1.28,1.41v2.63Z"/><path d="M22.78,13.79a7.18,7.18,0,0,0-7-7.7H12.33v15.7h3.45V20.08h1.23a7.18,7.18,0,0,0,5.77-6.29ZM19.57,18A5.5,5.5,0,0,1,14,20.44V8.42a5.5,5.5,0,0,1,5.57,5.88Z"/></svg></button>`;
        const modalHTML = `<div id="tutorial-modal" style="display: none;"><img src="${tutorialImageUrl}" alt="教程图片"></div>`;

        document.body.insertAdjacentHTML('beforeend', triggerHTML);
        document.body.insertAdjacentHTML('beforeend', panelHTML);
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // 缓存所有需要操作的DOM元素
    function getElements() {
        const ids = [ "sat-calc-trigger", "sat-calc-container", "fee-rate", "tx-size", "mint-count", "sat-input", "btc-input", "usdt-input", "rate-display", "fees-display", "total-market-value", "pl-panel", "pl-value", "reserved-sats", "btn-low", "btn-medium", "btn-high", "btn-sats-330", "btn-sats-546", "cost-breakdown-fee", "cost-breakdown-postage", "cost-breakdown-total", "cost-info-trigger", "tutorial-modal", "market-price-per-token", "market-tokens-per-sheet", "market-sheet-count"];
        ids.forEach(id => { if (document.getElementById(id)) allElements[id] = document.getElementById(id); });
        allElements.closeBtn = document.querySelector('.sat-calc-close-btn');
        allElements.header = document.querySelector('.sat-calc-header');
    }

    // =================================================================================
    // 3. 核心计算逻辑
    // =================================================================================

    function calculateAll() {
        const feeRate = Number(allElements["fee-rate"]?.value) || 0;
        const txSize = Number(allElements["tx-size"]?.value) || 0;
        const reservedSats = Number(allElements["reserved-sats"]?.value) || 0;
        const mintCount = Number(allElements["mint-count"]?.value) || 0;
        const totalFeeSats = (feeRate * txSize) * mintCount;
        const totalPostageSats = reservedSats * mintCount;
        const grandTotalSats = totalFeeSats + totalPostageSats;
        updateCostLine("cost-breakdown-fee", totalFeeSats);
        updateCostLine("cost-breakdown-postage", totalPostageSats);
        updateCostLine("cost-breakdown-total", grandTotalSats);

        const pricePerToken = Number(allElements["market-price-per-token"]?.value) || 0;
        const tokensPerSheet = Number(allElements["market-tokens-per-sheet"]?.value) || 0;
        const sheetCount = Number(allElements["market-sheet-count"]?.value) || 0;
        const totalMarketValue = pricePerToken * tokensPerSheet * sheetCount;
        const totalMarketValueEl = allElements["total-market-value"];
        if(totalMarketValueEl) {
            totalMarketValueEl.textContent = totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
        }

        const plPanelEl = allElements["pl-panel"];
        const plValueEl = allElements["pl-value"];
        if(plPanelEl && plValueEl){
            plPanelEl.className = 'neutral';
            if (grandTotalSats === 0) {
                plValueEl.textContent = '---';
            } else {
                const pl = ((totalMarketValue - grandTotalSats) / grandTotalSats) * 100;
                plValueEl.textContent = `${pl >= 0 ? '+' : ''}${pl.toFixed(2)}%`;
                if (pl > 0) plPanelEl.className = 'profit';
                else if (pl < 0) plPanelEl.className = 'loss';
            }
        }
    }

    function updateCostLine(elementId, sats) {
        const lineElement = allElements[elementId];
        if (!lineElement) return;
        lineElement.querySelector('.sats').textContent = `${sats.toLocaleString('en-US')} SAT`;
        const convertedElement = lineElement.querySelector('.converted');
        if (btcToUsdtRate > 0) {
            const btc = sats / SATS_PER_BTC;
            const usdt = btc * btcToUsdtRate;
            convertedElement.textContent = `≈ ${btc.toFixed(8)} BTC ≈ ${usdt.toFixed(2)} USDT`;
        } else {
            convertedElement.textContent = '';
        }
    }

    function updateConverterValues(source) {
        if (isUpdatingConverter) return;
        isUpdatingConverter = true;
        const satInput = allElements["sat-input"], btcInput = allElements["btc-input"], usdtInput = allElements["usdt-input"];
        if(!satInput || !btcInput || !usdtInput) { isUpdatingConverter = false; return; }
        const sat = parseFloat(satInput.value), btc = parseFloat(btcInput.value), usdt = parseFloat(usdtInput.value);
        try {
            switch (source) {
                case 'sat': if (!isNaN(sat)) { const b = sat / SATS_PER_BTC; btcInput.value = b.toFixed(8); if (btcToUsdtRate > 0) usdtInput.value = (b * btcToUsdtRate).toFixed(2); } else { btcInput.value = usdtInput.value = ''; } break;
                case 'btc': if (!isNaN(btc)) { satInput.value = (btc * SATS_PER_BTC).toFixed(0); if (btcToUsdtRate > 0) usdtInput.value = (btc * btcToUsdtRate).toFixed(2); } else { satInput.value = usdtInput.value = ''; } break;
                case 'usdt': if (!isNaN(usdt) && btcToUsdtRate > 0) { const b = usdt / btcToUsdtRate; btcInput.value = b.toFixed(8); satInput.value = (b * SATS_PER_BTC).toFixed(0); } else { satInput.value = btcInput.value = ''; } break;
            }
        } finally { isUpdatingConverter = false; }
    }

    // =================================================================================
    // 4. API 数据获取
    // =================================================================================

    function gmFetch(url, timeout = 5000) { return new Promise((resolve, reject) => { GM_xmlhttpRequest({ method: "GET", url, timeout, onload: r => (r.status >= 200 && r.status < 300) ? resolve(JSON.parse(r.responseText)) : reject(new Error(`状态 ${r.status}`)), onerror: reject, ontimeout: () => reject(new Error('请求超时')) }); }); }
    async function fetchApiData(endpoints, successCallback, failureCallback) { for (const api of endpoints) { try { const data = await gmFetch(api.url); const parsedData = api.parser(data); if (parsedData && (typeof parsedData === 'number' || Object.values(parsedData).every(v => v))) { successCallback(parsedData, api.name); return; } } catch (error) { console.warn(`[SAT 计算器] 从 ${api.name} 获取数据失败:`, error.message); } } failureCallback(); }

    function fetchBtcPrice() {
        allElements["rate-display"].textContent = '正在刷新汇率...';
        const priceApiEndpoints = [ { name: 'Binance', url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', parser: d => parseFloat(d.price) }, { name: 'CoinGecko', url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usdt', parser: d => d.bitcoin.usdt }, { name: 'OKX', url: 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT', parser: d => parseFloat(d.data[0].last) } ];
        fetchApiData(priceApiEndpoints,
            (price, name) => { btcToUsdtRate = price; allElements["rate-display"].innerHTML = `1 BTC ≈ ${btcToUsdtRate.toLocaleString()} USDT (来源: ${name}) <span id="refresh-rate-btn" class="refresh-btn" title="刷新汇率">🔄</span>`; document.getElementById('refresh-rate-btn').addEventListener('click', fetchBtcPrice); calculateAll(); },
            () => { allElements["rate-display"].innerHTML = `<span>汇率加载失败 <span id="refresh-rate-btn" class="refresh-btn" title="刷新汇率">🔄</span></span><input type="number" id="manual-rate-input" placeholder="或在此手动输入BTC价格">`; document.getElementById('refresh-rate-btn').addEventListener('click', fetchBtcPrice); const manualInput = document.getElementById('manual-rate-input'); if (manualInput) { manualInput.addEventListener('input', (e) => { btcToUsdtRate = parseFloat(e.target.value) || 0; calculateAll(); }); } }
        );
    }

    function fetchFeeRates() {
        allElements["fees-display"].textContent = '正在刷新费率...';
        const feeApiEndpoints = [ { name: 'Mempool.space', url: 'https://mempool.space/api/v1/fees/recommended', parser: d => ({ low: d.hourFee, medium: d.halfHourFee, high: d.fastestFee }) }, { name: 'Blockstream', url: 'https://blockstream.info/api/fee-estimates', parser: d => ({ low: Math.round(d['144']), medium: Math.round(d['6']), high: Math.round(d['1']) }) } ];
        fetchApiData(feeApiEndpoints,
            (fees, name) => { recommendedFees = fees; allElements["fees-display"].innerHTML = `推荐费率 (来源: ${name}): 低 ${fees.low} | 中 ${fees.medium} | 高 ${fees.high} <span id="refresh-fees-btn" class="refresh-btn" title="刷新费率">🔄</span>`; document.getElementById('refresh-fees-btn').addEventListener('click', fetchFeeRates); const feeRateEl = allElements["fee-rate"]; if (feeRateEl && !feeRateEl.value) { feeRateEl.value = fees.medium; calculateAll(); } },
            () => { allElements["fees-display"].innerHTML = `费率加载失败 <span id="refresh-fees-btn" class="refresh-btn" title="刷新费率">🔄</span>`; document.getElementById('refresh-fees-btn').addEventListener('click', fetchFeeRates); }
        );
    }

    // =================================================================================
    // 5. UI交互和事件绑定
    // =================================================================================

    function makeDraggable(element, handle) {
        let isDragging = false, startX, startY, initialLeft, initialTop;
        handle.addEventListener('mousedown', e => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            // 【拖动修复】移除 transform，切换到纯 top/left 定位，防止布局错乱
            if (element.style.transform.includes('translate')) {
                const rect = element.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                element.style.transform = 'none';
                element.style.left = `${initialLeft}px`;
                element.style.top = `${initialTop}px`;
            } else {
                initialLeft = element.offsetLeft;
                initialTop = element.offsetTop;
            }
            handle.style.userSelect = 'none';
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', e => {
            if (isDragging) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                let newLeft = initialLeft + deltaX;
                let newTop = initialTop + deltaY;
                const V_MARGIN = 5, H_MARGIN = 5;
                newTop = Math.max(V_MARGIN, Math.min(newTop, window.innerHeight - element.offsetHeight - V_MARGIN));
                newLeft = Math.max(H_MARGIN, Math.min(newLeft, window.innerWidth - element.offsetWidth - H_MARGIN));
                element.style.top = `${newTop}px`;
                element.style.left = `${newLeft}px`;
            }
        });
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                handle.style.userSelect = '';
                document.body.style.userSelect = '';
                if (element.id === 'sat-calc-trigger') {
                    GM_setValue('triggerPos', { top: element.style.top, left: element.style.left });
                }
            }
        });
    }


    async function fullUISetup() {
        if (document.getElementById('sat-calc-trigger')) return;
        injectUI();
        getElements();
        const { "sat-calc-trigger": triggerBtn, "sat-calc-container": panel, header, closeBtn } = allElements;
        if (!triggerBtn || !panel) { return; }
        const pos = await GM_getValue('triggerPos');
        if (pos && pos.top && pos.left) {
             Object.assign(triggerBtn.style, { top: pos.top, left: pos.left, bottom: 'auto', right: 'auto' });
        } else {
             Object.assign(triggerBtn.style, { bottom: '20px', right: '20px', top: 'auto', left: 'auto' });
        }

        makeDraggable(panel, header);
        makeDraggable(triggerBtn, triggerBtn);

        function togglePanel() {
            const isHidden = panel.style.display === 'none' || panel.style.display === '';
            if (isHidden) {
                panel.style.top = '50%';
                panel.style.left = '50%';
                panel.style.transform = 'translate(-50%, -50%)';
            }
            panel.style.display = isHidden ? 'block' : 'none';
        }
        triggerBtn.addEventListener('click', togglePanel);
        closeBtn.addEventListener('click', togglePanel);

        allElements["cost-info-trigger"]?.addEventListener('click', () => { allElements["tutorial-modal"].style.display = 'flex'; });
        allElements["tutorial-modal"]?.addEventListener('click', () => { allElements["tutorial-modal"].style.display = 'none'; });

        const inputIds = [ "fee-rate", "tx-size", "mint-count", "reserved-sats", "market-price-per-token", "market-tokens-per-sheet", "market-sheet-count" ];
        inputIds.forEach(id => allElements[id]?.addEventListener('input', calculateAll));

        const converterInputIds = ["sat-input", "btc-input", "usdt-input"];
        converterInputIds.forEach(id => allElements[id]?.addEventListener('input', () => updateConverterValues(id.split('-')[0])));

        allElements["btn-low"].addEventListener('click', () => { if(recommendedFees.low) { allElements["fee-rate"].value = recommendedFees.low; calculateAll(); } });
        allElements["btn-medium"].addEventListener('click', () => { if(recommendedFees.medium) { allElements["fee-rate"].value = recommendedFees.medium; calculateAll(); } });
        allElements["btn-high"].addEventListener('click', () => { if(recommendedFees.high) { allElements["fee-rate"].value = recommendedFees.high; calculateAll(); } });
        allElements["btn-sats-330"].addEventListener('click', () => { allElements["reserved-sats"].value = 330; calculateAll(); });
        allElements["btn-sats-546"].addEventListener('click', () => { allElements["reserved-sats"].value = 546; calculateAll(); });

        const copyToConverter = (value) => { const satInput = allElements["sat-input"]; if (value && satInput) { satInput.value = String(value).replace(/,/g, '').replace(/\sSAT/,''); updateConverterValues('sat'); satInput.focus(); } };
        allElements["cost-breakdown-total"]?.addEventListener('click', (e) => copyToConverter(e.currentTarget.querySelector('.sats').textContent));
        allElements["total-market-value"]?.parentElement.addEventListener('click', () => copyToConverter(allElements["total-market-value"]?.textContent));

        fetchBtcPrice();
        fetchFeeRates();
        calculateAll();
    }

    async function registerSettings() {
        const isBallVisible = await GM_getValue('showFloatingBall', true);
        GM_registerMenuCommand(isBallVisible ? '🔴 隐藏悬浮球' : '🟢 显示悬浮球', async () => { await GM_setValue('showFloatingBall', !isBallVisible); alert('设置已更改。页面将自动刷新以应用更改。'); location.reload(); });
        GM_registerMenuCommand('⚙️ 重置悬浮球位置', async () => { await GM_deleteValue('triggerPos'); alert('悬浮球位置已重置。页面将自动刷新。'); location.reload(); });
    }

    // =================================================================================
    // 6. 脚本执行入口
    // =================================================================================
    async function main() {
        if (!document.body) { setTimeout(main, 200); return; }
        registerSettings();
        const showBall = await GM_getValue('showFloatingBall', true);
        if (showBall) { fullUISetup(); }
    }

    if (document.readyState === 'interactive' || document.readyState === 'complete') { main(); }
    else { document.addEventListener('DOMContentLoaded', main, { once: true }); }

})();