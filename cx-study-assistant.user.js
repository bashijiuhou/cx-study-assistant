// ==UserScript==
// @name                cx-study-assistant v3.2.4-qb
// @version             3.2.4
// @description         自建API版 - 使用 api.bashijiuhou.com New-API后端，原作者:Ne-21
// @match               *://*.chaoxing.com/*
// @match               *://*.edu.cn/*
// @tag                 自建API
// @connect api.bashijiuhou.com
// @connect api.zaizhexue.top
// @connect zaizhexue.top
// @run-at              document-end
// @grant               unsafeWindow
// @grant               GM_xmlhttpRequest
// @grant               GM_setValue
// @grant               GM_getValue
// @grant               GM_info
// @grant               GM_getResourceText
// @icon https://api.bashijiuhou.com/logo.png
// @homepage            https://github.com/bashijiuhou/cx-study-assistant
// @updateURL           https://raw.githubusercontent.com/bashijiuhou/cx-study-assistant/feature/question-bank/cx-study-assistant.user.js
// @downloadURL         https://raw.githubusercontent.com/bashijiuhou/cx-study-assistant/feature/question-bank/cx-study-assistant.user.js
// ==/UserScript==


/*********************************自定义配置区******************************************************** */
var setting = {
    showBox: 1,     // 显示脚本浮窗，0为关闭，1为开启，不建议关闭
    maskImg: 1,     // 显示皮卡丘，0为关闭，1为开启，默认开启，无实质作用，只是为了减少睿智问题

    task: 0,        // 只处理任务点任务，0为关闭，1为开启

    video: 1,       // 处理视频，0为关闭，1为开启
    audio: 1,       // 处理音频，0为关闭，1为开启
    rate: 1,        // 视频/音频倍速，默认 1（正常），可在浮窗设置中调整（1/1.25/1.5/2）
    review: 0,      // 复习模式，0为关闭，1为开启可以补挂视频时长

    work: 1,        // 测验自动处理，0为关闭，1为开启，开启将会处理测验，关闭会跳过测验
    time: 2500,     // 答题时间间隔，默认5s=5000
    reqIntervalTime: 0, // 搜题（AI）请求最小间隔(秒)。0 为不节流；高并发可设 1~3 秒，避免被服务端限流
    sub: 0,         // 测验自动提交，0为关闭,1为开启，当没答案时测验将不会提交，如需提交请设置force：1
    force: 0,       // 测验强制提交，0为关闭，1为开启，开启此功能将会强制提交测验（无论作答与否）
    decrypt: 1,     // 字体解密，0为关闭，1为开启，推荐开启，方法来自wyn665817大佬
    redo: 0,        // 重做模式，0为关闭，1为开启，开启后不跳过已答题，重新AI作答覆盖旧答案
    fuzzyMatch: 1,  // 相似度匹配，0为关闭，1为开启，开启后当精确匹配失败时使用相似度匹配选择最接近的选项

    examTurn: 0,     // 考试自动跳转下一题，0为关闭，1为开启
    examTurnTime: 0, // 考试自动跳转下一题随机间隔时间(3-7s)之间，0为关闭，1为开启
    goodStudent: 1,  // 好学生模式,不自动选择答案,仅将单选题和多选题的ABCD加粗
    alterTitle: 1,  //修改题目,将AI回复的答案插入题目中,不建议关闭,AI回复不能完全匹配答案,题目显示答案供手动选择

    autoLogin: 0,   // 自动登录，0为关闭，1为开启，开启此功能请配置登陆配置项
    phone: '',      // 登录配置项：登录手机号/超星号
    password: ''    // 登录配置项：登录密码
}
/************************************************************************************************** */
/*
                  _    _                    _   _              ___  __
     /\          | |  | |                  | \ | |            |__ \/_ |
    /  \   _   _ | |_ | |__    ___   _ __  |  \| |  ___  ______  ) || |
   / /\ \ | | | || __|| '_ \  / _ \ | '__| | . ` | / _ \|______|/ / | |
  / ____ \| |_| || |_ | | | || (_) || |    | |\  ||  __/       / /_ | |
 /_/    \_\\__,_| \__||_| |_| \___/ |_|    |_| \_| \___|      |____||_|

  TG：https://t.me/+REKHQoWVJh45MDg1   Date：20240914

*/
/************************************************************************************************** */


var _w = unsafeWindow,
    _l = location,
    _d = _w.document,
    $ = _w.jQuery || top.jQuery,
    md5 = md5 || window.md5,
    UE = _w.UE,
    Swal = Swal || window.Swal;

// 多域名候选及自动测速选择
// API 配置 — 使用自建 New-API
var _host = "https://api.bashijiuhou.com";
var _apiKey = "sk-1Pkx8xT2qbnjMVjGOa5RRNroihdd45g2FndkhoVfR4Vi9Rkv";
var _defaultModel = "deepseek-ai/deepseek-v4-flash";








var _mlist, _defaults, _domList, $subBtn, $saveBtn, $frame_c, $okBtn;
var _currentQuestionMeta = null;
// AI 搜题请求节流：记录下一次可发起请求的时间戳（ms），由 getAnswer 内部维护
var _ne21NextAiAllowedAt = 0;

$('.navshow').find('a:contains(体验新版)')[0] ? $('.navshow').find('a:contains(体验新版)')[0].click() : '';

setting.decrypt ? decryptFont() : '';

function waitForJQueryElement(selector) {
    return new Promise(function (resolve) {
        var interval = setInterval(function () {
            if ($(selector).length > 0) {
                clearInterval(interval);
                resolve();
            }
        }, 500);
    });
}

if (_l.hostname == 'i.mooc.chaoxing.com' || _l.hostname == "i.chaoxing.com") {
    // 
} else if (_l.pathname == '/login' && setting.autoLogin) {
    showBox()
    waitForJQueryElement('#phone').then(function () { autoLogin() });
} else if (_l.pathname.includes('/mycourse/studentstudy')) {
    showBox()
    $('#ne-21log', window.parent.document).html('初始化完毕！')
    setupAntiSleep()
    setupAutoRefresh()
} else if (_l.pathname.includes('/knowledge/cards')) {
    setupAntiSleep()
    var params = getTaskParams()
    var parsedParams = null;
    if (params && params !== '$mArg') {
        try { parsedParams = $.parseJSON(params); } catch (e) { parsedParams = null; }
    }
    if (!parsedParams || !parsedParams['attachments'] || parsedParams['attachments'].length <= 0) {
        logger('无任务点可处理，即将跳转页面', 'red')
        toNext()
    } else {
        waitForJQueryElement('.wrap .ans-cc .ans-attach-ct').then(function () {
            top.checkJob ? top.checkJob = () => false : true
            _domList = []
            _mlist = parsedParams['attachments']
            _defaults = parsedParams['defaults']
            $.each($('.wrap .ans-cc .ans-attach-ct'), (i, t) => {
                _domList.push($(t).find('iframe'))
            })
            missonStart()
        });
    }
} else if (_l.pathname.includes('/exam/test/reVersionTestStartNew')) {
    showBox()
    waitForJQueryElement('.mark_table .whiteDiv').then(function () { missonExam() });
} else if (_l.pathname.includes('/mooc2/exam/preview')) {
    showBox()
    waitForJQueryElement('.mark_table .questionLi').then(function () { missonExamPreview() });
} else if (_l.pathname.includes('/mooc2/work/dowork')) {
    showBox()
    waitForJQueryElement('.mark_table form').then(function () { missonHomeWork() });
} else if (_l.pathname.includes('/work/phone/doHomeWork')) {
    var _oldal = _w.alert
    _w.alert = function (msg) {
        if (msg == '保存成功') {
            return;
        }
        return _oldal(msg)
    }
    var _oldcf = _w.confirm
    _w.confirm = function (msg) {
        if (msg.includes('确认提交') || msg.includes('未做完')) {
            return true
        }
        return _oldcf(msg)
    }
} else if (_l.pathname.includes('/mooc2/exam/exam-list')) {
    // Swal.fire('ChatGPT学习通助手提示', '注意：请谨慎使用脚本考试，开始考试之前请确保该账号已激活脚本。', 'info')
} else if (_l.pathname == '/mycourse/stu') {
    checkBrowser()
} else {
    // console.log(_l.pathname)
}

function checkBrowser() {
    var userAgent = navigator.userAgent
    if (userAgent.indexOf('Chrome') == -1 || GM_info.scriptHandler != 'ScriptCat') {
        // 非推荐环境，但不弹出警告
        // Swal.fire('您使用的不是推荐运行环境(edge、谷歌浏览器+ScriptCat)，脚本运行可能会发生问题.')
    }
}

function parseUrlParams() {
    let query = window.location.search.substring(1);
    let vars = query.split("&");
    let _p = {}
    for (let i = 0; i < vars.length; i++) {
        let pair = vars[i].split("=");
        _p[pair[0]] = pair[1]
    }
    return _p
}


function updateLocalStorage(event) {
    var checkbox = event.target;
    localStorage.setItem(checkbox.id, checkbox.checked);
}

// 判断是否开启重做模式（不跳过已答题）
function isRedoMode() {
    var stored = localStorage.getItem('GPTJsSetting.redo');
    if (stored !== null) return stored === 'true';
    return !!setting.redo;
}

// 判断是否开启相似度匹配
function isFuzzyMatchEnabled() {
    var stored = localStorage.getItem('GPTJsSetting.fuzzyMatch');
    if (stored !== null) return stored === 'true';
    return !!setting.fuzzyMatch;
}

// 计算两个字符串的相似度（基于Levenshtein距离），返回 0~1 之间的值，1表示完全相同
function stringSimilarity(s1, s2) {
    if (!s1 && !s2) return 1;
    if (!s1 || !s2) return 0;
    // 统一小写、去除首尾空白
    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();
    if (s1 === s2) return 1;
    var len1 = s1.length, len2 = s2.length;
    if (len1 === 0 || len2 === 0) return 0;
    // Levenshtein距离 - 空间优化版
    var prev = [], curr = [];
    for (var j = 0; j <= len2; j++) prev[j] = j;
    for (var i = 1; i <= len1; i++) {
        curr[0] = i;
        for (var j = 1; j <= len2; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                curr[j] = prev[j - 1];
            } else {
                curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
            }
        }
        var tmp = prev; prev = curr; curr = tmp;
    }
    var maxLen = Math.max(len1, len2);
    return 1 - prev[len2] / maxLen;
}

// 在选项数组中查找与AI回答最相似的选项，返回索引；相似度低于阈值时返回-1
// threshold 默认 0.5（50%相似度）
function findBestFuzzyMatch(optionTexts, aiAnswer, threshold) {
    if (!isFuzzyMatchEnabled()) return -1;
    if (!aiAnswer || !optionTexts || optionTexts.length === 0) return -1;
    threshold = (threshold !== undefined) ? threshold : 0.5;
    var bestIndex = -1, bestScore = 0;
    for (var i = 0; i < optionTexts.length; i++) {
        var score = stringSimilarity(optionTexts[i], aiAnswer);
        if (score > bestScore) {
            bestScore = score;
            bestIndex = i;
        }
    }
    if (bestScore >= threshold) {
        logger('相似度匹配: 最佳匹配项[' + bestIndex + '] 相似度=' + (bestScore * 100).toFixed(1) + '%', 'blue');
        return bestIndex;
    }
    logger('相似度匹配: 所有选项相似度均低于阈值(' + (threshold * 100) + '%)，最高=' + (bestScore * 100).toFixed(1) + '%', 'orange');
    return -1;
}

// 多选题模糊匹配：AI返回的答案用'|'分割后，对每个答案片段在选项中找最佳匹配
// 返回匹配到的选项索引数组
function findFuzzyMatchMultiple(optionTexts, aiAnswer, threshold) {
    if (!isFuzzyMatchEnabled()) return [];
    if (!aiAnswer || !optionTexts || optionTexts.length === 0) return [];
    threshold = (threshold !== undefined) ? threshold : 0.5;
    var parts = aiAnswer.split('|');
    var matched = [];
    for (var p = 0; p < parts.length; p++) {
        var part = parts[p].trim();
        if (!part) continue;
        var bestIndex = -1, bestScore = 0;
        for (var i = 0; i < optionTexts.length; i++) {
            var score = stringSimilarity(optionTexts[i], part);
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }
        if (bestScore >= threshold && matched.indexOf(bestIndex) === -1) {
            matched.push(bestIndex);
            logger('相似度匹配(多选): "' + part + '" → 选项[' + bestIndex + '] 相似度=' + (bestScore * 100).toFixed(1) + '%', 'blue');
        }
    }
    return matched;
}

// 读取播放倍速：优先 localStorage（UI 设置），否则回退 setting.rate；范围 (0, 16]
function getRate() {
    var stored = localStorage.getItem('GPTJsSetting.rate');
    var n = stored !== null ? parseFloat(stored) : (setting.rate || 1);
    if (!isFinite(n) || n <= 0) n = 1;
    if (n > 16) n = 16;
    return n;
}

// 统一判断题答案解析：将AI回答归一为 'true' / 'false' / null
// 解决旧版 string.indexOf 子串匹配导致 "正确的"、"True"、"对的" 等变体匹配失败的问题
function parseJudgeAnswer(agrs) {
    if (!agrs) return null;
    var s = agrs.replace(/[。，.,!！\s]/g, '').toLowerCase();
    var trueWords = ['正确', '是', '对', '√', 't', 'true', 'ri', 'right', 'yes'];
    var falseWords = ['错误', '否', '错', '×', 'f', 'false', 'wr', 'wrong', 'no'];
    // 精确匹配
    for (var i = 0; i < trueWords.length; i++) {
        if (s === trueWords[i]) return 'true';
    }
    for (var i = 0; i < falseWords.length; i++) {
        if (s === falseWords[i]) return 'false';
    }
    // 包含匹配（优先判断"错"避免"正确的"误判——先检查否定词）
    for (var i = 0; i < falseWords.length; i++) {
        if (s.indexOf(falseWords[i]) !== -1) return 'false';
    }
    for (var i = 0; i < trueWords.length; i++) {
        if (s.indexOf(trueWords[i]) !== -1) return 'true';
    }
    return null;
}

// 在选项列表中查找"正确/对"或"错误/错"对应的索引
function findJudgeOptionIndex(optionTexts, isTrue) {
    var trueWords = ['正确', '是', '对', '√', 'T', 'ri'];
    var falseWords = ['错误', '否', '错', '×', 'F', 'wr'];
    var words = isTrue ? trueWords : falseWords;
    for (var i = 0; i < optionTexts.length; i++) {
        var t = optionTexts[i];
        for (var j = 0; j < words.length; j++) {
            if (t.indexOf(words[j]) !== -1) return i;
        }
    }
    return -1;
}

// 查找文本作答类题目（简答/写作/翻译/名词解释/论述题/计算题/材料题等）的 textarea。
// 按特异性优先级尝试多个选择器，最后兜底为任意 textarea。
function findAnswerTextareas($container) {
    if (!$container || $container.length === 0) return $();
    // 1) 标准 UEditor 下层 textarea，name="answerEditor{questionId}{i}"
    var $eles = $container.find('textarea[name^="answerEditor"]');
    if ($eles.length > 0) return $eles;
    // 2) 旧版/兼容路径
    $eles = $container.find('.subEditor textarea, .Answer .divText textarea, .stem_answer textarea, .edui-editor textarea');
    if ($eles.length > 0) return $eles;
    // 3) 兜底：容器内任意 textarea
    return $container.find('textarea');
}

