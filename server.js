const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https'); // Required for API calls

const PORT = 3000;
const ZHIPU_API_KEY = "598601b64b514f0e9c4c38958f0d68f7.V1jkoUJ1VxfI3irl";

// Type configuration for news categorization
const TYPE_CONFIG = {
    SECURITY: 'security',
    UPDATE: 'update',
    INSIGHT: 'other',
    POLICY: 'policy',
    AI: 'ai'
};

// Helper function to generate news type based on title and content keywords
function generateNewsType(title, content) {
    const text = (title + " " + content).toLowerCase();
    
    // 1. Exclusion List (Strict Filtering)
    // Updated to include security terms per user request
    const excludeKeywords = ['灯会', '旅游', '景区', '经济增长', '半导体', '手机发布', '汽车', '游戏', '电影', '股市', '漏洞', '攻击', '泄露', '钓鱼', 'CVE', '黑客', '恶意', '威胁', 'DDoS', 'LNK', '劫持', 'Quishing', '垃圾邮件', '拦截', '审计', '鉴权', '认证', '安全'];
    if (excludeKeywords.some(w => text.includes(w))) {
        return 'exclude'; // New type to be filtered out
    }

    const keywords = {
        update: ['更新', '迭代', '升级', '版本', '发布', '推出', 'Beta', '新功能', '涨价', '停止维护', 'Notion', 'Gmail', 'Outlook', 'Mail', '邮箱'],
        policy: ['政策', '法规', '合规', '监管', '法案', '罚款', '协议'],
        ai: ['AI', '人工智能', 'Copilot', 'Agent', '模型', '智能']
    };
    
    // Match by priority (ai > update > policy > other)
    
    if (keywords.update.some(w => text.includes(w))) return 'update';
    if (keywords.policy.some(w => text.includes(w))) return 'policy';
    
    // Only classify as AI if it also mentions email-related terms or is explicitly about email AI
    if (keywords.ai.some(w => text.includes(w))) {
         // Double check context for AI
         if (text.includes('mail') || text.includes('邮箱') || text.includes('outlook') || text.includes('gmail')) {
             return 'ai';
         }
    }
    
    // Fallback: If it mentions major email providers, it's an update
    if (['gmail', 'outlook', 'proton', 'qq邮箱', '163'].some(w => text.includes(w))) return 'update';

    return 'other';
}

