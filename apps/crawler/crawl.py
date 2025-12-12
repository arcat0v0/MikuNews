"""
爬虫主入口：基于配置数组调度多个爬虫源，并将内容推送到 Hono /submit。

运行（无需参数）：
  uv run apps/crawler/crawl.py

配置说明：
  - 爬虫配置：CRAWLER_CONFIGS 数组，每个配置包含 type、url、author、color
  - LLM 提供商：LLM_PROVIDERS 字典，支持 deepseek、openrouter 等
  - 是否 headless：HEADLESS
  - 是否下载媒体：DOWNLOAD_MEDIA
  - 是否推送：PUSH_TO_HONO（若 False 则只打印 JSON）
  - 提交地址通过环境变量 HONO_BASE_URL 推导（默认 http://127.0.0.1:8787）

环境变量：
  - LLM_PROVIDER: 指定使用的 LLM 提供商（默认 "openrouter"）
  - DEEPSEEK_APIKEY: DeepSeek API 密钥
  - OPENROUTER_API_KEY: OpenRouter API 密钥
  - OPENROUTER_PROVIDER: OpenRouter 供应商优先级（默认 "DeepInfra,Together"）
    可选值: DeepInfra, Together, Fireworks, Lepton, Novita, Lambda 等
    格式: "Provider1,Provider2" 或 "Provider1:order=1,Provider2:order=2"
  - HONO_BASE_URL: Hono 服务基础地址
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, List, Tuple
from urllib.parse import quote
from urllib.request import urlopen

# Ensure repo root on sys.path when running as a script
CURRENT_DIR = os.path.abspath(os.path.dirname(__file__))
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)

from apps.crawler.push_to_hono import (  # noqa: E402
    ArticlePayload,
    build_article_from_weibo,
    post_article,
    load_config_from_env,
)
from apps.crawler.weibo import (  # noqa: E402
    LLMSettings,
    crawl_weibo,
)


@dataclass
class LLMProviderConfig:
    """LLM 提供商配置"""

    name: str  # 提供商名称，如 "deepseek", "openrouter"
    provider: str  # crawl4ai 的 provider 字符串
    api_token_env: str  # API token 环境变量名
    base_url: str  # API 基础 URL
    temperature: float = 0.3  # 温度参数
    max_tokens: int = 2000  # 最大 token 数
    extra_headers: dict[str, str] | None = None  # 额外的 HTTP 头


@dataclass
class CrawlerConfig:
    """爬虫配置"""

    type: str  # 爬虫类型，如 "weibo"
    url: str  # 爬取的 URL
    author: str  # 作者名称
    color: str = "#e0e7ff"  # 标签颜色


# LLM 提供商配置数组
LLM_PROVIDERS = {
    "deepseek": LLMProviderConfig(
        name="deepseek",
        provider="openai/deepseek-chat",
        api_token_env="DEEPSEEK_APIKEY",
        base_url="https://api.deepseek.com/v1",
        temperature=0.3,
        max_tokens=2000,
    ),
    "openrouter": LLMProviderConfig(
        name="openrouter",
        provider="openrouter/google/gemini-2.5-flash",  # OpenRouter 模型路径
        api_token_env="OPENROUTER_API_KEY",
        base_url="https://openrouter.ai/api/v1",
        temperature=0.3,
        max_tokens=2000,
        extra_headers={
            # 通过 X-Provider-Preference 指定供应商优先级
            # 格式: "Provider1,Provider2" 或 "Provider1:order=1,Provider2:order=2"
            # 可选供应商: DeepInfra, Together, Fireworks, Lepton, Novita, Lambda 等
            # 留空则使用 OpenRouter 默认路由
            "X-Provider-Preference": os.getenv("OPENROUTER_PROVIDER", "google-vertex"),
        },
    ),
}

# 默认使用的 LLM 提供商（可通过环境变量 LLM_PROVIDER 覆盖）
DEFAULT_LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openrouter")

# 爬虫配置数组
CRAWLER_CONFIGS = [
    CrawlerConfig(
        type="weibo",
        url="https://www.weibo.com/u/2462905490",
        author="初音未来CryptonFutureMedia-weibo",
        color="#e0e7ff",
    ),
    # 可以在这里添加更多爬虫配置
    # CrawlerConfig(
    #     type="weibo",
    #     url="https://www.weibo.com/u/另一个用户ID",
    #     author="另一个作者名",
    #     color="#fef3c7",
    # ),
]

# 全局配置
HEADLESS = True
DOWNLOAD_MEDIA = True
PUSH_TO_HONO = True
DRY_RUN = False

# Hono 基础地址：优先使用环境变量 HONO_BASE_URL，否则回退到本地开发地址
HONO_BASE_URL = os.getenv("HONO_BASE_URL", "http://127.0.0.1:8787")
HONO_SUBMIT_URL = f"{HONO_BASE_URL.rstrip('/')}/submit"


def _today_prefix() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _fetch_existing_article_summaries(hono_base_url: str) -> List[Tuple[str, str]]:
    """
    从 Hono /articles 读取已有文章，解析 frontmatter 中的 title 和 timestamp，
    生成最近的 20 条 (日期, 标题) 列表，用于传递给 LLM 做“已有文章参考”。
    """
    base = hono_base_url.rstrip("/")
    index_url = f"{base}/articles"

    try:
        with urlopen(index_url, timeout=30) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        data = json.loads(raw)
    except Exception as e:  # noqa: BLE001
        print(f"[Crawler] WARNING: Failed to fetch /articles index: {e}")
        return []

    files = data.get("files") or []
    summaries_with_ts: List[Tuple[str, str, int]] = []

    for f in files:
        name = f.get("name")
        if not name:
            continue

        # 文件名可能包含非 ASCII 字符，需 URL 编码
        detail_url = f"{base}/articles/{quote(name, safe='')}"
        try:
            with urlopen(detail_url, timeout=30) as resp:
                raw = resp.read().decode("utf-8", errors="ignore")
            detail = json.loads(raw)
        except Exception as e:  # noqa: BLE001
            print(f"[Crawler] WARNING: Failed to fetch article {name}: {e}")
            continue

        content = (detail.get("file") or {}).get("content") or ""

        # 轻量解析 frontmatter：在第一对 --- 之间解析 title / timestamp
        title_value: str | None = None
        ts_value: int | None = None
        if content.startswith("---"):
            parts = content.split("---", 2)
            if len(parts) >= 3:
                frontmatter = parts[1]
                for line in frontmatter.splitlines():
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    key, sep, value = line.partition(":")
                    if sep != ":":
                        continue
                    key = key.strip().lower()
                    value = value.strip().strip('"').strip("'")
                    if not value:
                        continue
                    if key == "title":
                        title_value = value
                    elif key == "timestamp":
                        try:
                            ts_value = int(value)
                        except ValueError:
                            ts_value = None

        if not title_value:
            continue

        # 将毫秒级时间戳转为 YYYY-MM-DD，失败则标记为“日期未知”
        date_str = "日期未知"
        if ts_value:
            try:
                dt = datetime.fromtimestamp(ts_value / 1000.0, tz=timezone.utc)
                date_str = dt.strftime("%Y-%m-%d")
            except Exception:
                pass

        summaries_with_ts.append((date_str, title_value, ts_value or 0))

    if summaries_with_ts:
        print(f"[Crawler] Existing articles from /articles: {len(summaries_with_ts)}")

    # 取最近的 20 条（按 timestamp 从新到旧）；无 timestamp 视为最旧
    summaries_with_ts.sort(key=lambda x: x[2], reverse=True)
    limited = summaries_with_ts[:20]
    if len(limited) < len(summaries_with_ts):
        print(f"[Crawler] Using latest {len(limited)} articles for LLM context")

    return [(date, title) for date, title, _ in limited]


def _build_weibo_prompt(
    existing_articles: Iterable[Tuple[str, str]] | None = None,
) -> str:
    """
    构造给 crawl4ai 的提示词。
    在原有规则基础上，追加“已有文章时间+标题”信息，由 LLM 自行判断是否为重复内容。
    """
    base_prompt = """
