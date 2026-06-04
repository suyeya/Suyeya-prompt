import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImagePlus,
  LayoutDashboard,
  Languages,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "prompt-atlas-items-v1";

const samplePrompts = [
  {
    id: "seed-1",
    title: "模块化咖啡机产品爆炸图",
    uploader: "帝国小英",
    type: "产品爆炸图",
    tool: "Midjourney",
    chinese:
      "一台模块化咖啡机的爆炸分解图，展示水箱、研磨器、加热核心和金属外壳，适合工业设计提案。",
    english:
      "Exploded view of a modular espresso machine, floating components, brushed aluminum shell, translucent water tank, precision grinder, annotated industrial design render, studio lighting, ultra detailed",
    tags: ["3D渲染", "工业设计", "金属质感"],
    image:
      "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-20T09:20:00.000Z",
  },
  {
    id: "seed-2",
    title: "复古港口手绘地图",
    uploader: "Eris Create Lab",
    type: "手绘地图",
    tool: "GPT image 2",
    chinese:
      "复古旅行海报风格的港口地图，带手写地名、小船、灯塔和旧纸纹理。",
    english:
      "Hand drawn illustrated map of an old harbor town, vintage travel poster style, tiny boats, lighthouse, handwritten labels, warm paper texture, charming details",
    tags: ["复古", "旅行", "插画"],
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-18T14:36:00.000Z",
  },
  {
    id: "seed-3",
    title: "音乐应用深色 UI 样机",
    uploader: "Hidekazu Furukawa",
    type: "UI样机",
    tool: "Figma AI",
    chinese:
      "深色模式音乐播放器移动端界面，强调专辑封面、播放队列和清晰的底部导航。",
    english:
      "Dark mode mobile music app UI mockup, album art focus, glass controls, clean bottom navigation, queue panel, polished product screenshot, high contrast interface",
    tags: ["移动端", "暗色界面", "产品设计"],
    image:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-17T10:12:00.000Z",
  },
  {
    id: "seed-4",
    title: "赛博朋克雨夜街角",
    uploader: "雨夕",
    type: "动漫插画",
    tool: "Stable Diffusion",
    chinese:
      "雨夜街角的动漫场景，霓虹招牌、湿润路面反光和穿透明雨衣的人物。",
    english:
      "Anime illustration of a rainy cyberpunk street corner at night, neon shop signs, wet pavement reflections, character in translucent raincoat, cinematic color, detailed background",
    tags: ["赛博朋克", "夜景", "角色"],
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-15T21:45:00.000Z",
  },
  {
    id: "seed-5",
    title: "香水瓶商业摄影",
    uploader: "李岳",
    type: "商业摄影",
    tool: "Nano Banana Pro",
    chinese:
      "高端香水瓶商业大片，透明玻璃、花瓣、水珠和柔和侧逆光。",
    english:
      "Luxury perfume bottle product photography, transparent glass, flower petals, water droplets, soft rim light, editorial advertising composition, premium beauty campaign",
    tags: ["广告", "美妆", "摄影"],
    image:
      "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-12T16:08:00.000Z",
  },
  {
    id: "seed-6",
    title: "儿童科学百科跨页",
    uploader: "オズ",
    type: "版式设计",
    tool: "seedream(豆包)",
    chinese:
      "儿童科学百科书跨页设计，主题为火山结构，包含剖面图、图标和趣味说明。",
    english:
      "Children science encyclopedia spread about volcano structure, cutaway diagram, playful icons, colorful editorial layout, friendly educational illustration, clean labels",
    tags: ["教育", "儿童", "信息图"],
    image:
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80",
    createdAt: "2026-05-10T12:27:00.000Z",
  },
];

const emptyForm = {
  title: "",
  type: "",
  tool: "",
  promptText: "",
  tagsInput: "",
  resultImagesInput: "",
  referenceImagesInput: "",
  processText: "",
};

function readStoredPrompts() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return samplePrompts;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return samplePrompts;
    return parsed.map((item, index) => ({
      ...item,
      uploader:
        item.uploader ||
        samplePrompts.find((sample) => sample.id === item.id)?.uploader ||
        samplePrompts[index]?.uploader ||
        "未命名",
    }));
  } catch {
    return samplePrompts;
  }
}