function showBox() {
    //公告&充值
    if (setting.showBox && top.document.querySelector('#ne-21notice') == undefined) {
        // 注入样式（仅一次）
        if (!top.document.getElementById('ne-21style')) {
            var styleEl = top.document.createElement('style');
            styleEl.id = 'ne-21style';
            styleEl.textContent = `
            /* === Liquid Glass UI (iOS 26 style, neutral light glass) === */
            #ne-21box{position:fixed;top:5%;right:16%;width:340px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;color:rgba(15,23,42,.86);background:linear-gradient(180deg,rgba(255,255,255,.62) 0%,rgba(241,245,249,.55) 100%);backdrop-filter:blur(22px) saturate(180%) brightness(1.04);-webkit-backdrop-filter:blur(22px) saturate(180%) brightness(1.04);border:1px solid rgba(255,255,255,.65);border-radius:22px;box-shadow:0 0 0 1px rgba(15,23,42,.09),0 24px 48px -12px rgba(15,23,42,.45),0 10px 26px -8px rgba(15,23,42,.3),inset 0 1px 0 rgba(255,255,255,.9),inset 0 -1px 0 rgba(15,23,42,.06);overflow:hidden;transition:opacity .25s ease,transform .25s ease;animation:ne21-in .4s cubic-bezier(.2,.9,.3,1) both;}
            @keyframes ne21-in{from{opacity:0;transform:translateY(-8px) scale(.98)}to{opacity:1;transform:none}}
            #ne-21box .ne21-header{position:relative;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:linear-gradient(180deg,rgba(255,255,255,.72) 0%,rgba(248,250,252,.35) 100%);color:rgba(15,23,42,.92);border-bottom:1px solid rgba(15,23,42,.07);cursor:move;user-select:none;}
            #ne-21box .ne21-header::after{content:'';position:absolute;left:14px;right:14px;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);pointer-events:none;}
            #ne-21box.ne21-collapsed .ne21-body{display:none;}
            #ne-21box.ne21-collapsed .ne21-header{border-bottom:none;}
            #ne-21box.ne21-collapsed .ne21-header::after{display:none;}
            #ne-21box .ne21-title{display:flex;align-items:center;gap:9px;font-weight:600;font-size:14px;letter-spacing:.3px;margin:0;color:inherit;}
            #ne-21box .ne21-dot{width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.98),rgba(255,255,255,.5) 55%,rgba(15,23,42,.18) 100%);box-shadow:0 0 0 0 rgba(255,255,255,.7),inset 0 1px 1px rgba(255,255,255,.95);animation:ne21-pulse 2s infinite;flex-shrink:0;}
            @keyframes ne21-pulse{0%{box-shadow:0 0 0 0 rgba(255,255,255,.7),inset 0 1px 1px rgba(255,255,255,.95)}70%{box-shadow:0 0 0 8px rgba(255,255,255,0),inset 0 1px 1px rgba(255,255,255,.95)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0),inset 0 1px 1px rgba(255,255,255,.95)}}
            #ne-21box #ne-21close{margin:0;width:24px;height:24px;padding:0;display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;line-height:1;color:rgba(15,23,42,.7);cursor:pointer;border:1px solid rgba(255,255,255,.65);border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 0 1px rgba(15,23,42,.06),inset 0 1px 0 rgba(255,255,255,.8),0 1px 2px rgba(15,23,42,.08);transition:background .2s,color .2s,transform .15s;user-select:none;font-family:inherit;}
            #ne-21box #ne-21close:hover{background:rgba(255,255,255,.78);color:rgba(15,23,42,.92);box-shadow:0 0 0 1px rgba(15,23,42,.08),inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(15,23,42,.1);}
            #ne-21box #ne-21close:active{transform:scale(.92);}
            #ne-21box .ne21-body{padding:14px 16px 16px;}
            #ne-21box #ne-21notice{border-top:none!important;margin:0 0 6px!important;overflow:visible;}
            #ne-21box .ne21-uid{display:flex;align-items:center;gap:6px;color:rgba(15,23,42,.62);font-size:12px;margin-bottom:10px;padding:8px 12px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.7);border-radius:12px;box-shadow:0 0 0 1px rgba(15,23,42,.05),inset 0 1px 0 rgba(255,255,255,.75),0 1px 2px rgba(15,23,42,.05);}
            #ne-21box .ne21-uid b{color:rgba(15,23,42,.92);font-weight:600;}
            #ne-21box .ne21-row{display:flex;gap:8px;align-items:center;}
            #ne-21box .ne21-btn{display:inline-flex;align-items:center;justify-content:center;padding:7px 14px;font-size:12px;font-weight:500;border-radius:14px;cursor:pointer;border:1px solid rgba(255,255,255,.7);transition:transform .15s,box-shadow .2s,background .2s,color .2s;white-space:nowrap;}
            #ne-21box .ne21-btn-primary{color:rgba(15,23,42,.92);background:rgba(255,255,255,.72);box-shadow:0 0 0 1px rgba(15,23,42,.07),inset 0 1px 0 rgba(255,255,255,.95),inset 0 -6px 12px -6px rgba(15,23,42,.08),0 4px 10px -2px rgba(15,23,42,.22);}
            #ne-21box .ne21-btn-primary:hover{transform:translateY(-1px);background:rgba(255,255,255,.88);box-shadow:0 0 0 1px rgba(15,23,42,.09),inset 0 1px 0 rgba(255,255,255,1),inset 0 -6px 12px -6px rgba(15,23,42,.1),0 6px 14px -2px rgba(15,23,42,.28);}
            #ne-21box .ne21-btn-secondary{color:rgba(15,23,42,.78);background:rgba(255,255,255,.45);box-shadow:0 0 0 1px rgba(15,23,42,.06),inset 0 1px 0 rgba(255,255,255,.75),0 1px 2px rgba(15,23,42,.06);}
            #ne-21box .ne21-btn-secondary:hover{background:rgba(255,255,255,.65);color:rgba(15,23,42,.92);box-shadow:0 0 0 1px rgba(15,23,42,.08),inset 0 1px 0 rgba(255,255,255,.85),0 2px 4px rgba(15,23,42,.08);}
            #ne-21box .ne21-btn:active{transform:translateY(0) scale(.98);}
            #ne-21box #modelSelect{flex:1;min-width:0;padding:7px 10px;font-size:12px;border-radius:14px;border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.55);color:rgba(15,23,42,.86);cursor:pointer;outline:none;box-shadow:0 0 0 1px rgba(15,23,42,.06),inset 0 1px 0 rgba(255,255,255,.8);transition:background .2s,box-shadow .2s;}
            #ne-21box #modelSelect:hover{background:rgba(255,255,255,.7);}
            #ne-21box #modelSelect:focus{background:rgba(255,255,255,.75);box-shadow:0 0 0 1px rgba(15,23,42,.08),inset 0 1px 0 rgba(255,255,255,.85),0 0 0 4px rgba(15,23,42,.1);}
            #ne-21box .ne21-select{padding:5px 8px;font-size:12px;border-radius:10px;border:1px solid rgba(255,255,255,.65);background:rgba(255,255,255,.5);color:rgba(15,23,42,.86);cursor:pointer;outline:none;min-width:80px;flex-shrink:0;box-shadow:0 0 0 1px rgba(15,23,42,.05),inset 0 1px 0 rgba(255,255,255,.75);transition:background .2s,box-shadow .2s;}
            #ne-21box .ne21-select:hover{background:rgba(255,255,255,.7);}
            #ne-21box .ne21-select:focus{background:rgba(255,255,255,.72);box-shadow:0 0 0 1px rgba(15,23,42,.08),inset 0 1px 0 rgba(255,255,255,.82),0 0 0 3px rgba(15,23,42,.06);}
            #ne-21box #userInfo{margin:10px 0 0;padding:10px 12px;background:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.7);border-radius:12px;box-shadow:0 0 0 1px rgba(15,23,42,.05),inset 0 1px 0 rgba(255,255,255,.75);font-size:12px;color:rgba(15,23,42,.66);line-height:1.6;overflow:hidden;}
            #ne-21box #userInfo:empty{display:none;}
            #ne-21box #userInfo b{color:rgba(15,23,42,.9);font-weight:600;}
            #ne-21box #moreSettings{padding:4px 14px;background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.65);border-radius:14px;box-shadow:0 0 0 1px rgba(15,23,42,.05),inset 0 1px 0 rgba(255,255,255,.7);margin:10px 0 0;}
            #ne-21box #moreSettings label{display:flex;flex-direction:row-reverse;align-items:center;justify-content:space-between;margin:0;padding:8px 2px;font-size:12px;color:rgba(15,23,42,.78);cursor:pointer;user-select:none;line-height:1.4;}
            #ne-21box #moreSettings label + label{border-top:1px dashed rgba(15,23,42,.1);}
            #ne-21box #moreSettings input[type=checkbox]{appearance:none;-webkit-appearance:none;width:34px;height:20px;border:1px solid rgba(15,23,42,.08);border-radius:20px;cursor:pointer;position:relative;transition:background .25s,box-shadow .25s;background:rgba(15,23,42,.16);box-shadow:inset 0 1px 2px rgba(15,23,42,.12);margin:0 0 0 10px;flex-shrink:0;}
            #ne-21box #moreSettings input[type=checkbox]::before{content:'';position:absolute;top:1px;left:1px;width:16px;height:16px;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,1),rgba(255,255,255,.85));box-shadow:0 1px 3px rgba(15,23,42,.25),inset 0 1px 0 rgba(255,255,255,1);transition:transform .25s cubic-bezier(.2,.9,.3,1);}
            #ne-21box #moreSettings input[type=checkbox]:hover{background:rgba(15,23,42,.24);}
            #ne-21box #moreSettings input[type=checkbox]:checked{background:rgba(255,255,255,.78);border-color:rgba(15,23,42,.1);box-shadow:inset 0 1px 0 rgba(255,255,255,.95),inset 0 -2px 4px rgba(15,23,42,.08),0 0 0 1px rgba(15,23,42,.06);}
            #ne-21box #moreSettings input[type=checkbox]:checked:hover{background:rgba(255,255,255,.92);}
            #ne-21box #moreSettings input[type=checkbox]:checked::before{transform:translateX(14px);}
            #ne-21box #moreSettings p{display:none;}
            #ne-21box #ne-21thinking{display:none!important;}
            @keyframes ne21-spin{to{transform:rotate(360deg)}}
            @keyframes ne21-dot{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}
            #ne-21box #ne-21log .ne21-log-spinner{display:inline-block;width:9px;height:9px;margin-right:5px;border:1.5px solid rgba(15,23,42,.18);border-top-color:rgba(15,23,42,.7);border-radius:50%;vertical-align:-1px;animation:ne21-spin .8s linear infinite;}
            #ne-21box #ne-21log .ne21-log-dots{display:inline-flex;gap:2px;margin-left:3px;vertical-align:1px;}
            #ne-21box #ne-21log .ne21-log-dots i{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.65;animation:ne21-dot 1.2s infinite ease-in-out both;}
            #ne-21box #ne-21log .ne21-log-dots i:nth-child(2){animation-delay:.16s;}
            #ne-21box #ne-21log .ne21-log-dots i:nth-child(3){animation-delay:.32s;}
            #ne-21box #ne-21log{max-height:140px;overflow-y:auto;margin:12px 0 0;padding:10px 12px;background:rgba(15,23,42,.06);border:1px solid rgba(255,255,255,.55);border-radius:14px;box-shadow:0 0 0 1px rgba(15,23,42,.06),inset 0 1px 0 rgba(255,255,255,.6),inset 0 0 16px rgba(15,23,42,.06);font-family:"SF Mono","Cascadia Code",Consolas,Menlo,monospace;font-size:11px;line-height:1.6;color:rgba(15,23,42,.78);}
            #ne-21box #ne-21log:empty{display:none;}
            #ne-21box #ne-21log::-webkit-scrollbar{width:5px;}
            #ne-21box #ne-21log::-webkit-scrollbar-thumb{background:rgba(15,23,42,.2);border-radius:4px;}
            #ne-21box #ne-21log::-webkit-scrollbar-thumb:hover{background:rgba(15,23,42,.32);}
            #ne-21box #ne-21log p{margin:0;padding:2px 0;word-break:break-all;}
            #ne-21box #ne-21log hr{display:none;}
            #ne-21box #ne-21log .ne21-time{color:rgba(15,23,42,.4);margin-right:6px;}
            `;
            top.document.head.appendChild(styleEl);
        }
        var box_html = `
            <div id="ne-21box">
                <div class="ne21-header" title="按住标题栏可拖动 / 点击右侧按钮收起">
                    <h3 class="ne21-title"><span class="ne21-dot"></span>ChatGPT 学习通助手</h3>
                    <button id="ne-21close" type="button" aria-label="收起">−</button>
                </div>
                <div class="ne21-body">
                    <div id="ne-21notice"></div>
                    <div id="userInfo"></div>
                    <div id="moreSettings" style="display:none;">
                        <label><select id="GPTJsSetting.rate" class="ne21-select"><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select>视频/音频倍速</label>
                        <label title="两次 AI 搜题请求之间的最小间隔（秒）。0 为不节流；高并发整卷预览、小号被限流时可设 1~3">
                            <input type="number" id="GPTJsSetting.reqIntervalTime" class="ne21-select" min="0" max="60" step="1" style="min-width:56px;width:56px;padding:5px 8px;">搜题间隔 (秒)
                        </label>
                        <p></p>
                        <label><input type="checkbox" id="GPTJsSetting.sub">测验自动提交</label>
                        <label><input type="checkbox" id="GPTJsSetting.force">测验强制提交</label>
                        <label><input type="checkbox" id="GPTJsSetting.examTurn">考试自动跳转</label>
                        <p></p>
                        <label><input type="checkbox" id="GPTJsSetting.goodStudent">答案加粗不选择</label>
                        <label><input type="checkbox" id="GPTJsSetting.alterTitle" checked>答案插入题目后</label>
                        <p></p>
                        <label><input type="checkbox" id="GPTJsSetting.redo">重做模式 (不跳过已答题)</label>
                        <label><input type="checkbox" id="GPTJsSetting.fuzzyMatch" checked>相似度匹配 (答案模糊匹配)</label>
                    </div>
                    <div id="ne-21thinking">
                        <div class="ne21-thinking-spinner"></div>
                        <span class="ne21-thinking-text">AI 思考中<span class="ne21-thinking-dots"><i></i><i></i><i></i></span></span>
                    </div>
                    <div id="ne-21log"></div>
                </div>
            </div>
        `;
        $(box_html).appendTo('body');

        // 恢复保存的位置与收起/展开状态
        (function () {
            var $box = $('#ne-21box');
            // 恢复位置
            try {
                var savedPos = localStorage.getItem('GPTJsSetting.boxPosition');
                if (savedPos) {
                    var pos = JSON.parse(savedPos);
                    if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
                        var vw = window.innerWidth, vh = window.innerHeight;
                        var w = $box.outerWidth() || 340;
                        // 约束：避免恢复后跑到视窗外不可见
                        var nx = Math.max(40 - w, Math.min(pos.left, vw - 40));
                        var ny = Math.max(0, Math.min(pos.top, vh - 40));
                        $box.css({ left: nx + 'px', top: ny + 'px', right: 'auto' });
                    }
                }
            } catch (_) { /* empty */ }
            // 恢复收起/展开状态
            if (localStorage.getItem('GPTJsSetting.boxCollapsed') === 'true') {
                $box.addClass('ne21-collapsed');
                $('#ne-21close').text('+').attr('aria-label', '展开');
            }
        })();

        // 收起/展开按钮：切换 .ne21-collapsed，按钮文本在 − / + 之间切换
        $('#ne-21close').on('mousedown', function (e) {
            e.stopPropagation(); // 避免触发标题栏拖动
        }).on('click', function (e) {
            e.stopPropagation();
            var collapsed = $('#ne-21box').toggleClass('ne21-collapsed').hasClass('ne21-collapsed');
            $(this).text(collapsed ? '+' : '−');
            $(this).attr('aria-label', collapsed ? '展开' : '收起');
            // 持久化收起/展开状态
            try { localStorage.setItem('GPTJsSetting.boxCollapsed', collapsed ? 'true' : 'false'); } catch (_) { /* empty */ }
        });
        // 标题栏拖动：拖动结束后写入 localStorage，刷新后保持上次位置
        (function () {
            var $box = $('#ne-21box');
            var $header = $box.find('.ne21-header');
            var dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
            $header.on('mousedown', function (e) {
                if (e.which !== 1) return; // 仅响应鼠标左键
                if ($(e.target).closest('#ne-21close').length) return; // 点在按钮上不拖动
                dragging = true;
                var rect = $box[0].getBoundingClientRect();
                startX = e.clientX;
                startY = e.clientY;
                startLeft = rect.left;
                startTop = rect.top;
                // 清空 right，把 left/top 改为像素值，避免与默认 left:66% 计算冲突
                $box.css({ left: startLeft + 'px', top: startTop + 'px', right: 'auto' });
                $('body').css('user-select', 'none');
                e.preventDefault();
            });
            $(document).on('mousemove.ne21drag', function (e) {
                if (!dragging) return;
                var nx = startLeft + (e.clientX - startX);
                var ny = startTop + (e.clientY - startY);
                var w = $box.outerWidth();
                var vw = window.innerWidth;
                var vh = window.innerHeight;
                // 约束：保留至少 40px 标题栏在视窗内，便于回拉
                nx = Math.max(40 - w, Math.min(nx, vw - 40));
                ny = Math.max(0, Math.min(ny, vh - 40));
                $box.css({ left: nx + 'px', top: ny + 'px' });
            }).on('mouseup.ne21drag', function () {
                if (!dragging) return;
                dragging = false;
                $('body').css('user-select', '');
                // 持久化位置
                try {
                    var rect = $box[0].getBoundingClientRect();
                    localStorage.setItem('GPTJsSetting.boxPosition', JSON.stringify({ left: rect.left, top: rect.top }));
                } catch (_) { /* empty */ }
            });
        })();

        // 设置面板切换 + 复选框监听器
        (function () {
            var moreSettings = document.getElementById('moreSettings');
            var userInfo = document.getElementById('userInfo');
            if (!moreSettings || !userInfo) return;

            // #moreSettingsBtn 由 $('#ne-21notice').html(...) 在后面动态注入，
            // 此时还不存在，且每次 showBox() 都会被重建，因此使用事件委托。
            var isSettingsVisible = false;
            $('#ne-21box').on('click', '#moreSettingsBtn', function () {
                userInfo.style.display = isSettingsVisible ? 'block' : 'none';
                moreSettings.style.display = isSettingsVisible ? 'none' : 'block';
                this.textContent = isSettingsVisible ? '设置' : '返回';
                isSettingsVisible = !isSettingsVisible;
            });

            // 修改题目默认开启（仅初始化一次，避免 forEach 内重复执行）
            if (localStorage.getItem('GPTJsSetting.alterTitle') === null) {
                localStorage.setItem('GPTJsSetting.alterTitle', 'true');
            }
            // 相似度匹配默认开启
            if (localStorage.getItem('GPTJsSetting.fuzzyMatch') === null) {
                localStorage.setItem('GPTJsSetting.fuzzyMatch', 'true');
            }

            ['sub', 'force', 'examTurn', 'goodStudent', 'alterTitle', 'redo', 'fuzzyMatch'].forEach(function (settingId) {
                var checkbox = document.getElementById('GPTJsSetting.' + settingId);
                if (!checkbox) return;
                checkbox.addEventListener('change', updateLocalStorage);
                checkbox.checked = localStorage.getItem('GPTJsSetting.' + settingId) === 'true';
            });

            // 倍速下拉：恢复上次选择并持久化
            var rateSelect = document.getElementById('GPTJsSetting.rate');
            if (rateSelect) {
                rateSelect.value = localStorage.getItem('GPTJsSetting.rate') || '1';
                rateSelect.addEventListener('change', function () {
                    localStorage.setItem('GPTJsSetting.rate', rateSelect.value);
                });
            }
            // 搜题间隔输入框：恢复上次值并持久化（范围 0~60 秒）
            var reqIntervalInput = document.getElementById('GPTJsSetting.reqIntervalTime');
            if (reqIntervalInput) {
                var savedInterval = localStorage.getItem('GPTJsSetting.reqIntervalTime');
                reqIntervalInput.value = (savedInterval !== null && isFinite(parseInt(savedInterval, 10)))
                    ? savedInterval
                    : String(setting.reqIntervalTime || 0);
                reqIntervalInput.addEventListener('change', function () {
                    var v = parseInt(reqIntervalInput.value, 10);
                    if (!isFinite(v) || v < 0) v = 0;
                    if (v > 60) v = 60;
                    reqIntervalInput.value = String(v);
                    localStorage.setItem('GPTJsSetting.reqIntervalTime', String(v));
                });
            }
        })();
    } else {
        $('#ne-21log', window.parent.document).html('')
    }
    let _u = getCk('_uid') || getCk('UID')
    $('#ne-21notice').html(`
        <div class="ne21-uid">学习通账号 UID：<b>${_u || '-'}</b></div>
        <div class="ne21-row">
            <a target="_blank" href="${_host}?uid=${_u}" style="text-decoration:none;flex:0 0 auto;">
                <button class="ne21-btn ne21-btn-primary">充值</button>
            </a>
            <select id="modelSelect">
                <option value="deepseek-default">DeepSeek Default (默认)</option>
                <option value="deepseek-ai/deepseek-v4-flash">DeepSeek V4 Flash (推荐 ⚡)</option>
                <option value="deepseek-ai/deepseek-v4-pro">DeepSeek V4 Pro (高质量 🎯)</option>
                <option value="moonshotai/kimi-k2.6">Kimi K2.6 (长文本)</option>
                <option value="z-ai/glm-5.1">GLM-5.1 (智谱)</option>
                <option value="minimaxai/minimax-m2.7">MiniMax M2.7</option>
                <option value="google/gemma-3-12b-it">Gemma 3 12B (轻量)</option>
            </select>
            <button id="moreSettingsBtn" class="ne21-btn ne21-btn-secondary">设置</button>
        </div>
    `);

    // 同步恢复上次选中的模型，避免等 window.onload 造成的闪烁
    // 旧模型名映射（向后兼容）
    var _modelCompat = {
        'deepseek-expert': 'deepseek-ai/deepseek-v4-pro',
        'deepseek-reasoner': 'moonshotai/kimi-k2.6'
    };
    var lastSelectedModel = localStorage.getItem('GPTJsSetting.model') || _defaultModel;
    lastSelectedModel = _modelCompat[lastSelectedModel] || lastSelectedModel;
    $('#modelSelect').val(lastSelectedModel);
    // 同步绑定 change 监听（命名空间避免 showBox 重入时重复绑定）
    $('#modelSelect').off('change.gptjsModel').on('change.gptjsModel', function () {
        localStorage.setItem('GPTJsSetting.model', $(this).val());
    });

    //公告&积分
    
}

var _ne21LogColorMap = {
    red: '#dc2626', green: '#059669', blue: '#2563eb',
    yellow: '#ca8a04', orange: '#ea580c', purple: '#7c3aed',
    pink: '#db2777', gray: '#64748b', grey: '#64748b'
}
function logger(str, color) {
    var _time = new Date().toLocaleTimeString()
    var c = _ne21LogColorMap[color] || color || '#334155'
    var $p = $('<p><span class="ne21-time">[' + _time + ']</span><span class="ne21-msg" style="color:' + c + ';">' + str + '</span></p>')
    $('#ne-21log', window.parent.document).prepend($p)
    return $p
}
// 原地更新一条已存在的日志(由 logger 返回的 jQuery <p> 元素)。
// 用于把 "AI 思考中..." 占位行原地替换为答案/错误提示, 避免反复出现/消失。
function updateLogEntry($p, str, color) {
    if (!$p || !$p.length) return
    var c = _ne21LogColorMap[color] || color || '#334155'
    $p.find('.ne21-msg').css('color', c).html(str)
}

function getStr(str, start, end) {
    let res = str.match(new RegExp(`${start}(.*?)${end}`))
    return res ? res[1] : null
}

function getTaskParams() {
    try {
        var _iframeScripts = _d.scripts,
            _p = null;
        for (let i = 0; i < _iframeScripts.length; i++) {
            if (_iframeScripts[i].innerHTML.indexOf('mArg = "";') != -1 && _iframeScripts[i].innerHTML.indexOf('==UserScript==') == -1) {
                _p = getStr(_iframeScripts[i].innerHTML.replace(/\s/g, ""), 'try{mArg=', ';}catch');
                return _p
            }
        }
        return _p
    } catch (e) {
        return null
    }

}

function getCk(name) {
    return document.cookie.match(`[;\\s+]?${name}=([^;]*)`)?.pop();
}


function autoLogin() {
    logger('用户已设置自动登录', 'green')
    if (setting.phone.length <= 0 || setting.password.length <= 0) {
        logger('用户未设置登录信息', 'red')
        return
    }
    setTimeout(() => {
        $('#phone').val(setting.phone)
        $('#pwd').val(setting.password)
        $('#loginBtn').click()
    }, 3000)
}

function toNext() {
    refreshCourseList().then((res) => {
        // 检测当前课时是否还有未完成的页面（兼容多种 DOM 结构）
        // 返回 { activeIndex, total, hasNext, tabs } 或 null
        function detectSubTabPosition() {
            try {
                // 兼容现代版（.prev_ul）、旧版（#prev_tab）、备用版（#prevTabBox）
                var selectors = ['#prev_tab > li', '.prev_ul > li', '#prevTabBox > li'];
                for (var i = 0; i < selectors.length; i++) {
                    var nodes = top.document.querySelectorAll(selectors[i]);
                    if (!nodes || nodes.length === 0) continue;
                    var tabs = Array.prototype.slice.call(nodes);
                    var activeIdx = -1;
                    for (var j = 0; j < tabs.length; j++) {
                        if (tabs[j].classList && tabs[j].classList.contains('active')) {
                            activeIdx = j;
                            break;
                        }
                    }
                    if (activeIdx === -1) continue;
                    return {
                        activeIndex: activeIdx,
                        total: tabs.length,
                        hasNext: activeIdx < tabs.length - 1,
                        tabs: tabs
                    };
                }
                // 兼容风格：span.currents ~ span（当前页指示器后还有兄弟节点表示存在下一页）
                var currents = top.document.querySelector('span.currents');
                if (currents) {
                    var nextSibs = [];
                    var sib = currents.nextElementSibling;
                    while (sib) {
                        if (sib.tagName === 'SPAN') nextSibs.push(sib);
                        sib = sib.nextElementSibling;
                    }
                    if (nextSibs.length > 0) {
                        return { activeIndex: 0, total: nextSibs.length + 1, hasNext: true, tabs: null };
                    }
                }
            } catch (e) { /* ignore */ }
            return null;
        }

        // 点击章节内 “下一页” 按钮（仅在当前课时尚有页面时使用，避免误跳到下一章节）
        function clickNextPageBtn() {
            $('#ne-21log', window.parent.document).html('')
            var nextBtn = top.document.querySelector('#mainid > .prev_next.next')
            if (nextBtn) { nextBtn.click(); return true }
            return false
        }

        // 点击 “下一章节” 按钮：优先尝试章节内的“下一页/下一节”统一按钮，
        // 找不到时再退回 #prevNextFocusNext（仅用于章节级跳转）
        function clickNextChapterBtn() {
            $('#ne-21log', window.parent.document).html('')
            var nextBtn = top.document.querySelector('#mainid > .prev_next.next')
            if (nextBtn) { nextBtn.click(); return true }
            var focusBtn = top.document.querySelector('#prevNextFocusNext')
            if (focusBtn) { focusBtn.click(); return true }
            return false
        }

        // 优先级 1：当前课时若仍有未完成的页面，先切换到下一页，避免漏刷
        var sub = detectSubTabPosition()
        if (sub && sub.hasNext) {
            logger('当前课时存在未完成页面（' + (sub.activeIndex + 1) + '/' + sub.total + '），准备切换到下一页', 'blue')
            setTimeout(() => {
                if (!clickNextPageBtn()) {
                    logger('未找到本课时下一页按钮，回退到下一章节跳转', 'orange')
                    clickNextChapterBtn()
                }
            }, 5000)
            return
        }

        if (setting.review || !setting.work) {
            logger('本课时已无未完成页面，准备切换到下一章节', 'blue')
            setTimeout(() => { clickNextChapterBtn() }, 5000)
            return
        }
        let _t = []
        $.each($(res).find('li'), (_, t) => {
            let curid = $(t).find('.posCatalog_select').attr('id'),
                status = $(t).find('.prevHoverTips').text(),
                name = $(t).find('.posCatalog_name').attr('title');
            if (curid.indexOf('cur') != -1) {
                _t.push({ 'curid': curid, 'status': status, 'name': name })
            }
        })

        let _curChaterId = $('#coursetree', window.parent.document).find('.posCatalog_active').attr('id')
        let _curIndex = _t.findIndex((item) => item['curid'] == _curChaterId)
        for (_curIndex; _curIndex < _t.length - 1; _curIndex++) {
            // 当前章节仍标记为待完成，但章节内已无更多页面（hasNext=false 已在前面判定过）
            // 此分支保留作为兜底：万一 detectSubTabPosition 漏检，仍尝试调用一次
            if (_t[_curIndex]['status'].indexOf('待完成') != -1) {
                var subAgain = detectSubTabPosition()
                if (subAgain && subAgain.hasNext) {
                    logger('兜底检测到本课时仍有未完成页面（' + (subAgain.activeIndex + 1) + '/' + subAgain.total + '），切换到下一页', 'blue')
                    setTimeout(() => {
                        if (!clickNextPageBtn()) clickNextChapterBtn()
                    }, 5000)
                    return
                }
            }
            let t = _t[_curIndex + 1]
            if (t['status'].indexOf('待完成') != -1) {
                setTimeout(() => {
                    clickNextChapterBtn()
                    showBox()
                }, 5000)
                return
            } else if (t['status'].indexOf('闯关') != -1) {
                logger('当前为闯关模式，存在未完成任务点，脚本已暂停运行，请手动完成并点击下一章节', 'red')
                return
            } else if (t['status'].indexOf('开放') != -1) {
                logger('章节未开放', 'red')
                return
            } else {
                //  console.log(t)
            }
        }
        logger('此课程处理完毕', 'green')
        return
    })
}

