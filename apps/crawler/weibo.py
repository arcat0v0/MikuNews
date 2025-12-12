import json
import os
import sys
import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional

from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CacheMode,
    CrawlerRunConfig,
    LLMConfig,
    LLMExtractionStrategy,
)
from pydantic import BaseModel, Field

CURRENT_DIR = Path(__file__).resolve().parent
REPO_ROOT = CURRENT_DIR.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.append(str(REPO_ROOT))

from apps.crawler.weibo_image_downloader import WeiboImageDownloader
from apps.crawler.r2_uploader import R2Config, R2Uploader


class WeiboPost(BaseModel):
    date: str = Field(
        ...,
        description="微博发布时间，尽量用 YYYY-MM-DD HH:mm 格式；无法判断时可以填'日期未知'",
    )
    title: str = Field(
        ...,
        description="该条微博的一个简短标题，概括主要事件或主题",
    )
    summary: str = Field(
        ...,
        description="2-4 句中文摘要，说明发生了什么、何时何地、和谁相关以及重要性",
    )
    url: str = Field(
        ...,
        description="该条微博的原始链接，必须填写原文地址",
    )
    importance: int = Field(
        ...,
        description="重要等级，1-4 的整数，1 最重要（重大公告、演出信息、作品发布），2 ~ 3 一般重要（合作联动、官方周边、日常更新、互动），这个主要看配图的比例是横屏还是竖屏，如果配图是横屏，则用2,反正用3；4 次要（琐碎信息）",
    )
    engagement: Optional[str] = Field(
        None,
        description="可选：转发/评论/点赞等互动数据的简要描述，例如'转发 158 评论 184 点赞 1167'",
    )
    media_urls: Optional[List[str]] = Field(
        None,
        description="可选：正文内出现的图片或视频链接（img/src、视频封面或播放地址等），使用绝对或可直接访问的 URL 列表",
    )
    content_markdown: str = Field(
        ...,
        description="微博正文内容的 Markdown 版本，尽量原样保留换行和表情（用占位符即可），不额外生成总结",
    )


@dataclass(frozen=True)
class LLMSettings:
    provider: str = "openai/deepseek-chat"
    api_token_env: str = "DEEPSEEK_APIKEY"
    base_url: str = "https://api.deepseek.com/v1"
    temperature: float = 0.3
    max_tokens: int = 2000
    extra_headers: Optional[dict] = None


DEFAULT_LLM_SETTINGS = LLMSettings()


def build_llm_config(settings: LLMSettings) -> LLMConfig:
    """根据配置构造 crawl4ai 的 LLMConfig。"""
    return LLMConfig(
        provider=settings.provider,
        api_token=f"env:{settings.api_token_env}",
        base_url=settings.base_url,
        temperature=settings.temperature,
        max_tokens=settings.max_tokens,
    )


def build_instruction() -> str:
    """默认的 LLM 抽取指令，供调用方覆盖。"""
    return """
你是一个内容筛选与整理助手，目标页面是一名微博用户的主页（不限具体账号）。

任务目标：从给定内容中，抽取若干条"与该账号主题高度相关、且信息量较大"的微博，每条微博用一个 JSON 对象表示，对象结构由 schema 决定。你最终要返回的是一个 JSON 数组（列表）。

请遵守以下要求：
1. 只保留对账号关注者有价值的内容，例如：重要公告、活动/演出信息、作品/产品发布、合作/联动、官方周边、里程碑或总结类信息。
2. 严格忽略并**不要**单独生成以下类型的记录：
   - 对"页面只是框架代码/仅包含SVG图标/没有正文内容"等元描述性的说明性总结
   - 登录/注册提示、按钮、导航栏、热搜、推荐等 UI 元素
   - 纯表情或几乎没有实质信息的短句
   - **所有转发的微博**（无论是否有附加评论，只要是转发就跳过）
   - 包含"转发微博"字样或明显是转发他人内容的微博
3. 对每条保留的微博（一个 JSON 对象）：
   - 填写 date：尽可能从文本或时间信息中推断出 YYYY-MM-DD；不能确定时填"日期未知"
   - 填写 title：一行中文标题，突出事件/活动的核心信息
   - 填写 summary：2–4 句中文，描述关键信息（发生了什么、何时何地、与谁相关、有何意义）
   - url 必须填入微博原文链接（不可留空）
   - 填写 importance：评估该微博的重要等级（1-4 的整数）：
     * 1 = 最重要：重大公告、演唱会/演出信息、新作品/新专辑发布、重要合作发布
     * 2 = 较重要：合作联动预告、官方周边发售、重要活动参与、里程碑事件
     * 3 = 一般重要：日常更新、粉丝互动、幕后花絮、一般性宣传
     * 4 = 次要：琐碎日常、简单问候、非实质性内容
   - content_markdown：把微博正文用 Markdown 原样搬运（不要省略/改写正文，保留换行；表情可用原样或占位符；若正文明显未完全展开则跳过该条），不过要删除"收起"字样
   - 如能从上下文推测互动数据（转发/评论/点赞），可以写入 engagement（简单中文描述即可）
   - 尽可能提取正文中出现的图片或视频链接，填入 media_urls 数组（img/src、视频封面或播放地址等，可直接访问的 URL 均可）
   - 如果正文明显不完整（如含"展开"且未展开，或关键信息缺失），跳过该条，不要生成记录
4. 在有真实微博内容的情况下，请**只**输出真实微博对应的 JSON 对象，不要再附加"页面缺失/仅框架代码"等解释性条目。
5. 如果确实完全找不到任何微博正文（例如内容确实为空），此时可以返回一个空数组 `[]`。
6. 最终输出必须是一个 **JSON 数组**（例如 `[ {...}, {...} ]`），数组里的每个元素都是一个合法的 WeiboPost 对象。不要在 JSON 之外添加任何多余文本或 Markdown。
"""