function normalizeText(value) {
  return value.trim().toLowerCase();
}

function parseTags(value) {
  return value
    .split(/[,，\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseLines(value) {
  return value
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function appendLines(current, nextLines, limit = Infinity) {
  const merged = [...parseLines(current), ...nextLines.map((item) => item.trim()).filter(Boolean)];
  return Array.from(new Set(merged)).slice(0, limit).join("\n");
}

function isImageUrl(value) {
  return /^https?:\/\/\S+\.(png|jpe?g|webp|gif|avif)(\?\S*)?$/i.test(value.trim());
}

function extractDetailImages(value) {
  const text = String(value || "");
  const markdownImages = Array.from(text.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)).map(
    (match) => match[1]
  );
  const plainImageLines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(isImageUrl);
  return Array.from(new Set([...markdownImages, ...plainImageLines]));
}

function parseDetailContent(content, fallbackImages = []) {
  const blocks = [];
  const paragraph = [];
  const quote = [];
  const usedImages = new Set();

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph.length = 0;
  }

  function flushQuote() {
    if (!quote.length) return;
    blocks.push({ type: "quote", text: quote.join("\n") });
    quote.length = 0;
  }

  String(content || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushQuote();
        return;
      }

      const imageMatch = trimmed.match(/^!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/);
      if (imageMatch || isImageUrl(trimmed)) {
        flushParagraph();
        flushQuote();
        const src = imageMatch ? imageMatch[1] : trimmed;
        usedImages.add(src);
        blocks.push({ type: "image", src });
        return;
      }

      const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushQuote();
        blocks.push({
          type: "heading",
          level: headingMatch[1].length,
          text: headingMatch[2].trim(),
        });
        return;
      }

      if (trimmed.startsWith(">")) {
        flushParagraph();
        quote.push(trimmed.replace(/^>\s?/, ""));
        return;
      }

      flushQuote();
      paragraph.push(trimmed);
    });

  flushParagraph();
  flushQuote();

  fallbackImages
    .filter((src) => src && !usedImages.has(src))
    .forEach((src) => blocks.push({ type: "image", src }));

  return blocks;
}

function looksEnglish(text) {
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  return letters > chinese;
}