function missonStart() {
    showBox()
    if (_mlist.length <= 0) {
        logger('此页面任务处理完毕，准备跳转页面', 'green')
        return toNext()
    }
    let _type = _mlist[0]['type'],
        _dom = _domList[0],
        _task = _mlist[0];
    if (_type == undefined) {
        _type = _mlist[0]['property']["module"]
    }
    switch (_type) {
        case "video":
            if (_mlist[0]['property']['module'] == 'insertvideo') {
                logger('开始处理视频', 'purple')
                missonVideo(_dom, _task)
                break
            } else if (_mlist[0]['property']['module'] == 'insertaudio') {
                logger('开始处理音频', 'purple')
                missonVideo(_dom, _task)
                break
            } else {
                logger('未知类型任务，请联系作者，跳过', 'red')
                switchMission()
                break
            }
        case "workid":
            logger('开始处理测验', 'purple')
            missonWork(_dom, _task)
            break
        case "document":
            logger('开始处理文档', 'purple')
            missonDoucument(_dom, _task)
            break
        case "read":
            logger('开始处理阅读', 'purple')
            missonRead(_dom, _task)
            break
        case "insertbook":
            logger('开始处理读书', 'purple')
            missonBook(_dom, _task)
            break
        case "live":
            logger('开始处理直播', 'purple')
            missonLive(_dom, _task)
            break
        case "microCourse":
        case "insertmicroCourse":
            logger('开始处理速课', 'purple')
            missonMicroCourse(_dom, _task)
            break
        default: {
            // 无需处理或不算任务点的占位类型：图片、答疑、分享、外链题库等
            let GarbageTasks = ['insertimage', 'insertanswerquestion', 'insertshare', 'insertquestion', 'insertdiscuss', 'insertsubject']
            if (GarbageTasks.indexOf(_type) != -1) {
                logger('发现无需处理任务（' + _type + '），跳过。', 'red')
                switchMission()
            } else {
                logger('暂不支持处理此类型:' + _type + '，跳过。', 'red')
                switchMission()
            }
        }
    }
}

function missonVideo(dom, obj) {
    const { isPassed, otherInfo, property } = obj;
    const { _jobid: jobId, name, objectid: objectId, module } = property;

    // 同一函数处理视频与音频两种任务，按 module 区分日志/开关
    const isAudioTask = module === 'insertaudio';
    const taskLabel = isAudioTask ? '音频' : '视频';

    if (isAudioTask ? !setting.audio : !setting.video) {
        logger(`用户设置不处理${taskLabel}任务，准备开始下一个任务。`, 'red');
        return setTimeout(switchMission, 3000);
    }

    if (!setting.review && isPassed === true) {
        logger(`${taskLabel}：${name} 检测已完成，准备处理下一个任务`, 'green');
        return switchMission();
    }

    // 使用传入的 dom 参数查找相关的 iframe，而不是搜索整个文档
    let target = dom.length > 0 ? dom[0] : null;
    let mediaType = isAudioTask ? 'audio' : 'video'; // 按任务类型预设，循环里再以 DOM 为准

    if (!target) {
        logger(`未找到${taskLabel} iframe，3 秒后重试……`, 'orange');
        return setTimeout(() => missonVideo(dom, obj), 3000);
    }

    logger(`处理${taskLabel}：${name}，正在解析`);
    let executed = false;
    const doc = target.contentDocument || target.contentWindow.document;

    const intervalId = setInterval(() => {
        // 先尝试查找视频，如果没有则尝试查找音频
        let media = doc.querySelector('video');
        if (!media) {
            media = doc.querySelector('audio');
            mediaType = 'audio';
        }

        if (media && !executed) {
            executed = true;
            clearInterval(intervalId);

            // 计算最终倍速：优先用户设置；若超星禁用了倍速菜单则强制 1×
            const userRate = getRate();
            const rateDisabled = mediaType === 'video' && isPlaybackRateDisabled(doc);
            const finalRate = rateDisabled ? 1 : userRate;
            if (rateDisabled && userRate > 1) {
                logger(`${name} 超星禁用了此视频的倍速菜单，已回退至 1×（强行倍速会被清空进度）`, 'orange');
            } else if (userRate > 1) {
                logger(`已开启倍速：${userRate}×（高倍速可能被超星判定异常）`, 'orange');
            }

            logger(`${name} - ${mediaType} 播放成功，开始控制播放（${finalRate}×）`);
            media.pause();
            media.muted = true;
            hookMediaRate(media, finalRate);
            media.play();

            // 防止暂停的通用恢复函数
            const resume = () => {
                if (media.paused) {
                    media.play();
                }
            };

            media.addEventListener('pause', resume);
            if (mediaType === 'video' && media.parentElement) {
                media.parentElement.addEventListener('mouseleave', resume);
            }

            // 临近结尾自动恢复 1×（仅当当前为倍速）—— 避免任务点判定失败
            let rateRestored = finalRate <= 1;
            if (!rateRestored) {
                const onTimeUpdate = () => {
                    if (!rateRestored && isFinite(media.duration) && media.duration - media.currentTime < 10) {
                        rateRestored = true;
                        try { delete media.playbackRate; } catch (_) { /* empty */ }
                        hookMediaRate(media, 1);
                        media.removeEventListener('timeupdate', onTimeUpdate);
                    }
                };
                media.addEventListener('timeupdate', onTimeUpdate);
            }

            media.addEventListener('ended', () => {
                logger(`${name} - ${mediaType} 已播放完成`);
                media.removeEventListener('pause', resume);
                clearInterval(intervalId);
                setTimeout(switchMission, 1000);
            });
        }
    }, 2500);
}

// 强锁 playbackRate：用 Object.defineProperty 阻止超星播放器把倍速改回 1
// 失败则降级为 ratechange 监听守护，仍尽力维持倍速
function hookMediaRate(media, rate) {
    try { media.playbackRate = rate; } catch (_) { /* empty */ }
    try {
        Object.defineProperty(media, 'playbackRate', {
            configurable: true,
            get: function () { return rate; },
            set: function () { /* 阻止外部改写 */ }
        });
    } catch (_) {
        try {
            media.addEventListener('ratechange', function () {
                if (media.playbackRate !== rate) {
                    try { media.playbackRate = rate; } catch (__) { /* empty */ }
                }
            });
        } catch (___) { /* empty */ }
    }
}

// 超星 video.js 播放器若禁用了倍速，倍速菜单会无项 → 视为禁用
function isPlaybackRateDisabled(iframeDocument) {
    try {
        var items = iframeDocument.querySelectorAll('.vjs-playback-rate .vjs-menu-content .vjs-menu-item');
        return items.length === 0;
    } catch (_) {
        return false;
    }
}

function missonBook(dom, obj) {
    if (setting.task) {
        if (obj['jobid'] == undefined) {
            logger("当前只处理任务点任务,跳过", 'red')
            switchMission()
            return
        }
    }
    let jobId = obj['property']['jobid'],
        name = obj['property']['bookname'],
        jtoken = obj['jtoken'],
        knowledgeId = _defaults['knowledgeid'],
        courseId = _defaults['courseid'],
        clazzId = _defaults['clazzId'];
    if (obj['job'] == undefined) {
        logger('读书：' + name + '检测已完成，准备执行下一个任务。', 'green')
        switchMission()
        return
    }
    $.ajax({
        url: _l.protocol + '//' + _l.host + '/ananas/job?jobid=' + jobId + '&knowledgeid=' + knowledgeId + '&courseid=' + courseId + '&clazzid=' + clazzId + '&jtoken=' + jtoken + '&_dc=' + String(Math.round(new Date())),
        method: 'GET',
        success: function (res) {
            if (res.status) {
                logger('读书：' + name + res.msg + ',准备执行下一个任务。', 'green')
            } else {
                logger('读书：' + name + '处理异常,跳过。', 'red')
            }
            switchMission()
            return
        },
    })
}

// 直播（live）任务：
// 1. 拉 /ananas/live/liveinfo 取 duration、timeLongValue、liveStatus
// 2. 触发一次 zhibo.chaoxing.com 的 index 请求完成鉴权
// 3. 循环上报 saveTimePc（每 30 秒一次），直到 playTime 达到剩余时长
// 注意：若 liveStatus==4 && ifReview==1 表示不允许回放，直接跳过
function missonLive(dom, obj) {
    if (!setting.video) {
        logger('用户设置不处理视频/直播任务，准备开始下一个任务。', 'red')
        return setTimeout(switchMission, 3000)
    }
    if (setting.task && obj['jobid'] == undefined) {
        logger('当前只处理任务点任务,跳过', 'red')
        return switchMission()
    }
    if (!setting.review && obj['isPassed'] === true) {
        logger('直播：' + (obj['property'] && obj['property']['title']) + ' 检测已完成，准备处理下一个任务', 'green')
        return switchMission()
    }

    let prop = obj['property'] || {}
    let name = prop['title'] || prop['name'] || '未命名'
    let liveId = prop['liveId']
    let streamName = prop['streamName']
    let vdoid = prop['vdoid']
    let jobId = obj['jobid']
    let courseId = _defaults['courseid']
    let clazzId = _defaults['clazzId']
    let knowledgeId = _defaults['knowledgeid']
    let userId = getCk('_uid') || getCk('UID')
    let liveSetEnc = obj['liveSetEnc'] || ''
    let authEnc = obj['authEnc'] || ''
    let rt = prop['rt'] ? parseFloat(prop['rt']) : 0.9

    if (!liveId || !userId) {
        logger('直播任务缺少必要参数（liveId/userId），跳过：' + name, 'red')
        return switchMission()
    }

    let liveInfoUrl = _l.protocol + '//' + _l.host + '/ananas/live/liveinfo?liveid=' + liveId + '&userid=' + userId + '&clazzid=' + clazzId + '&knowledgeid=' + knowledgeId + '&courseid=' + courseId + '&jobid=' + jobId + '&ut=s'
    logger('开始直播任务：' + name, 'purple')

    $.ajax({
        url: liveInfoUrl,
        method: 'GET',
        dataType: 'text',
        success: function (raw) {
            let info
            try { info = JSON.parse(raw) } catch (_) { info = null }
            if (!info || !info.temp || !info.temp.data) {
                logger('获取直播信息失败，跳过：' + name, 'red')
                return switchMission()
            }
            let data = info.temp.data
            let duration = data['duration'] || 0
            let timeLongValue = (data['timeLongValue'] || 0) * 60
            let liveStatus = data['liveStatus']
            let ifReview = data['ifReview']
            if (liveStatus == 4 && ifReview == 1) {
                logger('直播不允许回放，无法完成：' + name, 'orange')
                return switchMission()
            }
            // 预热 zhibo.chaoxing.com session（鉴权上下文）—跨域请求，交给浏览器处理 cookie
            let indexUrl = _l.protocol + '//zhibo.chaoxing.com/' + liveId + '?courseId=' + courseId + '&classId=' + clazzId + '&knowledgeId=' + knowledgeId + '&jobId=' + jobId + '&userId=' + userId + '&rt=' + rt + '&livesetenc=' + encodeURIComponent(liveSetEnc) + '&isjob=true&watchingInCourse=1&customPara1=' + clazzId + '_' + courseId + '&customPara2=' + encodeURIComponent(authEnc) + '&isNotDrag=1&jobfs=0'
            $.ajax({
                url: indexUrl, method: 'GET', dataType: 'text',
                xhrFields: { withCredentials: true },
                complete: function () {
                    if (rt <= 0.9) duration = duration * (rt + 0.1)
                    if (timeLongValue > duration) {
                        logger('直播时长已达标，无需继续观看：' + name, 'green')
                        return switchMission()
                    }
                    duration -= timeLongValue
                    let playTime = 0, isStart = '0'
                    function reportOnce() {
                        let reportUrl = _l.protocol + '//zhibo.chaoxing.com/saveTimePc?streamName=' + streamName + '&vdoid=' + vdoid + '&userId=' + userId + '&isStart=' + isStart + '&t=' + Date.now() + '&courseId=' + courseId
                        $.ajax({
                            url: reportUrl, method: 'GET', dataType: 'text',
                            xhrFields: { withCredentials: true },
                            success: function (resp) {
                                if (String(resp).indexOf('success') !== -1) {
                                    logger('直播进度上报成功（' + Math.round(playTime) + 's / ' + Math.round(duration) + 's）：' + name)
                                } else {
                                    logger('直播进度上报失败：' + name, 'orange')
                                }
                            },
                            error: function () { logger('直播进度上报网络失败：' + name, 'red') },
                            complete: function () {
                                isStart = '1'
                                if (playTime >= duration) {
                                    logger('直播回放完成：' + name, 'green')
                                    return switchMission()
                                }
                                playTime += 30
                                if (playTime > duration) playTime = duration
                                setTimeout(reportOnce, 30000)
                            }
                        })
                    }
                    reportOnce()
                }
            })
        },
        error: function () {
            logger('获取直播信息网络失败：' + name, 'red')
            switchMission()
        }
    })
}

// 速课（microCourse）任务：对齐九九助手的 /ananas/job/microCourse 接口
function missonMicroCourse(dom, obj) {
    if (setting.task && obj['jobid'] == undefined) {
        logger('当前只处理任务点任务,跳过', 'red')
        return switchMission()
    }
    if (!setting.review && obj['isPassed'] === true) {
        logger('速课：' + (obj['property'] && (obj['property']['title'] || obj['property']['name'])) + ' 检测已完成，准备处理下一个任务', 'green')
        return switchMission()
    }
    let prop = obj['property'] || {}
    let name = prop['title'] || prop['name'] || '未命名'
    let jobId = obj['jobid']
    let jtoken = obj['jtoken'] || ''
    let courseId = _defaults['courseid']
    let clazzId = _defaults['clazzId']
    let knowledgeId = _defaults['knowledgeid']
    let cb = 'jQuery' + Math.floor(Math.random() * 1e15) + '_' + Date.now()
    let url = _l.protocol + '//' + _l.host + '/ananas/job/microCourse?jobid=' + jobId + '&knowledgeid=' + knowledgeId + '&courseid=' + courseId + '&clazzid=' + clazzId + '&jtoken=' + jtoken + '&checkMicroTopic=true&microTopicId=undefined&jsoncallback=' + cb + '&_=' + Date.now()
    logger('开始速课任务：' + name, 'purple')
    $.ajax({
        url: url, method: 'GET', dataType: 'text',
        success: function (raw) {
            // jsonp 包装，但我们只需要判断字符串中是否含"添加考核点成功"
            if (String(raw).indexOf('添加考核点成功') !== -1) {
                logger('速课任务完成：' + name, 'green')
            } else {
                logger('速课任务响应异常：' + name, 'orange')
            }
            switchMission()
        },
        error: function () {
            logger('速课任务网络失败：' + name, 'red')
            switchMission()
        }
    })
}

function missonDoucument(dom, obj) {
    if (setting.task) {
        if (obj['jobid'] == undefined) {
            logger("当前只处理任务点任务,跳过", 'red')
            switchMission()
            return
        }
    }
    let jobId = obj['property']['jobid'],
        name = obj['property']['name'],
        jtoken = obj['jtoken'],
        knowledgeId = _defaults['knowledgeid'],
        courseId = _defaults['courseid'],
        clazzId = _defaults['clazzId'];
    if (obj['job'] == undefined) {
        logger('文档：' + name + '检测已完成，准备执行下一个任务。', 'green')
        switchMission()
        return
    }
    $.ajax({
        url: _l.protocol + '//' + _l.host + '/ananas/job/document?jobid=' + jobId + '&knowledgeid=' + knowledgeId + '&courseid=' + courseId + '&clazzid=' + clazzId + '&jtoken=' + jtoken + '&_dc=' + String(Math.round(new Date())),
        method: 'GET',
        success: function (res) {
            if (res.status) {
                logger('文档：' + name + res.msg + ',准备执行下一个任务。', 'green')
            } else {
                logger('文档：' + name + '处理异常,跳过。', 'red')
            }
            switchMission()
            return
        },
    })

}

function missonRead(dom, obj) {
    if (setting.task) {
        if (obj['jobid'] == undefined) {
            logger("当前只处理任务点任务,跳过", 'red')
            switchMission()
            return
        }
    }
    let jobId = obj['property']['jobid'],
        name = obj['property']['title'],
        jtoken = obj['jtoken'],
        knowledgeId = _defaults['knowledgeid'],
        courseId = _defaults['courseid'],
        clazzId = _defaults['clazzId'];
    if (obj['job'] == undefined) {
        logger('阅读：' + name + ',检测已完成，准备执行下一个任务。', 'green')
        switchMission()
        return
    }
    $.ajax({
        url: _l.protocol + '//' + _l.host + '/ananas/job/readv2?jobid=' + jobId + '&knowledgeid=' + knowledgeId + '&courseid=' + courseId + '&clazzid=' + clazzId + '&jtoken=' + jtoken + '&_dc=' + String(Math.round(new Date())),
        method: 'GET',
        success: function (res) {
            if (res.status) {
                logger('阅读：' + name + res.msg + ',准备执行下一个任务。', 'green')
            } else {
                logger('阅读：' + name + '处理异常,跳过。', 'red')
            }
            switchMission()
            return
        }
    })
}

function missonWork(dom, obj) {
    if (!setting.work) {
        logger('用户设置不自动处理测验，准备处理下一个任务', 'green')
        switchMission()
        return
    }
    let isDo;
    if (setting.task) {
        logger("当前只处理任务点任务", 'red')
        if (obj['jobid'] == undefined ? false : true) {
            isDo = true
        } else {
            isDo = false
        }
    } else {
        logger("当前默认处理所有任务（包括非任务点任务）", 'red')
        isDo = true
    }
    if (isDo) {
        if (obj['jobid'] !== undefined) {
            var phoneWeb = _l.protocol + '//' + _l.host + '/work/phone/work?workId=' + obj['jobid'].replace('work-', '') + '&courseId=' + _defaults['courseid'] + '&clazzId=' + _defaults['clazzId'] + '&knowledgeId=' + _defaults['knowledgeid'] + '&jobId=' + obj['jobid'] + '&enc=' + obj['enc']
            // setTimeout(() => { startDoCyWork(0, dom) }, 3000)
            setTimeout(() => { startDoPhoneCyWork(0, dom, phoneWeb) }, 3000)
        } else {
            setTimeout(() => { startDoCyWork(0, dom) }, 3000)
        }
        // } else if (!GM_getValue('cando')) {
        //     logger('存在未完成任务点，脚本已暂停执行，请手动处理后刷新网页。', 'red')
        //     return
    } else {
        logger('用户设置只处理属于任务点的任务，准备处理下一个任务', 'green')
        switchMission()
        return
    }
}

function doPhoneWork($dom) {
    let $cy = $dom.find('.Wrappadding form')
    $subBtn = $cy.find('.zquestions .zsubmit .btn-ok-bottom')
    $okBtn = $dom.find('#okBtn')
    $saveBtn = $cy.find('.zquestions .zsubmit .btn-save')
    let TimuList = $cy.find('.zquestions .Py-mian1')
    startDoPhoneTimu(0, TimuList)
}

