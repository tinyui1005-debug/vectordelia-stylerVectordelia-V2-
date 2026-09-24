/**
 * Vectordelia V2 风格引擎
 * 基于 vectordelia-image-styler-v2 SKILL 规则实现
 * 核心：图片分析 → 子风格选择 → 构图/色彩/装饰策略 → 提示词生成
 */

const VectordeliaEngine = (() => {

  // ========== 七种子风格配置 ==========
  const SUBSTYLES = {
    portrait: {
      id: 'portrait',
      name: 'Vectordelia Portrait',
      nameCn: '人物肖像',
      icon: '👤',
      description: '人物轮廓清晰，脸部识别优先，扁平色块高饱和肤色，流动曲线环绕，放射光环与花卉装饰',
      keywords: ['人物', '肖像', '时尚', '自拍', '群像', 'face', 'portrait', 'person', 'people'],
      coreElements: ['人物剪影与局部细节结合', '放射光环', '花卉/抽象装饰围绕人物', '高饱和肤色与服装配色'],
      protectRules: '保留脸型、发型、姿态、服装大结构，禁止装饰遮脸、改变身份、过度抽象',
      decorationSystem: '流动曲线围绕人物形成光环，花卉与抽象几何作为次级装饰，同心圆作为背景节奏'
    },
    commercial: {
      id: 'commercial',
      name: 'Vectordelia Commercial',
      nameCn: '商业产品',
      icon: '📦',
      description: '产品轮廓准确，绝对视觉中心，几何底座彩色平台，曲线飘带穿过，半调纹理背景',
      keywords: ['产品', '商品', '鞋', '服装', '电子', '包装', '家具', 'product', 'shoe', 'bottle', 'package', 'item'],
      coreElements: ['几何底座/彩色平台', '曲线/飘带从产品周围穿过', '半调纹理背景', '少量高光和透明矢量层'],
      protectRules: '保留尺寸比例、轮廓、按钮/接口/结构位置，禁止改变产品结构、添加不存在零件、错误Logo',
      decorationSystem: '产品置于几何平台之上，飘带曲线环绕穿插，半调网点作为背景肌理，渐变色块衬托'
    },
    urban: {
      id: 'urban',
      name: 'Vectordelia Urban',
      nameCn: '城市建筑',
      icon: '🏙️',
      description: '建筑轮廓简化，几何平面重组，太阳圆环放射线，流动道路曲线，饱和天空大面积色块',
      keywords: ['建筑', '街景', '城市', '大楼', '天际线', 'architecture', 'building', 'city', 'urban', 'street', 'skyline'],
      coreElements: ['建筑轮廓简化为几何平面', '太阳/圆环/放射线', '流动道路或曲线', '饱和天空大面积色块'],
      protectRules: '保留主要建筑体块和空间关系，可适当改变现实光影但不能破坏建筑基本结构',
      decorationSystem: '建筑作为视觉锚点，天空使用大面积饱和色块，放射线与圆环营造能量感，道路曲线引导视觉'
    },
    botanical: {
      id: 'botanical',
      name: 'Psychedelic Botanical',
      nameCn: '迷幻植物',
      icon: '🌿',
      description: '植物轮廓矢量化，花瓣放大，藤蔓曲线，迷幻太阳，波浪山体，高饱和绿青橙粉',
      keywords: ['植物', '花', '自然', '山水', '叶子', '树', 'botanical', 'flower', 'plant', 'nature', 'leaf', 'tree', 'mountain'],
      coreElements: ['植物轮廓矢量化', '花瓣放大处理', '藤蔓曲线', '迷幻太阳', '波浪山体'],
      protectRules: '保留植物物种基本形态，自然元素可大胆风格化但需可辨认',
      decorationSystem: '藤蔓与花瓣向四周蔓延，迷幻太阳作为光源中心，波浪层叠形成纵深，半调与渐变增加质感'
    },
    character: {
      id: 'character',
      name: 'Vectordelia Character',
      nameCn: '动物角色',
      icon: '🐾',
      description: '保留角色识别轮廓，强化剪影，大色块，流动背景，花朵星星圆环闪电放射线，动态姿势',
      keywords: ['动物', '吉祥物', 'IP', '卡通', '角色', '宠物', 'animal', 'mascot', 'character', 'cartoon', 'pet', 'cat', 'dog'],
      coreElements: ['强化角色剪影', '大色块表现', '流动背景', '花朵/星星/圆环/闪电/放射线', '动态姿势'],
      protectRules: '保留物种、姿势、花纹、角色比例、脸部、服装和关键配件，装饰不能覆盖脸部和关键识别部位',
      decorationSystem: '角色周围环绕星星、圆环、闪电等动态元素，流动曲线制造运动感，背景色块衬托剪影'
    },
    poster: {
      id: 'poster',
      name: 'Vectordelia Poster',
      nameCn: '活动海报',
      icon: '🎵',
      description: '极繁视觉爆炸，放射构图，多层矢量叠加，大型圆环，波浪旋涡，人物剪影，高饱和CMYK',
      keywords: ['音乐', '活动', '演出', '节日', '海报', '演唱会', 'festival', 'music', 'event', 'concert', 'poster', 'party'],
      coreElements: ['极繁构图', '放射构图', '多层矢量叠加', '大型圆环', '波浪和旋涡', '人物剪影', '半调'],
      protectRules: '如果用户没有要求文字，不要生成任何随机文字',
      decorationSystem: '全画面多层矢量叠加，大型圆环与旋涡形成视觉漩涡，放射线条向外爆发，半调网点统一肌理'
    },
    digital: {
      id: 'digital',
      name: 'Neo-Vectordelia Digital',
      nameCn: '数字界面',
      icon: '💻',
      description: '保持扁平矢量核心，加入现代数字渐变，轻微透明层，简洁几何UI结构，圆角模块，电光色点缀',
      keywords: ['UI', '界面', '网页', '科技', '数字', 'H5', 'APP', 'screen', 'ui', 'interface', 'web', 'tech', 'digital', 'app'],
      coreElements: ['现代数字渐变', '轻微透明层', '简洁几何UI结构', '圆角模块', '电光色点缀'],
      protectRules: '禁止把整个画面变成赛博朋克UI，保持Vectordelia扁平矢量核心',
      decorationSystem: '圆角几何模块层叠，电光色作为点缀高光，透明渐变增加数字感，曲线保留Vectordelia基因'
    }
  };

  // ========== 核心色彩系统 ==========
  const COLOR_PALETTES = [
    { name: '电光经典', colors: ['#00E5FF', '#7B2FF7', '#FF2D95', '#D4FF00'], desc: '青 + 紫 + 品红 + 荧光黄' },
    { name: '热浪迷幻', colors: ['#FF6B00', '#FF2D95', '#00B4FF', '#00E5FF'], desc: '橙 + 品红 + 电蓝 + 青' },
    { name: '植物幻境', colors: ['#00FF88', '#00E5FF', '#FF6B9D', '#FFD600'], desc: '荧光绿 + 青 + 粉 + 亮黄' },
    { name: '紫电狂想', colors: ['#7B2FF7', '#FF2D95', '#00E5FF', '#FFD600'], desc: '紫 + 品红 + 青 + 亮黄' },
    { name: '复古印刷', colors: ['#E63946', '#F4A261', '#2A9D8F', '#264653'], desc: 'CMYK复古印刷色' },
    { name: '糖果爆炸', colors: ['#FF6B9D', '#FFD600', '#00E5FF', '#A855F7'], desc: '粉 + 黄 + 青 + 紫' }
  ];

  // ========== 负面提示词 ==========
  const NEGATIVE_PROMPT = '写实摄影, 普通Y2K, 赛博朋克, Chrome金属, 金属塑料, 3D模型, 玻璃拟态, 全息投影, 未来科技UI, 暗黑霓虹, 蒸汽波, Vaporwave, Frutiger Aero, 低饱和, 灰暗, 过度模糊, 脏乱噪点, 主体变形, 人物身份改变, 脸部变形, 错误手指, 错误肢体, 产品结构改变, 建筑结构改变, 随机文字, 乱码, 随机Logo, 水印, photorealistic, 3d render, chrome, metallic, cyberpunk, neon dark, holographic';

  // ========== 图片分析 ==========
  function analyzeImage(imageData) {
    const { width, height, dominantColors, fileName, aspectRatio } = imageData;

    // 构图判断
    let composition = 'center';
    if (aspectRatio > 1.3) composition = 'horizontal';
    else if (aspectRatio < 0.77) composition = 'vertical';
    else composition = 'balanced';

    // 从文件名猜测主体类型
    const lowerName = (fileName || '').toLowerCase();
    let guessedType = null;
    for (const [key, style] of Object.entries(SUBSTYLES)) {
      if (style.keywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
        guessedType = key;
        break;
      }
    }

    // 从主色调判断明暗
    const avgBrightness = dominantColors.length > 0
      ? dominantColors.reduce((sum, c) => sum + c.brightness, 0) / dominantColors.length
      : 128;

    return {
      width, height, aspectRatio,
      composition,
      dominantColors,
      avgBrightness,
      guessedType,
      isBright: avgBrightness > 160,
      isDark: avgBrightness < 90
    };
  }

  // ========== 自动推荐子风格 ==========
  function recommendSubstyle(analysis) {
    if (analysis.guessedType) return analysis.guessedType;

    // 根据构图和色彩启发式推荐
    if (analysis.aspectRatio > 1.5) return 'urban';
    if (analysis.isBright && analysis.dominantColors.some(c => c.hue >= 80 && c.hue <= 160)) return 'botanical';
    return 'portrait'; // 默认肖像
  }

  // ========== 构图策略生成 ==========
  function getCompositionStrategy(analysis, substyleId) {
    const comp = analysis.composition;
    const strategies = {
      center: '中心锚点 + 放射线 + 同心圆 + 环绕曲线',
      horizontal: '横向流动曲线、波浪、道路式视觉引导',
      vertical: '纵向飘带、放射光环、花藤、垂直视觉节奏',
      balanced: '非对称平衡 + 层叠重叠形态 + 视觉流动'
    };
    return strategies[comp] || strategies.balanced;
  }

  // ========== 视觉密度控制 ==========
  function getDensityProfile(intensity) {
    // intensity: 0-100, 控制装饰密度
    const level = intensity < 30 ? 'low' : intensity < 60 ? 'medium' : intensity < 85 ? 'high' : 'extreme';
    const profiles = {
      low: { subject: '低复杂度', around: '中等复杂度', edge: '低复杂度', desc: '简洁留白，主体与核心曲线为主' },
      medium: { subject: '中等复杂度', around: '中高复杂度', edge: '中等复杂度', desc: '标准有组织极繁，中心可读周围丰富' },
      high: { subject: '中等复杂度', around: '高复杂度', edge: '中高复杂度', desc: '中心可读、周围爆炸，装饰密集但受控' },
      extreme: { subject: '中高复杂度', around: '极高复杂度', edge: '高复杂度', desc: '全画面极繁视觉爆炸，多层叠加' }
    };
    return { level, ...profiles[level] };
  }

  // ========== 色彩策略 ==========
  function getColorStrategy(paletteIndex, analysis) {
    const palette = COLOR_PALETTES[paletteIndex % COLOR_PALETTES.length];
    return {
      palette,
      rule: `1个主色(${palette.colors[0]}) + 2-3个辅助色(${palette.colors.slice(1, 3).join(', ')}) + 1个强调色(${palette.colors[3]})`,
      note: analysis.isDark ? '原图偏暗，生成时提亮整体色调，保持高饱和' : '保持高饱和数字色彩，避免灰暗'
    };
  }

  // ========== 核心：生成完整提示词 ==========
  function generatePrompt(options) {
    const {
      subjectDescription = '图片中的主体',
      keyFeatures = '主要特征与姿态',
      substyleId = 'portrait',
      compositionStrategy = '中心锚点 + 放射线 + 同心圆',
      colorStrategy,
      densityProfile,
      eraBias = 'balanced', // retro / balanced / modern / y2k
      customNotes = ''
    } = options;

    const substyle = SUBSTYLES[substyleId];
    const palette = colorStrategy?.palette || COLOR_PALETTES[0];
    const density = densityProfile || getDensityProfile(60);

    // 年代倾向描述
    const eraDesc = {
      retro: '强化1960-70年代迷幻流行艺术与印刷质感，减少数字感',
      balanced: '1960-70年代迷幻流行艺术与2000年代数字矢量设计融合',
      modern: '减少复古纹理，保留Vectordelia构图逻辑与高饱和矢量语言，更现代简洁',
      y2k: '增加2000年代数字矢量、渐变、透明层、早期互联网图形语言，但保持扁平矢量不滑向普通Y2K'
    }[eraBias];

    // 组装提示词
    const prompt = `以用户上传图片中的${subjectDescription}为核心，保留${keyFeatures}和主要构图关系，重新设计为${substyle.name}（${substyle.nameCn}）。

采用${eraDesc}的视觉语言。扁平矢量造型，清晰大胆轮廓，简化剪影，有机流动曲线。高饱和数字色彩，${palette.desc}形成强烈对比，遵循"1主色+2-3辅助色+1强调色"的色彩规则。

围绕主体加入${substyle.decorationSystem}。使用流动有机曲线、旋涡、飘带、同心圆、放射线、半调网点、渐变色块和透明矢量层，形成动态、丰富但有秩序的有组织极繁构图。

构图策略：${compositionStrategy}。视觉密度控制：主体区域${density.subject}，主体周围${density.around}，画面边缘${density.edge}，形成"中心可读、周围爆炸"的关系。

${substyle.protectRules}。具有专业商业平面设计完成度、精确矢量边缘、鲜明数字复古气质。${customNotes}`;

    return {
      prompt,
      negativePrompt: NEGATIVE_PROMPT,
      substyle,
      palette,
      density,
      compositionStrategy,
      eraBias
    };
  }

  // ========== 风格化CSS滤镜预览（前端实时预览用） ==========
  function generatePreviewFilter(options) {
    const { intensity = 60, paletteIndex = 0, eraBias = 'balanced' } = options;
    const sat = 130 + (intensity / 100) * 70; // 130%-200%
    const contrast = 105 + (intensity / 100) * 25;
    const hue = paletteIndex * 35;
    const sepia = eraBias === 'retro' ? 15 : eraBias === 'y2k' ? 5 : 0;

    return `saturate(${sat}%) contrast(${contrast}%) hue-rotate(${hue}deg) sepia(${sepia}%)`;
  }

  // ========== 导出 ==========
  return {
    SUBSTYLES,
    COLOR_PALETTES,
    NEGATIVE_PROMPT,
    analyzeImage,
    recommendSubstyle,
    getCompositionStrategy,
    getDensityProfile,
    getColorStrategy,
    generatePrompt,
    generatePreviewFilter,
    getSubstyleList: () => Object.values(SUBSTYLES),
    getPaletteList: () => COLOR_PALETTES
  };

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VectordeliaEngine;
}
