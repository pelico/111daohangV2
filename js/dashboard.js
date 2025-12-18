// js/dashboard.js
import { API } from './config.js';
import { isMobile } from './utils.js';

// --- 通知模块 ---
export async function fetchNotifications() {
    const listEl = document.getElementById('notifications-list');
    listEl.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><div>正在刷新...</div></div>';
    
    try {
        const res = await fetch(API.NOTIFICATIONS);
        const data = await res.json();
        
        if (data.notifications && data.notifications.length > 0) {
            listEl.innerHTML = '';
            const tpl = document.getElementById('tpl-notification-item');
            
            data.notifications.forEach(item => {
                const clone = tpl.content.cloneNode(true);
                clone.querySelector('.notification-content').textContent = item.content;
                clone.querySelector('.notification-timestamp').textContent = new Date(item.timestamp).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'});
                listEl.appendChild(clone);
            });
        } else {
            listEl.innerHTML = '<div class="empty-state"><p>暂无通知</p></div>';
        }
    } catch (e) {
        listEl.innerHTML = `<div class="error-state"><p>加载失败: ${e.message}</p></div>`;
    }
}

// --- 天气模块 ---
export async function fetchWeatherData() {
    const container = document.getElementById('latest-weather-cards');
    const loading = document.getElementById('weather-loading-message');
    
    try {
        const res = await fetch(API.WEATHER);
        const data = await res.json();
        loading.style.display = 'none';
        container.style.display = 'flex';
        container.innerHTML = ''; // Clear
        
        const tpl = document.getElementById('tpl-weather-card');
        
        if(data.latest) {
            data.latest.forEach(city => {
                const clone = tpl.content.cloneNode(true);
                clone.querySelector('h2').textContent = city.city_name;
                clone.querySelector('.weather-text').textContent = city.weather_text;
                clone.querySelector('.val-temp').textContent = city.temperature;
                clone.querySelector('.val-feel').textContent = city.feels_like;
                clone.querySelector('.val-humid').textContent = city.humidity;
                clone.querySelector('.timestamp').textContent = `更新于: ${new Date(city.observation_time).toLocaleString()}`;
                container.appendChild(clone);
            });
        }
        // 图表渲染逻辑 (displayTrendCharts) 可以类似地保留，或者动态加载 Chart.js
    } catch (e) {
        loading.innerHTML = `<p class="error-state">加载失败: ${e.message}</p>`;
    }
}

// --- 服务监控模块 (简化版，保留原有用法) ---
export async function initMonitoring() {
    const container = document.getElementById('tab-monitoring');
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>正在加载...</p></div>';
    try {
        const res = await fetch(API.MONITORING_PROXY, { method: 'POST' });
        const data = await res.json();
        // 这里逻辑比较复杂且涉及 Chart.js，
        // 为了保持“简洁”，建议先渲染基础 HTML，
        // 复杂图表逻辑可保留在原 dashboard.js 内部函数中
        container.innerHTML = ''; // 清空 Loading
        
        // 渲染 UptimeRobot 列表
        if(data.monitors) {
            const listContainer = document.createElement('div');
            listContainer.className = 'services-grid';
            data.monitors.forEach(m => {
                const div = document.createElement('div');
                div.className = 'service-card';
                // 使用 innerHTML 快速构建简单列表，或者继续用 Template
                const statusClass = m.status === 2 ? 'status-up' : 'status-down';
                const statusIcon = m.status === 2 ? 'fa-check-circle' : 'fa-times-circle';
                const statusText = m.status === 2 ? '运行中' : '故障';
                div.innerHTML = `
                    <div class="service-header">
                        <div class="service-name">${m.friendly_name}</div>
                        <div class="service-status ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</div>
                    </div>`;
                listContainer.appendChild(div);
            });
            container.appendChild(listContainer);
        }
    } catch (e) {
        container.innerHTML = `<div class="error-state"><p>${e.message}</p></div>`;
    }
}