async def crawl_weibo(
    url: str,
    instruction: Optional[str] = None,
    headless: bool = False,
    download_media: bool = False,
    llm_settings: LLMSettings = DEFAULT_LLM_SETTINGS,
    r2_config: Optional[R2Config] = None,
    date_prefix: Optional[str] = None,
) -> List[dict]:
    downloader = None

    try:
        # 爬取阶段
        browser_conf = BrowserConfig(
            headless=headless,
            viewport_width=1280,
            viewport_height=2000,
        )

        # 构建 extra_args，如果有额外的 HTTP 头则添加
        extra_args = {}
        if llm_settings.extra_headers:
            extra_args["extra_headers"] = llm_settings.extra_headers

        extraction_strategy = LLMExtractionStrategy(
            llm_config=build_llm_config(llm_settings),
            schema=WeiboPost.model_json_schema(),
            extraction_type="block",
            instruction=instruction or build_instruction(),
            apply_chunking=True,
            chunk_token_threshold=4800,
            overlap_rate=0.1,
            input_format="html",
            verbose=True,
            extra_args=extra_args if extra_args else {},
        )

        c4a_script = r"""
# 等待正文容器出现
WAIT `#scroller` 8
# 向下滑动3个页面高度以加载更多内容
EVAL `window.scrollTo(0, window.innerHeight);`
WAIT `#scroller` 2
EVAL `window.scrollTo(0, window.innerHeight * 2);`
WAIT `#scroller` 2
EVAL `window.scrollTo(0, window.innerHeight * 3);`
WAIT `#scroller` 2
# 点击所有"展开"按钮，避免正文截断
EVAL `document.querySelectorAll('#scroller span.expand').forEach(el => el.click());`
# 等待展开内容渲染
WAIT `#scroller` 3
"""

        run_conf = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,
            scan_full_page=False,
            scroll_delay=0.0,
            process_iframes=True,
            remove_overlay_elements=False,
            extraction_strategy=extraction_strategy,
            c4a_script=c4a_script,
            delay_before_return_html=8.0,
            css_selector="#scroller .vue-recycle-scroller__item-wrapper",
        )

        async with AsyncWebCrawler(config=browser_conf) as crawler:
            result = await crawler.arun(url=url, config=run_conf)

        if not result.success:
            raise RuntimeError(f"爬取失败: {result.error_message}")

        try:
            posts_data = json.loads(result.extracted_content)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"JSON 解析失败: {exc}") from exc

        # 图片下载阶段 - 使用图片下载器管理浏览器
        if download_media and posts_data:
            print(f"[Weibo] ========== Media Download Phase ==========")
            print(
                f"[Weibo] download_media={download_media}, posts_count={len(posts_data)}"
            )
            print(
                f"[Weibo] r2_config={'configured' if r2_config else 'NOT configured'}"
            )

            images_dir = Path("images")
            uploader = (
                R2Uploader(r2_config, date_prefix=date_prefix) if r2_config else None
            )
            if uploader:
                print(f"[Weibo] ✓ R2 uploader created with date_prefix={date_prefix}")
            else:
                print(f"[Weibo] ✗ R2 uploader NOT created (r2_config is None)")

            downloader = WeiboImageDownloader(
                profile_url=url, download_dir=str(images_dir), r2_uploader=uploader
            )
            print(f"[Weibo] Starting media download to {images_dir}...")

            # 启动浏览器并准备页面
            await downloader.start_browser(headless=headless)
            await downloader.prepare_page()

            posts_with_media = 0
            posts_without_media = 0

            for i, post in enumerate(posts_data, 1):
                media_urls = post.get("media_urls")
                if not media_urls:
                    posts_without_media += 1
                    print(
                        f"[Weibo] Post {i}/{len(posts_data)}: No media_urls, skipping"
                    )
                    continue

                posts_with_media += 1
                post_url = post.get("url", "")
                post_id = post_url.split("/")[-1] if post_url else f"post_{i}"
                post_title = post.get("title", "")[:50]

                print(f"\n[Weibo] Post {i}/{len(posts_data)}: {post_title}")
                print(f"[Weibo]   ID: {post_id}")
                print(f"[Weibo]   Media URLs: {len(media_urls)} items")
                print(f"[Weibo]   Original URLs: {media_urls[:2]}...")

                local_paths = await downloader.download_media_list(media_urls, post_id)

                print(f"[Weibo]   Downloaded paths: {local_paths[:2]}...")
                post["media_urls"] = local_paths

            print(f"\n[Weibo] ========== Media Download Summary ==========")
            print(f"[Weibo] Total posts: {len(posts_data)}")
            print(f"[Weibo] Posts with media: {posts_with_media}")
            print(f"[Weibo] Posts without media: {posts_without_media}")

        return posts_data

    finally:
        # 清理浏览器资源
        if downloader:
            await downloader.close_browser()


async def main():
    # 默认运行配置：URL 和参数写死在脚本中
    default_url = "https://www.weibo.com/u/2462905490"
    default_headless = True
    default_download_media = False

    posts = await crawl_weibo(
        url=default_url,
        instruction=build_instruction(),
        headless=default_headless,
        download_media=default_download_media,
    )
    print(json.dumps(posts, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
