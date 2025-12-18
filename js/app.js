// js/app.js
import { NAV_DATA } from './config.js';
import { initNasModule } from './nas.js';
import { fetchNotifications, fetchWeatherData, initMonitoring } from './dashboard.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 初始化时间
    const timeEl = document.getElementById('current-time');
    const dateEl = document.getElementById('current-date');
    const updateTime = () => {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
        dateEl.textContent = now.toLocaleDateString('zh-CN', { dateStyle: 'full' });
    };
    setInterval(updateTime, 1000);
    updateTime();

    // 2. 渲染导航链接 (使用 Template)
    const navContainer = document.getElementById('tab-links');
    const catTemplate = document.getElementById('tpl-nav-category');
    
    // 清空现有占位内容（如果有）
    navContainer.innerHTML = '<div class="nav-grid" id="nav-grid-root"></div>';
    const gridRoot = document.getElementById('nav-grid-root');
    let totalSites = 0;

    NAV_DATA.forEach(cat => {
        const clone = catTemplate.content.cloneNode(true);
        clone.querySelector('.category-title h2').textContent = cat.title;
        clone.querySelector('.category-title i').className = cat.icon;
        
        const linksContainer = clone.querySelector('.nav-links');
        cat.links.forEach(link => {
            const a = document.createElement('a');
            a.className = 'nav-link';
            a.href = link.url;
            a.target = '_blank';
            a.innerHTML = `<i class="${link.icon}"></i> ${link.name}`;
            linksContainer.appendChild(a);
            totalSites++;
        });
        gridRoot.appendChild(clone);
    });
    
    document.getElementById('site-count').textContent = totalSites;

    // 3. Tab 切换逻辑
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // 状态标记，避免重复加载
    const loadedState = { monitoring: false, notifications: false, weather: false };

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add('active');

            // 懒加载
            if (tabId === 'tab-monitoring' && !loadedState.monitoring) {
                initMonitoring();
                loadedState.monitoring = true;
            }
            if (tabId === 'tab-notifications' && !loadedState.notifications) {
                fetchNotifications();
                loadedState.notifications = true;
            }
            if (tabId === 'tab-weather' && !loadedState.weather) {
                fetchWeatherData();
                loadedState.weather = true;
            }
        });
    });

    // 4. 初始化 NAS 模块
    initNasModule();

    // 5. 绑定刷新按钮 (通知页)
    document.getElementById('refresh-notifications-btn')?.addEventListener('click', fetchNotifications);
});
