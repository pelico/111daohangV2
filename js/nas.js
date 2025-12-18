// js/nas.js
import { API } from './config.js';
import { formatBytes, formatSpeed, formatUptime } from './utils.js';

let nasInstances = {};
let nasUrlList = [];
let updateInterval;

// 解析 Prometheus 格式的 Metrics
function parseNasMetrics(text) {
    const metrics = { 
        cpu: { total: 0, idle: 0 }, 
        memory: { total: 0, available: 0 }, 
        network: { received: 0, transmitted: 0 }, 
        bootTime: 0, 
        temp: null, 
        filesystems: {} 
    };
    const ignoredInterfaces = /^(lo|veth|docker0|tailscale0)/;
    let primaryInterface = null;
    const networkData = {};
    const targetMountpoint = '/etc/hostname';

    const lines = text.split('\n');
    for (const line of lines) {
        if (line.startsWith('#')) continue;
        const parts = line.split(' ');
        const value = parseFloat(parts[1]);
        if (isNaN(value)) continue;

        if (line.startsWith('node_cpu_seconds_total') && line.includes('mode="idle"')) metrics.cpu.idle += value;
        else if (line.startsWith('node_cpu_seconds_total')) metrics.cpu.total += value;
        else if (line.startsWith('node_memory_MemTotal_bytes')) metrics.memory.total = value;
        else if (line.startsWith('node_memory_MemAvailable_bytes')) metrics.memory.available = value;
        else if (line.startsWith('node_boot_time_seconds')) metrics.bootTime = value;
        else if ((line.startsWith('node_thermal_zone_temp') || line.startsWith('node_hwmon_temp_input')) && metrics.temp === null) metrics.temp = value;
        
        // 网络与磁盘逻辑保持原样，简化展示
        else if (line.includes('node_network_')) {
             const isRx = line.startsWith('node_network_receive_bytes_total');
             const isTx = line.startsWith('node_network_transmit_bytes_total');
             if(isRx || isTx) {
                 const match = line.match(/device="([^"]+)"/);
                 if(match) {
                     const dev = match[1];
                     if(!networkData[dev]) networkData[dev] = {rx:0, tx:0};
                     if(isRx) networkData[dev].rx = value; else networkData[dev].tx = value;
                 }
             }
        }
        else if (line.includes(`mountpoint="${targetMountpoint}"`)) {
            if (line.startsWith('node_filesystem_size_bytes')) metrics.filesystems[targetMountpoint] = { ...metrics.filesystems[targetMountpoint], size: value };
            if (line.startsWith('node_filesystem_avail_bytes')) metrics.filesystems[targetMountpoint] = { ...metrics.filesystems[targetMountpoint], avail: value };
        }
    }

    // 简单选取主网卡逻辑
    primaryInterface = Object.keys(networkData).find(dev => !ignoredInterfaces.test(dev)) || 'eth0';
    if(networkData[primaryInterface]) {
        metrics.network = { received: networkData[primaryInterface].rx, transmitted: networkData[primaryInterface].tx };
    }
    return metrics;
}