function startDoPhoneTimu(index, TimuList) {
    if (index == TimuList.length) {
        if (localStorage.getItem('GPTJsSetting.sub') === 'true') {
            logger('测验处理完成，准备自动提交。', 'green')
            setTimeout(() => {
                $subBtn.click()
                setTimeout(() => {
                    $okBtn.click()
                    logger('提交成功，准备切换下一个任务。', 'green')
                    _mlist.splice(0, 1)
                    _domList.splice(0, 1)
                    setTimeout(() => { switchMission() }, 3000)
                }, 3000)
            }, 5000)
        } else if (localStorage.getItem('GPTJsSetting.force') === 'true') {
            logger('测验处理完成，存在无答案题目,由于用户设置了强制提交，准备自动提交。', 'red')
            setTimeout(() => {
                $subBtn.click()
                setTimeout(() => {
                    $okBtn.click()
                    logger('提交成功，准备切换下一个任务。', 'green')
                    _mlist.splice(0, 1)
                    _domList.splice(0, 1)
                    setTimeout(() => { switchMission() }, 3000)
                }, 3000)
            }, 5000)
        } else {
            logger('测验处理完成，存在无答案题目或用户设置不自动提交，自动保存！', 'green')
            setTimeout(() => {
                $saveBtn.click()
                setTimeout(() => {
                    logger('保存成功，准备切换下一个任务。', 'green')
                    _mlist.splice(0, 1)
                    _domList.splice(0, 1)
                    setTimeout(() => { switchMission() }, 3000)
                }, 3000)
            }, 5000)
        }
        return
    }
    // 获取当前题目所属的window对象 (可能是iframe)
    let contextWindow = TimuList[index] ? (TimuList[index].ownerDocument.defaultView || unsafeWindow) : unsafeWindow;
    let questionFull = $(TimuList[index]).find('.Py-m1-title').html()
    let _question = tidyQuestion(questionFull).replace(/.*?\[.*?题\]\s*\n\s*/, '').trim()
    let typeName = questionFull.match(/.*?\[(.*?)]|$/)[1];
    let _type = ({
        单选题: 0, 单项选择题: 0, 单选: 0, 选择题: 0,
        多选题: 1, 多项选择题: 1, 多选: 1,
        填空题: 2, 填空: 2,
        判断题: 3, 是非题: 3, 判断: 3,
        简答题: 4, 简答: 4, 问答题: 4, 名词解释: 4, 论述题: 4, 论述: 4,
        计算题: 4, 计算: 4, 分录题: 4, 资料题: 4, 作图题: 4, 其他: 4, 其它: 4, 阅读理解: 4, 阅读: 4, 阅读题: 4, 理解题: 4, 完形填空: 4, 完形: 4, 综合题: 4,
        写作题: 5,
        翻译题: 6
    })[typeName]
    let _a = []
    let _answerTmpArr
    var check_answer_flag = 0;

    // 如果题型不在预设类型中，根据DOM结构自动识别题型
    if (_type === undefined) {
        logger('未知题型: ' + typeName + '，尝试自动识别', 'blue');

        // 检查选项列表特征
        let singleChoiceList = $(TimuList[index]).find('.answerList.singleChoice li');
        let multiChoiceList = $(TimuList[index]).find('.answerList.multiChoice li');

        if (singleChoiceList && singleChoiceList.length > 0) {
            _type = 0; // 单选题
            logger('自动识别为单选题', 'green');
        } else if (multiChoiceList && multiChoiceList.length > 0) {
            _type = 1; // 多选题
            logger('自动识别为多选题', 'green');
        } else {
            // 检查是否为填空题
            let tkList = $(TimuList[index]).find('.blankList2 input');
            if (tkList && tkList.length > 0) {
                _type = 2; // 填空题
                logger('自动识别为填空题', 'green');
            } else {
                // 判断题等其他情况
                let panduanList = $(TimuList[index]).find('.answerList.panduan li');
                if (panduanList && panduanList.length > 0) {
                    _type = 3; // 判断题
                    logger('自动识别为判断题', 'green');
                } else {
                    // 检查是否为简答题或材料题
                    let textareaList = $(TimuList[index]).find('textarea');
                    let editorList = $(TimuList[index]).find('.edui-editor');

                    if ((textareaList && textareaList.length > 0) || (editorList && editorList.length > 0)) {
                        _type = 4; // 简答题
                        logger('自动识别为简答题或材料题', 'green');
                    }
                }
            }
        }
    }

    _currentQuestionMeta = { index: index, total: TimuList.length, typeName: typeName }
    switch (_type) {
        case 0: {
            //遍历选项列表
            _answerTmpArr = $(TimuList[index]).find('.answerList.singleChoice li')
            let mergedAnswers = [];
            _answerTmpArr.each(function () {
                var answerText = $(this).text().replace(/[ABCD]/g, '').trim();
                mergedAnswers.push(answerText);
            });
            mergedAnswers = mergedAnswers.join("|");

            _question = buildPrompt({ type: '单选题', question: _question, options: mergedAnswers.split('|') })
            //判断题目是否已作答
            for (let i = 0; i < _answerTmpArr.length; i++) {
                if ($(_answerTmpArr[i]).attr('aria-label')) {
                    if (!isRedoMode()) {
                        logger(index + 1 + '此题已作答，准备切换下一题', 'green')
                        check_answer_flag = 1;
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, 30)
                    } else {
                        logger(index + 1 + '此题已作答，重做模式下重新作答', 'blue')
                        // 重做模式：先取消已选选项
                        $(_answerTmpArr[i]).click()
                    }
                    break
                }
            }
            if (check_answer_flag == 0) {
                getAnswer(_type, _question).then((agrs) => {
                    _answerTmpArr = $(TimuList[index]).find('.answerList.singleChoice li')
                    $.each(_answerTmpArr, (i, t) => {
                        _a.push(tidyStr($(t).html()).replace(/^[A-Z]\s*\n\s*/, '').trim())
                    })
                    let _i = _a.findIndex((item) => item == agrs)
                    if (_i == -1) {
                        // 精确匹配失败，尝试相似度匹配
                        _i = findBestFuzzyMatch(_a, agrs)
                    }
                    if (_i == -1) {
                        logger('AI未能完美匹配正确答案，请尝试更换更高级模型或手动选择，跳过此题', 'red')
                        // setting.sub = 0
                        localStorage.setItem('GPTJsSetting.sub', false)
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    } else {
                        $(_answerTmpArr[_i]).click()
                        logger('自动答题成功，准备切换下一题', 'green')
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }
                })
            }
        }
            break
        case 1: {
            //遍历选项列表
            _answerTmpArr = $(TimuList[index]).find('.answerList.multiChoice li')
            let mergedAnswers = [];
            _answerTmpArr.each(function () {
                var answerText = $(this).text().replace(/[ABCD]/g, '').trim();
                mergedAnswers.push(answerText);
            });
            mergedAnswers = mergedAnswers.join("|");
            _question = buildPrompt({ type: '多选题', question: _question, options: mergedAnswers.split('|'), answer_format: "用'|'分割多个答案" })
            //判断题目是否已作答
            for (let i = 0; i < _answerTmpArr.length; i++) {
                if ($(_answerTmpArr[i]).attr('aria-label')) {
                    if (!isRedoMode()) {
                        logger(index + 1 + '此题已作答，准备切换下一题', 'green')
                        check_answer_flag = 1;
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, 30)
                    } else {
                        logger(index + 1 + '此题已作答，重做模式下重新作答', 'blue')
                        // 重做模式：先取消已选选项
                        $(_answerTmpArr[i]).click()
                    }
                    break
                }
            }
            if (check_answer_flag == 0) {
                getAnswer(_type, _question).then((agrs) => {
                    if (agrs == '暂无答案') {
                        logger('AI未能完美匹配正确答案，请尝试更换更高级模型或手动选择，跳过此题', 'red')
                        // setting.sub = 0
                        localStorage.setItem('GPTJsSetting.sub', false)
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    } else {
                        _answerTmpArr = $(TimuList[index]).find('.answerList.multiChoice li')
                        let _multiOptions = []
                        $.each(_answerTmpArr, (i, t) => {
                            _multiOptions.push(tidyStr($(t).html()).replace(/^[A-Z]\s*\n\s*/, '').trim())
                        })
                        let _matchedAny = false
                        $.each(_answerTmpArr, (i, t) => {
                            if (agrs.indexOf(_multiOptions[i]) != -1) {
                                _matchedAny = true
                                setTimeout(() => { $(_answerTmpArr[i]).click() }, 300)
                            }
                        })
                        // 如果精确匹配没有命中任何选项，尝试模糊匹配
                        if (!_matchedAny) {
                            let fuzzyIndices = findFuzzyMatchMultiple(_multiOptions, agrs)
                            for (var fi = 0; fi < fuzzyIndices.length; fi++) {
                                (function (idx) {
                                    setTimeout(function () { $(_answerTmpArr[idx]).click() }, 300)
                                })(fuzzyIndices[fi])
                            }
                        }
                        let check = 0
                        setTimeout(() => {
                            $.each(_answerTmpArr, (i, t) => {
                                if (($(_answerTmpArr[i]).attr('class') || '').indexOf('cur') != -1) {
                                    check = 1
                                }
                            })
                            if (check) {
                                logger('自动答题成功，准备切换下一题', 'green')
                            } else {
                                logger('未能正确选择答案，请手动选择，跳过此题', 'red')
                                // setting.sub = 0
                                localStorage.setItem('GPTJsSetting.sub', false)
                            }
                            setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                        }, 1000)
                    }
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }
                })
            }
        }
            break
        case 2: {
            // 填空题处理 - 使用全局editors数组 (ExtJS)
            let tkList = $(TimuList[index]).find('.blankList2 input')
            // 使用属性选择器匹配包含editorIndex的元素
            let tkEditorBlocks = $(TimuList[index]).find('[data-editorindex]')

            // 检查是否使用UEditor编辑器（手机页面）
            if (tkEditorBlocks && tkEditorBlocks.length > 0) {
                let firstTextarea = $(TimuList[index]).find('textarea[name^="answer"]')
                if (firstTextarea.length > 0 && $(firstTextarea[0]).val() && $(firstTextarea[0]).val().trim() !== '' && !isRedoMode()) {
                    logger("此题已作答,跳过", "green");
                    setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, 30);
                    break
                }

                _question = buildPrompt({ type: '填空题', question: _question, answer_format: "多个填空用'|'分隔" })
                getAnswer(_type, _question).then((agrs) => {
                    if (agrs == '暂无答案') {
                        logger('AI未能完美匹配正确答案，请尝试更换更高级模型或手动选择，跳过此题', 'red')
                        localStorage.setItem('GPTJsSetting.sub', false)
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                        return
                    }
                    let answers = agrs.split('|')
                    let editorBlocks = $(TimuList[index]).find('[data-editorindex]')

                    $.each(editorBlocks, (i, block) => {
                        let editorIndex = $(block).attr('data-editorindex')
                        let itemId = $(block).attr('data-itemid')
                        let answerContent = answers[i] || answers[0] || agrs

                        setTimeout(() => {
                            try {
                                let ueditor = null

                                // 1. 尝试通过 contextWindow.editors 获取
                                if (contextWindow.editors && contextWindow.editors[editorIndex]) {
                                    ueditor = contextWindow.editors[editorIndex].ueditor
                                }

                                // 2. 尝试通过 contextWindow.UE.instants 获取
                                if (!ueditor && contextWindow.UE && contextWindow.UE.instants) {
                                    let instantKey = 'ueditorInstant' + editorIndex
                                    ueditor = contextWindow.UE.instants[instantKey]
                                }

                                // 3. 尝试通过标准ID获取 (ananas-editor-answer + itemId)
                                if (!ueditor && itemId && contextWindow.UE && contextWindow.UE.getEditor) {
                                    ueditor = contextWindow.UE.getEditor('ananas-editor-answer' + itemId)
                                }

                                if (ueditor) {
                                    ueditor.setContent(answerContent)
                                    logger(`填空题第${i + 1}空已填入 (Index: ${editorIndex})`, 'green')
                                } else {
                                    logger(`填空题第${i + 1}空未找到编辑器实例 (Index: ${editorIndex}, ItemId: ${itemId})`, 'yellow')
                                }

                                // 始终尝试更新隐藏的textarea作为兜底
                                if (itemId) {
                                    let textarea = $('#answer' + itemId)
                                    if (textarea.length > 0) {
                                        textarea.val(answerContent)
                                        try {
                                            if (textarea[0].value === answerContent) {
                                                textarea[0].dispatchEvent(new Event('change'))
                                                textarea[0].dispatchEvent(new Event('input'))
                                            }
                                        } catch (e) { /* empty */ }
                                    }
                                }
                            } catch (e) {
                                logger('填空题填入详情失败：' + e.message, 'red')
                            }
                        }, 500 * (i + 1))
                    })

                    setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time + 300 * editorBlocks.length)
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }
                })
            } else if (tkList && tkList.length > 0) {
                // 普通input模式（旧版页面）
                if ($(tkList[0]).val() && $(tkList[0]).val().trim() !== '' && !isRedoMode()) {
                    logger("此题已作答,跳过", "green");
                    setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, 30);
                    break
                }
                getAnswer(_type, _question).then((agrs) => {
                    if (agrs == '暂无答案') {
                        logger('AI未能完美匹配正确答案，请尝试更换更高级模型或手动选择，跳过此题', 'red')
                        localStorage.setItem('GPTJsSetting.sub', false)
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                        return
                    }
                    let answers = agrs.split('|')
                    let inputList = $(TimuList[index]).find('.blankList2 input')
                    $.each(inputList, (i, t) => {
                        setTimeout(() => {
                            $(t).val(answers[i] || answers[0] || agrs)
                            // 触发input事件以确保框架能够检测到值的变化
                            $(t).trigger('input').trigger('change')
                        }, 200)
                    })
                    setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }
                })
            } else {
                logger('未找到填空题输入区域，跳过此题', 'red')
                localStorage.setItem('GPTJsSetting.sub', false)
                setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
            }
            break
        }
        case 3: {
            _answerTmpArr = $(TimuList[index]).find('.answerList.panduan li')
            $.each(_answerTmpArr, (i, t) => {
                _a.push($(t).text().trim())
            })
            //判断题目是否已作答
            for (let i = 0; i < _answerTmpArr.length; i++) {
                if ($(_answerTmpArr[i]).attr('aria-label')) {
                    if (!isRedoMode()) {
                        logger(index + 1 + '此题已作答，准备切换下一题', 'green')
                        check_answer_flag = 1;
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, 30)
                    } else {
                        logger(index + 1 + '此题已作答，重做模式下重新作答', 'blue')
                        // 重做模式：先取消已选选项
                        $(_answerTmpArr[i]).click()
                    }
                    break
                }
            }
            if (check_answer_flag == 0) {
                _question = buildPrompt({ type: '判断题', question: _question, answer_format: "只回答正确或错误" })
                getAnswer(_type, _question).then((agrs) => {
                    let judgeResult = parseJudgeAnswer(agrs)
                    if (judgeResult === null) {
                        logger('答案匹配出错，准备切换下一题', 'red')
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                        return
                    }
                    let _i = findJudgeOptionIndex(_a, judgeResult === 'true')
                    if (_i === -1) {
                        logger('未匹配到正确选项，跳过', 'red')
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                        return
                    }
                    setTimeout(() => {
                        $(_answerTmpArr[_i]).click()
                        logger('自动答题成功，准备切换下一题', 'green')
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }, 300)
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }
                })
            }
            break
        }
        case 4: { // 简答题或材料题
            _question = buildPrompt({ type: '简答题或材料题', question: _question })

            // 查找可能的编辑器区域（通过data-editorindex）
            let jdEditorBlocks = $(TimuList[index]).find('[data-editorindex]')
            let jdTextareas = $(TimuList[index]).find('textarea[name^="answer"]')

            // 检查是否已作答
            let jdIsAnswered = false

            // 优先处理UEditor编辑器（手机页面）
            if (jdEditorBlocks && jdEditorBlocks.length > 0) {
                if (jdTextareas.length > 0 && $(jdTextareas[0]).val() && $(jdTextareas[0]).val().trim() !== '' && !isRedoMode()) {
                    logger(index + 1 + '简答题已作答，准备切换下一题', 'green')
                    setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, 30)
                    break
                }

                getAnswer(_type, _question).then((agrs) => {
                    if (agrs == '暂无答案') {
                        logger('AI无法匹配答案，请手动完成', 'red')
                        localStorage.setItem('GPTJsSetting.sub', false)
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                        return
                    }

                    // 获取第一个编辑器（简答题通常只有一个）
                    let firstBlock = jdEditorBlocks.first()
                    if (firstBlock.length > 0) {
                        let editorIndex = firstBlock.attr('data-editorindex')
                        let itemId = firstBlock.attr('data-itemid')
                        // 如果container上没有itemid，尝试从子元素或关联的textarea找
                        if (!itemId && jdTextareas.length > 0) {
                            let tid = $(jdTextareas[0]).attr('id')
                            if (tid) itemId = tid.replace('answer', '')
                        }

                        setTimeout(() => {
                            try {
                                let ueditor = null

                                // 1. 尝试通过 contextWindow.editors 获取
                                if (contextWindow.editors && contextWindow.editors[editorIndex]) {
                                    ueditor = contextWindow.editors[editorIndex].ueditor
                                }

                                // 2. 尝试通过 contextWindow.UE.instants 获取
                                if (!ueditor && contextWindow.UE && contextWindow.UE.instants) {
                                    let instantKey = 'ueditorInstant' + editorIndex
                                    ueditor = contextWindow.UE.instants[instantKey]
                                }

                                // 3. 尝试通过标准ID获取 (ananas-editor-answer + itemId)
                                if (!ueditor && itemId && contextWindow.UE && contextWindow.UE.getEditor) {
                                    ueditor = contextWindow.UE.getEditor('ananas-editor-answer' + itemId)
                                }

                                if (ueditor) {
                                    ueditor.setContent(agrs)
                                    logger(`简答题已填入 (Index: ${editorIndex})`, 'green')
                                } else {
                                    logger(`简答题未找到编辑器实例 (Index: ${editorIndex}, ItemId: ${itemId})`, 'yellow')
                                }

                                // 兜底：更新隐藏textarea
                                if (jdTextareas.length > 0) {
                                    let ta = $(jdTextareas[0])
                                    ta.val(agrs)
                                    // 触发change/input事件
                                    try {
                                        ta[0].dispatchEvent(new Event('change'))
                                        ta[0].dispatchEvent(new Event('input'))
                                    } catch (e) { /* empty */ }
                                }
                            } catch (e) {
                                logger('简答题填入失败：' + e.message, 'red')
                                // 尝试直接设置textarea
                                if (jdTextareas.length > 0) {
                                    $(jdTextareas[0]).val(agrs)
                                    logger('简答题通过textarea填入答案', 'blue')
                                }
                            }
                        }, 500)
                    } else {
                        // Fallback direct textarea
                        if (jdTextareas.length > 0) {
                            $(jdTextareas[0]).val(agrs)
                            logger('简答题通过textarea填入答案', 'blue')
                        }
                    }

                    setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }
                })
            }
            // 如果没有编辑器，但有textarea，直接使用textarea
            else if (jdTextareas && jdTextareas.length > 0) {
                // 检查是否已作答
                if ($(jdTextareas[0]).val() && $(jdTextareas[0]).val().trim() !== '' && !isRedoMode()) {
                    logger(index + 1 + '简答题已作答，准备切换下一题', 'green')
                    jdIsAnswered = true
                    setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, 30)
                } else {
                    getAnswer(_type, _question).then((agrs) => {
                        if (agrs == '暂无答案') {
                            logger('AI无法匹配答案，请手动完成', 'red')
                            localStorage.setItem('GPTJsSetting.sub', false)
                        } else {
                            $(jdTextareas[0]).val(agrs)
                            $(jdTextareas[0]).trigger('input').trigger('change')
                            logger('简答题自动答题成功，准备切换下一题', 'green')
                        }
                        setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                    }).catch((agrs) => {
                        if (agrs && agrs['c'] == 0) {
                            setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                        }
                    })
                }
            }
            // 如果以上方法都失败
            else {
                logger('无法找到简答题输入区域，请手动完成', 'red')
                localStorage.setItem('GPTJsSetting.sub', false)
                setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
            }
            break
        }
        case 5: {
            getAnswer(_type, _question).then((agrs) => {
                // setting.sub = 0
                localStorage.setItem('GPTJsSetting.sub', false)
                logger('此类型题目无法区分单/多选，请手动选择答案', 'red')
                setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
            }).catch((agrs) => {
                if (agrs['c'] == 0) {
                    setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
                }
            })
            break
        }
        default:
            logger('暂不支持处理此类型题目：' + questionFull.match(/.*?\[(.*?)]|$/)[1] + '，跳过！请手动作答。', 'red')
            // setting.sub = 0
            localStorage.setItem('GPTJsSetting.sub', false)
            setTimeout(() => { startDoPhoneTimu(index + 1, TimuList) }, setting.time)
            break
    }
}

// 轮询方式查找iframe内的元素
// 解决getElement使用MutationObserver在iframe文档替换时失效导致脚本卡死的问题
// 第四个参数 maxAttempts：最大轮询次数，超时返回 null（上层 if(!el) 会触发自身重试），避免永久卡死
function pollForElement(iframeDom, selector, interval, maxAttempts) {
    interval = interval || 2000;
    maxAttempts = (typeof maxAttempts === 'number' && maxAttempts > 0) ? maxAttempts : 60; // 默认 60 次 ≈ 2 分钟
    return new Promise(function (resolve) {
        var attempts = 0;
        var check = function () {
            try {
                var doc = $(iframeDom).contents()[0];
                if (doc) {
                    var el = doc.querySelector(selector);
                    if (el) return resolve(el);
                }
            } catch (e) { /* iframe未就绪或跨域 */ }
            attempts++;
            if (attempts >= maxAttempts) {
                logger('框架等待超时（' + Math.round(attempts * interval / 1000) + 's），上层将重试或跳过', 'red');
                return resolve(null);
            }
            if (attempts % 15 === 0) {
                logger('框架仍在加载中，已等待' + (attempts * interval / 1000) + '秒...请耐心等待', 'orange');
            }
            setTimeout(check, interval);
        };
        check();
    });
}

// 后台标签页防休眠：用 Web Audio 静音振荡器维持音频上下文，缓解浏览器对隐藏标签页的节流。
// 已经被多个网课助手实践证明对超星视频任务在后台时进度回退/刷新不出问题有效。
// 浏览器策略要求自动播放需用户手势；首次失败时会挂监听到 click/keydown 上再试一次。
var _ne21AntiSleepStarted = false;
function setupAntiSleep() {
    if (_ne21AntiSleepStarted) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    function tryStart() {
        if (_ne21AntiSleepStarted) return;
        try {
            var ac = new AC();
            var osc = ac.createOscillator();
            var gain = ac.createGain();
            gain.gain.value = 0; // 完全静音
            osc.connect(gain);
            gain.connect(ac.destination);
            osc.start();
            _ne21AntiSleepStarted = true;
            // visibilitychange 后某些浏览器会 suspend AudioContext，主动恢复
            document.addEventListener('visibilitychange', function () {
                try { if (ac.state === 'suspended') ac.resume(); } catch (_) { /* empty */ }
            });
        } catch (_) { /* ignore */ }
    }
    tryStart();
    if (!_ne21AntiSleepStarted) {
        var onUserGesture = function () {
            tryStart();
            if (_ne21AntiSleepStarted) {
                document.removeEventListener('click', onUserGesture, true);
                document.removeEventListener('keydown', onUserGesture, true);
                document.removeEventListener('touchstart', onUserGesture, true);
            }
        };
        document.addEventListener('click', onUserGesture, true);
        document.addEventListener('keydown', onUserGesture, true);
        document.addEventListener('touchstart', onUserGesture, true);
    }
}

// 周期性自动刷新页面，防止脚本因不可恢复的 iframe 卡死/超星接口响应异常而死循环
// 默认关闭，需用户在 localStorage 写入 GPTJsSetting.autoRefresh=true 启用
// 默认 30 分钟，可通过 GPTJsSetting.autoRefreshMinutes 改写（最小 5 分钟）
function setupAutoRefresh() {
    var stored = localStorage.getItem('GPTJsSetting.autoRefresh');
    var enabled = stored !== null ? (stored === 'true') : false;
    if (!enabled) return;
    var minutes = parseInt(localStorage.getItem('GPTJsSetting.autoRefreshMinutes'), 10);
    if (!isFinite(minutes) || minutes < 5) minutes = 30;
    setTimeout(function () {
        logger('已达到自动刷新时间（' + minutes + '分钟），3 秒后刷新页面...', 'orange');
        setTimeout(function () { try { window.location.reload(); } catch (_) { /* empty */ } }, 3000);
    }, minutes * 60 * 1000);
}

function startDoPhoneCyWork(index, doms, phoneWeb) {
    if (index == doms.length) {
        logger('此页面全部测验已处理完毕！准备进行下一项任务')
        setTimeout(missonStart, 5000)
        return
    }
    logger('等待测验框架加载...', 'purple')
    pollForElement(doms[index], 'iframe').then(element => {
        let workIframe = element
        if (!workIframe) {
            setTimeout(() => { startDoPhoneCyWork(index, doms, phoneWeb) }, 5000)
            return
        }
        let workStatus = $(workIframe).contents().find('.newTestCon .newTestTitle .testTit_status').text().trim()
        if (!workStatus) {
            _domList.splice(0, 1)
            setTimeout(missonStart, 2000)
            return
        }
        if (isRedoMode() && workStatus.indexOf("已完成") != -1) {
            logger('测验：' + (index + 1) + ',重做模式下重新处理已完成测验', 'blue')
            $(workIframe).attr('src', phoneWeb)
            getElement($(doms[index]).contents()[0], 'iframe[src="' + phoneWeb + '"]').then((element) => {
                setTimeout(() => { doPhoneWork($(element).contents()) }, 3000)
            })
        } else if (workStatus.indexOf("待做") != -1 || workStatus.indexOf("待完成") != -1 || workStatus.indexOf("重做") != -1 || workStatus.indexOf("未达到") != -1) {
            var isRedoStatus = workStatus.indexOf("重做") != -1 || workStatus.indexOf("未达到") != -1
            logger('测验：' + (index + 1) + (isRedoStatus ? ',未达到及格线,准备重做...' : ',准备处理此测验...'), 'purple')
            $(workIframe).attr('src', phoneWeb)
            getElement($(doms[index]).contents()[0], 'iframe[src="' + phoneWeb + '"]').then((element) => {
                setTimeout(() => { doPhoneWork($(element).contents()) }, 3000)
            })
        } else if (workStatus.indexOf('待批阅') != -1) {
            _mlist.splice(0, 1)
            _domList.splice(0, 1)
            logger('测验：' + (index + 1) + ',测验待批阅,跳过', 'red')
            setTimeout(() => { startDoPhoneCyWork(index + 1, doms, phoneWeb) }, 5000)
        } else {
            _mlist.splice(0, 1)
            _domList.splice(0, 1)
            logger('测验：' + (index + 1) + ',未知状态[' + workStatus + '],跳过', 'red')
            setTimeout(() => { startDoPhoneCyWork(index + 1, doms, phoneWeb) }, 5000)
        }
    })
}

