let isRunning = false;
let currentConfig = null;
let currentRound = 0;
let excelData = null;
const DELAY_BETWEEN_STEPS = 150; // 设置步骤间的延迟时间

// 添加调试功能
function log(message) {
    console.log(`[Excel2蝉镜] ${message}`);
    chrome.runtime.sendMessage({
        type: 'log',
        message: message
    });
}

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'start') {
        log(`收到开始消息: ${JSON.stringify(message.config)}, 数据: ${JSON.stringify(message.data)}`);
        currentConfig = message.config;
        excelData = message.data;
        
        // 记录当前是第几轮操作（在多标签模式下）
        if (currentConfig && currentConfig.currentRound) {
            log(`当前是总体操作的第 ${currentConfig.currentRound}/${currentConfig.totalRounds} 轮`);
        }
        
        // 确保循环次数正确设置 - 在新模式下每个标签页只执行一次
        if (currentConfig && currentConfig.loopCount) {
            log(`本标签页内设置循环次数: ${currentConfig.loopCount}`);
        } else {
            log(`警告: 未找到有效的循环次数配置，使用默认值 1`);
            currentConfig = currentConfig || {};
            currentConfig.loopCount = 1;
        }
        
        startAutomation();
    } else if (message.action === 'stop') {
        stopAutomation();
    }
});

async function startAutomation() {
    if (isRunning) return;
    isRunning = true;
    currentRound = 0;

    try {
        log("开始自动化流程");
        log(`本标签页内循环次数: ${currentConfig.loopCount}`);
        // 分析页面结构
        analyzePage();
        
        while (isRunning && currentRound < currentConfig.loopCount) {
            currentRound++;
            
            log(`执行第 ${currentRound}/${currentConfig.loopCount} 轮操作`);
            // 执行自动化步骤
            await executeAutomationSteps();
            
            // 等待一段时间后继续下一轮
            if (currentRound < currentConfig.loopCount) {
                log(`本轮操作完成，等待2秒后开始下一轮...`);
                await sleep(2000);
            }
        }

        if (currentRound >= currentConfig.loopCount) {
            log(`已完成本标签页的所有操作`);
            
            // 标记当前标签页为已完成状态
            markTabAsCompleted();
            
            // 通知background.js当前标签页的操作已完成
            chrome.runtime.sendMessage({ type: 'complete' });
            log("自动化流程完成");
        }
    } catch (error) {
        handleError(error);
    } finally {
        isRunning = false;
    }
}

function stopAutomation() {
    log("停止自动化流程");
    isRunning = false;
}

// 分析页面结构，记录可能的选择器
function analyzePage() {
    log("分析页面结构...");
    // 记录所有可能的标签页元素
    const possibleTabs = document.querySelectorAll('div[class*="tab"], ul[class*="tab"] > li, .tabs > *');
    log(`找到 ${possibleTabs.length} 个可能的标签页元素`);
    
    // 记录所有可能的人像列表元素
    const possibleLists = document.querySelectorAll('div[class*="list"], ul[class*="list"]');
    log(`找到 ${possibleLists.length} 个可能的列表元素`);
    
    // 记录输入框
    const possibleInputs = document.querySelectorAll('div[contenteditable="true"], div.editor, div[class*="input"], textarea');
    log(`找到 ${possibleInputs.length} 个可能的输入元素`);
    
    // 记录按钮
    const possibleButtons = document.querySelectorAll('button, div[class*="button"], div[class*="btn"]');
    log(`找到 ${possibleButtons.length} 个可能的按钮元素`);
}

