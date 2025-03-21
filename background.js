let isRunning = false;
let currentTab = null;
let config = null;
let currentRound = 0;
let totalRounds = 0;
let shouldKeepTabs = true; // 默认保留标签页

function log(message) {
    console.log(`[Excel2蝉镜 Background] ${message}`);
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start') {
        log(`收到启动消息，循环次数: ${message.data.loopCount}`);
        log(`完整配置: ${JSON.stringify(message.data)}`);
        startAutomation(message.data);
    } else if (message.action === 'stop') {
        log('收到停止消息');
        stopAutomation();
    } else if (message.type === 'log') {
        // 将content script的日志转发给popup
        log(`[Content] ${message.message}`);
        chrome.runtime.sendMessage({
            type: 'debug',
            message: message.message
        });
    } else if (message.type === 'complete') {
        // 当单轮操作完成时，处理下一轮或全部完成
        handleRoundComplete();
    }
});

async function startAutomation(data) {
    if (isRunning) return;
    
    isRunning = true;
    config = data;
    currentRound = 0;
    totalRounds = parseInt(config.loopCount);
    
    // 获取并记录保留标签页选项
    shouldKeepTabs = config.keepTabs !== undefined ? config.keepTabs : true;
    log(`保留标签页选项: ${shouldKeepTabs ? '启用' : '禁用'}`);
    
    // 记录配置信息以便调试
    log(`存储的配置: 循环次数=${totalRounds}, Excel数据长度=${config.excelData ? config.excelData.length : 0}`);
    
    // 开始第一轮操作
    startNextRound();
}

function stopAutomation() {
    isRunning = false;
    if (currentTab) {
        log(`向标签页 ${currentTab} 发送停止消息`);
        chrome.tabs.sendMessage(currentTab, { action: 'stop' });
    }
    
    chrome.runtime.sendMessage({
        type: 'stopped'
    });
}

async function startNextRound() {
    if (!isRunning) return;
    
    currentRound++;
    if (currentRound > totalRounds) {
        // 所有轮次已完成
        log(`所有 ${totalRounds} 轮操作完成`);
        chrome.runtime.sendMessage({
            type: 'allComplete'
        });
        isRunning = false;
        return;
    }
    
    try {
        log(`开始第 ${currentRound}/${totalRounds} 轮操作`);
        chrome.runtime.sendMessage({
            type: 'progress',
            current: currentRound,
            total: totalRounds
        });
        
        // 每一轮创建新标签页
        const tab = await chrome.tabs.create({
            url: 'https://www.chanjing.cc/worktable?direction=vertical&from=home&track=main_home',
            active: true
        });
        
        currentTab = tab.id;
        log(`为第 ${currentRound} 轮创建了标签页: ${currentTab}`);
        
        // 等待页面加载完成
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo, tab) {
            if (tabId === currentTab && changeInfo.status === 'complete') {
                log(`第 ${currentRound} 轮页面加载完成`);
                chrome.tabs.onUpdated.removeListener(listener);
                // 等待页面完全加载和渲染
                log('等待页面充分渲染 (3秒)...');
                setTimeout(() => {
                    startRoundProcess();
                }, 3000);
            }
        });
    } catch (error) {
        handleError(error);
    }
}

function handleRoundComplete() {
    log(`第 ${currentRound}/${totalRounds} 轮操作完成`);
    
    // 根据保留标签页选项决定是否关闭当前标签页
    if (!shouldKeepTabs && currentTab) {
        try {
            chrome.tabs.remove(currentTab);
            log(`关闭标签页 ${currentTab}`);
        } catch (error) {
            log(`关闭标签页失败: ${error.message}`);
        }
    } else {
        log(`保留标签页 ${currentTab} 并继续下一轮操作`);
    }
    
    // 延迟启动下一轮
    setTimeout(() => {
        startNextRound();
    }, 1000);
}

async function startRoundProcess() {
    try {
        log(`第 ${currentRound} 轮开始自动化流程`);
        
        // 准备当前轮次的数据
        const currentData = {
            loopCount: 1, // 每个标签页只执行一次操作
            currentRound: currentRound,
            totalRounds: totalRounds
        };
        
        // 如果有Excel数据，则取对应轮次的数据
        if (config.excelData && config.excelData.length > 0) {
            // 数组索引从0开始，轮次从1开始，所以减1
            const dataIndex = (currentRound - 1) % config.excelData.length;
            currentData.roundData = config.excelData[dataIndex];
        }
        
        log(`向content script发送第 ${currentRound} 轮数据`);
        
        // 向content script发送开始信号
        chrome.tabs.sendMessage(currentTab, {
            action: 'start',
            config: currentData,
            data: {
                cellRange: config.cellRange,
                loopCount: 1, // 每个页面只执行一次
                excelData: config.excelData ? [currentData.roundData] : []
            }
        });
    } catch (error) {
        handleError(error);
    }
}

function handleError(error) {
    log(`错误: ${error.message}`);
    isRunning = false;
    chrome.runtime.sendMessage({
        type: 'error',
        error: error.message
    });
} 