function startDoCyWork(index, doms) {
    if (index == doms.length) {
        logger('此页面全部测验已处理完毕！准备进行下一项任务')
        setTimeout(missonStart, 5000)
        return
    }
    logger('等待测验框架加载...', 'purple')
    pollForElement(doms[index], 'iframe').then(element => {
        let workIframe = element
        if (!workIframe) {
            setTimeout(() => { startDoCyWork(index, doms) }, 5000)
            return
        }
        let workStatus = $(workIframe).contents().find(".newTestCon .newTestTitle .testTit_status").text().trim()
        if (!workStatus) {
            _domList.splice(0, 1)
            setTimeout(missonStart, 2000)
            return
        }
        if (isRedoMode() && workStatus.indexOf("已完成") != -1) {
            logger('测验：' + (index + 1) + ',重做模式下重新处理已完成测验', 'blue')
            setTimeout(() => { doWork(index, doms, workIframe) }, 5000)
        } else if (workStatus.indexOf("待做") != -1 || workStatus.indexOf("待完成") != -1 || workStatus.indexOf("重做") != -1 || workStatus.indexOf("未达到") != -1) {
            var isRedoStatus = workStatus.indexOf("重做") != -1 || workStatus.indexOf("未达到") != -1
            logger('测验：' + (index + 1) + (isRedoStatus ? ',未达到及格线,准备重做...' : ',准备处理此测验...'), 'purple')
            setTimeout(() => { doWork(index, doms, workIframe) }, 5000)
        } else if (workStatus.indexOf('待批阅') != -1) {
            _mlist.splice(0, 1)
            _domList.splice(0, 1)
            logger('测验：' + (index + 1) + ',测验待批阅,跳过', 'red')
            setTimeout(() => { startDoCyWork(index + 1, doms) }, 5000)
        } else {
            _mlist.splice(0, 1)
            _domList.splice(0, 1)
            logger('测验：' + (index + 1) + ',未知状态[' + workStatus + '],跳过', 'red')
            setTimeout(() => { startDoCyWork(index + 1, doms) }, 5000)
        }
    })
}



function getElement(parent, selector, timeout = 0) {
    /**
     * Author   cxxjackie
     * From     https://bbs.tampermonkey.net.cn
     */
    return new Promise(resolve => {
        var result = parent.querySelector(selector);
        if (result) return resolve(result);
        var timer;
        const mutationObserver = window.MutationObserver || window.WebkitMutationObserver || window.MozMutationObserver;
        if (mutationObserver) {
            const observer = new mutationObserver(mutations => {
                for (var mutation of mutations) {
                    for (var addedNode of mutation.addedNodes) {
                        if (addedNode instanceof Element) {
                            result = addedNode.matches(selector) ? addedNode : addedNode.querySelector(selector);
                            if (result) {
                                observer.disconnect();
                                timer && clearTimeout(timer);
                                return resolve(result);
                            }
                        }
                    }
                }
            });
            observer.observe(parent, {
                childList: true,
                subtree: true
            });
            if (timeout > 0) {
                timer = setTimeout(() => {
                    observer.disconnect();
                    return resolve(null);
                }, timeout);
            }
        } else {
            const listener = e => {
                if (e.target instanceof Element) {
                    result = e.target.matches(selector) ? e.target : e.target.querySelector(selector);
                    if (result) {
                        parent.removeEventListener('DOMNodeInserted', listener, true);
                        timer && clearTimeout(timer);
                        return resolve(result);
                    }
                }
            };
            parent.addEventListener('DOMNodeInserted', listener, true);
            if (timeout > 0) {
                timer = setTimeout(() => {
                    parent.removeEventListener('DOMNodeInserted', listener, true);
                    return resolve(null);
                }, timeout);
            }
        }
    });
}

function missonHomeWork() {
    logger('开始处理作业', 'green')
    let $_homeworktable = $('.mark_table').find('form')
    let TimuList = $_homeworktable.find('.questionLi')
    doHomeWork(0, TimuList)
}

function doHomeWork(index, TiMuList) {
    if (index == TiMuList.length) {
        logger('作业题目已全部完成', 'green')
        return
    }


    // Helper function for handling normal textareas
    function handleNormalTextarea(textareaList, jdt, index, TiMuList) {
        if (!textareaList || textareaList.length === 0) {
            setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time);
            return;
        }
        getAnswer(4, jdt).then((agrs) => {
            $.each(textareaList, (i, t) => {
                let _id = $(t).attr('id') || $(t).attr('name');
                setTimeout(() => {
                    try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                }, 300 + i * 200);
            });
            logger('自动答题成功，准备切换下一题', 'green');
            setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time + 200 * textareaList.length);
        }).catch((agrs) => {
            if (agrs && agrs['c'] == 0) {
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time);
            }
        });
    }

    let typeName = $(TiMuList[index]).attr('typename');
    let _type = ({
        单选题: 0, 单项选择题: 0, 单选: 0,
        多选题: 1, 多项选择题: 1, 多选: 1,
        填空题: 2, 填空: 2,
        判断题: 3, 是非题: 3, 判断: 3,
        简答题: 4, 简答: 4, 问答题: 4, 名词解释: 4, 论述题: 4, 论述: 4,
        计算题: 4, 计算: 4, 分录题: 4, 资料题: 4, 作图题: 4, 其他: 4, 其它: 4, 阅读理解: 4, 阅读: 4, 阅读题: 4, 理解题: 4, 完形填空: 4, 完形: 4, 综合题: 4,
        写作题: 5,
        翻译题: 6
    })[typeName]
    _currentQuestionMeta = { index: index, total: TiMuList.length, typeName: typeName }
    let _questionFull = $(TiMuList[index]).find('.mark_name').html()
    let _question = tidyQuestion(_questionFull).replace(/^[(].*?[)]/, '').trim()
    let _a = []
    let _answerTmpArr, _textareaList
    var check_answer_flag = 0;

    // 如果题型不在预设类型中，根据DOM结构自动识别题型
    if (_type === undefined) {
        logger('未知题型: ' + typeName + '，尝试自动识别', 'blue');

        // 检查是否有选择题特征
        _answerTmpArr = $(TiMuList[index]).find('.stem_answer').find('.answer_p')
        if (_answerTmpArr && _answerTmpArr.length > 0) {
            _type = 0; // 假定为单选题

            // 检查是否有多个可选项
            let multiChoiceCheck = $(TiMuList[index]).find('.stem_answer input[type="checkbox"]');
            if (multiChoiceCheck && multiChoiceCheck.length > 0) {
                _type = 1; // 多选题
                logger('自动识别为多选题', 'green');
            } else {
                logger('自动识别为单选题', 'green');
            }
        }
        // 检查是否有文本输入框特征
        else {
            _textareaList = $(TiMuList[index]).find('.stem_answer').find('.subEditor textarea, .Answer .divText textarea, .Answer .divText .textDIV textarea, textarea[name^="answerEditor"], .edui-editor textarea');
            if (_textareaList && _textareaList.length > 0) {
                _type = 4; // 简答题
                logger('自动识别为简答题', 'green');
            }
        }
    }

    switch (_type) {
        case 0: {
            _answerTmpArr = $(TiMuList[index]).find('.stem_answer').find('.answer_p')

            //遍历选项列表
            let mergedAnswers = [];
            _answerTmpArr.each(function () {
                var answerText = $(this).text().replace(/[ABCD]/g, '').trim();
                mergedAnswers.push(answerText);
            });
            mergedAnswers = mergedAnswers.join("|");
            _question = buildPrompt({ type: '单选题', question: _question, options: mergedAnswers.split('|') })
            //判断题目是否已作答
            for (let i = 0; i < _answerTmpArr.length; i++) {
                if (($(_answerTmpArr[i]).parent().find('span').attr('class') || '').indexOf('check_answer') == -1) {
                    //没有被选择
                } else {
                    if (!isRedoMode()) {
                        logger(index + 1 + '此题已作答，准备切换下一题', 'green')
                        check_answer_flag = 1;
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, 30)
                    } else {
                        logger(index + 1 + '此题已作答，重做模式下重新作答', 'blue')
                        $(_answerTmpArr[i]).parent().click()
                    }
                    break
                }
            }
            if (check_answer_flag == 0) {
                getAnswer(_type, _question).then((agrs) => {
                    $.each(_answerTmpArr, (i, t) => {
                        _a.push(tidyStr($(t).html()))
                    })
                    if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                        //修改题目将答案插入
                        let timuele = $(TiMuList[index]).find('.mark_name')
                        // logger("timuele题目标签:"+timuele.html())
                        timuele.html(timuele.html() + "<p></p>" + agrs)
                    }
                    let _i = _a.findIndex((item) => item == agrs)

                    if (_i == -1) {
                        // 精确匹配失败，尝试相似度匹配
                        _i = findBestFuzzyMatch(_a, agrs)
                    }
                    if (_i == -1) {
                        logger('AI未能完美匹配正确答案，请尝试更换更高级模型或手动选择，跳过此题', 'red')
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                    } else {
                        setTimeout(() => {
                            let check = $(_answerTmpArr[_i]).parent().find('span').attr('class') || ''
                            if (check.indexOf('check_answer') == -1) {
                                $(_answerTmpArr[_i]).parent().click()
                            }
                            logger('自动答题成功，准备切换下一题', 'green')
                            setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                        }, 300)
                    }
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                    }
                })
            }
        }
            break

        case 1: {
            _answerTmpArr = $(TiMuList[index]).find('.stem_answer').find('.answer_p')
            //遍历选项列表
            let mergedAnswers = [];
            _answerTmpArr.each(function () {
                var answerText = $(this).text().replace(/[ABCD]/g, '').trim();
                mergedAnswers.push(answerText);
            });
            mergedAnswers = mergedAnswers.join("|");
            _question = buildPrompt({ type: '多选题', question: _question, options: mergedAnswers.split('|'), answer_format: "用'|'分割多个答案" })
            //判断题目是否已作答
            for (let i = 0; i < _answerTmpArr.length; i++) {
                if (($(_answerTmpArr[i]).parent().find('span').attr('class') || '').indexOf('check_answer') == -1) {
                    //没有被选择
                } else {
                    if (!isRedoMode()) {
                        logger(index + 1 + '此题已作答，准备切换下一题', 'green')
                        check_answer_flag = 1;
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, 30)
                        break
                    } else {
                        logger(index + 1 + '此题已作答，重做模式下取消旧答案', 'blue')
                        $(_answerTmpArr[i]).parent().click()
                        // 不break，继续取消其他已选选项
                    }
                }
            }
            if (check_answer_flag == 0) {
                getAnswer(_type, _question).then((agrs) => {
                    if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                        //修改题目将答案插入
                        let timuele = $(TiMuList[index]).find('.mark_name')
                        // logger("timuele题目标签:"+timuele.html())
                        timuele.html(timuele.html() + "<p></p>" + agrs)
                    }
                    let _multiOptions = []
                    $.each(_answerTmpArr, (i, t) => {
                        _multiOptions.push(tidyStr($(t).html()))
                    })
                    let _matchedAny = false
                    $.each(_answerTmpArr, (i, t) => {
                        if (agrs.indexOf(_multiOptions[i]) != -1) {
                            _matchedAny = true
                            setTimeout(() => {
                                let check = $(_answerTmpArr[i]).parent().find('span').attr('class') || ''
                                if (check.indexOf('check_answer_dx') == -1) {
                                    $(_answerTmpArr[i]).parent().click()
                                }
                            }, 300)
                        }
                    });
                    // 如果精确匹配没有命中任何选项，尝试模糊匹配
                    if (!_matchedAny) {
                        let fuzzyIndices = findFuzzyMatchMultiple(_multiOptions, agrs)
                        for (var fi = 0; fi < fuzzyIndices.length; fi++) {
                            (function (idx) {
                                setTimeout(function () {
                                    let check = $(_answerTmpArr[idx]).parent().find('span').attr('class') || ''
                                    if (check.indexOf('check_answer_dx') == -1) {
                                        $(_answerTmpArr[idx]).parent().click()
                                    }
                                }, 300)
                            })(fuzzyIndices[fi])
                        }
                    }
                    logger('自动答题成功，准备切换下一题', 'green')
                    setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                    }
                })
            }
        }
            break
        case 2: {
            _question = buildPrompt({ type: '填空题', question: _question, answer_format: "用'|'分割多个答案" });
            _textareaList = findAnswerTextareas($(TiMuList[index]));
            if (!_textareaList || _textareaList.length === 0) {
                logger('未找到填空题输入区域，跳过此题', 'red');
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time);
                break
            }
            // 判断题目是否已作答（用 try/catch 防止 UE.getEditor 抛错；id 为空则回退 name）
            let _id = $(_textareaList[0]).attr('id') || $(_textareaList[0]).attr('name');
            let firstAnswered = false;
            try {
                if (_id && UE.getEditor(_id) && UE.getEditor(_id).getContent && UE.getEditor(_id).getContent() !== '') firstAnswered = true;
            } catch (e) { firstAnswered = false; }
            if (firstAnswered && !isRedoMode()) {
                logger(index + 1 + '此题已作答，准备切换下一题', 'green');
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, 30);
            } else {
                getAnswer(_type, _question).then((agrs) => {
                    let _answerTmpArr = (agrs || '').split('|');
                    $.each(_textareaList, (i, t) => {
                        let _currentId = $(t).attr('id') || $(t).attr('name');
                        let val = _answerTmpArr[i] !== undefined ? _answerTmpArr[i] : (_answerTmpArr[0] || agrs);
                        setTimeout(() => {
                            try { UE.getEditor(_currentId).setContent(val) } catch (e) { /* ignore */ }
                        }, 300 + i * 200);
                    });
                    setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time + 200 * _textareaList.length);
                    logger('自动答题成功，准备切换下一题', 'green');
                }).catch((agrs) => {
                    if (agrs && agrs['c'] == 0) {
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time);
                    }
                });
            }
            break
        }
        case 3: {
            _answerTmpArr = $(TiMuList[index]).find('.stem_answer').find('.answer_p')
            $.each(_answerTmpArr, (i, t) => {
                _a.push($(t).text().trim())
            })
            //判断题目是否已作答
            for (let i = 0; i < _answerTmpArr.length; i++) {
                if (($(_answerTmpArr[i]).parent().find('span').attr('class') || '').indexOf('check_answer') == -1) {
                    //没有被选择
                } else {
                    if (!isRedoMode()) {
                        logger(index + 1 + '此题已作答，准备切换下一题', 'green')
                        check_answer_flag = 1;
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, 30)
                    } else {
                        logger(index + 1 + '此题已作答，重做模式下重新作答', 'blue')
                        $(_answerTmpArr[i]).parent().click()
                    }
                    break
                }
            }
            if (check_answer_flag == 0) {
                _question = buildPrompt({ type: '判断题', question: _question, answer_format: "只回答正确或错误" })
                getAnswer(_type, _question).then((agrs) => {
                    if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                        let timuele = $(TiMuList[index]).find('.mark_name')
                        timuele.html(timuele.html() + "<p></p>" + agrs)
                    }
                    let judgeResult = parseJudgeAnswer(agrs)
                    if (judgeResult === null) {
                        logger('答案匹配出错，准备切换下一题', 'red')
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                        return
                    }
                    let _i = findJudgeOptionIndex(_a, judgeResult === 'true')
                    if (_i === -1) {
                        logger('未匹配到正确选项，跳过', 'red')
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                        return
                    }
                    setTimeout(() => {
                        let check = $(_answerTmpArr[_i]).parent().find('span').attr('class') || ''
                        if (check.indexOf('check_answer') == -1) {
                            $(_answerTmpArr[_i]).parent().click()
                        }
                    }, 300)
                    logger('自动答题成功，准备切换下一题', 'green')
                    setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                }).catch((agrs) => {
                    if (agrs['c'] == 0) {
                        setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                    }
                })
            }
            break
        }
        case 4: {
            let _answerEle = findAnswerTextareas($(TiMuList[index]))
            if (!_answerEle || _answerEle.length === 0) {
                logger((index + 1) + ' 未找到文本作答区域，跳过此题', 'red')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                break
            }
            let _isAnswered4 = false
            $.each(_answerEle, function (i, t) {
                let _eid = $(t).attr('id') || $(t).attr('name')
                try { if (_eid && UE.getEditor(_eid) && UE.getEditor(_eid).getContent && UE.getEditor(_eid).getContent() !== '') _isAnswered4 = true } catch (e) { /* ignore */ }
            })
            if (_isAnswered4 && !isRedoMode()) {
                logger((index + 1) + ' 此题已作答，准备切换下一题', 'green')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, 30)
                break
            }
            let jdt = buildPrompt({ type: typeName || '简答题', question: _question, answer_format: "用50字简要回答" })
            getAnswer(_type, jdt).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $(TiMuList[index]).find('.mark_name')
                    timuele.html(timuele.html() + "<p></p>" + agrs)
                }
                $.each(_answerEle, (i, t) => {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(() => {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200);
                });
                logger('自动答题成功，准备切换下一题', 'green')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time + 200 * _answerEle.length);
            }).catch(() => {
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
            });
        }
            break
        case 5: {
            let _answerEle5 = findAnswerTextareas($(TiMuList[index]))
            if (!_answerEle5 || _answerEle5.length === 0) {
                logger((index + 1) + ' 未找到写作题文本框，跳过此题', 'red')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                break
            }
            // 已作答检测
            let _isAnswered5 = false
            $.each(_answerEle5, function (i, t) {
                let _eid = $(t).attr('id') || $(t).attr('name')
                try { if (_eid && UE.getEditor(_eid) && UE.getEditor(_eid).getContent && UE.getEditor(_eid).getContent() !== '') _isAnswered5 = true } catch (e) { /* ignore */ }
            })
            if (_isAnswered5 && !isRedoMode()) {
                logger((index + 1) + ' 此题已作答，准备切换下一题', 'green')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, 30)
                break
            }
            let jdt5 = buildPrompt({ type: typeName || '写作题', question: _question, answer_format: "用英文根据题目进行写作" })
            getAnswer(_type, jdt5).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $(TiMuList[index]).find('.mark_name')
                    timuele.html(timuele.html() + "<p></p>" + agrs)
                }
                $.each(_answerEle5, (i, t) => {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(() => {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200);
                });
                logger('自动答题成功，准备切换下一题', 'green')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time + 200 * _answerEle5.length);
            }).catch(() => {
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
            });
        }
            break
        case 6: {
            let _answerEle6 = findAnswerTextareas($(TiMuList[index]))
            if (!_answerEle6 || _answerEle6.length === 0) {
                logger((index + 1) + ' 未找到翻译题文本框，跳过此题', 'red')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
                break
            }
            // 已作答检测
            let _isAnswered6 = false
            $.each(_answerEle6, function (i, t) {
                let _eid = $(t).attr('id') || $(t).attr('name')
                try { if (_eid && UE.getEditor(_eid) && UE.getEditor(_eid).getContent && UE.getEditor(_eid).getContent() !== '') _isAnswered6 = true } catch (e) { /* ignore */ }
            })
            if (_isAnswered6 && !isRedoMode()) {
                logger((index + 1) + ' 此题已作答，准备切换下一题', 'green')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, 30)
                break
            }
            let jdt6 = buildPrompt({ type: typeName || '翻译题', question: _question, answer_format: "中文英文互译" })
            getAnswer(_type, jdt6).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $(TiMuList[index]).find('.mark_name')
                    timuele.html(timuele.html() + "<p></p>" + agrs)
                }
                $.each(_answerEle6, (i, t) => {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(() => {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200);
                });
                logger('自动答题成功，准备切换下一题', 'green')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time + 200 * _answerEle6.length);
            }).catch(() => {
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
            });
        }
            break
        default: {
            if (_type === undefined) {
                logger('无法识别题型：' + typeName + '，跳过此题', 'red')
                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time)
            } else {
                // 尝试获取文本输入区域
                _textareaList = $(TiMuList[index]).find('.stem_answer').find('textarea, .subEditor textarea, .divText textarea, .eidtDiv textarea, .divText .edui-editor, textarea[name^="answerEditor"]');
                if (_textareaList && _textareaList.length > 0) {
                    logger('检测到文本输入区域，尝试回答', 'green');
                    let jdt = buildPrompt({ type: typeName || '未知题型', question: _question, answer_format: "请根据题目作答" })

                    // 检查是否有富文本编辑器特有的textarea
                    let editorTextareas = $(TiMuList[index]).find('.stem_answer textarea[name^="answerEditor"]');
                    if (editorTextareas && editorTextareas.length > 0) {
                        // 使用富文本编辑器ID
                        let editorId = $(editorTextareas[0]).attr('id');
                        if (editorId) {
                            getAnswer(_type || 4, jdt).then((agrs) => {
                                setTimeout(() => { UE.getEditor(editorId).setContent(agrs) }, 300);
                                logger('使用富文本编辑器ID回答成功，准备切换下一题', 'green');
                                setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time);
                            }).catch((agrs) => {
                                if (agrs['c'] == 0) {
                                    setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time);
                                }
                            });
                        } else {
                            logger('找到富文本编辑器但无法获取ID，改用普通方法', 'yellow');
                            // 如果没有ID，退回到常规处理
                            handleNormalTextarea(_textareaList, jdt, index, TiMuList);
                        }
                    } else {
                        // 处理普通文本输入区域
                        handleNormalTextarea(_textareaList, jdt, index, TiMuList);
                    }


                } else {
                    logger('无法处理此题型：' + typeName + '，跳过此题', 'red');
                    setTimeout(() => { doHomeWork(index + 1, TiMuList) }, setting.time);
                }
            }
        }
    }
}