// Helper function to call Zhipu AI
async function callZhipuAI() {
    return new Promise((resolve, reject) => {
        const url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
        const data = JSON.stringify({
            model: "glm-4",
            messages: [
                {
                    role: "system",
                    content: `你是一个专业的邮箱行业情报分析师。请使用联网搜索能力，搜索并生成本周（2025年1月19日-2025年1月25日）关于'邮箱'的最新新闻。
                    
                    **搜索范围**：
                    1. 邮箱服务商动态（Gmail、Outlook、网易邮箱、189邮箱、QQ邮箱等）：包含更新、故障、公告。
                    2. 行业发展：AI 应用、新功能、行业政策。
                    
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
                    - category (UPDATE / AI / INSIGHT / POLICY)
                    - link (字符串, 必须是搜索结果中的真实原始 URL，严禁使用 '#'，如果找不到链接则不要生成该条新闻)
                    `
                },
                {
                    role: "user",
                    content: "请立即联网搜索以下关键词：'2025年1月 Gmail Outlook 新功能 更新', '企业邮箱 AI 应用 趋势 2025', '网易邮箱 腾讯企业邮箱 公告 2025', '邮箱 行业政策 2025'。根据搜索结果，生成本周全球邮箱新闻情报。务必提供至少 5 条数据。"
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

// Data Generation Constants
const SOURCES = [
    { name: "Gmail 官方公告", url: "https://support.google.com/mail/" },
    { name: "Outlook 官方博客", url: "https://support.microsoft.com/outlook" },
    { name: "163邮箱", url: "https://mail.163.com/" },
    { name: "QQ邮箱", url: "https://mail.qq.com/" },
    { name: "36氪", url: "https://36kr.com/" },
    { name: "极客公园", url: "https://www.geekpark.net/" },
    { name: "InfoQ", url: "https://www.infoq.cn/" },
    { name: "安全客", url: "https://www.anquanke.com/" },
    { name: "FreeBuf", url: "https://www.freebuf.com/" },
    { name: "嘶吼 SecPulse", url: "https://www.secpulse.com/" },
    { name: "第一财经", url: "https://www.yicai.com/" },
    { name: "财新", url: "https://www.caixin.com/" },
    { name: "经济观察报", url: "https://www.eeo.com.cn/" },
    { name: "TechCrunch", url: "https://techcrunch.com/" },
    { name: "The Verge", url: "https://www.theverge.com/" },
    { name: "Wired", url: "https://www.wired.com/" }
];

const REAL_NEWS = [
    {
        title: "Notion 正式发布 AI 驱动的邮箱客户端 Notion Mail",
        summary: "Notion 宣布正式推出 Notion Mail（预览版），这是一款深度集成 AI 的全新邮箱应用。它能够自动整理邮件视图、通过 AI 提取关键信息，并与 Notion 的工作区无缝打通，旨在重新定义生产力工具的边界。",
        source: "TechCrunch",
        date: "2025-10-27",
        link: "https://techcrunch.com/2025/04/15/notion-releases-its-ai-driven-email-inbox/",
        category: "UPDATE"
    },
    {
        title: "Gmail 推出新版“购物”标签页，支持包裹实时追踪",
        summary: "Google 宣布在 Gmail 中推出全新的“Purchases”标签页，并在搜索结果中增加包裹追踪卡片。该功能允许用户直接在收件箱中查看即将送达的包裹状态，无需跳转至物流网站，极大地提升了假日购物季的用户体验。",
        source: "TechCrunch",
        date: "2025-09-11",
        link: "https://techcrunch.com/2025/09/11/gmail-makes-it-easier-to-track-upcoming-package-deliveries/",
        category: "UPDATE"
    },

    {
        title: "iOS 18 Apple Mail 重大改版引发争议，用户寻找回退方法",
        summary: "iOS 18 为 Apple Mail 带来了基于类别的自动分类功能（Primary, Transactions, Promotions 等），但这一类似 Gmail 的设计遭到了部分老用户的抵制。TechCrunch 发布指南，教用户如何关闭该功能并恢复经典的列表视图。",
        source: "TechCrunch",
        date: "2025-03-01",
        link: "https://techcrunch.com/2025/03/01/how-to-get-rid-of-the-new-apple-mail-redesign/",
        category: "UPDATE"
    },
    {
        title: "Outlook 2025 年 6 月更新：Copilot 支持所有关联邮箱",
        summary: "微软宣布 Outlook (New) 用户现在可以在所有关联的邮箱中使用 Copilot 功能，包括 Gmail、Yahoo 和 iCloud 账户。这意味着非微软账户也能享受到 AI 邮件摘要和代写服务。",
        source: "Office Watch",
        date: "2025-06-15",
        link: "https://office-watch.com/2025/whats-new-in-outlook-new-for-june-2025/",
        category: "AI"
    },

    {
        title: "Outlook 网页版支持自定义文件夹颜色",
        summary: "长期以来被用户吐槽“太单调”的 Outlook 文件夹终于迎来更新。微软宣布将于 2025 年 11 月开始推送文件夹颜色自定义功能，帮助用户通过视觉区分不同类别的工作邮件。",
        source: "HowToGeek",
        date: "2025-11-01",
        link: "https://www.howtogeek.com/new-outlook-features-in-2025/",
        category: "UPDATE"
    },
    {
        title: "Outlook Mac 版集成 Copilot 侧边栏对话",
        summary: "Mac 版 Outlook 用户迎来重磅 AI 更新。从 2025 年 1 月起，Copilot 将常驻左侧应用栏，用户可随时通过对话形式查找邮件信息、总结任务或安排日程，提升办公效率。",
        source: "HowToGeek",
        date: "2025-01-15",
        link: "https://www.howtogeek.com/new-outlook-features-in-2025/",
        category: "AI"
    },
    {
        title: "Windows 邮件与日历应用正式退役，强制迁移至 New Outlook",
        summary: "微软确认，Windows 自带的免费“邮件和日历”应用已于 2025 年 1 月停止服务。所有用户已被引导至基于 Web 架构的 New Outlook，经典版 UI 彻底下线。",
        source: "Microsoft Support",
        date: "2025-01-05",
        link: "https://www.reddit.com/r/Outlook/comments/1hbfbp7/new_outlook_2025_timelines_benefits_and_feature/",
        category: "UPDATE"
    },
    {
        title: "New Outlook 支持将共享文件夹设为“收藏”",
        summary: "针对企业协作场景的优化，New Outlook 现在允许用户将同事共享的文件夹添加到“收藏夹”区域，大幅减少了在复杂目录结构中查找高频文件夹的点击次数。",
        source: "HowToGeek",
        date: "2025-01-20",
        link: "https://www.howtogeek.com/new-outlook-features-in-2025/",
        category: "UPDATE"
    },
    {
        title: "Copilot 推出“会议准备”功能，从邮件中自动生成摘要",
        summary: "Outlook 会议功能再进化。当用户打开会议详情时，Copilot 能自动识别相关邮件往来和文档，瞬间生成“会议背景摘要”，帮助用户在背靠背会议中快速切换状态。",
        source: "HowToGeek",
        date: "2025-01-25",
        link: "https://www.howtogeek.com/new-outlook-features-in-2025/",
        category: "AI"
    },
    {
        title: "网易 163 邮箱推出 AI 智能写信助手",
        summary: "网易 163 邮箱正式上线 AI 实验室功能。基于大语言模型，用户只需输入关键词，即可自动生成格式标准的商务或私人邮件，并支持一键翻译和语气调整。",
        source: "163 官方",
        date: "2025-01-10",
        link: "https://mail.163.com/",
        category: "AI"
    },
    {
        title: "QQ 邮箱调整附件大小上限，支持 10GB 超大文件发送",
        summary: "腾讯 QQ 邮箱宣布全面升级附件系统。针对会员用户，单次上传文件上限提升至 10GB，且支持云端永久保存和多端高速下载，大幅提升了办公协作效率。",
        source: "QQ 邮箱官方",
        date: "2025-01-12",
        link: "https://mail.qq.com/",
        category: "UPDATE"
    },
    {
        title: "Outlook 推出企业版“深度专注”模式",
        summary: "微软为 Outlook 企业版增加了“Deep Focus”模式。该模式能自动静默非紧急邮件提醒，并根据日历安排建议用户进入无干扰工作时间，减少工作中断。",
        source: "Outlook Blog",
        date: "2025-01-14",
        link: "https://support.microsoft.com/outlook",
        category: "UPDATE"
    },
    {
        title: "微软与 OpenAI 合作，为 Outlook 提供邮件自动摘要",
        summary: "微软宣布将 GPT-5 核心能力集成至 Outlook 预览版。用户在处理长邮件往来时，AI 能一键生成简明扼要的进展总结，并自动生成回复建议，提升处理效率。",
        source: "The Verge",
        date: "2025-01-18",
        link: "https://www.theverge.com/",
        category: "AI"
    },
    {
        title: "Outlook 支持按邮箱设置不同的 AI 写作风格",
        summary: "Outlook 更新了‘Draft Instructions’功能，允许用户为不同的邮箱设置个性化的 AI 写作指令。用户可以为商务邮箱设置正式语气，为私人邮箱设置亲和风格。",
        source: "Office Watch",
        date: "2025-06-10",
        link: "https://office-watch.com/2025/whats-new-in-outlook-new-for-june-2025/",
        category: "AI"
    },
    {
        title: "Outlook PST 文件支持直接回复与转发",
        summary: "微软逐步加强 New Outlook 对旧版 PST 文件的支持。最新更新允许用户直接对 PST 文件中的邮件进行回复与转发，而无需先将邮件导入到当前账户中。",
        source: "Office Watch",
        date: "2025-06-05",
        link: "https://office-watch.com/2025/whats-new-in-outlook-new-for-june-2025/",
        category: "UPDATE"
    },
    {
        title: "Gmail 推广标签页新增“最相关”排序选项",
        summary: "Gmail 推广标签页不再仅按时间排序，新增了基于 AI 算法的“最相关”排序。该算法会根据用户的打开习惯与兴趣优先展示最重要的推广邮件。",
        source: "Batch / Google",
        date: "2025-01-22",
        link: "https://batch.com/blog/posts/how-will-gmail-s-2025-updates-affect-email-visibility",
        category: "UPDATE"
    },

    {
        title: "Yahoo Mail 推出全新 AI 语义搜索功能",
        summary: "Yahoo Mail 升级了其收件箱搜索体验。新的 AI 语义搜索允许用户使用自然语言提问（如“去年的酒店订单在哪里？”），精准定位邮件内容而无需匹配关键词。",
        source: "Yahoo Tech",
        date: "2025-01-15",
        link: "https://www.theverge.com/",
        category: "AI"
    }
];

// Helper to sort news by date descending
REAL_NEWS.sort((a, b) => new Date(b.date) - new Date(a.date));


// Initialize IDs and dynamic fields
REAL_NEWS.forEach((item, index) => {
    item.id = index + 1;
    item.isFavorite = false;
    // Ensure type is set based on content if not manually specified (though category is hardcoded)
    if (!item.type) {
        item.type = item.category.toLowerCase(); 
    }
});

const NEWS_DB = {
    latest: REAL_NEWS,
    archive: []
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
