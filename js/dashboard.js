import { API } from './config.js';
import { isMobile, formatBytes } from './utils.js';

// 用于存储图表实例，以便刷新时销毁旧图表
const chartInstances = {
    nasCpu: null,
    nasNet: null,
    nasTemp: null,
    uptimeResponse: null,
    weather: [],
    details: {}
};

// --- 1. 通知模块 (保持不变) ---
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

// --- 2. 天气模块 ---
export async function fetchWeatherData() {
    const container = document.getElementById('latest-weather-cards');
    const chartContainer = document.getElementById('weather-charts-container');
    const loading = document.getElementById('weather-loading-message');
    
    try {
        const res = await fetch(API.WEATHER);
        const data = await res.json();
        loading.style.display = 'none';
        container.style.display = 'flex';
        chartContainer.style.display = 'flex';
        container.innerHTML = '';
        chartContainer.innerHTML = '';
        
        // 渲染卡片
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

        // 渲染趋势图表
        if (data.history && data.history.length > 0) {
            renderWeatherCharts(data.history, chartContainer);
        }

    } catch (e) {
        console.error(e);
        loading.innerHTML = `<p class="error-state">加载失败: ${e.message}</p>`;
    }
}

function renderWeatherCharts(historyData, container) {
    // 销毁旧图表
    chartInstances.weather.forEach(c => c.destroy());
    chartInstances.weather = [];

    const cities = {};
    historyData.forEach(record => {
        if (!cities[record.city_name]) cities[record.city_name] = [];
        cities[record.city_name].push(record);
    });

    const sourceStyles = { 
        'HefengAPI': { label: 'API', tempColor: 'rgb(255, 99, 132)', humidColor: 'rgb(255, 159, 64)' }, 
        'ESP8266':   { label: '设备', tempColor: 'rgb(54, 162, 235)', humidColor: 'rgb(75, 192, 192)' }, 
        'default':   { label: '其他', tempColor: 'rgb(201, 203, 207)', humidColor: 'rgb(153, 102, 255)' } 
    };

    Object.keys(cities).forEach(cityName => {
        const wrapper = document.createElement('div');
        wrapper.className = 'weather-chart-container';
        const canvas = document.createElement('canvas');
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        const datasets = [];
        const cityHistory = cities[cityName];
        const sources = {};
        
        cityHistory.forEach(r => {
            if(!sources[r.source]) sources[r.source] = [];
            sources[r.source].push(r);
        });

        Object.keys(sources).forEach(sourceName => {
            const style = sourceStyles[sourceName] || sourceStyles.default;
            const data = sources[sourceName];
            datasets.push({
                label: `温度 - ${style.label}`,
                data: data.map(d => ({ x: new Date(d.observation_time), y: d.temperature })),
                borderColor: style.tempColor,
                backgroundColor: style.tempColor.replace('rgb', 'rgba').replace(')', ', 0.5)'),
                yAxisID: 'y', tension: 0.1, borderWidth: 1.5, pointRadius: 0
            });
            datasets.push({
                label: `湿度 - ${style.label}`,
                data: data.map(d => ({ x: new Date(d.observation_time), y: d.humidity })),
                borderColor: style.humidColor,
                backgroundColor: style.humidColor.replace('rgb', 'rgba').replace(')', ', 0.5)'),
                yAxisID: 'y1', borderDash: [5, 5], tension: 0.1, borderWidth: 1.5, pointRadius: 0
            });
        });

        const chart = new Chart(canvas, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                interaction: { mode: 'x', intersect: false },
                plugins: {
                    title: { display: true, text: `${cityName} - 24小时趋势`, font: { size: isMobile ? 14 : 18 } },
                    legend: { display: !isMobile, position: 'bottom' }
                },
                scales: {
                    x: { type: 'time', time: { unit: 'hour', displayFormats: { hour: 'HH:mm' } }, ticks: { font: { size: 10 } } },
                    y: { type: 'linear', display: true, position: 'left', title: { display: !isMobile, text: '温度 (°C)' } },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: !isMobile, text: '湿度 (%)' } }
                }
            }
        });
        chartInstances.weather.push(chart);
    });
}