function missonExam() {
    let $_examtable = $('.mark_table').find('.whiteDiv')
    let _questionFull = tidyStr($_examtable.find('h3.mark_name').html().trim())
    let typeName = _questionFull.match(/[(](.*?),.*?分[)]|$/)[1];
    let _qType = ({
        单选题: 0, 单项选择题: 0, 单选: 0,
        多选题: 1, 多项选择题: 1, 多选: 1,
        填空题: 2, 填空: 2,
        判断题: 3, 是非题: 3, 判断: 3,
        简答题: 4, 简答: 4, 问答题: 4, 名词解释: 4, 论述题: 4, 论述: 4,
        计算题: 4, 计算: 4, 分录题: 4, 资料题: 4, 作图题: 4, 其他: 4, 其它: 4, 阅读理解: 4, 阅读: 4, 阅读题: 4, 理解题: 4, 完形填空: 4, 完形: 4, 综合题: 4,
        写作题: 5,
        翻译题: 6
    })[typeName]
    // 尝试从导航栏获取当前题号
    let _examCurIdx = null
    try {
        let $curLi = $('.mark_table .mark_li_list li.active, .mark_table .mark_li_list li.current')
        if ($curLi.length) _examCurIdx = parseInt($curLi.text().trim()) - 1
    } catch (_) { /* empty */ }
    _currentQuestionMeta = { index: isFinite(_examCurIdx) ? _examCurIdx : null, total: null, typeName: typeName }
    let _question = tidyQuestion(_questionFull.replace(/[(].*?分[)]/, '').replace(/^\s*/, ''))
    let $_ansdom = $_examtable.find('#submitTest').find('.stem_answer')
    let _answerTmpArr;
    let _a = []

    function handleStandardExamTextarea(standardTextareas, _question) {
        logger('检测到标准文本输入区域，尝试回答', 'green');
        let jdt = buildPrompt({ type: typeName || '未知题型', question: _question, answer_format: "请根据题目作答" })
        getAnswer(4, jdt).then((agrs) => {
            $.each(standardTextareas, (i, t) => {
                let _id = $(t).attr('id')
                setTimeout(() => { UE.getEditor(_id).setContent(agrs) }, 300)
            })
            logger('自动答题成功，准备切换下一题', 'green')
            toNextExam()
        }).catch((agrs) => {
            if (agrs['c'] == 0) {
                toNextExam()
            }
        })
    }

    // 如果题型不在预设类型中，根据DOM结构自动识别题型
    if (_qType === undefined) {
        logger('未知题型: ' + typeName + '，尝试自动识别', 'blue');

        // 检查是否有选择题特征
        _answerTmpArr = $_ansdom.find('.clearfix.answerBg .fl.answer_p');
        if (_answerTmpArr && _answerTmpArr.length > 0) {
            _qType = 0; // 假定为单选题

            // 检查是否有多个可选项
            let multiChoiceCheck = $_ansdom.find('.clearfix.answerBg input[type="checkbox"]');
            if (multiChoiceCheck && multiChoiceCheck.length > 0) {
                _qType = 1; // 多选题
                logger('自动识别为多选题', 'green');
            } else {
                logger('自动识别为单选题', 'green');
            }
        }
        // 检查是否有文本输入框特征
        else {
            let _textareaList = $_ansdom.find('.Answer .divText .subEditor textarea, .Answer .divText .edui-editor, .Answer .divText textarea, textarea[name^="answerEditor"]');
            if (_textareaList && _textareaList.length > 0) {
                _qType = 4; // 简答题
                logger('自动识别为简答题', 'green');
            }
        }
    }

    switch (_qType) {
        case 0: {
            _answerTmpArr = $_ansdom.find('.clearfix.answerBg .fl.answer_p')
            // 已作答前置检查：兼容 check_answer 与 check_answer_dx（indexOf('check_answer') 都能命中）
            let _answeredIdxE0 = -1
            for (let _ai = 0; _ai < _answerTmpArr.length; _ai++) {
                let _cls = $(_answerTmpArr[_ai]).parent().find('span').attr('class') || ''
                if (_cls.indexOf('check_answer') !== -1) { _answeredIdxE0 = _ai; break }
            }
            if (_answeredIdxE0 !== -1 && !isRedoMode()) {
                logger('此题已作答，准备切换下一题', 'green')
                toNextExam()
                break
            }
            if (_answeredIdxE0 !== -1 && isRedoMode()) {
                logger('此题已作答，重做模式下重新作答', 'blue')
                $(_answerTmpArr[_answeredIdxE0]).parent().click()
            }
            //遍历选项列表
            let mergedAnswers = [];
            _answerTmpArr.each(function () {
                var answerText = $(this).text().replace(/[ABCD]/g, '').trim();
                mergedAnswers.push(answerText);
            });
            mergedAnswers = mergedAnswers.join("|");
            _question = buildPrompt({ type: '单选题', question: _question, options: mergedAnswers.split('|') })
            getAnswer(_qType, _question).then((agrs) => {
                $.each(_answerTmpArr, (i, t) => {
                    _a.push(tidyStr($(t).html()))
                })
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    //修改题目将答案插入
                    let timuele = $_examtable.find('h3.mark_name')
                    // logger(timuele.html())
                    timuele.html(timuele.html() + agrs)
                }

                let _i = _a.findIndex((item) => item == agrs)
                if (_i == -1) {
                    // 精确匹配失败，尝试相似度匹配
                    _i = findBestFuzzyMatch(_a, agrs)
                }
                if (_i == -1) {
                    logger('AI未能完美匹配正确答案，请尝试更换更高级模型或手动选择，跳过此题', 'red')
                    setTimeout(toNextExam, 5000)
                } else {
                    setTimeout(() => {
                        if (($(_answerTmpArr[_i]).parent().find('span').attr('class') || '').indexOf('check_answer') == -1) {
                            //好学生模式,ABCD加粗
                            if (localStorage.getItem('GPTJsSetting.goodStudent') === 'true') {
                                $(_answerTmpArr[_i]).parent().find('span').css('font-weight', 'bold');
                            } else {
                                setTimeout(() => { $(_answerTmpArr[_i]).parent().click() }, 300)
                            }
                            logger('自动答题成功，准备切换下一题', 'green')
                            toNextExam()
                        } else {
                            logger('此题已作答，准备切换下一题', 'green')
                            toNextExam()
                        }
                    }, 300)
                }
            }).catch((agrs) => {
                if (agrs['c'] == 0) {
                    toNextExam()
                }
            })
        }
            break
        case 1: {
            _answerTmpArr = $_ansdom.find('.clearfix.answerBg .fl.answer_p')
            // 已作答前置检查（多选用 check_answer_dx）
            let _alreadyAnsweredE1 = $_ansdom.find('.clearfix.answerBg span.check_answer_dx, .clearfix.answerBg span.check_answer').length > 0
            if (_alreadyAnsweredE1 && !isRedoMode()) {
                logger('此题已作答，准备切换下一题', 'green')
                toNextExam()
                break
            }
            if (_alreadyAnsweredE1 && isRedoMode()) {
                logger('此题已作答，重做模式下重新作答', 'blue')
                $.each(_answerTmpArr, function (_i2, _t2) {
                    var _cls2 = $(_t2).parent().find('span').attr('class') || ''
                    if (_cls2.indexOf('check_answer') !== -1) {
                        $(_t2).parent().click()
                    }
                })
            }
            //遍历选项列表
            let mergedAnswers = [];
            _answerTmpArr.each(function () {
                var answerText = $(this).text().replace(/[ABCD]/g, '').trim();
                mergedAnswers.push(answerText);
            });
            mergedAnswers = mergedAnswers.join("|");
            _question = buildPrompt({ type: '多选题', question: _question, options: mergedAnswers.split('|'), answer_format: "用'|'分割多个答案" })
            getAnswer(_qType, _question).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    //修改题目将答案插入
                    let timuele = $_examtable.find('h3.mark_name')
                    // logger(timuele.html())
                    timuele.html(timuele.html() + agrs)
                }

                {
                    let _multiOptions = []
                    $.each(_answerTmpArr, (i, t) => {
                        _multiOptions.push(tidyStr($(t).html()))
                    })
                    let _matchedAny = false
                    $.each(_answerTmpArr, (i, t) => {
                        if (agrs.indexOf(_multiOptions[i]) != -1) {
                            _matchedAny = true
                            //好学生模式,ABCD加粗
                            if (localStorage.getItem('GPTJsSetting.goodStudent') === 'true') {
                                $(_answerTmpArr[i]).parent().find('span').css('font-weight', 'bold');
                            } else {
                                setTimeout(() => { $(_answerTmpArr[i]).parent().click() }, 300)
                            }
                        }
                    });
                    // 如果精确匹配没有命中任何选项，尝试模糊匹配
                    if (!_matchedAny) {
                        let fuzzyIndices = findFuzzyMatchMultiple(_multiOptions, agrs)
                        for (var fi = 0; fi < fuzzyIndices.length; fi++) {
                            (function (idx) {
                                if (localStorage.getItem('GPTJsSetting.goodStudent') === 'true') {
                                    $(_answerTmpArr[idx]).parent().find('span').css('font-weight', 'bold');
                                } else {
                                    setTimeout(function () { $(_answerTmpArr[idx]).parent().click() }, 300)
                                }
                            })(fuzzyIndices[fi])
                        }
                    }
                    logger('自动答题成功，准备切换下一题', 'green')
                    toNextExam()
                }
            }).catch((agrs) => {
                if (agrs['c'] == 0) {
                    toNextExam()
                }
            })
        }
            break
        case 2: {
            let _textareaList = $_ansdom.find('.Answer .divText .subEditor textarea')
            // 已作答前置检查：任一 textarea 已有内容即视为已作答
            let _alreadyAnsweredE2 = false
            $.each(_textareaList, function (_i2, _t2) {
                let _eid = $(_t2).attr('id')
                try {
                    if (_eid && typeof UE !== 'undefined' && UE.getEditor(_eid) && UE.getEditor(_eid).getContent && UE.getEditor(_eid).getContent() !== '') {
                        _alreadyAnsweredE2 = true
                    }
                } catch (_e) { /* ignore */ }
            })
            if (_alreadyAnsweredE2 && !isRedoMode()) {
                logger('此题已作答，准备切换下一题', 'green')
                toNextExam()
                break
            }
            if (_alreadyAnsweredE2 && isRedoMode()) {
                logger('此题已作答，重做模式下重新作答', 'blue')
                $.each(_textareaList, function (_i2, _t2) {
                    let _eid = $(_t2).attr('id')
                    try { if (_eid && UE.getEditor(_eid)) UE.getEditor(_eid).setContent('') } catch (_e) { /* ignore */ }
                })
            }
            _question = buildPrompt({ type: '填空题', question: _question, answer_format: "用'|'分割多个答案" });
            // logger(_textareaList)
            getAnswer(_qType, _question).then((agrs) => {
                let _answerTmpArr = agrs.split('|')
                $.each(_textareaList, (i, t) => {
                    let _id = $(t).attr('id')
                    setTimeout(() => { UE.getEditor(_id).setContent(_answerTmpArr[i]) }, 300)
                })
                logger('自动答题成功，准备切换下一题', 'green')
                toNextExam()
            }).catch((agrs) => {
                if (agrs && agrs['c'] == 0) { toNextExam() }
            })
            break
        }
        case 3: {
            _answerTmpArr = $_ansdom.find('.clearfix.answerBg .fl.answer_p')
            // 已作答前置检查
            let _answeredIdxE3 = -1
            for (let _ai = 0; _ai < _answerTmpArr.length; _ai++) {
                let _cls = $(_answerTmpArr[_ai]).parent().find('span').attr('class') || ''
                if (_cls.indexOf('check_answer') !== -1) { _answeredIdxE3 = _ai; break }
            }
            if (_answeredIdxE3 !== -1 && !isRedoMode()) {
                logger('此题已作答，准备切换下一题', 'green')
                toNextExam()
                break
            }
            if (_answeredIdxE3 !== -1 && isRedoMode()) {
                logger('此题已作答，重做模式下重新作答', 'blue')
                $(_answerTmpArr[_answeredIdxE3]).parent().click()
            }
            _question = buildPrompt({ type: '判断题', question: _question, answer_format: "只回答正确或错误" });
            $.each(_answerTmpArr, (i, t) => {
                _a.push($(t).text().trim())
            })
            getAnswer(_qType, _question).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    //修改题目将答案插入
                    let timuele = $_examtable.find('h3.mark_name')
                    timuele.html(timuele.html() + agrs)
                }

                let judgeResult = parseJudgeAnswer(agrs)
                if (judgeResult === null) {
                    logger('答案匹配出错，准备切换下一题', 'red')
                    toNextExam()
                    return
                }
                let _i = findJudgeOptionIndex(_a, judgeResult === 'true')
                if (_i === -1) {
                    logger('未匹配到正确选项，跳过', 'red')
                    toNextExam()
                    return
                }
                if (($(_answerTmpArr[_i]).parent().find('span').attr('class') || '').indexOf('check_answer') == -1) {
                    //好学生模式,ABCD加粗
                    if (localStorage.getItem('GPTJsSetting.goodStudent') === 'true') {
                        setTimeout(() => { $(_answerTmpArr[_i]).parent().find('span').css('font-weight', 'bold'); }, 300)
                    } else {
                        $(_answerTmpArr[_i]).parent().click()
                    }
                    logger('自动答题成功，准备切换下一题', 'green')
                    toNextExam()
                } else {
                    logger('此题已作答，准备切换下一题', 'green')
                    toNextExam()
                }
            }).catch((agrs) => {
                if (agrs['c'] == 0) {
                    toNextExam()
                }
            })
            break
        }
        case 4: {
            let _answerEle = findAnswerTextareas($_ansdom)
            if (!_answerEle || _answerEle.length === 0) { toNextExam(); break }
            // 已作答检测
            let _isAnsweredE4 = false
            $.each(_answerEle, function (i, t) {
                let _eid = $(t).attr('id') || $(t).attr('name')
                try { if (_eid && UE.getEditor(_eid) && UE.getEditor(_eid).getContent && UE.getEditor(_eid).getContent() !== '') _isAnsweredE4 = true } catch (e) { /* ignore */ }
            })
            if (_isAnsweredE4 && !isRedoMode()) {
                logger('此题已作答，准备切换下一题', 'green')
                toNextExam()
                break
            }
            let jdt = buildPrompt({ type: typeName || '简答题', question: _question, answer_format: "用50字简要回答" })
            getAnswer(_qType, jdt).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $_examtable.find('h3.mark_name')
                    timuele.html(timuele.html() + agrs)
                }
                $.each(_answerEle, (i, t) => {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(() => {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200);
                });
                setTimeout(toNextExam, 300 + 200 * _answerEle.length);
            }).catch(() => { toNextExam(); });
        }
            break
        case 5: {
            let _answerEle = findAnswerTextareas($_ansdom)
            if (!_answerEle || _answerEle.length === 0) { toNextExam(); break }
            // 已作答检测
            let _isAnsweredE5 = false
            $.each(_answerEle, function (i, t) {
                let _eid = $(t).attr('id') || $(t).attr('name')
                try { if (_eid && UE.getEditor(_eid) && UE.getEditor(_eid).getContent && UE.getEditor(_eid).getContent() !== '') _isAnsweredE5 = true } catch (e) { /* ignore */ }
            })
            if (_isAnsweredE5 && !isRedoMode()) {
                logger('此题已作答，准备切换下一题', 'green')
                toNextExam()
                break
            }
            let jdt = buildPrompt({ type: typeName || '写作题', question: _question, answer_format: "用英文根据题目进行写作" })
            getAnswer(_qType, jdt).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $_examtable.find('h3.mark_name')
                    timuele.html(timuele.html() + agrs)
                }
                $.each(_answerEle, (i, t) => {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(() => {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200);
                });
                setTimeout(toNextExam, 300 + 200 * _answerEle.length);
            }).catch(() => { toNextExam(); });
        }
            break
        case 6: {
            let _answerEle = findAnswerTextareas($_ansdom)
            if (!_answerEle || _answerEle.length === 0) { toNextExam(); break }
            // 已作答检测
            let _isAnsweredE6 = false
            $.each(_answerEle, function (i, t) {
                let _eid = $(t).attr('id') || $(t).attr('name')
                try { if (_eid && UE.getEditor(_eid) && UE.getEditor(_eid).getContent && UE.getEditor(_eid).getContent() !== '') _isAnsweredE6 = true } catch (e) { /* ignore */ }
            })
            if (_isAnsweredE6 && !isRedoMode()) {
                logger('此题已作答，准备切换下一题', 'green')
                toNextExam()
                break
            }
            let jdt = buildPrompt({ type: typeName || '翻译题', question: _question, answer_format: "中文英文互译" })
            getAnswer(_qType, jdt).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $_examtable.find('h3.mark_name')
                    timuele.html(timuele.html() + agrs)
                }
                $.each(_answerEle, (i, t) => {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(() => {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200);
                });
                setTimeout(toNextExam, 300 + 200 * _answerEle.length);
            }).catch(() => { toNextExam(); });
        }
            break
        default: {
            if (_qType === undefined) {
                logger('无法识别题型：' + typeName + '，跳过此题', 'red')
                toNextExam()
            } else {
                // 尝试获取文本输入区域
                // 查找所有可能的文本输入区域
                let standardTextareas = $_ansdom.find('.Answer .divText .subEditor textarea');
                let richEditors = $_ansdom.find('.Answer .divText .edui-editor');

                // 首先检查是否有材料题特有的富文本编辑器textarea
                let editorTextareas = $_ansdom.find('textarea[name^="answerEditor"]');

                if (editorTextareas && editorTextareas.length > 0) {
                    logger('检测到材料题富文本编辑器，尝试回答', 'green');
                    let editorId = $(editorTextareas[0]).attr('id');
                    if (editorId) {
                        let jdt = buildPrompt({ type: '材料题', question: _question, answer_format: "请根据材料详细回答" })
                        getAnswer(4, jdt).then((agrs) => {
                            setTimeout(() => { UE.getEditor(editorId).setContent(agrs) }, 300);
                            logger('材料题自动答题成功，准备切换下一题', 'green');
                            toNextExam();
                        }).catch((agrs) => {
                            if (agrs['c'] == 0) {
                                toNextExam();
                            }
                        });
                    } else {
                        logger('找到材料题编辑器但无法获取ID，尝试其他方法', 'yellow');
                        handleStandardExamTextarea(standardTextareas, _question);
                    }
                }
                // 处理标准文本区域
                else if (standardTextareas && standardTextareas.length > 0) {
                    handleStandardExamTextarea(standardTextareas, _question);
                }
                // 处理其他类型的富文本编辑器
                else if (richEditors && richEditors.length > 0) {
                    logger('检测到富文本编辑器，尝试查找编辑器ID', 'green');

                    // 尝试在页面中查找所有可能的编辑器ID
                    let editorScripts = $('script:contains("UE.getEditor")');
                    let editorIdMatch = null;

                    if (editorScripts && editorScripts.length > 0) {
                        // 从脚本中提取编辑器ID
                        let scriptContent = editorScripts.text();
                        let matches = scriptContent.match(/UE\.getEditor\(['"](.*?)['"]/);
                        if (matches && matches.length > 1) {
                            editorIdMatch = matches[1];
                            logger('从脚本中发现编辑器ID: ' + editorIdMatch, 'green');
                        }
                    }

                    if (editorIdMatch) {
                        let jdt = buildPrompt({ type: '材料题', question: _question, answer_format: "请根据材料详细回答" })
                        getAnswer(4, jdt).then((agrs) => {
                            setTimeout(() => { UE.getEditor(editorIdMatch).setContent(agrs) }, 300);
                            logger('使用脚本找到的编辑器ID回答成功，准备切换下一题', 'green');
                            toNextExam();
                        }).catch((agrs) => {
                            if (agrs['c'] == 0) {
                                toNextExam();
                            }
                        });
                    } else {
                        logger('无法找到有效的编辑器ID，跳过此题', 'red');
                        toNextExam();
                    }
                }
                else {
                    logger('无法处理此题型：' + typeName + '，跳过此题', 'red');
                    toNextExam();
                }


            }
        }
    }
}


function toNextExam() {
    if (localStorage.getItem('GPTJsSetting.examTurn') === 'true') {
        let $_examtable = $('.mark_table').find('.whiteDiv')
        let $nextbtn = $_examtable.find('.nextDiv a.jb_btn')
        setTimeout(() => {
            $nextbtn.click()
        }, setting.examTurnTime ? 2000 + (Math.floor(Math.random() * 5 + 1) * 1000) : 2000)
    } else {
        logger('用户设置不自动跳转下一题，请手动点击', 'blue')
    }
}

// ============== 整卷预览页面（一页多题）自动答题 ==============
// 适配 /mooc-ans/mooc2/exam/preview 与 /ans/mooc2/exam/preview
// 不自动跳转、不自动交卷；叠加随机抖动
function missonExamPreview() {
    logger('进入整卷预览页面，开始处理考试', 'green')
    let TiMuList = $('.mark_table').find('.questionLi')
    if (!TiMuList || TiMuList.length === 0) {
        logger('未解析到题目，请确认页面已渲染', 'red')
        return
    }
    logger('共解析到 ' + TiMuList.length + ' 道题', 'blue')
    doExamPreview(0, TiMuList)
}

// 题间间隔：基础 setting.time + 0~1500ms 抖动，模仿真人节奏
function getExamPreviewDelay() {
    let base = (setting && setting.time) ? setting.time : 2500
    return base + Math.floor(Math.random() * 1500)
}

// 解析 questionLi 题型：返回 { type: 0~6 | undefined, typeName: string }
function getExamPreviewType($timu) {
    let typeMap = {
        单选题: 0, 单项选择题: 0, 单选: 0,
        多选题: 1, 多项选择题: 1, 多选: 1,
        填空题: 2, 填空: 2,
        判断题: 3, 是非题: 3, 判断: 3,
        简答题: 4, 简答: 4, 问答题: 4, 名词解释: 4, 论述题: 4, 论述: 4,
        计算题: 4, 计算: 4, 分录题: 4, 资料题: 4, 作图题: 4, 其他: 4, 其它: 4, 阅读理解: 4, 阅读: 4, 阅读题: 4, 理解题: 4, 完形填空: 4, 完形: 4, 综合题: 4,
        写作题: 5,
        翻译题: 6
    }
    let typeName = $timu.attr('typename')
    if (typeName && typeMap[typeName] !== undefined) {
        return { type: typeMap[typeName], typeName: typeName }
    }
    let prefixText = $timu.find('.colorShallow').text() || $timu.find('.mark_name').text() || ''
    let m = prefixText.match(/(单选题|多选题|填空题|判断题|简答题|论述题|写作题|翻译题)/)
    if (m && typeMap[m[1]] !== undefined) {
        return { type: typeMap[m[1]], typeName: m[1] }
    }
    let qid = $timu.attr('data') || $timu.find('.questionId').val() || $timu.find('input.questionId').val()
    if (qid) {
        let typeVal = $('[name="type' + qid + '"]').val()
        if (typeVal !== undefined && typeVal !== null && typeVal !== '') {
            let n = parseInt(typeVal)
            if (!isNaN(n) && n >= 0 && n <= 6) {
                return { type: n, typeName: typeName || ('类型' + n) }
            }
        }
    }
    let $opts = $timu.find('.answerBg .answer_p')
    if ($opts && $opts.length > 0) {
        let hasCheckbox = $timu.find('.answerBg input[type="checkbox"]').length > 0
        return { type: hasCheckbox ? 1 : 0, typeName: typeName || (hasCheckbox ? '多选题' : '单选题') }
    }
    let $textareas = $timu.find('textarea[name^="answerEditor"], .subEditor textarea')
    if ($textareas && $textareas.length > 0) {
        return { type: 4, typeName: typeName || '简答题' }
    }
    return { type: undefined, typeName: typeName || '未知' }
}

function doExamPreview(index, TiMuList) {
    if (index >= TiMuList.length) {
        logger('整卷预览答题已完成，请人工核对后手动交卷', 'green')
        return
    }
    let $timu = $(TiMuList[index])
    let typeInfo = getExamPreviewType($timu)
    let _type = typeInfo.type
    let typeName = typeInfo.typeName
    let _questionFull = $timu.find('.mark_name').html() || ''
    let _question = tidyQuestion(_questionFull).replace(/^[(].*?[)]/, '').trim()
    let _a = []
    let _answerTmpArr, _textareaList
    let alreadyAnswered = 0
    let prefix = '第' + (index + 1) + '题: '

    function nextSoon() {
        setTimeout(function () { doExamPreview(index + 1, TiMuList) }, getExamPreviewDelay())
    }
    function nextFast() {
        setTimeout(function () { doExamPreview(index + 1, TiMuList) }, 30)
    }

    _currentQuestionMeta = { index: index, total: TiMuList.length, typeName: typeName }

    if (_type === undefined) {
        logger(prefix + '无法识别题型(' + typeName + ')，跳过此题', 'red')
        return nextSoon()
    }

    switch (_type) {
        case 0: {
            _answerTmpArr = $timu.find('.answerBg .answer_p')
            if (!_answerTmpArr || _answerTmpArr.length === 0) {
                logger(prefix + '未找到选项，跳过', 'red')
                return nextSoon()
            }
            let mergedAnswers = []
            _answerTmpArr.each(function () {
                mergedAnswers.push($(this).text().replace(/[ABCD]/g, '').trim())
            })
            let prompt = buildPrompt({ type: '单选题', question: _question, options: mergedAnswers })
            for (let i = 0; i < _answerTmpArr.length; i++) {
                let cls = $(_answerTmpArr[i]).parent().find('span').attr('class') || ''
                if (cls.indexOf('check_answer') !== -1) {
                    if (!isRedoMode()) {
                        logger(prefix + '已作答，跳过', 'green')
                        alreadyAnswered = 1
                    } else {
                        logger(prefix + '已作答，重做模式下重新作答', 'blue')
                        $(_answerTmpArr[i]).parent().click()
                    }
                    break
                }
            }
            if (alreadyAnswered) return nextFast()
            getAnswer(_type, prompt).then(function (agrs) {
                $.each(_answerTmpArr, function (i, t) { _a.push(tidyStr($(t).html())) })
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $timu.find('.mark_name')
                    timuele.html(timuele.html() + '<p></p>' + agrs)
                }
                let _i = _a.findIndex(function (item) { return item === agrs })
                if (_i === -1) {
                    // 精确匹配失败，尝试相似度匹配
                    _i = findBestFuzzyMatch(_a, agrs)
                }
                if (_i === -1) {
                    logger(prefix + 'AI无法完美匹配正确答案，请手动选择', 'red')
                    return nextSoon()
                }
                setTimeout(function () {
                    let cls = $(_answerTmpArr[_i]).parent().find('span').attr('class') || ''
                    if (cls.indexOf('check_answer') === -1) {
                        if (localStorage.getItem('GPTJsSetting.goodStudent') === 'true') {
                            $(_answerTmpArr[_i]).parent().find('span').css('font-weight', 'bold')
                        } else {
                            $(_answerTmpArr[_i]).parent().click()
                        }
                    }
                    logger(prefix + '自动答题成功', 'green')
                    nextSoon()
                }, 300)
            }).catch(function () { nextSoon() })
            break
        }
        case 1: {
            _answerTmpArr = $timu.find('.answerBg .answer_p')
            if (!_answerTmpArr || _answerTmpArr.length === 0) {
                logger(prefix + '未找到选项，跳过', 'red')
                return nextSoon()
            }
            let mergedAnswers = []
            _answerTmpArr.each(function () {
                mergedAnswers.push($(this).text().replace(/[ABCD]/g, '').trim())
            })
            let prompt = buildPrompt({ type: '多选题', question: _question, options: mergedAnswers, answer_format: "用'|'分割多个答案" })
            for (let i = 0; i < _answerTmpArr.length; i++) {
                let cls = $(_answerTmpArr[i]).parent().find('span').attr('class') || ''
                if (cls.indexOf('check_answer') !== -1) {
                    if (!isRedoMode()) {
                        logger(prefix + '已作答，跳过', 'green')
                        alreadyAnswered = 1
                        break
                    } else {
                        logger(prefix + '已作答，重做模式下取消旧答案', 'blue')
                        $(_answerTmpArr[i]).parent().click()
                    }
                }
            }
            if (alreadyAnswered) return nextFast()
            getAnswer(_type, prompt).then(function (agrs) {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $timu.find('.mark_name')
                    timuele.html(timuele.html() + '<p></p>' + agrs)
                }
                let _multiOptions = []
                $.each(_answerTmpArr, function (i, t) {
                    _multiOptions.push(tidyStr($(t).html()))
                })
                let _matchedAny = false
                $.each(_answerTmpArr, function (i, t) {
                    if (agrs.indexOf(_multiOptions[i]) !== -1) {
                        _matchedAny = true
                        if (localStorage.getItem('GPTJsSetting.goodStudent') === 'true') {
                            $(_answerTmpArr[i]).parent().find('span').css('font-weight', 'bold')
                        } else {
                            let cls = $(_answerTmpArr[i]).parent().find('span').attr('class') || ''
                            if (cls.indexOf('check_answer_dx') === -1) {
                                setTimeout(function () { $(_answerTmpArr[i]).parent().click() }, 300)
                            }
                        }
                    }
                })
                // 如果精确匹配没有命中任何选项，尝试模糊匹配
                if (!_matchedAny) {
                    let fuzzyIndices = findFuzzyMatchMultiple(_multiOptions, agrs)
                    for (var fi = 0; fi < fuzzyIndices.length; fi++) {
                        (function (idx) {
                            if (localStorage.getItem('GPTJsSetting.goodStudent') === 'true') {
                                $(_answerTmpArr[idx]).parent().find('span').css('font-weight', 'bold')
                            } else {
                                let cls = $(_answerTmpArr[idx]).parent().find('span').attr('class') || ''
                                if (cls.indexOf('check_answer_dx') === -1) {
                                    setTimeout(function () { $(_answerTmpArr[idx]).parent().click() }, 300)
                                }
                            }
                        })(fuzzyIndices[fi])
                    }
                }
                logger(prefix + '自动答题成功', 'green')
                nextSoon()
            }).catch(function () { nextSoon() })
            break
        }
        case 2: {
            _textareaList = $timu.find('textarea[name^="answerEditor"]')
            if (!_textareaList || _textareaList.length === 0) {
                _textareaList = $timu.find('.subEditor textarea')
            }
            if (!_textareaList || _textareaList.length === 0) {
                logger(prefix + '未找到填空文本框，跳过', 'red')
                return nextSoon()
            }
            let isAnswered = false
            $.each(_textareaList, function (i, t) {
                let _id = $(t).attr('id') || $(t).attr('name')
                try {
                    if (_id && UE.getEditor(_id) && UE.getEditor(_id).getContent && UE.getEditor(_id).getContent() !== '') {
                        isAnswered = true
                    }
                } catch (e) { /* ignore */ }
            })
            if (isAnswered && !isRedoMode()) {
                logger(prefix + '已作答，跳过', 'green')
                return nextFast()
            }
            let prompt = buildPrompt({ type: '填空题', question: _question, answer_format: "用'|'分割多个答案" })
            getAnswer(_type, prompt).then(function (agrs) {
                let parts = (agrs || '').split('|')
                $.each(_textareaList, function (i, t) {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    let val = parts[i] !== undefined ? parts[i] : (parts[parts.length - 1] || '')
                    setTimeout(function () {
                        try { UE.getEditor(_id).setContent(val) } catch (e) { /* ignore */ }
                    }, 300 + i * 200)
                })
                logger(prefix + '自动答题成功', 'green')
                nextSoon()
            }).catch(function () { nextSoon() })
            break
        }
        case 3: {
            _answerTmpArr = $timu.find('.answerBg .answer_p')
            if (!_answerTmpArr || _answerTmpArr.length === 0) {
                logger(prefix + '未找到判断选项，跳过', 'red')
                return nextSoon()
            }
            $.each(_answerTmpArr, function (i, t) { _a.push($(t).text().trim()) })
            for (let i = 0; i < _answerTmpArr.length; i++) {
                let cls = $(_answerTmpArr[i]).parent().find('span').attr('class') || ''
                if (cls.indexOf('check_answer') !== -1) {
                    if (!isRedoMode()) {
                        logger(prefix + '已作答，跳过', 'green')
                        alreadyAnswered = 1
                    } else {
                        logger(prefix + '已作答，重做模式下重新作答', 'blue')
                        $(_answerTmpArr[i]).parent().click()
                    }
                    break
                }
            }
            if (alreadyAnswered) return nextFast()
            let prompt = buildPrompt({ type: '判断题', question: _question, answer_format: "只回答正确或错误" })
            getAnswer(_type, prompt).then(function (agrs) {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    let timuele = $timu.find('.mark_name')
                    timuele.html(timuele.html() + '<p></p>' + agrs)
                }
                let judgeResult = parseJudgeAnswer(agrs)
                let _i = judgeResult !== null ? findJudgeOptionIndex(_a, judgeResult === 'true') : -1
                if (_i === -1) {
                    logger(prefix + '答案匹配出错，跳过', 'red')
                    return nextSoon()
                }
                setTimeout(function () {
                    let cls = $(_answerTmpArr[_i]).parent().find('span').attr('class') || ''
                    if (cls.indexOf('check_answer') === -1) {
                        if (localStorage.getItem('GPTJsSetting.goodStudent') === 'true') {
                            $(_answerTmpArr[_i]).parent().find('span').css('font-weight', 'bold')
                        } else {
                            $(_answerTmpArr[_i]).parent().click()
                        }
                    }
                    logger(prefix + '自动答题成功', 'green')
                    nextSoon()
                }, 300)
            }).catch(function () { nextSoon() })
            break
        }
        case 4: {
            let _answerEle = findAnswerTextareas($timu)
            if (!_answerEle || _answerEle.length === 0) {
                logger(prefix + '未找到答题文本框，跳过', 'red')
                return nextSoon()
            }
            let isAnswered = false
            $.each(_answerEle, function (i, t) {
                let _id = $(t).attr('id') || $(t).attr('name')
                try {
                    if (_id && UE.getEditor(_id) && UE.getEditor(_id).getContent && UE.getEditor(_id).getContent() !== '') {
                        isAnswered = true
                    }
                } catch (e) { /* ignore */ }
            })
            if (isAnswered && !isRedoMode()) {
                logger(prefix + '已作答，跳过', 'green')
                return nextFast()
            }
            let prompt = buildPrompt({ type: typeName || '简答题', question: _question, answer_format: "用50字简要回答" })
            getAnswer(_type, prompt).then(function (agrs) {
                $.each(_answerEle, function (i, t) {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(function () {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200)
                })
                logger(prefix + '自动答题成功', 'green')
                nextSoon()
            }).catch(function () { nextSoon() })
            break
        }
        case 5: {
            let _answerEle = findAnswerTextareas($timu)
            if (!_answerEle || _answerEle.length === 0) {
                logger(prefix + '未找到答题文本框，跳过', 'red')
                return nextSoon()
            }
            // 已作答检测
            let isAnswered5 = false
            $.each(_answerEle, function (i, t) {
                let _id = $(t).attr('id') || $(t).attr('name')
                try {
                    if (_id && UE.getEditor(_id) && UE.getEditor(_id).getContent && UE.getEditor(_id).getContent() !== '') {
                        isAnswered5 = true
                    }
                } catch (e) { /* ignore */ }
            })
            if (isAnswered5 && !isRedoMode()) {
                logger(prefix + '已作答，跳过', 'green')
                return nextFast()
            }
            let prompt = buildPrompt({ type: typeName || '写作题', question: _question, answer_format: "用英文根据题目进行写作" })
            getAnswer(_type, prompt).then(function (agrs) {
                $.each(_answerEle, function (i, t) {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(function () {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200)
                })
                logger(prefix + '自动答题成功', 'green')
                nextSoon()
            }).catch(function () { nextSoon() })
            break
        }
        case 6: {
            let _answerEle = findAnswerTextareas($timu)
            if (!_answerEle || _answerEle.length === 0) {
                logger(prefix + '未找到答题文本框，跳过', 'red')
                return nextSoon()
            }
            // 已作答检测
            let isAnswered6 = false
            $.each(_answerEle, function (i, t) {
                let _id = $(t).attr('id') || $(t).attr('name')
                try {
                    if (_id && UE.getEditor(_id) && UE.getEditor(_id).getContent && UE.getEditor(_id).getContent() !== '') {
                        isAnswered6 = true
                    }
                } catch (e) { /* ignore */ }
            })
            if (isAnswered6 && !isRedoMode()) {
                logger(prefix + '已作答，跳过', 'green')
                return nextFast()
            }
            let prompt = buildPrompt({ type: typeName || '翻译题', question: _question, answer_format: "中文英文互译" })
            getAnswer(_type, prompt).then(function (agrs) {
                $.each(_answerEle, function (i, t) {
                    let _id = $(t).attr('id') || $(t).attr('name')
                    setTimeout(function () {
                        try { UE.getEditor(_id).setContent(agrs) } catch (e) { /* ignore */ }
                    }, 300 + i * 200)
                })
                logger(prefix + '自动答题成功', 'green')
                nextSoon()
            }).catch(function () { nextSoon() })
            break
        }
        default: {
            logger(prefix + '无法处理此题型: ' + typeName + '，跳过', 'red')
            nextSoon()
        }
    }
}

