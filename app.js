/**
 * Vectordelia V2 图片风格化工具 - 主应用逻辑
 */

(function () {
  'use strict';

  // ========== 状态管理 ==========
  const state = {
    originalImage: null,      // HTMLImageElement
    imageDataUrl: null,
    imageInfo: null,          // { width, height, fileName, dominantColors, aspectRatio }
    analysis: null,           // VectordeliaEngine.analyzeImage 结果
    selectedSubstyle: null,
    selectedPalette: 0,
    intensity: 60,            // 装饰密度 0-100
    eraBias: 'balanced',      // retro / balanced / modern / y2k
    subjectDescription: '',
    keyFeatures: '',
    customNotes: '',
    generatedResult: null,
    history: [],
    // AI 生成相关
    apiKey: '',
    modelId: 'doubao-seedream-4-0-250828',
    aiResultUrl: null,
    aiGenerating: false
  };

  // ========== DOM 引用 ==========
  const $ = (id) => document.getElementById(id);
  let els = {};

  // ========== 初始化 ==========
  function init() {
    cacheElements();
    bindEvents();
    renderSubstyleCards();
    renderPaletteCards();
    updateParamsDisplay();
    initAISettings();
    console.log('[Vectordelia] 应用初始化完成');
  }

  function cacheElements() {
    els = {
      dropZone: $('dropZone'),
      fileInput: $('fileInput'),
      uploadBtn: $('uploadBtn'),
      originalPreview: $('originalPreview'),
      originalImg: $('originalImg'),
      styledPreview: $('styledPreview'),
      styledImg: $('styledImg'),
      imageMeta: $('imageMeta'),
      substyleGrid: $('substyleGrid'),
      paletteGrid: $('paletteGrid'),
      intensitySlider: $('intensitySlider'),
      intensityValue: $('intensityValue'),
      eraButtons: document.querySelectorAll('.era-btn'),
      subjectInput: $('subjectInput'),
      featuresInput: $('featuresInput'),
      notesInput: $('notesInput'),
      generateBtn: $('generateBtn'),
      promptOutput: $('promptOutput'),
      negativeOutput: $('negativeOutput'),
      copyPromptBtn: $('copyPromptBtn'),
      copyNegativeBtn: $('copyNegativeBtn'),
      copyAllBtn: $('copyAllBtn'),
      analysisPanel: $('analysisPanel'),
      resultPanel: $('resultPanel'),
      strategyTags: $('strategyTags'),
      historyList: $('historyList'),
      clearBtn: $('clearBtn'),
      downloadBtn: $('downloadBtn'),
      toast: $('toast'),
      // AI 生成相关
      aiSettingsToggle: $('aiSettingsToggle'),
      aiSettingsBody: $('aiSettingsBody'),
      toggleArrow: $('toggleArrow'),
      apiKeyInput: $('apiKeyInput'),
      modelIdInput: $('modelIdInput'),
      rememberKey: $('rememberKey'),
      toggleKeyVisibility: $('toggleKeyVisibility'),
      apiKeyStatus: $('apiKeyStatus'),
      aiGenerateBtn: $('aiGenerateBtn'),
      aiResultSection: $('aiResultSection'),
      aiResultImg: $('aiResultImg'),
      aiResultMeta: $('aiResultMeta'),
      aiLoadingSection: $('aiLoadingSection'),
      loaderSubtext: $('loaderSubtext'),
      downloadAiBtn: $('downloadAiBtn'),
      regenerateBtn: $('regenerateBtn')
    };
  }

  // ========== 事件绑定 ==========
  function bindEvents() {
    // 上传
    els.uploadBtn.addEventListener('click', () => els.fileInput.click());
    els.dropZone.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', handleFileSelect);

    // 拖拽
    ['dragenter', 'dragover'].forEach(evt => {
      els.dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        els.dropZone.classList.add('drag-over');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      els.dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        els.dropZone.classList.remove('drag-over');
      });
    });
    els.dropZone.addEventListener('drop', handleDrop);

    // 参数
    els.intensitySlider.addEventListener('input', (e) => {
      state.intensity = parseInt(e.target.value);
      updateParamsDisplay();
      updatePreview();
    });

    els.eraButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        els.eraButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.eraBias = btn.dataset.era;
        updatePreview();
      });
    });

    els.subjectInput.addEventListener('input', (e) => { state.subjectDescription = e.target.value; });
    els.featuresInput.addEventListener('input', (e) => { state.keyFeatures = e.target.value; });
    els.notesInput.addEventListener('input', (e) => { state.customNotes = e.target.value; });

    // 生成
    els.generateBtn.addEventListener('click', generate);

    // 复制
    els.copyPromptBtn.addEventListener('click', () => copyText(els.promptOutput.value, '正面提示词已复制'));
    els.copyNegativeBtn.addEventListener('click', () => copyText(els.negativeOutput.value, '负面提示词已复制'));
    els.copyAllBtn.addEventListener('click', copyAll);

    // 清除
    els.clearBtn.addEventListener('click', resetAll);

    // 下载预览图
    els.downloadBtn.addEventListener('click', downloadStyledPreview);

    // ========== AI 生成相关事件 ==========
    // 设置面板折叠
    els.aiSettingsToggle.addEventListener('click', toggleAISettings);

    // API Key 输入
    els.apiKeyInput.addEventListener('input', (e) => {
      state.apiKey = e.target.value.trim();
      updateApiKeyStatus();
      if (els.rememberKey.checked) {
        localStorage.setItem('vd_api_key', state.apiKey);
      }
    });

    // 模型 ID 输入
    els.modelIdInput.addEventListener('input', (e) => {
      state.modelId = e.target.value.trim();
      localStorage.setItem('vd_model_id', state.modelId);
    });

    // 记住 Key 开关
    els.rememberKey.addEventListener('change', (e) => {
      if (e.target.checked && state.apiKey) {
        localStorage.setItem('vd_api_key', state.apiKey);
      } else {
        localStorage.removeItem('vd_api_key');
      }
    });

    // 显示/隐藏 Key
    els.toggleKeyVisibility.addEventListener('click', () => {
      const isPassword = els.apiKeyInput.type === 'password';
      els.apiKeyInput.type = isPassword ? 'text' : 'password';
      els.toggleKeyVisibility.textContent = isPassword ? '🙈' : '👁';
    });

    // AI 生成按钮
    els.aiGenerateBtn.addEventListener('click', generateWithAI);

    // 下载 AI 结果
    els.downloadAiBtn.addEventListener('click', downloadAIResult);

    // 重新生成
    els.regenerateBtn.addEventListener('click', generateWithAI);
  }

  // ========== 文件处理 ==========
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) loadImageFile(file);
  }

  function handleDrop(e) {
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      loadImageFile(file);
    } else {
      showToast('请拖入图片文件', 'error');
    }
  }

  function loadImageFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件（JPG/PNG/WebP）', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      state.imageDataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        state.originalImage = img;
        state.imageInfo = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileName: file.name,
          fileSize: file.size,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          dominantColors: extractDominantColors(img)
        };

        // 运行分析
        state.analysis = VectordeliaEngine.analyzeImage(state.imageInfo);

        // 自动推荐子风格
        const recommended = VectordeliaEngine.recommendSubstyle(state.analysis);
        state.selectedSubstyle = recommended;

        // 自动填充主体描述（基于文件名）
        if (!state.subjectDescription) {
          state.subjectDescription = guessSubjectFromFile(file.name);
          els.subjectInput.value = state.subjectDescription;
        }

        renderImage();
        renderAnalysis();
        highlightSubstyle(recommended);
        updatePreview();
        showToast('图片加载完成，已自动分析并推荐风格', 'success');
      };
      img.onerror = () => showToast('图片加载失败', 'error');
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function guessSubjectFromFile(fileName) {
    const name = fileName.toLowerCase();
    const guesses = [
      { keys: ['portrait', 'selfie', 'face', '人', '肖像', '自拍'], text: '人物主体' },
      { keys: ['product', 'shoe', 'bottle', '产品', '商品'], text: '产品主体' },
      { keys: ['building', 'city', 'architecture', '建筑', '城市'], text: '建筑/城市景观' },
      { keys: ['flower', 'plant', 'nature', '花', '植物', '自然'], text: '自然植物' },
      { keys: ['animal', 'pet', 'cat', 'dog', '动物', '宠物'], text: '动物角色' },
      { keys: ['poster', 'music', 'event', '海报', '音乐'], text: '活动/海报主体' },
      { keys: ['ui', 'screen', 'app', '界面', '屏幕'], text: '数字界面' }
    ];
    for (const g of guesses) {
      if (g.keys.some(k => name.includes(k))) return g.text;
    }
    return '图片中的主体';
  }

  // ========== 主色提取（Canvas） ==========
  function extractDominantColors(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    try {
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;
      const colorBuckets = {};

      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        // 量化到32级减少颜色数
        const qr = Math.round(r / 32) * 32;
        const qg = Math.round(g / 32) * 32;
        const qb = Math.round(b / 32) * 32;
        const key = `${qr},${qg},${qb}`;
        colorBuckets[key] = (colorBuckets[key] || 0) + 1;
      }

      const sorted = Object.entries(colorBuckets)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([key]) => {
          const [r, g, b] = key.split(',').map(Number);
          return {
            r, g, b,
            hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
            brightness: (r * 299 + g * 587 + b * 114) / 1000,
            hue: rgbToHue(r, g, b)
          };
        });

      return sorted;
    } catch (e) {
      console.warn('主色提取失败:', e);
      return [];
    }
  }

  function rgbToHue(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = ((b - r) / d + 2);
      else h = ((r - g) / d + 4);
      h *= 60;
    }
    return h;
  }

  // ========== 渲染 ==========
  function renderImage() {
    els.originalImg.src = state.imageDataUrl;
    els.styledImg.src = state.imageDataUrl;
    els.dropZone.classList.add('has-image');
    els.originalPreview.classList.add('loaded');
    els.styledPreview.classList.add('loaded');

    const info = state.imageInfo;
    const sizeKB = (info.fileSize / 1024).toFixed(1);
    els.imageMeta.innerHTML = `
      <span class="meta-tag">${info.fileName}</span>
      <span class="meta-tag">${info.width} × ${info.height}px</span>
      <span class="meta-tag">${sizeKB} KB</span>
      <span class="meta-tag">比例 ${info.aspectRatio.toFixed(2)}</span>
    `;
  }

  function renderAnalysis() {
    const a = state.analysis;
    const compMap = { center: '中心构图', horizontal: '横向构图', vertical: '纵向构图', balanced: '均衡构图' };
    const colorsHtml = a.dominantColors.map(c =>
      `<span class="color-dot" style="background:${c.hex}" title="${c.hex}"></span>`
    ).join('');

    els.analysisPanel.innerHTML = `
      <div class="analysis-row">
        <span class="analysis-label">构图判断</span>
        <span class="analysis-value">${compMap[a.composition] || '均衡构图'}</span>
      </div>
      <div class="analysis-row">
        <span class="analysis-label">推荐子风格</span>
        <span class="analysis-value highlight">${VectordeliaEngine.SUBSTYLES[state.selectedSubstyle].nameCn}</span>
      </div>
      <div class="analysis-row">
        <span class="analysis-label">主色调</span>
        <span class="analysis-value colors">${colorsHtml}</span>
      </div>
      <div class="analysis-row">
        <span class="analysis-label">明暗倾向</span>
        <span class="analysis-value">${a.isBright ? '偏亮' : a.isDark ? '偏暗' : '适中'}</span>
      </div>
    `;
  }

  function renderSubstyleCards() {
    const styles = VectordeliaEngine.getSubstyleList();
    els.substyleGrid.innerHTML = styles.map(s => `
      <div class="substyle-card" data-id="${s.id}">
        <div class="substyle-icon">${s.icon}</div>
        <div class="substyle-name">${s.nameCn}</div>
        <div class="substyle-en">${s.name}</div>
      </div>
    `).join('');

    els.substyleGrid.querySelectorAll('.substyle-card').forEach(card => {
      card.addEventListener('click', () => {
        state.selectedSubstyle = card.dataset.id;
        highlightSubstyle(card.dataset.id);
        updatePreview();
      });
    });
  }

  function highlightSubstyle(id) {
    els.substyleGrid.querySelectorAll('.substyle-card').forEach(card => {
      card.classList.toggle('active', card.dataset.id === id);
    });
  }

  function renderPaletteCards() {
    const palettes = VectordeliaEngine.getPaletteList();
    els.paletteGrid.innerHTML = palettes.map((p, i) => `
      <div class="palette-card ${i === 0 ? 'active' : ''}" data-index="${i}">
        <div class="palette-colors">
          ${p.colors.map(c => `<span class="palette-dot" style="background:${c}"></span>`).join('')}
        </div>
        <div class="palette-name">${p.name}</div>
      </div>
    `).join('');

    els.paletteGrid.querySelectorAll('.palette-card').forEach(card => {
      card.addEventListener('click', () => {
        state.selectedPalette = parseInt(card.dataset.index);
        els.paletteGrid.querySelectorAll('.palette-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        updatePreview();
      });
    });
  }

  function updateParamsDisplay() {
    els.intensityValue.textContent = state.intensity + '%';
    const labels = ['简洁', '适中', '丰富', '极繁'];
    const idx = Math.min(Math.floor(state.intensity / 25), 3);
    els.intensityValue.title = labels[idx];
  }

  function updatePreview() {
    if (!state.originalImage) return;
    const filter = VectordeliaEngine.generatePreviewFilter({
      intensity: state.intensity,
      paletteIndex: state.selectedPalette,
      eraBias: state.eraBias
    });
    els.styledImg.style.filter = filter;

    // 更新策略标签
    if (state.analysis) {
      const compStrategy = VectordeliaEngine.getCompositionStrategy(state.analysis, state.selectedSubstyle);
      const density = VectordeliaEngine.getDensityProfile(state.intensity);
      const palette = VectordeliaEngine.COLOR_PALETTES[state.selectedPalette];
      const eraMap = { retro: '复古60-70s', balanced: '融合平衡', modern: '现代简洁', y2k: '2000s数字' };

      els.strategyTags.innerHTML = `
        <span class="strategy-tag">构图：${compStrategy.split('+')[0].trim()}</span>
        <span class="strategy-tag">密度：${density.desc}</span>
        <span class="strategy-tag">配色：${palette.name}</span>
        <span class="strategy-tag">年代：${eraMap[state.eraBias]}</span>
      `;
    }
  }

  // ========== 生成提示词 ==========
  function generate() {
    if (!state.originalImage) {
      showToast('请先上传一张图片', 'error');
      return;
    }

    const compositionStrategy = VectordeliaEngine.getCompositionStrategy(state.analysis, state.selectedSubstyle);
    const colorStrategy = VectordeliaEngine.getColorStrategy(state.selectedPalette, state.analysis);
    const densityProfile = VectordeliaEngine.getDensityProfile(state.intensity);

    const result = VectordeliaEngine.generatePrompt({
      subjectDescription: state.subjectDescription || '图片中的主体',
      keyFeatures: state.keyFeatures || '主要特征与姿态',
      substyleId: state.selectedSubstyle,
      compositionStrategy,
      colorStrategy,
      densityProfile,
      eraBias: state.eraBias,
      customNotes: state.customNotes
    });

    state.generatedResult = result;
    els.promptOutput.value = result.prompt;
    els.negativeOutput.value = result.negativePrompt;
    els.resultPanel.classList.add('visible');

    // 加入历史
    addToHistory(result);

    showToast('提示词生成完成', 'success');
    els.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ========== AI 设置管理 ==========
  function initAISettings() {
    // 从 localStorage 读取
    const savedKey = localStorage.getItem('vd_api_key');
    const savedModel = localStorage.getItem('vd_model_id');
    if (savedKey) {
      state.apiKey = savedKey;
      els.apiKeyInput.value = savedKey;
    }
    if (savedModel) {
      state.modelId = savedModel;
      els.modelIdInput.value = savedModel;
    }
    updateApiKeyStatus();
  }

  function toggleAISettings() {
    const body = els.aiSettingsBody;
    const arrow = els.toggleArrow;
    if (body.style.display === 'none') {
      body.style.display = 'block';
      arrow.textContent = '▼';
    } else {
      body.style.display = 'none';
      arrow.textContent = '▶';
    }
  }

  function updateApiKeyStatus() {
    const status = els.apiKeyStatus;
    if (state.apiKey && state.apiKey.length > 10) {
      status.textContent = '✓ 已填写';
      status.className = 'api-key-status ok';
    } else {
      status.textContent = '未填写';
      status.className = 'api-key-status';
    }
  }

  // ========== AI 图生图核心 ==========
  async function generateWithAI() {
    // 校验
    if (!state.originalImage) {
      showToast('请先上传一张图片', 'error');
      return;
    }
    if (!state.apiKey) {
      showToast('请先在「AI 生成设置」中填写 API Key', 'error');
      els.aiSettingsBody.style.display = 'block';
      els.toggleArrow.textContent = '▼';
      els.aiSettingsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!state.modelId) {
      showToast('请填写模型 / 推理接入点 ID', 'error');
      return;
    }
    if (state.aiGenerating) {
      showToast('正在生成中，请稍候...', 'info');
      return;
    }

    // 先生成提示词（复用现有逻辑）
    const compositionStrategy = VectordeliaEngine.getCompositionStrategy(state.analysis, state.selectedSubstyle);
    const colorStrategy = VectordeliaEngine.getColorStrategy(state.selectedPalette, state.analysis);
    const densityProfile = VectordeliaEngine.getDensityProfile(state.intensity);
    const result = VectordeliaEngine.generatePrompt({
      subjectDescription: state.subjectDescription || '图片中的主体',
      keyFeatures: state.keyFeatures || '主要特征与姿态',
      substyleId: state.selectedSubstyle,
      compositionStrategy,
      colorStrategy,
      densityProfile,
      eraBias: state.eraBias,
      customNotes: state.customNotes
    });
    state.generatedResult = result;
    els.promptOutput.value = result.prompt;
    els.negativeOutput.value = result.negativePrompt;
    els.resultPanel.classList.add('visible');

    // 显示加载状态
    state.aiGenerating = true;
    els.aiGenerateBtn.disabled = true;
    els.aiGenerateBtn.classList.add('loading');
    els.aiResultSection.style.display = 'none';
    els.aiLoadingSection.style.display = 'flex';
    els.resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // 轮播加载提示
    const loadingMessages = [
      '分析图片 · 构建 Vectordelia 视觉系统',
      '提取主体特征 · 规划扁平矢量化方案',
      '生成高饱和色彩方案 · 布置迷幻曲线',
      'AI 正在创作中 · 请稍候',
      '即将完成 · 正在渲染最终画面'
    ];
    let msgIdx = 0;
    const loadingTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length;
      if (els.loaderSubtext) els.loaderSubtext.textContent = loadingMessages[msgIdx];
    }, 3500);

    try {
      // 准备图片 base64（压缩到合理大小，避免请求体过大）
      const imageBase64 = await prepareImageForAPI(state.originalImage);

      // 构建请求体 - 兼容 OpenAI 格式 + 火山引擎扩展参数
      const requestBody = {
        model: state.modelId,
        prompt: result.prompt,
        response_format: 'url',
        watermark: false,
        output_format: 'png',
        size: '1K',
        image: [imageBase64]
      };

      console.log('[AI] 调用火山引擎 Seedream API，模型:', state.modelId);
      console.log('[AI] 提示词长度:', result.prompt.length);

      // 发起请求
      const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + state.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data.error?.message || data.message || JSON.stringify(data);
        throw new Error('API 错误: ' + errMsg);
      }

      // 解析结果
      if (data.data && data.data.length > 0) {
        const imageUrl = data.data[0].url;
        if (!imageUrl) {
          throw new Error('API 返回了空图片地址');
        }
        state.aiResultUrl = imageUrl;
        els.aiResultImg.src = imageUrl;

        // 显示元信息
        const metaParts = [];
        if (data.created) metaParts.push('生成时间: ' + new Date(data.created * 1000).toLocaleTimeString());
        metaParts.push('模型: ' + state.modelId);
        metaParts.push('子风格: ' + VectordeliaEngine.SUBSTYLES[state.selectedSubstyle].nameCn);
        els.aiResultMeta.innerHTML = metaParts.map(m => `<span class="meta-tag">${m}</span>`).join('');

        els.aiResultSection.style.display = 'block';
        addToHistory(result);
        showToast('AI 风格化图片生成完成！', 'success');
      } else {
        throw new Error('API 返回数据格式异常: ' + JSON.stringify(data).substring(0, 200));
      }

    } catch (err) {
      console.error('[AI] 生成失败:', err);
      let errorMsg = err.message || '生成失败';
      // 友好化常见错误
      if (errorMsg.includes('401') || errorMsg.includes('Unauthorized') || errorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效或已过期，请检查后重试';
      } else if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('限流')) {
        errorMsg = '请求过于频繁，请稍后再试';
      } else if (errorMsg.includes('model') || errorMsg.includes('Model')) {
        errorMsg = '模型 ID 不正确或未开通，请在火山方舟确认推理接入点';
      } else if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = '网络连接失败，请检查网络后重试';
      }
      showToast('生成失败: ' + errorMsg, 'error');
      els.aiResultSection.style.display = 'none';
    } finally {
      clearInterval(loadingTimer);
      state.aiGenerating = false;
      els.aiGenerateBtn.disabled = false;
      els.aiGenerateBtn.classList.remove('loading');
      els.aiLoadingSection.style.display = 'none';
    }
  }

  // 将图片压缩并转为 base64 data URL，适配 API 要求
  function prepareImageForAPI(img) {
    return new Promise((resolve, reject) => {
      const maxDim = 1536; // 限制最大边长，避免请求体过大
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      // 用 JPEG 压缩，质量 0.92，控制体积
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve(dataUrl);
    });
  }

  // 下载 AI 生成的图片
  function downloadAIResult() {
    if (!state.aiResultUrl) {
      showToast('暂无生成结果', 'error');
      return;
    }
    // 创建一个临时链接下载
    const link = document.createElement('a');
    link.href = state.aiResultUrl;
    link.download = `vectordelia_ai_${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('正在下载 AI 生成图片', 'success');
  }

  function addToHistory(result) {
    const item = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      substyle: result.substyle.nameCn,
      palette: result.palette.name,
      prompt: result.prompt.substring(0, 80) + '...'
    };
    state.history.unshift(item);
    if (state.history.length > 10) state.history.pop();
    renderHistory();
  }

  function renderHistory() {
    if (state.history.length === 0) {
      els.historyList.innerHTML = '<div class="history-empty">暂无生成记录</div>';
      return;
    }
    els.historyList.innerHTML = state.history.map(h => `
      <div class="history-item">
        <div class="history-time">${h.time}</div>
        <div class="history-meta">${h.substyle} · ${h.palette}</div>
        <div class="history-preview">${h.prompt}</div>
      </div>
    `).join('');
  }

  // ========== 复制功能 ==========
  function copyText(text, msg) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(msg || '已复制到剪贴板', 'success');
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(msg || '已复制到剪贴板', 'success');
    });
  }

  function copyAll() {
    if (!state.generatedResult) return;
    const all = `【正面提示词】\n${state.generatedResult.prompt}\n\n【负面提示词】\n${state.generatedResult.negativePrompt}`;
    copyText(all, '正面+负面提示词已全部复制');
  }

  // ========== 下载风格化预览图 ==========
  function downloadStyledPreview() {
    if (!state.originalImage) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = state.imageInfo.width;
    canvas.height = state.imageInfo.height;

    // 应用CSS滤镜效果到canvas
    const filter = els.styledImg.style.filter;
    ctx.filter = filter;
    ctx.drawImage(state.originalImage, 0, 0);
    ctx.filter = 'none';

    // 叠加Vectordelia装饰元素
    drawVectordeliaOverlay(ctx, canvas.width, canvas.height);

    const link = document.createElement('a');
    link.download = `vectordelia_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('风格化预览图已下载', 'success');
  }

  function drawVectordeliaOverlay(ctx, w, h) {
    const intensity = state.intensity / 100;
    const palette = VectordeliaEngine.COLOR_PALETTES[state.selectedPalette];
    const cx = w / 2, cy = h / 2;
    const maxR = Math.max(w, h) * 0.6;

    ctx.save();
    ctx.globalAlpha = 0.15 + intensity * 0.2;

    // 同心圆
    const circleCount = Math.floor(3 + intensity * 5);
    for (let i = 0; i < circleCount; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * (0.3 + i * 0.12), 0, Math.PI * 2);
      ctx.strokeStyle = palette.colors[i % palette.colors.length];
      ctx.lineWidth = 2 + intensity * 4;
      ctx.stroke();
    }

    // 放射线
    const rayCount = Math.floor(8 + intensity * 16);
    ctx.globalAlpha = 0.1 + intensity * 0.15;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * maxR * 0.2, cy + Math.sin(angle) * maxR * 0.2);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.strokeStyle = palette.colors[i % palette.colors.length];
      ctx.lineWidth = 1 + intensity * 3;
      ctx.stroke();
    }

    // 流动曲线
    ctx.globalAlpha = 0.12 + intensity * 0.18;
    for (let i = 0; i < 3 + intensity * 4; i++) {
      ctx.beginPath();
      const yOffset = (i - 2) * (h / 8);
      ctx.moveTo(0, cy + yOffset);
      ctx.bezierCurveTo(
        w * 0.25, cy + yOffset - h * 0.15 * Math.sin(i),
        w * 0.75, cy + yOffset + h * 0.15 * Math.cos(i),
        w, cy + yOffset
      );
      ctx.strokeStyle = palette.colors[i % palette.colors.length];
      ctx.lineWidth = 3 + intensity * 5;
      ctx.stroke();
    }

    // 半调网点（边缘）
    ctx.globalAlpha = 0.08 + intensity * 0.1;
    const dotSize = 4 + intensity * 6;
    const spacing = dotSize * 3;
    for (let x = 0; x < w; x += spacing) {
      for (let y = 0; y < h; y += spacing) {
        // 只在边缘区域画点
        const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (distFromCenter > maxR * 0.5) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = palette.colors[Math.floor(Math.random() * palette.colors.length)];
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // ========== 重置 ==========
  function resetAll() {
    state.originalImage = null;
    state.imageDataUrl = null;
    state.imageInfo = null;
    state.analysis = null;
    state.generatedResult = null;
    state.subjectDescription = '';
    state.keyFeatures = '';
    state.customNotes = '';
    state.intensity = 60;
    state.eraBias = 'balanced';
    state.selectedPalette = 0;

    els.fileInput.value = '';
    els.subjectInput.value = '';
    els.featuresInput.value = '';
    els.notesInput.value = '';
    els.intensitySlider.value = 60;
    els.dropZone.classList.remove('has-image');
    els.originalPreview.classList.remove('loaded');
    els.styledPreview.classList.remove('loaded');
    els.resultPanel.classList.remove('visible');
    els.analysisPanel.innerHTML = '<div class="analysis-empty">上传图片后显示分析结果</div>';
    els.imageMeta.innerHTML = '';
    els.strategyTags.innerHTML = '';
    els.promptOutput.value = '';
    els.negativeOutput.value = '';

    highlightSubstyle(null);
    els.paletteGrid.querySelectorAll('.palette-card').forEach((c, i) => c.classList.toggle('active', i === 0));
    els.eraButtons.forEach(b => b.classList.toggle('active', b.dataset.era === 'balanced'));
    updateParamsDisplay();

    showToast('已重置', 'success');
  }

  // ========== Toast ==========
  function showToast(msg, type = 'info') {
    els.toast.textContent = msg;
    els.toast.className = `toast ${type} show`;
    setTimeout(() => els.toast.classList.remove('show'), 2500);
  }

  // ========== 启动 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