// --- 3. 服务监控模块 ---
export async function initMonitoring() {
    const container = document.getElementById('tab-monitoring');
    container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>正在加载服务监控数据...</p></div>';
    
    try {
        const res = await fetch(API.MONITORING_PROXY, { method: 'POST' });
        const data = await res.json();
        
        if (data.stat === 'fail') throw new Error((data.error || {}).message || 'API Error');
        
        container.innerHTML = ''; // Clear loading
        
        // 1. NAS 历史图表区域
        if (data.nas_history && (data.nas_history.cpu?.length || data.nas_history.network?.total?.length)) {
            const nasSection = document.createElement('div');
            nasSection.className = 'nas-section';
            nasSection.innerHTML = `
                <h2 class="section-title"><i class="fas fa-server"></i><span>NAS 历史趋势 (7天)</span></h2>
                <div class="charts-grid">
                    <div class="chart-container">
                        <div class="chart-header"><h3 class="chart-title">CPU 使用率</h3></div>
                        <div class="nas-chart-wrapper"><canvas id="nasCpuHistoryChart"></canvas></div>
                    </div>
                    <div class="chart-container">
                        <div class="chart-header"><h3 class="chart-title">网络总流量</h3></div>
                        <div class="nas-chart-wrapper"><canvas id="nasNetworkHistoryChart"></canvas></div>
                    </div>
                    <div class="chart-container" id="nas-temp-container" style="display:none">
                        <div class="chart-header"><h3 class="chart-title">温度变化</h3></div>
                        <div class="nas-chart-wrapper"><canvas id="nasTempHistoryChart"></canvas></div>
                    </div>
                </div>`;
            container.appendChild(nasSection);
            renderNasHistoryCharts(data.nas_history);
        }

        // 2. 网站监控区域
        if (data.monitors && data.monitors.length > 0) {
            let totalUptime = 0;
            data.monitors.forEach(m => {
                let ratio = parseFloat(m.custom_uptime_ratios?.split('-')[0]);
                if ((isNaN(ratio) || ratio === 0) && m.status === 2) ratio = 100.0;
                else if (isNaN(ratio)) ratio = parseFloat(m.all_time_uptime_ratio) || 0;
                totalUptime += ratio;
            });

            const uptimeDiv = document.createElement('div');
            uptimeDiv.id = 'uptime-robot-container';
            uptimeDiv.innerHTML = `
                <h2 class="section-title"><i class="fas fa-network-wired"></i><span>网站服务监控</span></h2>
                <div class="charts-grid">
                    <div class="summary-card uptime">
                        <div class="card-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="card-title">平均正常率 (7天)</div>
                        <div class="card-value">${(totalUptime / data.monitors.length).toFixed(2)}%</div>
                    </div>
                    <div class="chart-container">
                        <div class="chart-header"><h3 class="chart-title">平均响应时间 (24小时)</h3></div>
                        <div class="chart-wrapper"><canvas id="responseTimeChart"></canvas></div>
                    </div>
                </div>
                <div class="services-grid" style="margin-top: 30px;"></div>
            `;
            container.appendChild(uptimeDiv);
            
            // 渲染列表
            const listContainer = uptimeDiv.querySelector('.services-grid');
            data.monitors.forEach(m => {
                const statusMap = { 0: '暂停', 1: '未检查', 2: '运行中', 8: '异常', 9: '中断' };
                const statusClass = m.status === 2 ? 'status-up' : (m.status === 9 ? 'status-down' : 'status-warning');
                const icon = m.status === 2 ? 'fa-check-circle' : 'fa-exclamation-circle';
                
                const card = document.createElement('div');
                card.className = 'service-card';
                card.innerHTML = `
                    <div class="service-card-header">
                        <div class="service-header">
                            <div class="service-name">${m.friendly_name} <i class="fas fa-chevron-down"></i></div>
                            <div class="service-status ${statusClass}"><i class="fas ${icon}"></i> ${statusMap[m.status]||'未知'}</div>
                        </div>
                    </div>
                    <div class="service-details">
                        <div class="service-details-content">
                            <div class="detail-chart-container"><canvas id="detail-chart-${m.id}"></canvas></div>
                        </div>
                    </div>`;
                
                // 点击展开逻辑
                card.querySelector('.service-card-header').addEventListener('click', () => {
                    card.classList.toggle('expanded');
                    if (card.classList.contains('expanded') && m.response_times) {
                        renderDetailChart(m);
                    }
                });
                listContainer.appendChild(card);
            });

            renderOverviewChart(data.monitors);
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="error-state"><h2>加载数据失败</h2><p>${e.message}</p></div>`;
    }
}

function renderNasHistoryCharts(history) {
    // CPU
    if (chartInstances.nasCpu) chartInstances.nasCpu.destroy();
    const cpuCtx = document.getElementById('nasCpuHistoryChart')?.getContext('2d');
    if (cpuCtx && history.cpu) {
        chartInstances.nasCpu = new Chart(cpuCtx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'CPU Usage (%)',
                    data: history.cpu.map(d => ({x: d.timestamp * 1000, y: d.usage})),
                    borderColor: 'rgba(30, 136, 229, 0.7)', backgroundColor: 'rgba(30, 136, 229, 0.1)',
                    borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: true
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { type: 'time', time: { unit: 'day' }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, max: 100 } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Network
    if (chartInstances.nasNet) chartInstances.nasNet.destroy();
    const netCtx = document.getElementById('nasNetworkHistoryChart')?.getContext('2d');
    if (netCtx && history.network) {
        const datasets = [];
        if (history.network.total) {
            datasets.push({ label: '下载', data: history.network.total.map(d => ({ x: d.timestamp * 1000, y: d.total_recv / 1024**3 })), borderColor: 'rgba(76, 175, 80, 0.7)', borderWidth: 1.5, pointRadius: 0 });
            datasets.push({ label: '上传', data: history.network.total.map(d => ({ x: d.timestamp * 1000, y: d.total_sent / 1024**3 })), borderColor: 'rgba(255, 152, 0, 0.7)', borderWidth: 1.5, pointRadius: 0 });
        }
        chartInstances.nasNet = new Chart(netCtx, {
            type: 'line', data: { datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { x: { type: 'time', time: { unit: 'day' }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, title: { display: !isMobile, text: 'GB' } } },
                plugins: { legend: { display: !isMobile, position: 'bottom' } }
            }
        });
    }
    
    // Temp
    if (history.temp && history.temp.length > 0) {
        document.getElementById('nas-temp-container').style.display = 'block';
        if (chartInstances.nasTemp) chartInstances.nasTemp.destroy();
        const tempCtx = document.getElementById('nasTempHistoryChart')?.getContext('2d');
        if(tempCtx) {
            chartInstances.nasTemp = new Chart(tempCtx, {
                type: 'line',
                data: { datasets: [{ label: '温度', data: history.temp.map(d => ({ x: d.timestamp * 1000, y: d.temperature })), borderColor: 'rgba(244, 67, 54, 0.7)', borderWidth: 1.5, pointRadius: 0, tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'day' } } }, plugins: { legend: { display: false } } }
            });
        }
    }
}

function renderOverviewChart(monitors) {
    if (chartInstances.uptimeResponse) chartInstances.uptimeResponse.destroy();
    const ctx = document.getElementById('responseTimeChart')?.getContext('2d');
    if (ctx) {
        chartInstances.uptimeResponse = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monitors.map(m => m.friendly_name.substring(0, isMobile ? 5 : 12) + (m.friendly_name.length > 12 ? '...' : '')),
                datasets: [{ label: '响应时间 (ms)', data: monitors.map(m => m.average_response_time || 0), backgroundColor: 'rgba(
