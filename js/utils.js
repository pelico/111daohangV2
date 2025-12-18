// js/utils.js

export const isMobile = window.innerWidth <= 768;

export function formatBytes(bytes, decimals = 1) {
    if (bytes === undefined || bytes === null || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond, decimals = 2) {
    if (bytesPerSecond === undefined || bytesPerSecond === null || bytesPerSecond < 1) return `0 KB/s`;
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return `${parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatUptime(seconds) {
    if (!seconds || seconds <= 0) return '--';
    seconds = Math.floor(seconds);
    const d = Math.floor(seconds / 86400);
    const h = Math.floor(seconds % 86400 / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}天 ${h}小时 ${m}分钟`;
}
