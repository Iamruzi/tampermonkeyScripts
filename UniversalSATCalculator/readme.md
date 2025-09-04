# 通用铭文 SAT 计算器 (Universal Inscription SAT Calculator)

这是一个功能强大的油猴脚本 (Tampermonkey Script)，旨在为比特币铭文（Inscriptions）玩家提供一站式计算解决方案。它以一个可拖动的悬浮球形式常驻在任何网页上，方便随时调用。

[安装脚本 (Install Script)](https://raw.githubusercontent.com/Iamruzi/tampermonkeyScripts/main/%E9%80%9A%E7%94%A8%E9%93%AD%E6%96%87SAT%E8%AE%A1%E7%AE%97%E5%99%A8/%E9%80%9A%E7%94%A8%E9%93%AD%E6%96%87SAT%E8%AE%A1%E7%AE%97%E5%99%A8.user.js)

---

## ✨ 主要功能

1.  **铭文铸造成本计算**:
    * **自动获取实时费率**: 自动从 Mempool.space 或 Blockstream 获取低、中、高三档推荐的网络费率 (sat/vB)，并支持一键填充。
    * **灵活参数设置**: 用户可以自定义交易大小 (vB)、每张铭文的 Postages (聪) 以及铸造张数。
    * **成本明细清晰**: 自动计算并展示总手续费、总 Postages 和总成本，并根据实时汇率换算成 BTC 和 USDT 价值。

2.  **铭文市场价值评估**:
    * 根据单个 Token 的市价 (sats)、每张铭文包含的 Token 数量以及持有张数，快速计算出您持有的铭文总市场价值。

3.  **投资回报 (P/L) 分析**:
    * 自动对比“铸造成本”和“市场价值”，实时计算并显示您的盈亏百分比 (Profit/Loss)，并用红绿色直观展示。

4.  **通用单位换算器**:
    * 内置强大的 SAT, BTC, USDT 三向换算器。
    * **自动获取实时汇率**: 自动从 Binance, CoinGecko, OKX 等主流交易所获取 BTC/USDT 汇率。
    * **双向联动**: 修改任意一个单位的数值，其他两个单位会自动进行换算。
    * **一键填充**: 可以将在成本或价值模块计算出的总聪数一键填充到换算器中，方便快捷。

5.  **高度优化的用户体验**:
    * **悬浮球设计**: 计算器入口是一个可自由拖动的悬浮球，不干扰正常网页浏览。
    * **面板可拖动**: 计算器面板本身也可以随意拖动到屏幕的任何位置。
    * **用户菜单设置**: 在油猴插件菜单中，可以方便地“隐藏/显示悬浮球”或“重置悬浮球位置”，设置更改后页面会自动刷新生效。
    * **数据源容错**: 汇率和费率获取均有多个备用数据源，如果一个API请求失败，脚本会自动尝试下一个，保证了服务的稳定性。同时支持手动输入汇率作为备用方案。

## 🔧 如何使用

1.  确保您的浏览器已安装 [Tampermonkey](https://www.tampermonkey.net/) 插件。
2.  点击上方的 **[安装脚本]** 链接，然后在新打开的页面中点击 "Install" 按钮。
3.  刷新任意网页，右下角会出现一个橙色的比特币图标悬浮球。
4.  点击悬浮球即可打开或关闭计算器面板。
5.  在面板中输入相应参数即可进行计算。

## 预览
![1756916024955]()
**计算器主界面:**
![计算器主界面](image/readme/ui.png)

---

*This is a powerful Tampermonkey script for Bitcoin Inscription players, providing a one-stop calculation solution. It appears as a draggable floating ball on any webpage for easy access.*