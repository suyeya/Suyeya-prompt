# 飞书多维表格接入说明

## 1. 多维表格字段

建议创建这些字段，字段名保持一致即可直接读取：

| 字段名 | 类型 | 用途 |
| --- | --- | --- |
| 标题 | 单行文本 | 卡片标题和详情页标题 |
| 上传人 | 单行文本 | 卡片和详情页作者 |
| 模型 | 单选 / 单行文本 | Midjourney、GPT Image 2 等 |
| 类型 | 单选 / 单行文本 | 产品爆炸图、UI样机等 |
| 中文提示词 | 多行文本 | 详情页说明 |
| 英文提示词 | 多行文本 | 复制用的完整提示词 |
| 标签 | 多选 / 文本 | 筛选和详情页标签 |
| 封面图URL | URL / 文本 | 卡片封面图 |
| 详情图片URL组 | 多行文本 | 每行一个图片链接，详情页自动轮播 |
| 状态 | 单选 | 草稿、已发布；草稿/隐藏/未发布不会展示 |
| 排序 | 数字 | 数字越大越靠前 |
| 发布时间 | 日期 | 详情页发布时间 |

第一版建议用图片 URL，不建议直接用飞书附件。飞书附件需要鉴权或临时链接，公开前台展示不够稳定。

## 2. 飞书开放平台配置

1. 创建飞书自建应用。
2. 开通多维表格读取相关权限。
3. 发布应用版本，让权限生效。
4. 把该应用添加为目标多维表格的协作者或文档应用。
5. 获取：
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
   - `FEISHU_APP_TOKEN`
   - `FEISHU_TABLE_ID`

## 3. 本地环境变量

复制 `.env.example` 为 `.env`，填入真实值：

```env
FEISHU_APP_ID=cli_xxxxxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
FEISHU_APP_TOKEN=bascnxxxxxxxxxxxx
FEISHU_TABLE_ID=tblxxxxxxxxxxxx
```

如果你的字段名不同，也可以在 `.env` 里覆盖：

```env
FEISHU_FIELD_TITLE=标题
FEISHU_FIELD_DETAIL_IMAGES=详情图片URL组
```

## 4. 启动

```bash
npm run dev
```

启动后：

- 前台：`http://127.0.0.1:5173`
- 本地 API：`http://127.0.0.1:8787/api/prompts`

没有配置 `.env` 时，前台会继续显示本地示例数据。
