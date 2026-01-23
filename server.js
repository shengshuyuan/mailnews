const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https'); // Required for API calls

const PORT = 3000;
const ZHIPU_API_KEY = "598601b64b514f0e9c4c38958f0d68f7.V1jkoUJ1VxfI3irl";

// Helper function to call Zhipu AI
async function callZhipuAI() {
    return new Promise((resolve, reject) => {
        const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        const data = JSON.stringify({
            model: "glm-4",
            messages: [
                {
                    role: "system",
                    content: `你是一个专业的网络安全情报分析师。请使用联网搜索能力，搜索并生成本周（2025年1月19日-2025年1月25日）关于'邮箱'的最新新闻。
                    
                    **搜索范围**：
                    1. 邮箱服务商动态（Gmail、Outlook、网易邮箱、189邮箱、QQ邮箱等）：包含更新、故障、公告。
                    2. 邮箱安全事件：钓鱼邮件、数据泄露、漏洞预警 (CVE)。
                    3. 行业发展：AI 应用、新功能、行业政策。
                    
                    **信源要求**：
                    必须来自权威媒体或可信渠道，例如：路透社、华尔街日报、腾讯新闻、网易新闻、36氪、爱范儿、极客公园、今日头条等。严禁使用营销号内容。
                    
                    **关键要求**：
                    1. **必须生成 5-7 条不同的新闻**。如果搜索结果不足，请扩大搜索范围到 2025年1月 全月。
                    2. **严禁只返回 1 条新闻**。务必挖掘不同来源、不同主题的新闻。
                    3. 确保新闻的真实性和时效性。

                    **输出格式**：
                    必须返回标准的 JSON 格式，不包含 markdown 标记。JSON 结构为一个数组，每个对象包含：
                    - id (数字)
                    - title (字符串, 简练专业)
                    - source (字符串, 必须是上述权威媒体之一)
                    - date (YYYY-MM-DD)
                    - summary (简短摘要, 50字以内)
                    - category (SECURITY / UPDATE / INSIGHT / POLICY)
                    - link (字符串, 必须是搜索结果中的真实原始 URL，严禁使用 '#'，如果找不到链接则不要生成该条新闻)
                    `
                },
                {
                    role: "user",
                    content: "请立即联网搜索以下关键词：'2025年1月 邮箱安全事件', 'Gmail Outlook 新功能 更新 2025', '企业邮箱 钓鱼攻击 趋势 2025', '网易邮箱 腾讯企业邮箱 公告 2025'。根据搜索结果，生成本周全球邮箱新闻情报。务必提供至少 5 条数据。"
                }
            ],
            tools: [
                {
                    type: "web_search",
                    web_search: {
                        enable: true
                    }
                }
            ],
            temperature: 0.7
        });

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ZHIPU_API_KEY}`
            }
        };

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const parsed = JSON.parse(body);
                        const content = parsed.choices[0].message.content;
                        console.log("[AI RAW RESPONSE]", content); // Log raw response for debugging

                        // Improved JSON extraction using regex to find the first [ and last ]
                        const jsonMatch = content.match(/\[[\s\S]*\]/);
                        if (jsonMatch) {
                            const jsonStr = jsonMatch[0];
                            try {
                                resolve(JSON.parse(jsonStr));
                            } catch (parseError) {
                                reject(new Error(`JSON Parse Error: ${parseError.message}. Raw: ${jsonStr}`));
                            }
                        } else {
                            // Fallback: try to clean code blocks if no array found (maybe single object or other format)
                            const cleanStr = content.replace(/```json\n?|\n?```/g, '').trim();
                            try {
                                resolve(JSON.parse(cleanStr));
                            } catch (parseError) {
                                reject(new Error(`Failed to extract JSON. Raw content: ${content}`));
                            }
                        }
                    } catch (e) {
                        reject(new Error(`Failed to parse AI API response: ${e.message}`));
                    }
                } else {
                    reject(new Error(`API Error: ${res.statusCode} ${body}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

// Data Source (Simulating Database)
const NEWS_DB = {
    latest: [
        // Fallback data (Simulation Mode)
        {
            id: 1,
            title: "SmarterMail 严重漏洞：身份验证绕过导致 RCE",
            source: "The Hacker News",
            date: "2025-01-22",
            summary: "SmarterMail 邮件服务器被发现存在严重漏洞 (CVE-2025-1024)，攻击者可绕过身份验证重置管理员密码并执行远程代码。建议立即升级到 Build 9511。",
            category: "SECURITY",
            link: "https://thehackernews.com/"
        },
        {
            id: 2,
            title: "Gmail 推出量子加密传输层",
            source: "Google Blog",
            date: "2025-01-21",
            summary: "Google 宣布在 Gmail 企业版中默认启用抗量子加密算法，以应对未来的解密威胁。",
            category: "UPDATE",
            link: "https://blog.google/products/gmail/"
        },
        {
            id: 3,
            title: "腾讯企业邮箱发布 2025 年度安全报告",
            source: "腾讯科技",
            date: "2025-01-20",
            summary: "报告显示，利用 AI 生成的钓鱼邮件攻击量同比上升 300%，传统防御手段拦截率下降。",
            category: "INSIGHT",
            link: "https://new.qq.com/"
        },
        {
            id: 4,
            title: "Outlook Copilot 新增'意图识别'功能",
            source: "The Verge",
            date: "2025-01-23",
            summary: "微软更新 Outlook Copilot，能够自动识别邮件中的会议邀约、任务指派并自动添加到日历。",
            category: "UPDATE",
            link: "https://www.theverge.com/"
        },
        {
            id: 5,
            title: "欧盟通过《数字通信隐私法案》修订案",
            source: "Reuters",
            date: "2025-01-19",
            summary: "新法案要求所有在欧盟运营的邮箱服务商必须提供端到端加密选项，违者将面临巨额罚款。",
            category: "POLICY",
            link: "https://www.reuters.com/"
        },
        {
            id: 6,
            title: "Proton Mail 遭遇大规模 DDoS 攻击",
            source: "BleepingComputer",
            date: "2025-01-21",
            summary: "Proton Mail 确认遭受每秒 5TB 的流量攻击，部分用户访问受限，目前正在逐步恢复。",
            category: "SECURITY",
            link: "https://www.bleepingcomputer.com/"
        },
        {
            id: 7,
            title: "网易邮箱推出'无密码'登录新方案",
            source: "36Kr",
            date: "2025-01-24",
            summary: "网易邮箱宣布支持 Passkeys 通行密钥，用户可通过生物识别直接登录，彻底告别密码泄露风险。",
            category: "UPDATE",
            link: "https://36kr.com/"
        },
        {
            id: 8,
            title: "Fastmail 宣布全线产品涨价 20%",
            source: "TechCrunch",
            date: "2025-01-23",
            summary: "知名隐私邮箱服务商 Fastmail 宣布因运营成本上升，将于下月起调整订阅价格。",
            category: "INSIGHT",
            link: "https://techcrunch.com/"
        },
        {
            id: 9,
            title: "朝鲜黑客组织利用 LNK 文件攻击企业邮箱",
            source: "Mandiant",
            date: "2025-01-22",
            summary: "安全机构发现 Lazarus 组织正在利用伪装成发票的 LNK 文件攻击金融行业的企业邮箱账户。",
            category: "SECURITY",
            link: "https://www.mandiant.com/"
        },
        {
            id: 10,
            title: "AWS SES 推出 AI 垃圾邮件过滤引擎",
            source: "AWS News",
            date: "2025-01-20",
            summary: "Amazon SES 发布全新的 AI 驱动出站过滤引擎，帮助开发者防止域名信誉受损。",
            category: "UPDATE",
            link: "https://aws.amazon.com/new/"
        },
        {
            id: 11,
            title: "Zoom Mail 客户端正式停止维护",
            source: "Zoom Blog",
            date: "2025-01-18",
            summary: "Zoom 宣布将资源集中于视频会议核心业务，正式停止 Zoom Mail 和 Calendar 客户端的开发。",
            category: "INSIGHT",
            link: "https://blog.zoom.us/"
        },
        {
            id: 12,
            title: "钓鱼新变种：利用 QR 码绕过邮件网关",
            source: "Cofense",
            date: "2025-01-21",
            summary: "Quishing (QR 钓鱼) 攻击激增，攻击者将恶意链接嵌入图片二维码中，成功绕过多数文本扫描引擎。",
            category: "SECURITY",
            link: "https://cofense.com/"
        },
        {
            id: 13,
            title: "Thunderbird Supernova 移动版发布 Beta 测试",
            source: "Mozilla",
            date: "2025-01-24",
            summary: "备受期待的 Thunderbird 安卓版终于进入公开 Beta 测试阶段，支持 K-9 Mail 数据无缝迁移。",
            category: "UPDATE",
            link: "https://blog.thunderbird.net/"
        },
        {
            id: 14,
            title: "中国电信 189 邮箱升级大附件中转站",
            source: "IT之家",
            date: "2025-01-19",
            summary: "189 邮箱宣布免费用户大附件中转站扩容至 5GB，并延长保存期限至 30 天。",
            category: "UPDATE",
            link: "https://www.ithome.com/"
        },
        {
            id: 15,
            title: "黑客利用过期域名劫持企业邮件路由",
            source: "KrebsOnSecurity",
            date: "2025-01-22",
            summary: "研究人员展示了一种通过注册过期 DNS 服务器域名来劫持企业 MX 记录的新型攻击手法。",
            category: "SECURITY",
            link: "https://krebsonsecurity.com/"
        }
    ],
    archive: [
        {
            id: 101,
            title: "Outlook 推出全新 AI 辅助撰写功能",
            source: "TechCrunch",
            date: "2025-01-10",
            summary: "微软宣布在 Outlook 中集成更强大的 Copilot 功能，可根据简短提示自动撰写专业邮件。",
            category: "UPDATE",
            link: "#"
        },
        {
            id: 102,
            title: "Yahoo 邮箱遭遇短暂服务中断",
            source: "Downdetector",
            date: "2025-01-12",
            summary: "Yahoo 邮箱在北美地区遭遇约 2 小时的服务中断，目前已恢复正常。",
            category: "OUTAGE",
            link: "#"
        }
    ]
};

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.md': 'text/markdown'
};

const server = http.createServer(async (req, res) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);

    // API Routes
    if (req.url === '/api/news/latest') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(NEWS_DB.latest));
        return;
    }

    if (req.url.startsWith('/api/news/generate')) {
        // Simple pagination logic
        const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
        const page = parseInt(urlParams.get('page')) || 1;
        const limit = parseInt(urlParams.get('limit')) || 5;

        // In a real scenario, we might trigger AI generation here.
        // For simulation/mock mode, we return slices of our robust DB.
        
        // If page 1, we might want to "refresh" the data order to simulate new generation?
        // For now, let's keep it static but paginated.
        
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = NEWS_DB.latest.slice(startIndex, endIndex);
        
        const response = {
            items: paginatedData,
            hasMore: endIndex < NEWS_DB.latest.length,
            nextPage: endIndex < NEWS_DB.latest.length ? page + 1 : null
        };

        // Delay slightly to simulate network
        setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(response));
        }, 800);
        return;
    }

    if (req.url === '/api/news/archive') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(NEWS_DB.archive));
        return;
    }

    if (req.url === '/api/status') {
         res.writeHead(200, { 'Content-Type': 'application/json' });
         res.end(JSON.stringify({ status: 'ONLINE', version: '1.0.0', uptime: process.uptime() }));
         return;
    }

    // Static File Serving
    // Parse URL to ignore query parameters
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = parsedUrl.pathname;

    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = path.extname(filePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if(error.code == 'ENOENT'){
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`CyberMail Nexus Server running at http://localhost:${PORT}/`);
});