function refreshCourseList() {
    let _p = parseUrlParams()
    return new Promise((resolve, reject) => {
        $.ajax({
            url: _l.protocol + '//' + _l.host + '/mycourse/studentstudycourselist?courseId=' + _p['courseid'] + '&chapterId=' + _p['knowledgeid'] + '&clazzid=' + _p['clazzid'] + '&mooc2=1',
            type: 'GET',
            dateType: 'html',
            success: function (res) {
                resolve(res)
            }
        })
    })

}

var _ne21ThinkingCount = 0;
function showThinking() {
    _ne21ThinkingCount++;
    if (_ne21ThinkingCount === 1) {
        $('#ne-21thinking', window.parent.document).addClass('ne21-active');
    }
}
function hideThinking() {
    if (_ne21ThinkingCount > 0) _ne21ThinkingCount--;
    if (_ne21ThinkingCount === 0) {
        $('#ne-21thinking', window.parent.document).removeClass('ne21-active');
    }
}

// 构造结构化提示词，使 AI 能更精确地理解题目并回答。
// 入参 opts:
//   - type:          题型(如 单选题/多选题/判断题/填空题/简答题/写作题/翻译题)
//   - question:      题干
//   - options:       选项数组(可选)
//   - answer_format: 答案格式说明(可选,如 "用'|'分割多个答案"、"只回答正确或错误")
// 返回 { payload, display }:
//   - payload: 发送给 AI 的 JSON 字符串(更精确,便于 AI 解析)
//   - display: 用于用户日志展示的简洁文本(仅含题干与选项,不含题型/答案格式等元信息)
function buildPrompt(opts) {
    opts = opts || {}
    let q = opts.question != null ? String(opts.question) : ''
    let payloadObj = {}
    if (opts.type) payloadObj.type = String(opts.type)
    if (opts.answer_format) payloadObj.answer_format = String(opts.answer_format)
    payloadObj.question = q
    if (Array.isArray(opts.options) && opts.options.length > 0) {
        payloadObj.options = opts.options.map(function (s) { return String(s == null ? '' : s).trim() })
    }
    let payload = JSON.stringify(payloadObj, null, 2)
    let display = q
    if (payloadObj.options && payloadObj.options.length) {
        display += '\n' + payloadObj.options.join(' | ')
    }
    return { payload: payload, display: display }
}

// AIç­æ¡åå¤çï¼å»é¤å¼å¯¼è¯­ãåºå·ãæ ç¹åç¼ç­


// 从 buildPrompt 的 JSON payload 中提取 ZE 题库需要的 title/options/type
function buildZePayload(_t, _payload, _display) {
    var title = _display || _payload || '';
    var options = '';
    try {
        var obj = JSON.parse(_payload || '{}');
        if (obj.question) title = String(obj.question).trim();
        if (Array.isArray(obj.options)) options = obj.options.map(function (x) { return String(x == null ? '' : x).trim(); }).filter(Boolean).join('|');
    } catch (e) {
        // 兼容旧字符串调用：无法解析时使用 display/payload 作为题干，options 留空
    }
    return {
        title: String(title || '').trim(),
        options: String(options || '').trim(),
        type: String(_t)
    };
}

function cleanupAiAnswer(questionType, answerText, questionText) {
    let answer = String(answerText || '').trim();
    answer = answer.replace(/^```[\w-]*\s*/, '').replace(/```$/, '').trim();
    answer = answer.replace(/^[A-Zï¼¡-ï¼º]\s*[\.ï¼ã:ï¼]?\s*/i, '').trim();
    answer = answer.replace(/^(ç­æ¡|åç­|ç­|ç»æ)\s*[ï¼:]\s*/i, '').trim();
    if (String(questionType) === '4') {
        answer = answer.replace(/^ç¬¬[ä¸äºä¸åäºå­ä¸å«ä¹åç¾åä¸0-9]+ä¸ªé®é¢\s*[ï¼:]\s*/i, '')
            .replace(/^(å°±æ¯|å³|å æ­¤|æä»¥|æ|åºä¸º|åºè¯¥æ¯)\s*/i, '')
            .replace(/[ãï¼]+$/g, '').trim();
    }
    return answer;
}

// ═══════════════════════════════════════════════════════════════════
// 本地题库缓存 — md5 哈希问题，命中直接返回，未命中 AI 答题后存入
// ═══════════════════════════════════════════════════════════════════
var QUESTION_BANK_KEY = 'GPTJsQuestionBank';
var QUESTION_BANK_MAX = 5000;  // 最多缓存 5000 题

function isQuestionBankEnabled() {
    var stored = localStorage.getItem('GPTJsSetting.questionBank');
    if (stored !== null) return stored === 'true';
    return true;  // 默认开启
}

function getQuestionBank() {
    try { return JSON.parse(GM_getValue(QUESTION_BANK_KEY, '{}')); }
    catch(e) { return {}; }
}

function saveQuestionBank(bank) {
    // 超过上限时删除最旧的条目
    var keys = Object.keys(bank);
    if (keys.length > QUESTION_BANK_MAX) {
        keys.sort(function(a, b) { return bank[a].t - bank[b].t; });
        for (var i = 0; i < keys.length - QUESTION_BANK_MAX; i++) {
            delete bank[keys[i]];
        }
    }
    try { GM_setValue(QUESTION_BANK_KEY, JSON.stringify(bank)); }
    catch(e) { logger('题库存储失败，可能容量已满', 'red'); }
}

function questionHash(_t, _payload) {
    return md5(String(_t) + '|' + String(_payload).replace(/\s+/g, ' ').trim());
}

function questionBankLookup(_t, _payload) {
    var key = questionHash(_t, _payload);
    var bank = getQuestionBank();
    var entry = bank[key];
    if (entry) {
        // 更新命中统计
        entry._hits = (entry._hits || 0) + 1;
        entry._lastHit = Date.now();
        saveQuestionBank(bank);
        return entry.a;
    }
    return null;
}

function questionBankSave(_t, _payload, _answer) {
    var key = questionHash(_t, _payload);
    var bank = getQuestionBank();
    bank[key] = { a: _answer, t: Date.now(), _hits: 0 };
    saveQuestionBank(bank);
}

function getBankStats() {
    var bank = getQuestionBank();
    var keys = Object.keys(bank);
    var totalHits = 0;
    for (var i = 0; i < keys.length; i++) {
        totalHits += (bank[keys[i]]._hits || 0);
    }
    return { total: keys.length, hits: totalHits };
}

function clearQuestionBank() {
    GM_setValue(QUESTION_BANK_KEY, '{}');
}

// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════
// Ze 题库集成
// ═══════════════════════════════════════════════════════════════════

// Ze 题库查询
function zeQuery(title, options, type) {
    return new Promise(function(resolve) {
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://api.zaizhexue.top/api/query',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer c75907b23dceddfab0b8ed83920363a9075f1633ca49dc6ac8412010374d06a8dc5148fc070ff3f2a03d56df321fa6df787dd78d3aa47a'
            },
            data: JSON.stringify({
                title: title || '',
                options: options || '',
                type: type
            }),
            timeout: 8000,
            onload: function(response) {
                try {
                    var res = JSON.parse(response.responseText);
                    var payload = res.data || res;
                    // 学 OCS 的 handler 思路：返回 [question, answer, extra]
                    // 这里 msg 多数是提示/题干，不能当答案；只认 data/answer。
                    var answer = undefined;
                    if (payload) {
                        if (typeof payload.data === 'string' && payload.data.trim()) answer = payload.data.trim();
                        else if (Array.isArray(payload.data) && payload.data.length) answer = payload.data.join('|');
                        else if (payload.data && typeof payload.data.answer === 'string' && payload.data.answer.trim()) answer = payload.data.answer.trim();
                        else if (payload.answer && String(payload.answer).trim()) answer = String(payload.answer).trim();
                    }
                    if (answer && !/解析失败|请求体|未找到|不存在|error|错误/i.test(answer)) {
                        resolve({hit: true, answer: answer});
                    } else {
                        resolve({hit: false, msg: payload && payload.msg ? payload.msg : ''});
                    }
                } catch (e) {
                    resolve({hit: false, msg: '响应解析失败'});
                }
            },
            onerror: function() { resolve({hit: false, msg: '网络失败'}); },
            ontimeout: function() { resolve({hit: false, msg: '超时'}); }
        });
    });
}

