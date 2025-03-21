// 检查XLSX库是否已加载
function waitForXLSX() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20; // 最多等待2秒（20 * 100ms）
        
        const checkXLSX = () => {
            attempts++;
            if (typeof XLSX !== 'undefined') {
                console.log("XLSX库已加载");
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error("XLSX库加载超时");
                reject(new Error('XLSX库加载超时'));
            } else {
                console.log(`等待XLSX库加载... (${attempts}/${maxAttempts})`);
                setTimeout(checkXLSX, 100);
            }
        };
        
        // 立即检查一次
        if (typeof XLSX !== 'undefined') {
            console.log("XLSX库已经存在");
            resolve();
        } else {
            console.log("开始等待XLSX库加载");
            checkXLSX();
        }
    });
}

// Excel文件处理函数
async function readExcelFile(file) {
    try {
        // 等待XLSX库加载
        await waitForXLSX();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                try {
                    // 根据文件扩展名选择不同的处理方式
                    const fileExt = file.name.split('.').pop().toLowerCase();
                    
                    if (fileExt === 'csv') {
                        // 处理CSV文件 - 使用XLSX库解析CSV以正确处理单元格内的换行符
                        const text = e.target.result;
                        console.log("读取到的CSV原始内容:", text.substring(0, 200) + "..."); // 记录前200个字符
                        
                        // 使用XLSX库解析CSV文本
                        const workbook = XLSX.read(text, { 
                            type: 'string',
                            raw: true,
                            codepage: 65001 // 使用UTF-8编码
                        });
                        
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        
                        // 将工作表转换为数组，保留单元格内的换行符
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                            header: 1,
                            raw: true, // 保持原始格式
                            defval: '', // 空单元格的默认值
                            blankrows: false // 忽略空行
                        });
                        
                        console.log("解析后的CSV数据:", jsonData);
                        resolve(jsonData);
                    } else {
                        // 处理Excel文件
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { 
                            type: 'array',
                            raw: true,
                            cellText: false,
                            cellDates: true
                        });
                        
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        
                        // 将工作表转换为数组，保留单元格内的换行符
                        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                            header: 1,
                            raw: true, // 保持原始格式
                            defval: '', // 空单元格的默认值
                            blankrows: false // 忽略空行
                        });
                        
                        console.log("解析后的Excel数据:", jsonData);
                        resolve(jsonData);
                    }
                } catch (error) {
                    console.error("文件解析错误:", error);
                    reject(new Error('Excel文件解析失败：' + error.message));
                }
            };
            
            reader.onerror = function(error) {
                console.error("文件读取错误:", error);
                reject(new Error('文件读取失败'));
            };
            
            // 根据文件类型选择不同的读取方式
            const fileExt = file.name.split('.').pop().toLowerCase();
            if (fileExt === 'csv') {
                reader.readAsText(file, 'UTF-8'); // 使用UTF-8编码读取CSV
            } else {
                reader.readAsArrayBuffer(file);
            }
        });
    } catch (error) {
        console.error("XLSX库加载错误:", error);
        throw new Error('XLSX库加载失败：' + error.message);
    }
}

function parseCellRange(range) {
    // 解析单元格范围（例如：A1:A5）
    const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
    if (!match) {
        throw new Error('无效的单元格范围格式');
    }
    
    const [_, startCol, startRow, endCol, endRow] = match;
    return {
        start: {
            col: columnToNumber(startCol),
            row: parseInt(startRow)
        },
        end: {
            col: columnToNumber(endCol),
            row: parseInt(endRow)
        }
    };
}

function columnToNumber(column) {
    // 将列字母转换为数字（A=1, B=2, etc.）
    let result = 0;
    for (let i = 0; i < column.length; i++) {
        result *= 26;
        result += column.charCodeAt(i) - 'A'.charCodeAt(0) + 1;
    }
    return result;
}

function extractCellRangeData(data, range) {
    const { start, end } = parseCellRange(range);
    const result = [];
    
    // 添加调试信息
    console.log("提取数据范围:", {
        startRow: start.row,
        endRow: end.row,
        startCol: start.col,
        endCol: end.col,
        dataLength: data.length
    });
    
    for (let row = start.row - 1; row < end.row; row++) {
        if (data[row] && data[row][start.col - 1] !== undefined) {
            const cellValue = data[row][start.col - 1];
            console.log(`提取单元格 [${row + 1}, ${start.col}] 的值:`, cellValue);
            result.push(cellValue);
        }
    }
    
    // 打印提取的结果
    console.log("提取的数据:", result);
    return result;
} 