你是一个内容筛选与整理助手，目标页面是一名微博用户的主页。

任务：从页面中抽取若干条“与账号主题高度相关、信息量较大”的微博，按给定 schema 生成 JSON 数组。

规则：
- 只保留对关注者有价值的内容（重要公告、活动/演出、作品/产品发布、合作/联动、官方周边、里程碑/总结等）
- 忽略：无正文/框架代码说明、登录/注册提示、导航/热搜/推荐等 UI 元素、纯表情或几乎无信息的短句、纯转发且无附加说明
- 每条微博需填写：date、title、summary、url、content_markdown，可选 engagement、media_urls
- 正文未完全展开或关键信息缺失时，整条跳过，不要生成对象
- 有真实微博内容时，只输出微博 JSON 对象，不要输出额外解释；如果完全没有内容，返回空数组 []
""".strip()

    articles_list = list(existing_articles or [])
    if not articles_list:
        return base_prompt

    # 为避免提示词过长，只取前 N 条已有文章，用于提示“已有内容”
    max_items = 100
    sliced = articles_list[:max_items]
    joined = "\n".join(f"- {date} {title}" for date, title in sliced)

    dedup_note = f"""

已有文章（时间 + 标题，仅供参考去重）：
{joined}

去重规则：
- 如果某条微博与上面列表中的文章在主题/事件上高度重复（例如同一场活动公告），且没有明显新信息，可以不单独生成新的 JSON 对象；
- 若是同一事件的重要后续更新（如增加场次、改期等），可以视情况保留为新对象。
""".rstrip()

    return f"{base_prompt}\n{dedup_note}"


async def run_crawler_for_config(
    config: CrawlerConfig, existing_articles: List[Tuple[str, str]]
) -> Tuple[int, int, int]:
    """
    为单个配置运行爬虫。

    返回: (crawled_count, built_count, pushed_count)
    """
    print(f"\n[Crawler] ========== Starting Crawler ==========")
    print(f"[Crawler] Type: {config.type}")
    print(f"[Crawler] URL: {config.url}")
    print(f"[Crawler] Author: {config.author}")
    print(f"[Crawler] Headless: {HEADLESS}, Download Media: {DOWNLOAD_MEDIA}")
    print(f"[Crawler] Push to Hono: {PUSH_TO_HONO}, Dry Run: {DRY_RUN}")

    # 获取 LLM 配置
    llm_provider_name = DEFAULT_LLM_PROVIDER
    if llm_provider_name not in LLM_PROVIDERS:
        print(
            f"[Crawler] ✗ Unknown LLM provider: {llm_provider_name}, falling back to 'deepseek'"
        )
        llm_provider_name = "deepseek"

    llm_provider = LLM_PROVIDERS[llm_provider_name]
    llm_settings = LLMSettings(
        provider=llm_provider.provider,
        api_token_env=llm_provider.api_token_env,
        base_url=llm_provider.base_url,
        temperature=llm_provider.temperature,
        max_tokens=llm_provider.max_tokens,
        extra_headers=llm_provider.extra_headers,
    )
    print(
        f"[Crawler] LLM: {llm_provider.name} ({llm_settings.provider}) @ {llm_settings.base_url}"
    )
    if llm_provider.extra_headers:
        print(f"[Crawler] Extra headers: {llm_provider.extra_headers}")

    r2_config = load_config_from_env()
    if r2_config:
        print(
            f"[Crawler] R2: {r2_config.endpoint}/{r2_config.bucket} (prefix: {r2_config.prefix})"
        )
    else:
        print("[Crawler] R2: Not configured")
        if DOWNLOAD_MEDIA:
            print("[Crawler] WARNING: Media download enabled but R2 not configured!")

    # Step 1: 根据类型调用相应的爬虫
    posts = []
    try:
        print(f"\n[Crawler] Step 1: Crawling posts...")

        if config.type == "weibo":
            posts = await crawl_weibo(
                url=config.url,
                instruction=_build_weibo_prompt(existing_articles),
                headless=HEADLESS,
                download_media=DOWNLOAD_MEDIA,
                llm_settings=llm_settings,
                r2_config=r2_config,
                date_prefix=_today_prefix(),
            )
        else:
            print(f"[Crawler] ✗ Unknown crawler type: {config.type}")
            return (0, 0, 0)

        print(f"[Crawler] ✓ Crawled {len(posts)} posts (raw from LLM)")
    except Exception as e:
        print(f"[Crawler] ✗ Crawling failed: {e}")
        import traceback

        traceback.print_exc()
        return (0, 0, 0)

    if not posts:
        print("[Crawler] No posts found")
        return (0, 0, 0)

    # If not pushing, just print and exit
    if not PUSH_TO_HONO and not DRY_RUN:
        print("\n[Crawler] Raw posts output:")
        print(json.dumps(posts, ensure_ascii=False, indent=2))
        return (len(posts), 0, 0)

    # Step 2: Build articles from posts
    print(f"\n[Crawler] Step 2: Building articles...")
    articles: list[ArticlePayload] = []
    failed_builds = 0

    for i, post in enumerate(posts, 1):
        post_title = post.get("title") or post.get("url") or f"post_{i}"
        try:
            print(f"[Crawler] [{i}/{len(posts)}] Building article: {post_title}")

            # 根据类型调用相应的构建函数
            if config.type == "weibo":
                article = build_article_from_weibo(
                    post,
                    default_color=config.color,
                    author=config.author,
                    date_prefix=_today_prefix(),
                    r2_config=r2_config,
                )
            else:
                print(f"[Crawler]   ✗ Unknown type for building: {config.type}")
                failed_builds += 1
                continue

            articles.append(article)
            media_count = len(article.gallery) if article.gallery else 0
            print(f"[Crawler]   ✓ Built article with {media_count} media items")
        except Exception as e:
            failed_builds += 1
            print(f"[Crawler]   ✗ Failed to build article: {e}")
            import traceback

            traceback.print_exc()

    print(f"[Crawler] ✓ Built {len(articles)} articles ({failed_builds} failed)")

    if not articles:
        print("[Crawler] No articles to push")
        return (len(posts), 0, 0)

    # If dry run, print articles and exit
    if DRY_RUN:
        print("\n[Crawler] Dry run - articles output:")
        print(json.dumps([a.to_dict() for a in articles], ensure_ascii=False, indent=2))
        return (len(posts), len(articles), 0)

    # Step 3: Push articles to Hono
    print(f"\n[Crawler] Step 3: Pushing articles to {HONO_SUBMIT_URL}...")
    pushed = 0
    failed_pushes = 0

    for i, article in enumerate(articles, 1):
        try:
            print(f"[Crawler] [{i}/{len(articles)}] Pushing: {article.title}")
            post_article(HONO_SUBMIT_URL, article)
            pushed += 1
            print(f"[Crawler]   ✓ Pushed successfully")
        except Exception as e:
            failed_pushes += 1
            print(f"[Crawler]   ✗ Push failed: {e}")
            import traceback

            traceback.print_exc()

    print(f"\n[Crawler] ========== Summary for {config.author} ==========")
    print(f"[Crawler] Posts crawled: {len(posts)}")
    print(f"[Crawler] Articles built: {len(articles)} ({failed_builds} failed)")
    print(f"[Crawler] Articles pushed: {pushed} ({failed_pushes} failed)")
    print(f"[Crawler] ================================")

    return (len(posts), len(articles), pushed)


async def main() -> None:
    """主函数：遍历所有爬虫配置并执行"""
    print(f"[Crawler] ========== MikuNews Crawler ==========")
    print(f"[Crawler] Total crawler configs: {len(CRAWLER_CONFIGS)}")
    print(f"[Crawler] Hono base URL: {HONO_BASE_URL}")

    # Step 0: 从 Hono 获取已有文章的"时间 + 标题"信息，传给 LLM 做去重参考
    print(
        f"\n[Crawler] Step 0: Fetching existing articles from {HONO_BASE_URL.rstrip('/')}/articles ..."
    )
    existing_articles = _fetch_existing_article_summaries(HONO_BASE_URL)

    # 统计信息
    total_crawled = 0
    total_built = 0
    total_pushed = 0

    # 遍历所有配置
    for idx, config in enumerate(CRAWLER_CONFIGS, 1):
        print(f"\n[Crawler] ========================================")
        print(f"[Crawler] Processing config {idx}/{len(CRAWLER_CONFIGS)}")
        print(f"[Crawler] ========================================")

        crawled, built, pushed = await run_crawler_for_config(config, existing_articles)
        total_crawled += crawled
        total_built += built
        total_pushed += pushed

    # 总结
    print(f"\n[Crawler] ========== Final Summary ==========")
    print(f"[Crawler] Configs processed: {len(CRAWLER_CONFIGS)}")
    print(f"[Crawler] Total posts crawled: {total_crawled}")
    print(f"[Crawler] Total articles built: {total_built}")
    print(f"[Crawler] Total articles pushed: {total_pushed}")
    print(f"[Crawler] =====================================")
    print(f"[Crawler] Done!")


if __name__ == "__main__":
    asyncio.run(main())