async function updateSingleNas(url, index) {
    const card = document.querySelector(`.nas-card-container[data-index="${index}"]`);
    if(!card) return;

    const statusEl = card.querySelector('.nas-status-text');
    const errorEl = card.querySelector('.nas-error-text');

    try {
        const res = await fetch(API.NAS_HOOK, { method: 'POST', body: JSON.stringify({ url }) });
        if (!res.ok) throw new Error(res.status);
        const text = await res.text();
        if (text.includes('Error:')) throw new Error(text.replace('Error: ', ''));

        const now = Date.now();
        const instance = nasInstances[url] || {};
        const data = parseNasMetrics(text);

        // 更新 UI
        // CPU
        if (instance.prevCpu) {
            const totalDiff = data.cpu.total - instance.prevCpu.total;
            const idleDiff = data.cpu.idle - instance.prevCpu.idle;
            const usage = totalDiff > 0 ? (100 * (1 - idleDiff / totalDiff)).toFixed(1) : 0;
            card.querySelector('.val-cpu').textContent = `${usage}%`;
        }
        // 内存
        const memUsed = data.memory.total - data.memory.available;
        card.querySelector('.val-mem').textContent = `${(100 * memUsed / data.memory.total).toFixed(1)}%`;
        card.querySelector('.sub-mem').textContent = `${formatBytes(memUsed, 2)}/${formatBytes(data.memory.total, 2)}`;
        // 温度
        if(data.temp) {
            card.querySelector('.row-temp').style.display = 'flex';
            card.querySelector('.val-temp').textContent = `${(data.temp/1000).toFixed(1)}°C`; // 修正：原始metrics通常是毫摄氏度，如果这里显示不对请调整
        } else if (data.temp && data.temp < 150) {
             card.querySelector('.val-temp').textContent = `${data.temp.toFixed(1)}°C`; // 正常摄氏度
        }
        // 网络
        if(instance.prevNet && instance.lastTime) {
            const timeDelta = (now - instance.lastTime) / 1000;
            if(timeDelta > 0) {
                const up = (data.network.transmitted - instance.prevNet.transmitted) / timeDelta;
                const down = (data.network.received - instance.prevNet.received) / timeDelta;
                card.querySelector('.val-net').textContent = `${formatSpeed(up)} / ${formatSpeed(down)}`;
            }
        }
        // 磁盘
        const disk = data.filesystems['/etc/hostname'];
        if(disk && disk.size) {
            const used = disk.size - disk.avail;
            card.querySelector('.val-disk').textContent = `${(100 * used / disk.size).toFixed(1)}%`;
            card.querySelector('.sub-disk').textContent = `(${formatBytes(used)}/${formatBytes(disk.size)})`;
        }
        // Uptime
        if(data.bootTime) {
            instance.bootTime = data.bootTime;
            card.querySelector('.sub-uptime').textContent = `开机于: ${new Date(data.bootTime * 1000).toLocaleDateString()}`;
            card.querySelector('.val-uptime').textContent = formatUptime((now/1000) - data.bootTime);
        }

        // 保存状态
        nasInstances[url] = { ...instance, prevCpu: data.cpu, prevNet: data.network, lastTime: now };
        statusEl.textContent = `更新: ${new Date().toLocaleTimeString()}`;
        errorEl.textContent = '';
        
    } catch (e) {
        console.error(e);
        errorEl.textContent = `错误: ${e.message}`;
    }
}

export function initNasModule() {
    const container = document.getElementById('nas-grid-container');
    const stored = localStorage.getItem('nasUrlList');
    nasUrlList = stored ? JSON.parse(stored) : API.NAS_DEFAULT_URLS;
    
    // 渲染卡片
    const template = document.getElementById('tpl-nas-card');
    container.innerHTML = '';
    
    nasUrlList.forEach((url, index) => {
        const clone = template.content.cloneNode(true);
        const el = clone.querySelector('.nas-card-container');
        el.dataset.url = url;
        el.dataset.index = index;
        el.querySelector('.host-name').textContent = new URL(url).hostname;
        // 初始化一些 ID (为了配合 Chart.js 或其他逻辑，这里其实直接用类名选择器更好，但我保留了ID生成逻辑以防万一)
        el.querySelector('.nas-status-footer').id = `nas-status-footer-${index}`;
        container.appendChild(clone);
    });

    // 启动定时器
    const runUpdate = () => nasUrlList.forEach((url, i) => updateSingleNas(url, i));
    runUpdate();
    if(updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(runUpdate, 10000);
    
    // Uptime 独立刷新 (每秒)
    setInterval(() => {
        nasUrlList.forEach((url, i) => {
            const instance = nasInstances[url];
            if(instance && instance.bootTime) {
                const card = document.querySelector(`.nas-card-container[data-index="${i}"]`);
                if(card) card.querySelector('.val-uptime').textContent = formatUptime((Date.now()/1000) - instance.bootTime);
            }
        });
    }, 1000);
}
