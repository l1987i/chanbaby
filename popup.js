document.addEventListener('DOMContentLoaded', function() {
    const fileInputWrapper = document.getElementById('fileInputWrapper');
    const fileInput = document.getElementById('fileInput');
    const filePlaceholder = document.querySelector('.file-placeholder');
    const fileName = document.querySelector('.file-name');
    const cellRange = document.getElementById('cellRange');
    const loopCount = document.getElementById('loopCount');
    const keepTabs = document.getElementById('keepTabs');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');
    const debug = document.getElementById('debug');
    const debugToggle = document.getElementById('debugToggle');
    const debugArea = document.getElementById('debug');

    let isRunning = false;
    let currentFile = null;
    let excelData = null;
    let isDebugVisible = false;

    // 调试信息切换
    debugToggle.addEventListener('click', () => {
        isDebugVisible = !isDebugVisible;
        debugArea.classList.toggle('show');
        debugToggle.textContent = isDebugVisible ? '隐藏调试信息' : '显示调试信息';
    });

    // 添加调试日志
    function addDebugLog(message) {
        const time = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'debug-entry';
        logEntry.textContent = `[${time}] ${message}`;
        debug.appendChild(logEntry);
        debug.scrollTop = debug.scrollHeight;
    }

    // 文件选择处理
    fileInputWrapper.addEventListener('click', (e) => {
        // 如果点击的是input元素，不做处理（避免重复触发）
        if (e.target === fileInput) return;
        
        // 只有在未选择文件时才触发文件选择
        if (!currentFile) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        currentFile = file;
        fileName.textContent = file.name;
        fileName.style.display = 'block';
        filePlaceholder.style.display = 'none';
        fileInputWrapper.classList.add('has-file');

        try {
            status.textContent = `状态：正在解析文件 - ${file.name}`;
            addDebugLog(`开始解析文件: ${file.name}`);
            
            // 读取Excel文件
            const rawData = await readExcelFile(file);
            excelData = rawData;
            
            addDebugLog(`文件解析成功，读取到 ${rawData.length} 行数据`);
            status.textContent = `状态：文件已解析 - ${file.name}`;
        } catch (error) {
            addDebugLog(`文件解析失败: ${error.message}`);
            status.textContent = `状态：文件解析失败 - ${error.message}`;
            currentFile = null;
            excelData = null;
            filePlaceholder.style.display = 'block';
            fileName.style.display = 'none';
            fileInputWrapper.classList.remove('has-file');
        }
    });

    // 启动按钮处理
    startBtn.addEventListener('click', async function() {
        if (!currentFile) {
            alert('请先选择文件！');
            return;
        }

        if (!cellRange.value) {
            alert('请输入单元格区间！');
            return;
        }

        const loopCountValue = parseInt(loopCount.value);
        if (!loopCountValue || loopCountValue < 1) {
            alert('请输入有效的循环次数！');
            return;
        }

        try {
            // 提取指定区间的数据
            const rangeData = extractCellRangeData(excelData, cellRange.value);
            
            if (rangeData.length === 0) {
                alert('指定的单元格区间没有数据！');
                return;
            }

            addDebugLog(`提取了 ${rangeData.length} 条文本内容`);
            if (rangeData.length > 0) {
                const sample1 = rangeData[0].length > 30 ? 
                    rangeData[0].substring(0, 30) + '...' : rangeData[0];
                addDebugLog(`数据样例1: ${sample1}`);
                
                if (rangeData.length > 1) {
                    const sample2 = rangeData[1].length > 30 ? 
                        rangeData[1].substring(0, 30) + '...' : rangeData[1];
                    addDebugLog(`数据样例2: ${sample2}`);
                }
            }
            
            addDebugLog(`设置总循环次数: ${loopCountValue}`);
            addDebugLog(`保留标签页选项: ${keepTabs.checked ? '启用' : '禁用'}`);

            isRunning = true;
            status.textContent = '状态：正在启动...';
            startBtn.disabled = true;
            startBtn.classList.add('running');

            // 发送消息给background script
            const configData = {
                cellRange: cellRange.value,
                loopCount: loopCountValue,
                excelData: rangeData,
                keepTabs: keepTabs.checked
            };
            
            addDebugLog(`发送配置: 总循环次数=${configData.loopCount}, 数据长度=${configData.excelData.length}`);
            addDebugLog(`每个标签页将执行一次操作，总共将打开 ${loopCountValue} 个标签页`);
            
            chrome.runtime.sendMessage({
                action: 'start',
                data: configData
            });
            
            addDebugLog('已发送启动命令');
        } catch (error) {
            addDebugLog(`数据处理失败: ${error.message}`);
            alert(`数据处理失败：${error.message}`);
            return;
        }
    });

    // 停止按钮处理
    stopBtn.addEventListener('click', function() {
        isRunning = false;
        status.textContent = '状态：正在停止...';
        addDebugLog('发送停止命令');
        
        chrome.runtime.sendMessage({
            action: 'stop'
        });
    });

    // 监听来自background script的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'progress') {
            status.textContent = `状态：正在执行第 ${message.current} / ${message.total} 轮`;
            addDebugLog(`进度更新: ${message.current}/${message.total}`);
        } else if (message.type === 'complete') {
            // 单个标签页操作完成
            addDebugLog('当前标签页操作完成');
        } else if (message.type === 'allComplete') {
            // 所有轮次都完成
            isRunning = false;
            status.textContent = '状态：已完成所有操作';
            startBtn.disabled = false;
            startBtn.classList.remove('running');
            addDebugLog('所有标签页的自动化流程完成');
        } else if (message.type === 'stopped') {
            // 用户手动停止
            isRunning = false;
            status.textContent = '状态：已手动停止';
            startBtn.disabled = false;
            startBtn.classList.remove('running');
            addDebugLog('已手动停止自动化流程');
        } else if (message.type === 'error') {
            status.textContent = `状态：错误 - ${message.error}`;
            isRunning = false;
            startBtn.disabled = false;
            startBtn.classList.remove('running');
            addDebugLog(`错误: ${message.error}`);
        } else if (message.type === 'debug') {
            addDebugLog(message.message);
        }
    });

    function updateStatus(text) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = '状态：' + text;
        statusElement.setAttribute('data-full-text', '状态：' + text);
    }
});