function App() {
  const [prompts, setPrompts] = useState([]);
  const [dataSource, setDataSource] = useState("local");
  const [isSyncingRemote, setIsSyncingRemote] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState({ kind: "all", value: "全部" });
  const [view, setView] = useState("board");
  const [form, setForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [copiedDetail, setCopiedDetail] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadRemotePrompts() {
      try {
        const response = await fetch("/api/prompts");
        if (!response.ok) throw new Error("Remote prompts unavailable");
        const data = await response.json();
        if (active && Array.isArray(data.prompts)) {
          setPrompts(data.prompts);
          setDataSource(data.source || "feishu");
        }
      } catch {
        if (active) {
          setPrompts(readStoredPrompts());
          setDataSource("local");
        }
      } finally {
        if (active) setIsSyncingRemote(false);
      }
    }

    loadRemotePrompts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (dataSource !== "local") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  }, [prompts, dataSource]);

  useEffect(() => {
    if (!prompts.length) return undefined;
    const timer = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % prompts.length);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [prompts.length]);

  const types = useMemo(
    () => Array.from(new Set(prompts.map((item) => item.type).filter(Boolean))).sort(),
    [prompts]
  );

  const tags = useMemo(
    () => Array.from(new Set(prompts.flatMap((item) => item.tags || []))).sort(),
    [prompts]
  );

  const filteredPrompts = useMemo(() => {
    const keyword = normalizeText(query);
    return prompts.filter((item) => {
      const pool = [
        item.title,
        item.uploader,
        item.type,
        item.tool,
        item.chinese,
        item.english,
        ...(item.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !keyword || pool.includes(keyword);
      const matchesFilter =
        activeFilter.kind === "all" ||
        (activeFilter.kind === "type" && item.type === activeFilter.value) ||
        (activeFilter.kind === "tag" && item.tags?.includes(activeFilter.value));
      return matchesQuery && matchesFilter;
    });
  }, [prompts, query, activeFilter]);

  const selectedPrompt = useMemo(
    () => prompts.find((item) => item.id === selectedId) || null,
    [prompts, selectedId]
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
  }

  async function uploadFileToUrl(file) {
    if (!file) return;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = String(reader.result);
        try {
          const response = await fetch("/api/uploads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl, filename: file.name }),
          });
          if (!response.ok) throw new Error("图片上传失败");
          const data = await response.json();
          resolve(data.url || dataUrl);
        } catch {
          resolve(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadImagesToField(files, field, limit = Infinity) {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const urls = await Promise.all(imageFiles.map((file) => uploadFileToUrl(file)));
    setForm((current) => ({
      ...current,
      [field]: appendLines(current[field], urls, limit),
    }));
  }

  async function handleImagePaste(event, field, limit = Infinity) {
    const files = Array.from(event.clipboardData?.files || []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!files.length) return;
    event.preventDefault();
    await uploadImagesToField(files, field, limit);
  }

  async function pasteImageFromClipboard(field, limit = Infinity) {
    if (!navigator.clipboard?.read) {
      window.alert("当前浏览器不支持直接读取剪贴板图片，请在输入框内粘贴。");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          files.push(new File([blob], `clipboard-${Date.now()}.png`, { type: imageType }));
        }
      }
      await uploadImagesToField(files, field, limit);
    } catch {
      window.alert("没有读取到剪贴板图片，请先复制图片后再试。");
    }
  }

  async function insertImagesIntoText(files, field, selectionStart, selectionEnd) {
    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const urls = await Promise.all(imageFiles.map((file) => uploadFileToUrl(file)));
    const insertText = urls.map((url) => `![图片](${url})`).join("\n\n");

    setForm((current) => {
      const value = current[field] || "";
      const start = Number.isInteger(selectionStart) ? selectionStart : value.length;
      const end = Number.isInteger(selectionEnd) ? selectionEnd : start;
      const before = value.slice(0, start).replace(/\s*$/, "");
      const after = value.slice(end).replace(/^\s*/, "");
      return {
        ...current,
        [field]: [before, insertText, after].filter(Boolean).join("\n\n"),
      };
    });
  }

  async function pasteImageIntoTextFromClipboard(field) {
    if (!navigator.clipboard?.read) {
      window.alert("当前浏览器不支持直接读取剪贴板图片，请在输入框内粘贴。");
      return;
    }
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          files.push(new File([blob], `clipboard-${Date.now()}.png`, { type: imageType }));
        }
      }
      await insertImagesIntoText(files, field);
    } catch {
      window.alert("没有读取到剪贴板图片，请先复制图片后再试。");
    }
  }

  async function uploadImageFile(file) {
    if (!file) return;
    const url = await uploadFileToUrl(file);
    updateForm("resultImagesInput", appendLines(form.resultImagesInput, [url]));
  }

  async function uploadImageUrl(url) {
    return url;
  }

  async function uploadDataUrl(dataUrl, filename = "image.png") {
      try {
        const response = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl, filename }),
        });
        if (!response.ok) throw new Error("图片上传失败");
        const data = await response.json();
        return data.url || dataUrl;
      } catch {
        return dataUrl;
      }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const sourcePrompt = form.promptText.trim();
    if (!form.title.trim() || !sourcePrompt) return;
    setIsSubmitting(true);

    const sourceIsEnglish = looksEnglish(sourcePrompt);
    let chinesePrompt = sourceIsEnglish ? "" : sourcePrompt;
    let englishPrompt = sourceIsEnglish ? sourcePrompt : "";

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourcePrompt,
          direction: sourceIsEnglish ? "en-zh" : "zh-en",
        }),
      });
      const data = await response.json();
      if (response.ok && data.text) {
        if (sourceIsEnglish) {
          chinesePrompt = data.text;
        } else {
          englishPrompt = data.text;
        }
      } else {
        throw new Error(data.error || "自动翻译失败");
      }
    } catch (error) {
      chinesePrompt = chinesePrompt || sourcePrompt;
      englishPrompt = englishPrompt || sourcePrompt;
    }

    const nextItem = {
      id: `prompt-${Date.now()}`,
      title: form.title.trim(),
      uploader: "Suyeya",
      type: form.type.trim() || "未分类",
      tool: form.tool.trim() || "未指定",
      chinese: chinesePrompt,
      english: englishPrompt,
      tags: parseTags(form.tagsInput),
      image: parseLines(form.resultImagesInput)[0] || "",
      images: parseLines(form.resultImagesInput),
      referenceImages: parseLines(form.referenceImagesInput).slice(0, 8),
      detailText: form.processText.trim(),
      detailImages: extractDetailImages(form.processText),
      createdAt: new Date().toISOString(),
    };

    if (dataSource === "feishu") {
      const response = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...nextItem,
          detailImagesInput: form.resultImagesInput,
          referenceImagesInput: form.referenceImagesInput,
          detailText: form.processText,
          detailContentImagesInput: extractDetailImages(form.processText).join("\n"),
          status: "已发布",
        }),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        window.alert(message.error || "写入飞书失败，请检查权限。");
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      setPrompts((current) => [data.prompt || nextItem, ...current]);
      resetForm();
      setView("board");
      setIsSubmitting(false);
      return;
    }

    setPrompts((current) =>
      [nextItem, ...current]
    );
    resetForm();
    setView("board");
    setIsSubmitting(false);
  }

  function openPromptDetail(id) {
    setSelectedId(id);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  function goHome() {
    setSelectedId(null);
    setView("board");
    setQuery("");
    setActiveFilter({ kind: "all", value: "全部" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyPromptText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedDetail(true);
    window.setTimeout(() => setCopiedDetail(false), 1400);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand brand-button" onClick={goHome} aria-label="返回首页">
          <span className="brand-mark">PA</span>
          <div>
            <h1>Suyeya prompt</h1>
            <p>AI 提示词瀑布流管理</p>
          </div>
        </button>

        <div className="search-wrap">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、内容、工具或标签"
          />
          {query && (
            <button className="icon-button ghost" onClick={() => setQuery("")} aria-label="清空搜索">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="top-actions">
          <span className="total-count">
            提示词收录总计：{isSyncingRemote ? "同步中" : prompts.length}
          </span>
          <button
            className={view === "board" ? "nav-button active" : "nav-button"}
            onClick={() => {
              setSelectedId(null);
              setView("board");
            }}
          >
            <LayoutDashboard size={17} />
            看板
          </button>
          <button
            className="primary-button"
            onClick={() => {
              resetForm();
              setView("manage");
              window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }}
          >
            <Plus size={18} />
            新增
          </button>
        </div>
      </header>

      {view === "board" && !selectedPrompt && (
        <HeroPoster
          prompts={prompts}
          total={prompts.length}
          featuredIndex={featuredIndex}
          onFeaturedChange={setFeaturedIndex}
        />
      )}

      {view === "board" && !selectedPrompt && (
        <section className="filter-strip" aria-label="筛选">
          <button
            className={activeFilter.kind === "all" ? "filter-chip active" : "filter-chip"}
            onClick={() => setActiveFilter({ kind: "all", value: "全部" })}
          >
            全部
          </button>
          {types.map((type) => (
            <button
              key={type}
              className={
                activeFilter.kind === "type" && activeFilter.value === type
                  ? "filter-chip active"
                  : "filter-chip"
              }
              onClick={() => setActiveFilter({ kind: "type", value: type })}
            >
              {type}
            </button>
          ))}
          {tags.map((tag) => (
            <button
              key={tag}
              className={
                activeFilter.kind === "tag" && activeFilter.value === tag
                  ? "filter-chip active tag"
                  : "filter-chip tag"
              }
              onClick={() => setActiveFilter({ kind: "tag", value: tag })}
            >
              #{tag}
            </button>
          ))}
        </section>
      )}

      {view === "board" && selectedPrompt ? (
        <PromptDetail
          item={selectedPrompt}
          copied={copiedDetail}
          onBack={() => setSelectedId(null)}
          onCopy={copyPromptText}
        />
      ) : view === "board" ? (
        <Board prompts={filteredPrompts} onOpen={openPromptDetail} />
      ) : (
        <Manage
          form={form}
          formRef={formRef}
          typeOptions={types}
          tagOptions={tags}
          isSubmitting={isSubmitting}
          onFormChange={updateForm}
          onImagesToField={uploadImagesToField}
          onImagePaste={handleImagePaste}
          onPasteFromClipboard={pasteImageFromClipboard}
          onImagesIntoText={insertImagesIntoText}
          onPasteIntoText={pasteImageIntoTextFromClipboard}
          onSubmit={handleSubmit}
          onCancel={resetForm}
        />
      )}
    </main>
  );
}

function HeroPoster({ prompts, total, featuredIndex, onFeaturedChange }) {
  const featured = prompts[featuredIndex % Math.max(prompts.length, 1)];

  function moveFeatured(direction) {
    if (!prompts.length) return;
    onFeaturedChange((featuredIndex + direction + prompts.length) % prompts.length);
  }

  return (
    <section className="hero-poster">
      <div className="hero-copy">
        <span className="hero-badge">图像提示词 · 每日收录 · 免费整理</span>
        <h2>
          图像
          <span>提示词</span>
        </h2>
        <p>
          为主流 AI 图像模型精选高质量提示词，覆盖 Nano Banana Pro、GPT Image 2、
          Seedream、Midjourney 与 Stable Diffusion。
        </p>
      </div>

      <div className="hero-side">
        <div className="featured-card">
          <div className="featured-accent" />
          {featured?.image ? (
            <img src={featured.image} alt={featured.title} />
          ) : (
            <div className="featured-empty">
              <ImagePlus size={32} />
            </div>
          )}
          <div className="featured-footer">
            <strong>{featured?.title || "精选提示词"}</strong>
            <span>{featured?.tool || "AI IMAGE"}</span>
          </div>
          <div className="featured-controls">
            <button type="button" onClick={() => moveFeatured(-1)} aria-label="上一张">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => moveFeatured(1)} aria-label="下一张">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="hero-stat">
          <span>已收录</span>
          <strong>{total.toLocaleString("zh-CN")}</strong>
          <small>条提示词</small>
        </div>
      </div>
    </section>
  );
}

function Board({ prompts, onOpen }) {
  if (!prompts.length) {
    return (
      <section className="empty-state">
        <ImagePlus size={36} />
        <h2>没有匹配的提示词</h2>
        <p>换个关键词或筛选条件试试。</p>
      </section>
    );
  }

  return (
    <section className="masonry" aria-label="提示词瀑布流">
      {prompts.map((item) => (
        <article
          className="prompt-card"
          key={item.id}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(item.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onOpen(item.id);
            }
          }}
        >
          {item.image ? (
            <img className="preview-image" src={item.image} alt={item.title} loading="lazy" />
          ) : (
            <div className="preview-placeholder">
              <ImagePlus size={28} />
            </div>
          )}
          <div className="card-body">
            <h2>{item.title}</h2>
            <div className="display-meta">
              <span>@{item.uploader || "未命名"}</span>
              <strong>{item.tool}</strong>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function PromptDetail({ item, copied, onBack, onCopy }) {
  const [imageIndex, setImageIndex] = useState(0);
  const [promptLanguage, setPromptLanguage] = useState("chinese");
  const [previewReference, setPreviewReference] = useState("");
  const images = item.images?.length ? item.images : [item.image].filter(Boolean);
  const activeImage = images[imageIndex] || item.image;
  const referenceImages = (item.referenceImages || []).slice(0, 8);
  const detailImages = item.detailImages || [];
  const activePrompt =
    promptLanguage === "chinese" ? item.chinese || item.english : item.english || item.chinese;
  const dateLabel = item.createdAt
    ? new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(item.createdAt))
    : "未记录";

  useEffect(() => {
    setImageIndex(0);
    setPromptLanguage("chinese");
    setPreviewReference("");
  }, [item.id]);

  useEffect(() => {
    if (images.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setImageIndex((current) => (current + 1) % images.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [images.length, item.id]);

  function moveImage(direction) {
    if (!images.length) return;
    setImageIndex((current) => (current + direction + images.length) % images.length);
  }

  return (
    <section className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        返回提示词列表
      </button>

      <div className="detail-grid">
        <article className="detail-main">
          <div className="breadcrumb">提示词 / 图像 / {item.title}</div>
          <span className="detail-type">图像提示词</span>
          <h2>{item.title}</h2>

          <div className="detail-image-wrap">
            {activeImage ? (
              <img className="detail-image" src={activeImage} alt={item.title} />
            ) : (
              <div className="detail-image-empty">
                <ImagePlus size={40} />
              </div>
            )}
            {images.length > 1 && (
              <div className="detail-image-controls">
                <button type="button" onClick={() => moveImage(-1)} aria-label="上一张详情图">
                  <ChevronLeft size={18} />
                </button>
                <span>
                  {imageIndex + 1} / {images.length}
                </span>
                <button type="button" onClick={() => moveImage(1)} aria-label="下一张详情图">
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
            {images.length > 1 && (
              <div className="detail-image-dots">
                {images.map((_, index) => (
                  <button
                    type="button"
                    key={index}
                    className={index === imageIndex ? "active" : ""}
                    onClick={() => setImageIndex(index)}
                    aria-label={`切换结果图 ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {referenceImages.length > 0 && (
            <div className="reference-strip">
              <div className="reference-heading">参考图</div>
              <div className="reference-grid">
                {referenceImages.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setPreviewReference(image)}
                    aria-label={`查看参考图 ${index + 1}`}
                  >
                    <img src={image} alt={`参考图 ${index + 1}`} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="prompt-box">
            <div className="prompt-box-head">
              <strong>{promptLanguage === "chinese" ? "中文提示词" : "English Prompt"}</strong>
              <div className="prompt-head-actions">
                <button type="button" onClick={() => onCopy(activePrompt)}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "已复制" : "复制提示词"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPromptLanguage((current) => (current === "chinese" ? "english" : "chinese"))
                  }
                >
                  {promptLanguage === "chinese" ? "切换英文" : "切换中文"}
                </button>
              </div>
            </div>
            <p>{activePrompt}</p>
          </div>

        </article>

        <aside className="detail-side">
          <section className="side-card author-card">
            <div className="avatar">{(item.uploader || "未").slice(0, 1).toUpperCase()}</div>
            <div>
              <strong>@{item.uploader || "未命名"}</strong>
              <span>提示词上传人</span>
            </div>
          </section>

          <section className="side-card meta-card">
            <div>
              <span>发布时间</span>
              <strong>
                <CalendarDays size={16} />
                {dateLabel}
              </strong>
            </div>
            <div>
              <span>模型</span>
              <strong>{item.tool}</strong>
            </div>
            <div>
              <span>分类</span>
              <strong>{item.type}</strong>
            </div>
            <div>
              <span>标签</span>
              <div className="detail-tags">
                {(item.tags || []).map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </section>

        </aside>
      </div>
      <DetailArticle
        content={item.detailText}
        images={detailImages}
        onPreviewImage={setPreviewReference}
      />
      {previewReference && (
        <div className="reference-modal" onClick={() => setPreviewReference("")}>
          <button type="button" aria-label="关闭参考图" onClick={() => setPreviewReference("")}>
            <X size={22} />
          </button>
          <img src={previewReference} alt="参考图预览" />
        </div>
      )}
    </section>
  );
}

function DetailArticle({ content, images, onPreviewImage }) {
  const blocks = parseDetailContent(content, images);
  if (!blocks.length) return null;
  const headings = blocks.filter((block) => block.type === "heading");

  return (
    <section className="process-section detail-article-section">
      <div className="article-heading-row">
        <h3>详情介绍</h3>
      </div>
      <div className={headings.length > 1 ? "detail-article-layout has-toc" : "detail-article-layout"}>
        <div className="detail-article-body">
          {blocks.map((block, index) => {
            if (block.type === "heading") {
              const HeadingTag = block.level === 1 ? "h4" : "h5";
              return (
                <HeadingTag key={`${block.text}-${index}`} id={`detail-heading-${index}`}>
                  {block.text}
                </HeadingTag>
              );
            }

            if (block.type === "quote") {
              return <blockquote key={`${block.text}-${index}`}>{block.text}</blockquote>;
            }

            if (block.type === "image") {
              return (
                <button
                  type="button"
                  className="article-image-button"
                  key={`${block.src}-${index}`}
                  onClick={() => onPreviewImage(block.src)}
                  aria-label={`查看详情插图 ${index + 1}`}
                >
                  <img src={block.src} alt={`详情插图 ${index + 1}`} />
                </button>
              );
            }

            return <p key={`${block.text}-${index}`}>{block.text}</p>;
          })}
        </div>

        {headings.length > 1 && (
          <aside className="detail-article-toc">
            <strong>目录</strong>
            {headings.map((heading, headingIndex) => (
              <span key={`${heading.text}-${headingIndex}`}>{heading.text}</span>
            ))}
          </aside>
        )}
      </div>
    </section>
  );
}

function Manage({
  form,
  formRef,
  typeOptions,
  tagOptions,
  isSubmitting,
  onFormChange,
  onImagesToField,
  onImagePaste,
  onPasteFromClipboard,
  onImagesIntoText,
  onPasteIntoText,
  onSubmit,
  onCancel,
}) {
  function addTag(tag) {
    const current = parseTags(form.tagsInput);
    if (current.includes(tag)) return;
    onFormChange("tagsInput", [...current, tag].join("，"));
  }

  return (
    <section className="manage-layout">
      <form className="editor-panel" ref={formRef} onSubmit={onSubmit}>
        <div className="panel-heading">
          <div>
            <h2>新增提示词</h2>
            <p>上传效果图，填写任意语言提示词，提交时自动生成中英文。</p>
          </div>
        </div>

        <div className="editor-form-columns">
          <div className="editor-main-fields">
        <div className="form-grid compact-fields">
          <label>
            标题
            <input
              value={form.title}
              onChange={(event) => onFormChange("title", event.target.value)}
              placeholder="例如：模块化咖啡机产品爆炸图"
              required
            />
          </label>
          <label>
            类型
            <input
              list="type-options"
              value={form.type}
              onChange={(event) => onFormChange("type", event.target.value)}
              placeholder="产品爆炸图"
            />
            <datalist id="type-options">
              {typeOptions.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="form-grid compact-fields">
          <label>
            生成工具
            <input
              value={form.tool}
              onChange={(event) => onFormChange("tool", event.target.value)}
              placeholder="Midjourney"
            />
          </label>
          <label>
            标签
            <input
              list="tag-options"
              value={form.tagsInput}
              onChange={(event) => onFormChange("tagsInput", event.target.value)}
              placeholder="复古，3D渲染，赛博朋克"
            />
            <datalist id="tag-options">
              {tagOptions.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </label>
        </div>

        {tagOptions.length > 0 && (
          <div className="suggestion-row form-wide">
            {tagOptions.map((tag) => (
              <button type="button" key={tag} onClick={() => addTag(tag)}>
                #{tag}
              </button>
            ))}
          </div>
        )}

        <label className="prompt-field full-prompt-field">
          <span className="label-row">
            提示词
            <button
              type="button"
              className="text-tool-button"
              disabled
            >
              <Languages size={15} />
              提交时自动翻译
            </button>
          </span>
          <textarea
            value={form.promptText}
            onChange={(event) => onFormChange("promptText", event.target.value)}
            placeholder="中文或英文都可以，提交时会自动补齐另一种语言"
            rows={3}
          />
        </label>

          </div>

          <div className="editor-media-fields">
        <UploadModule
          title="预览图 / 结果图"
          description="首页展示第一张；详情页可用圆点切换，3秒自动轮播。"
          field="resultImagesInput"
          value={form.resultImagesInput}
          onFormChange={onFormChange}
          onImagesToField={onImagesToField}
          onImagePaste={onImagePaste}
          onPasteFromClipboard={onPasteFromClipboard}
        />

        <UploadModule
          title="参考图"
          description="最多8张，详情页展示缩略图，点击放大；没有可留空。"
          field="referenceImagesInput"
          value={form.referenceImagesInput}
          limit={8}
          onFormChange={onFormChange}
          onImagesToField={onImagesToField}
          onImagePaste={onImagePaste}
          onPasteFromClipboard={onPasteFromClipboard}
        />

        <RichDetailEditor
          value={form.processText}
          onFormChange={onFormChange}
          onImagesIntoText={onImagesIntoText}
          onPasteIntoText={onPasteIntoText}
        />

          </div>
        </div>

        <div className="form-actions">
          <button className="primary-button" type="submit">
            <Check size={18} />
            {isSubmitting ? "翻译并写入中" : "添加提示词"}
          </button>
          <button className="secondary-button" type="button" onClick={onCancel}>
            清空
          </button>
        </div>
      </form>
    </section>
  );
}

function RichDetailEditor({ value, onFormChange, onImagesIntoText, onPasteIntoText }) {
  const textareaRef = useRef(null);

  async function handlePaste(event) {
    const files = Array.from(event.clipboardData?.files || []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!files.length) return;
    event.preventDefault();
    await onImagesIntoText(files, "processText", event.target.selectionStart, event.target.selectionEnd);
  }

  async function handleFileChange(event) {
    const target = textareaRef.current;
    await onImagesIntoText(
      event.target.files,
      "processText",
      target?.selectionStart,
      target?.selectionEnd
    );
    event.target.value = "";
  }

  return (
    <section className="upload-module detail-editor-module">
      <div className="upload-module-head">
        <div>
          <strong>详情正文</strong>
          <span>文字和图片会按正文顺序展示。</span>
        </div>
        <div className="upload-actions">
          <button type="button" onClick={() => onPasteIntoText("processText")}>
            粘贴图片
          </button>
          <label className="upload-action-file">
            上传图片
            <input type="file" accept="image/*" multiple onChange={handleFileChange} />
          </label>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onFormChange("processText", event.target.value)}
        onPaste={handlePaste}
        placeholder={"# 为什么这个提示词有效\n正文段落...\n> 这里可以写重点提示\n\n粘贴图片会自动插入到正文里"}
        rows={5}
      />
    </section>
  );
}

function UploadModule({
  title,
  description,
  field,
  value,
  limit = Infinity,
  compact = false,
  onFormChange,
  onImagesToField,
  onImagePaste,
  onPasteFromClipboard,
}) {
  const images = parseLines(value);
  const canAddMore = images.length < limit;

  return (
    <section className={compact ? "upload-module compact-upload-module" : "upload-module"}>
      <div className="upload-module-head">
        <div>
          <strong>{title}</strong>
          <span>{description}</span>
        </div>
        <div className="upload-actions">
          <button type="button" onClick={() => onPasteFromClipboard(field, limit)} disabled={!canAddMore}>
            粘贴图片
          </button>
          <label className="upload-action-file">
            上传图片
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={!canAddMore}
              onChange={(event) => onImagesToField(event.target.files, field, limit)}
            />
          </label>
        </div>
      </div>

      {images.length > 0 && (
        <div className="upload-preview-row">
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="upload-preview-item">
              <img src={image} alt={`${title} ${index + 1}`} />
              <span>{index + 1}</span>
            </div>
          ))}
        </div>
      )}

      <textarea
        value={value}
        onChange={(event) =>
          onFormChange(field, limit === Infinity ? event.target.value : parseLines(event.target.value).slice(0, limit).join("\n"))
        }
        onPaste={(event) => onImagePaste(event, field, limit)}
        placeholder="可粘贴图片链接；也可以直接复制图片后在这里粘贴上传"
        rows={compact ? 1 : 2}
      />
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
