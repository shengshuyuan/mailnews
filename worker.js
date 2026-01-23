// Web Worker for Data Processing
// 负责处理繁重的数据计算，避免阻塞 UI 线程

self.addEventListener('message', (e) => {
    const { type, payload } = e.data;

    if (type === 'GENERATE_REPORT') {
        // 模拟复杂计算：排序、过滤、加密解密
        const report = processReport(payload.mockData, payload.weekNumber);
        self.postMessage({ type: 'REPORT_READY', payload: report });
    }
});

function processReport(data, weekNumber) {
    const now = new Date();
    
    // 模拟耗时操作 (CPU Intensive Task)
    let checksum = 0;
    for (let i = 0; i < 1000000; i++) {
        checksum += Math.sqrt(i);
    }

    // 可以在这里添加更复杂的逻辑，比如全文检索、关键词提取等
    // 目前主要是为了演示 Worker 的使用
    
    return {
        id: `report-${Date.now()}`,
        title: `WEEK ${weekNumber} / 2026`,
        dateGenerated: now.toLocaleString(),
        items: data, // 实际场景中这里可能包含过滤后的数据
        checksum: checksum.toFixed(2)
    };
}