async function executeAutomationSteps() {
    try {
        // 1. 尝试多种选择器找到人像标签页
        log("尝试点击人像标签页");
        await sleep(DELAY_BETWEEN_STEPS);
        
        const tabSelectors = [
            'div.tabs-tab:nth-child(2)', 
            '.tabs > :nth-child(2)', 
            'ul.tabs > li:nth-child(2)',
            'div[data-testid="avatar-tab"]',
            'div[role="tab"]:nth-child(2)',
            'div.tab-item:nth-child(2)'
        ];
        
        let tabFound = false;
        for (const selector of tabSelectors) {
            try {
                const element = document.querySelector(selector);
                if (element) {
                    log(`找到人像标签页: ${selector}`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    element.click();
                    tabFound = true;
                    await sleep(1000); // 点击标签页后的延迟
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
                await sleep(DELAY_BETWEEN_STEPS);
            }
        }
        
        if (!tabFound) {
            // 如果找不到预定义的选择器，尝试分析页面找到可能的标签页
            log("通过文本内容查找人像标签");
            await sleep(DELAY_BETWEEN_STEPS);
            
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                if (el.textContent && (
                    el.textContent.includes('人像') || 
                    el.textContent.includes('形象') || 
                    el.textContent.includes('角色')
                )) {
                    log(`找到可能的人像标签: ${el.tagName}.${el.className}`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    el.click();
                    tabFound = true;
                    await sleep(1000);
                    break;
                }
                // 每检查几个元素就暂停一下，避免界面卡顿
                if (allElements.indexOf(el) % 50 === 0) {
                    await sleep(DELAY_BETWEEN_STEPS);
                }
            }
        }
        
        if (!tabFound) {
            throw new Error("无法找到人像标签页");
        }

        log("标签页点击完成，进入下一步");
        await sleep(DELAY_BETWEEN_STEPS * 2);

        // 2. 尝试多种选择器找到人像列表并随机选择一个
        log("寻找人像列表");
        await sleep(DELAY_BETWEEN_STEPS);
        
        const listSelectors = [
            'div.people-list', 
            'div[class*="avatar-list"]', 
            'div[class*="people-list"]',
            'ul[class*="avatar"]',
            'div[data-testid="avatar-list"]'
        ];
        
        let avatarSelected = false;
        for (const selector of listSelectors) {
            try {
                const list = document.querySelector(selector);
                if (list && list.children.length > 0) {
                    log(`找到人像列表: ${selector} 包含 ${list.children.length} 个人像`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    
                    const randomIndex = Math.floor(Math.random() * list.children.length);
                    log(`选择第 ${randomIndex + 1} 个人像`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    
                    list.children[randomIndex].click();
                    avatarSelected = true;
                    await sleep(1000); // 选择人像后的延迟
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
                await sleep(DELAY_BETWEEN_STEPS);
            }
        }
        
        if (!avatarSelected) {
            log("无法通过列表选择器找到人像，尝试通过图片元素查找");
            await sleep(DELAY_BETWEEN_STEPS);
            
            const avatarImages = document.querySelectorAll('img[alt*="avatar"], img[src*="avatar"], img[class*="avatar"]');
            if (avatarImages.length > 0) {
                const randomIndex = Math.floor(Math.random() * avatarImages.length);
                const randomImg = avatarImages[randomIndex];
                log(`找到 ${avatarImages.length} 个可能的人像图片，随机选择第 ${randomIndex + 1} 个`);
                await sleep(DELAY_BETWEEN_STEPS);
                
                randomImg.click();
                avatarSelected = true;
                await sleep(1000);
            }
        }
        
        if (!avatarSelected) {
            throw new Error("无法找到或选择人像");
        }

        log("人像选择完成，进入下一步");
        await sleep(DELAY_BETWEEN_STEPS * 2);

        // 3. 点击页面空白区域
        log("点击页面空白区域");
        await sleep(DELAY_BETWEEN_STEPS);
        
        const designAreaSelectors = [
            'div#page-design', 
            'div.editor-area', 
            'div.canvas',
            'div[class*="editor"]',
            'div[class*="workspace"]'
        ];
        
        let designAreaClicked = false;
        for (const selector of designAreaSelectors) {
            try {
                const area = document.querySelector(selector);
                if (area) {
                    log(`找到设计区域: ${selector}`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    
                    area.click();
                    designAreaClicked = true;
                    await sleep(500); // 点击设计区域后的延迟
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
                await sleep(DELAY_BETWEEN_STEPS);
            }
        }
        
        if (!designAreaClicked) {
            // 如果找不到设计区域，尝试点击页面中间
            log("找不到特定设计区域，点击页面中间");
            await sleep(DELAY_BETWEEN_STEPS);
            
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            log(`点击页面中央坐标 (${centerX}, ${centerY})`);
            await sleep(DELAY_BETWEEN_STEPS);
            
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: centerX,
                clientY: centerY
            });
            document.elementFromPoint(centerX, centerY).dispatchEvent(clickEvent);
            await sleep(500);
        }

        log("空白区域点击完成，进入下一步");
        await sleep(DELAY_BETWEEN_STEPS * 2);

        // 4. 激活并填充脚本输入框
        log("查找并填充脚本输入框");
        await sleep(DELAY_BETWEEN_STEPS);
        
        const inputSelectors = [
            'div.tiptap', 
            '[contenteditable="true"]', 
            'div.editor-content',
            'textarea.script-input',
            'div[data-testid="script-input"]',
            'div[class*="input"]'
        ];
        
        let inputFilled = false;
        for (const selector of inputSelectors) {
            try {
                const input = document.querySelector(selector);
                if (input) {
                    log(`找到输入框: ${selector}`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    
                    input.focus();
                    await sleep(DELAY_BETWEEN_STEPS);
                    log(`输入框已获取焦点`);
                    
                    // 从Excel数据中获取当前轮次的文本
                    let text = '测试文本';
                    
                    if (excelData && excelData.excelData && excelData.excelData[currentRound - 1]) {
                        text = excelData.excelData[currentRound - 1];
                    }
                    
                    // 处理文本中的换行符，确保在HTML中正确显示
                    const formattedText = text.replace(/\n/g, '<br>');
                    
                    // 记录填入的文本内容（仅记录前20个字符，避免日志过长）
                    const displayText = text.length > 20 ? text.substring(0, 20) + '...' : text;
                    log(`填入文本: ${displayText}`);
                    // 记录文本长度和是否包含换行
                    log(`文本长度: ${text.length}, 包含 ${(text.match(/\n/g) || []).length} 个换行符`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    
                    // 使用不同方式尝试输入文本
                    if (input.isContentEditable) {
                        // 方法1：设置innerHTML（适用于带换行的内容）
                        log(`使用方法1: 设置innerHTML (带格式文本)`);
                        input.innerHTML = '';
                        await sleep(DELAY_BETWEEN_STEPS);
                        input.innerHTML = formattedText;
                        await sleep(DELAY_BETWEEN_STEPS);
                        
                        // 方法2：使用execCommand
                        log(`使用方法2: execCommand插入HTML文本`);
                        document.execCommand('insertHTML', false, formattedText);
                        await sleep(DELAY_BETWEEN_STEPS);
                        
                        // 方法3：使用clipboard API
                        try {
                            log(`使用方法3: 尝试使用clipboard API`);
                            await navigator.clipboard.writeText(text);
                            document.execCommand('paste');
                        } catch (clipboardError) {
                            log(`clipboard API失败: ${clipboardError.message}`);
                        }
                        await sleep(DELAY_BETWEEN_STEPS);
                    } else if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                        log(`使用input.value方法`);
                        input.value = text; // 文本框会自动处理换行符
                        await sleep(DELAY_BETWEEN_STEPS);
                    }
                    
                    // 触发多种输入事件，确保文本变化被检测到
                    log(`触发输入事件`);
                    const events = ['input', 'change', 'keyup', 'keydown', 'keypress'];
                    for (const eventType of events) {
                        input.dispatchEvent(new Event(eventType, { bubbles: true }));
                        await sleep(DELAY_BETWEEN_STEPS);
                    }
                    
                    inputFilled = true;
                    await sleep(500); // 填充文本后的延迟
                    break;
                }
            } catch (e) {
                log(`输入文本时出错: ${e.message}`);
                await sleep(DELAY_BETWEEN_STEPS);
                // 继续尝试下一个选择器
            }
        }
        
        if (!inputFilled) {
            throw new Error("无法找到或填充脚本输入框");
        }

        log("文本输入完成，进入下一步");
        await sleep(DELAY_BETWEEN_STEPS * 2);

        // 5. 点击生成按钮
        log("点击生成按钮");
        await sleep(DELAY_BETWEEN_STEPS);
        
        const buttonSelectors = [
            'div.create-btn', 
            'button[class*="generate"]', 
            'div[class*="generate"]',
            'button.primary',
            'div[data-testid="generate-button"]',
            'button[class*="create"]',
            'div[class*="create"]'
        ];
        
        let buttonClicked = false;
        for (const selector of buttonSelectors) {
            try {
                const button = document.querySelector(selector);
                if (button) {
                    log(`找到生成按钮: ${selector}`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    
                    button.click();
                    buttonClicked = true;
                    log(`生成按钮已点击，等待处理...`);
                    await sleep(3000); // 等待生成完成
                    break;
                }
            } catch (e) {
                // 继续尝试下一个选择器
                await sleep(DELAY_BETWEEN_STEPS);
            }
        }
        
        if (!buttonClicked) {
            // 尝试查找包含特定文字的按钮
            log("通过文本内容查找生成按钮");
            await sleep(DELAY_BETWEEN_STEPS);
            
            const buttonTexts = ['生成', '创建', '开始', 'Generate', 'Create', 'Start'];
            const allButtons = document.querySelectorAll('button, div[role="button"], div[class*="button"], div[class*="btn"]');
            
            log(`找到 ${allButtons.length} 个可能的按钮元素`);
            await sleep(DELAY_BETWEEN_STEPS);
            
            for (const button of allButtons) {
                const text = button.textContent.trim().toLowerCase();
                if (buttonTexts.some(btnText => text.includes(btnText.toLowerCase()))) {
                    log(`通过文本找到按钮: ${text}`);
                    await sleep(DELAY_BETWEEN_STEPS);
                    
                    button.click();
                    buttonClicked = true;
                    log(`生成按钮已点击，等待处理...`);
                    await sleep(3000);
                    break;
                }
                
                // 每检查几个按钮就暂停一下
                if (Array.from(allButtons).indexOf(button) % 10 === 0) {
                    await sleep(DELAY_BETWEEN_STEPS);
                }
            }
        }
        
        if (!buttonClicked) {
            throw new Error("无法找到或点击生成按钮");
        }
        
        log("本轮操作完成，通知状态更新");
    } catch (error) {
        throw new Error(`自动化步骤执行失败: ${error.message}`);
    }
}

async function clickElement(selector) {
    const element = await waitForElement(selector);
    if (element) {
        element.click();
    } else {
        throw new Error(`未找到元素: ${selector}`);
    }
}

async function waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
        const element = document.querySelector(selector);
        if (element) {
            return element;
        }
        await sleep(100);
    }
    
    return null;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function handleError(error) {
    log(`错误: ${error.message}`);
    isRunning = false;
    chrome.runtime.sendMessage({
        type: 'error',
        error: error.message
    });
}

// 添加标记当前标签页为已完成的函数
function markTabAsCompleted() {
    try {
        // 添加完成标记到页面标题
        const originalTitle = document.title;
        document.title = `✅ [已完成] ${originalTitle}`;
        
        // 在页面顶部添加一个醒目的完成标记
        const completedBanner = document.createElement('div');
        completedBanner.style.position = 'fixed';
        completedBanner.style.top = '0';
        completedBanner.style.left = '0';
        completedBanner.style.width = '100%';
        completedBanner.style.backgroundColor = 'rgba(0, 200, 0, 0.8)';
        completedBanner.style.color = 'white';
        completedBanner.style.padding = '10px';
        completedBanner.style.textAlign = 'center';
        completedBanner.style.fontWeight = 'bold';
        completedBanner.style.zIndex = '9999';
        
        // 如果有当前轮次信息，则显示在横幅中
        if (currentConfig && currentConfig.currentRound) {
            completedBanner.textContent = `✅ 此标签页已完成处理！(第 ${currentConfig.currentRound}/${currentConfig.totalRounds} 轮)`;
        } else {
            completedBanner.textContent = '✅ 此标签页已完成处理！';
        }
        
        document.body.appendChild(completedBanner);
        
        log("已标记当前标签页为完成状态");
    } catch (error) {
        log(`标记标签页完成状态时出错: ${error.message}`);
    }
} 