// Ze 题库上传
function zeUpload(title, options, type, answer) {
    logger('📤 题库上传: 开始', 'gray');
    return new Promise(function(resolve) {
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://api.zaizhexue.top/api/add',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer c75907b23dceddfab0b8ed83920363a9075f1633ca49dc6ac8412010374d06a8dc5148fc070ff3f2a03d56df321fa6df787dd78d3aa47a'
            },
            data: JSON.stringify({
                title: title || '',
                type: type,
                options: options || '',
                answer: answer
            }),
            timeout: 15000,
            onload: function(response) {
                try {
                    var res = JSON.parse(response.responseText);
                    if (res.success || res.code === 0 || (res.data && res.data.code === 0)) {
                        logger('📤 题库上传: 成功', 'green');
                    } else {
                        logger('📤 题库上传: 失败 HTTP ' + response.status + ' ' + (res.message || res.msg || JSON.stringify(res).substring(0, 80)), 'orange');
                    }
                } catch (e) {
                    logger('📤 题库上传: 响应解析失败 HTTP ' + response.status + ' ' + String(response.responseText).substring(0, 120), 'red');
                }
                resolve();
            },
            onerror: function(err) {
                logger('📤 题库上传: 网络失败 ' + (err && err.error ? err.error : ''), 'red');
                resolve();
            },
            ontimeout: function() {
                logger('📤 题库上传: 超时', 'red');
                resolve();
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════════
async function getAnswer(_t, _q, retryCount = 0) {
    // 兼容: _q 既可为字符串(旧调用),也可为 buildPrompt() 返回的 { payload, display } 对象
    let _payload, _display
    if (_q && typeof _q === 'object' && (_q.payload != null || _q.display != null)) {
        _payload = _q.payload != null ? String(_q.payload) : ''
        _display = _q.display != null ? String(_q.display) : _payload
    } else {
        _payload = _q == null ? '' : String(_q)
        _display = _payload
    }
    let _qPrefix = ''
    if (_currentQuestionMeta) {
        var _m = _currentQuestionMeta
        _qPrefix = '第' + ((_m.index != null ? _m.index : -1) + 1)
        if (_m.total) _qPrefix += '/' + _m.total
        _qPrefix += '题 [' + (_m.typeName || '未知') + '] '
    }
    logger(_qPrefix + '题目:' + _display, 'pink')

    // === Ze 题库查询（仅限首次尝试）===
    var zePayload = buildZePayload(_t, _payload, _display);
    var zeHitAnswer = null;
    if (retryCount === 0) {
        try {
            var zeRes = await zeQuery(zePayload.title, zePayload.options, zePayload.type);
            if (zeRes.hit) {
                logger(_qPrefix + '📚 Ze题库命中: ' + zeRes.answer, 'green');
                zeHitAnswer = zeRes.answer;
                // 不直接 return，让后续逻辑判断是否需要 AI 补充
                // 对选择题：如果 Ze 答案能在选项中匹配到，直接返回；否则继续 AI
                if (String(_t) === '0' || String(_t) === '1' || String(_t) === '3') {
                    // 选择/多选/判断题：尝试匹配选项
                    var _optTexts = [];
                    try {
                        var _pObj = JSON.parse(_payload || '{}');
                        if (Array.isArray(_pObj.options)) _optTexts = _pObj.options.map(function(o){return String(o||'').trim()});
                    } catch(e){}
                    if (_optTexts.length > 0) {
                        var _bestIdx = findBestFuzzyMatch(_optTexts, zeHitAnswer, 0.4);
                        if (_bestIdx >= 0) {
                            return zeHitAnswer; // 匹配成功，直接用 Ze 答案
                        }
                        logger(_qPrefix + '📚 Ze答案与选项不匹配，回退AI答题', 'orange');
                    } else {
                        return zeHitAnswer; // 无选项时直接返回（判断题等）
                    }
                } else {
                    // 填空/简答：直接返回 Ze 答案
                    return zeHitAnswer;
                }
            }
        } catch (e) {
            // Ze 查询出错，继续走 AI
        }
    }
    let _thinkingHtml = '<span class="ne21-log-spinner"></span>AI 思考中<span class="ne21-log-dots"><i></i><i></i><i></i></span>' + (retryCount > 0 ? '（第' + (retryCount + 1) + '次）' : '')
    let $thinkingLog = logger(_thinkingHtml, 'gray')
    return new Promise((resolve, reject) => {
        let requestCompleted = false;
        let longWaitTimer = null;

        // 按用户设置的搜题间隔节流
        let _intervalSec = parseInt(localStorage.getItem('GPTJsSetting.reqIntervalTime'), 10)
        if (!isFinite(_intervalSec) || _intervalSec < 0) _intervalSec = (setting && setting.reqIntervalTime) || 0
        let _intervalMs = Math.min(60000, _intervalSec * 1000)
        let _nowTs = Date.now()
        let _waitMs = Math.max(0, _ne21NextAiAllowedAt - _nowTs)
        _ne21NextAiAllowedAt = Math.max(_nowTs, _ne21NextAiAllowedAt) + _intervalMs
        if (_waitMs > 0) {
            updateLogEntry($thinkingLog, '搜题间隔限制，等待 ' + Math.round(_waitMs / 1000) + 's 后发起请求...', 'gray')
        }

        longWaitTimer = setTimeout(() => {
            if (!requestCompleted) {
                requestCompleted = true;
                updateLogEntry($thinkingLog, '请求超过5分钟未响应，正在重新发起请求...（第' + (retryCount + 1) + '次重试）', 'orange')
                if (retryCount < 3) {
                    getAnswer(_t, _q, retryCount + 1).then(resolve).catch(reject)
                } else {
                    logger('重试次数已用尽，跳过此题', 'red')
                    reject({ 'c': 0 })
                }
            }
        }, 300000 + _waitMs);

        setTimeout(function () {
        if (requestCompleted) return;

        if (_waitMs > 0) {
            let _resumeHtml = '<span class="ne21-log-spinner"></span>AI 思考中<span class="ne21-log-dots"><i></i><i></i><i></i></span>' + (retryCount > 0 ? '（第' + (retryCount + 1) + '次）' : '')
            updateLogEntry($thinkingLog, _resumeHtml, 'gray')
        }

        // 旧模型名映射（向后兼容）
        var _modelCompat = { 'deepseek-expert': 'deepseek-ai/deepseek-v4-pro', 'deepseek-reasoner': 'moonshotai/kimi-k2.6' };
        let _model = localStorage.getItem('GPTJsSetting.model') || _defaultModel;
        _model = _modelCompat[_model] || _model;
        let questionTypeLabels = { '0': '单选题', '1': '多选题', '2': '填空题', '3': '判断题', '4': '简答题' };
        let questionTypeLabel = questionTypeLabels[String(_t)] || '未知题型';

        let systemPrompt = '你是一个学习通作业考试助手。请严格按照以下规则回答：\n' +
            '1. 单选题：只回答选项的文本内容（不含A/B/C/D字母），不要解释\n' +
            '2. 多选题：用"#"分割多个答案，每个答案只写选项文本内容\n' +
            '3. 填空题：用"|"分割多个空的答案\n' +
            '4. 判断题：只回答"正确"或"错误"\n' +
            '5. 简答题：只输出可直接填入答题框的最终答案，不超过50字\n' +
            '6. 只输出答案本身，不要有任何前缀、解释或多余内容';

        let userPrompt = '题型：' + questionTypeLabel + '\n' + _payload;
        if (String(_t) === '4') {
            userPrompt += '\n请直接给出可填写的最终答案，不要使用序号、冒号、引导句或解释。';
        }

        GM_xmlhttpRequest({
            method: 'POST',
            url: _host + '/v1/chat/completions',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + _apiKey
            },
            data: JSON.stringify({
                model: _model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                max_tokens: 1024
            }),
            timeout: 120000,
            onload: function (xhr) {
                if (requestCompleted) {
                    logger('收到已超时请求的响应，已忽略', 'gray')
                    return;
                }

                requestCompleted = true;
                clearTimeout(longWaitTimer);

                try {
                    var obj = $.parseJSON(xhr.responseText);
                } catch (e) {
                    updateLogEntry($thinkingLog, '响应解析失败: ' + xhr.responseText.substring(0, 200), 'red')
                    reject({ 'c': 0 })
                    return;
                }

                if (xhr.status == 200) {
                    try {
                        var _answer = obj.choices[0].message.content.trim();
                        _answer = cleanupAiAnswer(_t, _answer, _payload);
                        if (_answer) {
                            // AI 答完，异步上传到 Ze 题库
                            if (retryCount === 0) {
                                zeUpload(zePayload.title, zePayload.options, zePayload.type, _answer);
                            }
                            updateLogEntry($thinkingLog, "答案:" + _answer, 'purple')
                            resolve(_answer)
                        } else {
                            updateLogEntry($thinkingLog, 'AI返回空答案', 'red')
                            localStorage.setItem('GPTJsSetting.sub', false)
                            reject({ 'c': 0 })
                        }
                    } catch (e) {
                        updateLogEntry($thinkingLog, '解析AI回复失败: ' + JSON.stringify(obj).substring(0, 200), 'red')
                        reject({ 'c': 0 })
                    }
                } else if (xhr.status == 401) {
                    updateLogEntry($thinkingLog, 'API认证失败，请检查API Key配置', 'red')
                    reject({ 'c': 401 })
                } else if (xhr.status == 429) {
                    updateLogEntry($thinkingLog, '请求过于频繁，请稍后再试', 'red')
                    reject({ 'c': 429 })
                } else if (xhr.status == 500) {
                    updateLogEntry($thinkingLog, 'AI服务器压力过大，请先保存答案后刷新重试', 'red')
                    reject({ 'c': 500 })
                } else if (xhr.status == 403) {
                    updateLogEntry($thinkingLog, '请求被拒绝(403)，可能是余额不足', 'red')
                    reject({ 'c': 403 })
                } else {
                    var errMsg = obj.error ? obj.error.message : '未知错误';
                    updateLogEntry($thinkingLog, '请求异常(' + xhr.status + '): ' + errMsg, 'red')
                    reject({ 'c': xhr.status })
                }
            },
            ontimeout: function () {
                if (requestCompleted) return;
                requestCompleted = true;
                clearTimeout(longWaitTimer);
                updateLogEntry($thinkingLog, '请求超时(120s)', 'red')
                reject({ 'c': 666 })
            }
        });
        }, _waitMs);
    })
}


function doWork(index, doms, dom) {
    $frame_c = $(dom).contents();
    let $CyHtml = $frame_c.find('.CeYan')
    let TiMuList = $CyHtml.find('.TiMu')
    $subBtn = $frame_c.find(".ZY_sub").find(".btnSubmit");
    $saveBtn = $frame_c.find(".ZY_sub").find(".btnSave");
    startDoWork(index, doms, 0, TiMuList)
}

function startDoWork(index, doms, c, TiMuList) {
    if (c == TiMuList.length) {
        if (localStorage.getItem('GPTJsSetting.sub') === 'true') {
            logger('测验处理完成，准备自动提交。', 'green')
            setTimeout(() => {
                $subBtn.click()
                setTimeout(() => {
                    $frame_c.find('#confirmSubWin > div > div > a.bluebtn').click()
                    logger('提交成功，准备切换下一个任务。', 'green')
                    _mlist.splice(0, 1)
                    _domList.splice(0, 1)
                    setTimeout(() => { startDoCyWork(index + 1, doms) }, 3000)
                }, 3000)
            }, 5000)
        } else if (localStorage.getItem('GPTJsSetting.force') === 'true') {
            logger('测验处理完成，存在无答案题目,由于用户设置了强制提交，准备自动提交。', 'red')
            setTimeout(() => {
                $subBtn.click()
                setTimeout(() => {
                    $frame_c.find('#confirmSubWin > div > div > a.bluebtn').click()
                    logger('提交成功，准备切换下一个任务。', 'green')
                    _mlist.splice(0, 1)
                    _domList.splice(0, 1)
                    setTimeout(() => { startDoCyWork(index + 1, doms) }, 3000)
                }, 3000)
            }, 5000)
        } else {
            logger('测验处理完成，存在无答案题目或者用户设置不提交。', 'red')
        }
        return
    }
    let questionFull = $(TiMuList[c]).find('.Zy_TItle.clearfix > div').html()
    questionFull = tidyQuestion(questionFull).replace("/<span.*?>.*?</span>/", "");
    let _question = tidyQuestion(questionFull)
    let typeName = questionFull.match(/^【(.*?)】|$/)[1];
    let _TimuType = {
        单选题: 0, 单项选择题: 0, 单选: 0,
        多选题: 1, 多项选择题: 1, 多选: 1,
        填空题: 2, 填空: 2,
        判断题: 3, 是非题: 3, 判断: 3,
        简答题: 4, 简答: 4, 问答题: 4, 名词解释: 4, 论述题: 4, 论述: 4,
        计算题: 4, 计算: 4, 分录题: 4, 资料题: 4, 作图题: 4, 其他: 4, 其它: 4, 阅读理解: 4, 阅读: 4, 阅读题: 4, 理解题: 4, 完形填空: 4, 完形: 4, 综合题: 4
    }[typeName]
    _currentQuestionMeta = { index: c, total: TiMuList.length, typeName: typeName }
    let _a = []
    let _answerTmpArr

    // 如果题型不在预设类型中，根据DOM结构自动识别题型
    if (_TimuType === undefined) {
        logger('未知题型: ' + typeName + '，尝试自动识别', 'blue');

        // 检查是否有选择题特征
        let choiceList = $(TiMuList[c]).find('.Zy_ulTop li');
        if (choiceList && choiceList.length > 0) {
            // 检查是否为判断题
            if (choiceList.length === 2 &&
                ($(choiceList[0]).text().includes('对') || $(choiceList[0]).text().includes('√')) &&
                ($(choiceList[1]).text().includes('错') || $(choiceList[1]).text().includes('×'))) {
                _TimuType = 3; // 判断题
                logger('自动识别为判断题', 'green');
            }
            // 检查是否为选择题
            else {
                // 默认为单选题，后续可根据页面特征判断是否为多选题
                _TimuType = 0;
                logger('自动识别为单选题', 'green');
            }
        }
        // 检查是否有填空题特征
        else {
            let fillBlankList = $(TiMuList[c]).find('.Zy_ulTk .XztiHover1');
            if (fillBlankList && fillBlankList.length > 0) {
                _TimuType = 2; // 填空题
                logger('自动识别为填空题', 'green');
            } else {
                // 检查是否有富文本编辑器
                let editorList = $(TiMuList[c]).find('.edui-editor');
                if (editorList && editorList.length > 0) {
                    _TimuType = 4; // 简答题
                    logger('检测到富文本编辑器，识别为简答题', 'green');
                } else {
                    // 默认当作简答题处理
                    _TimuType = 4;
                    logger('无法准确判断题型，按简答题处理', 'blue');
                }
            }
        }
    }

    switch (_TimuType) {
        case 0: {
            _answerTmpArr = $(TiMuList[c]).find('.Zy_ulTop li').find('a')
            //遍历选项列表
            let mergedAnswers = [];
            _answerTmpArr.each(function () {
                var answerText = $(this).text().replace(/[ABCD]/g, '').trim();
                mergedAnswers.push(answerText);
            });
            mergedAnswers = mergedAnswers.join("|");
            _question = buildPrompt({ type: '单选题', question: _question, options: mergedAnswers.split('|') })
            $.each(_answerTmpArr, (i, t) => {
                _a.push(tidyStr($(t).html()))
            })
            getAnswer(_TimuType, _question).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    //修改题目将答案插入
                    let timuele = $(TiMuList[c]).find('.Zy_TItle.clearfix > div')
                    timuele.html(timuele.html() + agrs)
                }
                let _i = _a.findIndex((item) => item == agrs)
                if (_i == -1) {
                    // 精确匹配失败，尝试相似度匹配
                    _i = findBestFuzzyMatch(_a, agrs)
                }
                if (_i == -1) {
                    logger('AI无法完美匹配正确答案,请手动选择，跳过', 'red')
                    localStorage.setItem('GPTJsSetting.sub', false)
                } else {
                    $(_answerTmpArr[_i]).parent().click();
                }
                setTimeout(() => { startDoWork(index, doms, c + 1, TiMuList) }, setting.time)
            }).catch((agrs) => {
                setTimeout(() => { startDoWork(index, doms, c + 1, TiMuList) }, setting.time)
            })
            break
        }
        case 1: {
            _answerTmpArr = $(TiMuList[c]).find('.Zy_ulTop li').find('a')
            //遍历选项列表
            let mergedAnswers = [];
            _answerTmpArr.each(function () {
                var answerText = $(this).text().replace(/[ABCD]/g, '').trim();
                mergedAnswers.push(answerText);
            });
            mergedAnswers = mergedAnswers.join("|");
            _question = buildPrompt({ type: '多选题', question: _question, options: mergedAnswers.split('|'), answer_format: "用'|'分割多个答案" })
            getAnswer(_TimuType, _question).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    //修改题目将答案插入
                    let timuele = $(TiMuList[c]).find('.Zy_TItle.clearfix > div')
                    timuele.html(timuele.html() + agrs)
                }
                let _multiOptions = []
                $.each(_answerTmpArr, (i, t) => {
                    _multiOptions.push(tidyStr($(t).html()))
                })
                let _matchedAny = false
                $.each(_answerTmpArr, (i, t) => {
                    if (agrs.indexOf(_multiOptions[i]) != -1) {
                        _matchedAny = true
                        $(_answerTmpArr[i]).parent().click();
                        _a.push(['A', 'B', 'C', 'D', 'E', 'F', 'G'][i])
                    }
                })
                // 如果精确匹配没有命中任何选项，尝试模糊匹配
                if (!_matchedAny) {
                    let fuzzyIndices = findFuzzyMatchMultiple(_multiOptions, agrs)
                    for (var fi = 0; fi < fuzzyIndices.length; fi++) {
                        $(_answerTmpArr[fuzzyIndices[fi]]).parent().click();
                        _a.push(['A', 'B', 'C', 'D', 'E', 'F', 'G'][fuzzyIndices[fi]])
                    }
                }
                let id = getStr($(TiMuList[c]).find('.Zy_ulTop li:nth-child(1)').attr('onclick'), 'addcheck(', ');').replace('(', '').replace(')', '')
                if (_a.length <= 0) {
                    logger('AI无法完美匹配正确答案,请手动选择，跳过', 'red')
                    // setting.sub = 0
                    localStorage.setItem('GPTJsSetting.sub', false)
                } else {
                    $(TiMuList[c]).find('.Zy_ulTop').parent().find('#answer' + id).val(_a.join(""))
                }
                setTimeout(() => { startDoWork(index, doms, c + 1, TiMuList) }, setting.time)
            }).catch((agrs) => {
                setTimeout(() => { startDoWork(index, doms, c + 1, TiMuList) }, setting.time)
            })
            break
        }
        case 2: {
            _question = buildPrompt({ type: '填空题', question: _question, answer_format: "多个填空用'|'分隔" })
            let _textareaList = $(TiMuList[c]).find('.Zy_ulTk .XztiHover1')
            getAnswer(_TimuType, _question).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    //修改题目将答案插入
                    let timuele = $(TiMuList[c]).find('.Zy_TItle.clearfix > div')
                    timuele.html(timuele.html() + agrs)
                }
                let _answerList = agrs.split("|")
                $.each(_textareaList, (i, t) => {
                    setTimeout(() => {
                        $(t).find('#ueditor_' + i).contents().find('.view p').html(_answerList[i]);
                        $(t).find('textarea').html('<p>' + _answerList[i] + '</p>')
                    }, 300)
                })
                setTimeout(() => { startDoWork(index, doms, c + 1, TiMuList) }, setting.time)
            }).catch((agrs) => {
                setTimeout(() => { startDoWork(index, doms, c + 1, TiMuList) }, setting.time)
            })
            break
        }
        case 3: {
            _answerTmpArr = $(TiMuList[c]).find(".Zy_ulTop li").find("a");
            let _true = "正确|是|对|√|T|ri";
            $.each(_answerTmpArr, (i, t) => {
                _a.push(tidyStr($(t).html()));
            });
            _question = buildPrompt({ type: '判断题', question: _question, answer_format: "只回答正确或错误" })
            getAnswer(_TimuType, _question).then((agrs) => {
                if (localStorage.getItem('GPTJsSetting.alterTitle') === 'true') {
                    //修改题目将答案插入
                    let timuele = $(TiMuList[c]).find('.Zy_TItle.clearfix > div')
                    timuele.html(timuele.html() + agrs)
                }
                agrs = _true.indexOf(agrs) != -1 ? "对" : "错";
                let _i = _a.findIndex((item) => item == agrs);
                if (_i == -1) {
                    // 精确匹配失败，尝试相似度匹配
                    _i = findBestFuzzyMatch(_a, agrs)
                }
                if (_i == -1) {
                    logger("未匹配到正确答案，跳过", "red");
                    localStorage.setItem('GPTJsSetting.sub', false)
                } else {
                    $(_answerTmpArr[_i]).parent().click();
                }
                setTimeout(() => {
                    startDoWork(index, doms, c + 1, TiMuList);
                }, setting.time);
            }).catch((agrs) => {
                setTimeout(() => {
                    startDoWork(index, doms, c + 1, TiMuList);
                }, setting.time);
            });
            break;
        }
        case 4: {
            let _textareaLista = $(TiMuList[c]).find('.Zy_ulTk .XztiHover1')
            getAnswer(_TimuType, _question).then((agrs) => {
                if (agrs == '暂无答案') {
                    // setting.sub = 0
                    localStorage.setItem('GPTJsSetting.sub', false)
                }
                let _answerList = agrs.split("#")
                $.each(_textareaLista, (i, t) => {
                    setTimeout(() => {
                        $(t).find('#ueditor_' + i).contents().find('.view p').html(_answerList[i]);
                        $(t).find('textarea').html('<p>' + _answerList[i] + '</p>')
                    }, 300)
                })
                setTimeout(() => { startDoWork(index, doms, c + 1, TiMuList) }, setting.time)
            }).catch((agrs) => {
                setTimeout(() => { startDoWork(index, doms, c + 1, TiMuList) }, setting.time)
            })
            break
        }
    }
}

function switchMission() {
    _mlist.splice(0, 1)
    _domList.splice(0, 1)
    setTimeout(missonStart, 5000)
}

function tidyStr(s) {
    if (s) {
        let str = s.replace(/<(?!img).*?>/g, "").replace(/^【.*?】\s*/, '').replace(/\s*（\d+\.\d+分）$/, '').trim().replace(/&nbsp;/g, '').replace(new RegExp("&nbsp;", ("gm")), '').replace(/^\s+/, '').replace(/\s+$/, '');
        return str
    } else {
        return null
    }
}

function tidyQuestion(s) {
    if (s) {
        let str = s.replace(/<(?!img).*?>/g, "").replace(/^【.*?】\s*/, '').replace(/\s*（\d+\.\d+分）$/, '').replace(/^\d+[.、]/, '').trim().replace(/&nbsp;/g, '').replace('javascript:void(0);', '').replace(new RegExp("&nbsp;", ("gm")), '').replace(/^\s+/, '').replace(/\s+$/, '');
        return str
    } else {
        return null
    }
}


function decryptFont() {
    /**
    * Author   wyn665817
    * From     https://greasyfork.org/zh-CN/scripts/445007
    */
    var $tip = $('style:contains(font-cxsecret)');
    if (!$tip.length) return;
    var font = $tip.text().match(/base64,([\w\W]+?)'/)[1];
    font = Typr.parse(base64ToUint8Array(font))[0];
    var table = JSON.parse(GM_getResourceText('Table'));
    var match = {};
    for (var i = 19968; i < 40870; i++) {
        $tip = Typr.U.codeToGlyph(font, i);
        if (!$tip) continue;
        $tip = Typr.U.glyphToPath(font, $tip);
        $tip = md5(JSON.stringify($tip)).slice(24);
        match[i] = table[$tip];
    }
    $('.font-cxsecret').html(function (index, html) {
        $.each(match, function (key, value) {
            key = String.fromCharCode(key);
            key = new RegExp(key, 'g');
            value = String.fromCharCode(value);
            html = html.replace(key, value);
        });
        return html;
    }).removeClass('font-cxsecret');
}

function base64ToUint8Array(base64) {
    var data = window.atob(base64);
    var buffer = new Uint8Array(data.length);
    for (var i = 0; i < data.length; ++i) {
        buffer[i] = data.charCodeAt(i);
    }
    return buffer;
}