// js/config.js

// API 地址配置
export const API = {
    NOTIFICATIONS: 'https://jy-api.111312.xyz/notifications',
    MONITORING_PROXY: 'https://up-api.111312.xyz/',
    WEATHER: 'https://tq-api.111312.xyz',
    NAS_HOOK: 'https://nas-hook.111312.xyz/',
    NAS_DEFAULT_URLS: [
        'https://nas-api.111312.xyz/metrics',
        'https://wkyapi.111312.xyz/metrics'
    ]
};

// 导航链接数据
export const NAV_DATA = [
    {
        title: "常用网站",
        icon: "fas fa-star",
        id: "nav-favorites",
        links: [
            { name: "SgwWeb", url: "https://web.sgwbox.com/home", icon: "fab fa-chrome" },
            { name: "Qinglong", url: "https://ql.111312.xyz/", icon: "fas fa-question-circle" },
            { name: "Memos", url: "https://mm.111312.xyz/", icon: "fas fa-question-circle" },
            { name: "OTP", url: "https://otp.111312.xyz/", icon: "fab fa-github" },
            { name: "SgwAlist", url: "https://sgw.111312.xyz/#/", icon: "fab fa-stack-overflow" },
            { name: "vocechat", url: "https://lt.111312.xyz/", icon: "fab fa-weibo" },
            { name: "Snapdrop", url: "https://cs.111312.xyz/", icon: "fas fa-play-circle" },
            { name: "Syncthing", url: "https://sync.111312.xyz/", icon: "fas fa-play-circle" },
            { name: "SgwTV", url: "https://stv.111312.xyz/", icon: "fas fa-play-circle" },
            { name: "YesMusic", url: "https://ypm.111312.xyz/", icon: "fas fa-play-circle" },
            { name: "UpWeb", url: "https://up.111312.xyz/", icon: "fas fa-play-circle" },
            { name: "Cloudflare", url: "https://dash.cloudflare.com/7dcad7e5c925385adde3ce2a3f5bb271/home/domains", icon: "fas fa-play-circle" },
            { name: "Taosync", url: "https://tao.111312.xyz/#/home", icon: "fas fa-play-circle" },
            { name: "Onedrive", url: "https://d8u4-my.sharepoint.com/my", icon: "fas fa-play-circle" },
            { name: "cpolar", url: "https://dashboard.cpolar.com/status", icon: "fas fa-play-circle" }
        ]
    },
    {
        title: "社交娱乐",
        icon: "fas fa-heart",
        id: "nav-social",
        links: [
            { name: "微信", url: "https://wx.qq.com", icon: "fab fa-weixin" },
            { name: "QQ", url: "https://im.qq.com", icon: "fab fa-qq" },
            { name: "抖音", url: "https://www.douyin.com", icon: "fas fa-film" },
            { name: "网易云音乐", url: "https://music.163.com", icon: "fas fa-music" },
            { name: "爱奇艺", url: "https://www.iqiyi.com", icon: "fas fa-tv" },
            { name: "优酷", url: "https://www.youku.com", icon: "fas fa-video" }
        ]
    }
];
