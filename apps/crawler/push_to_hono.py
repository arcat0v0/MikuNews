"""
将 weibo.py 爬取的结果（JSON 数组）转换并推送到 Hono /submit 接口。

使用方式示例：
  uv run apps/crawler/push_to_hono.py --input weibo_output.json \
    --api-url http://127.0.0.1:8787/submit \
    --default-importance 2 --default-color "#e0e7ff" --author "微博热榜"

环境变量（可选）：
  HONO_BASE_URL          Hono 服务基础地址（例如 https://xxx.workers.dev）
  DEFAULT_IMPORTANCE     1-4，文章重要度
  DEFAULT_COLOR          frontmatter 的 color 字段
  DEFAULT_AUTHOR         默认作者
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from apps.crawler.r2_uploader import R2Uploader, load_config_from_env, R2Config


MediaType = Literal["image", "video"]


@dataclass
class MediaItem:
    type: MediaType
    src: str
    alt: Optional[str] = None
    poster: Optional[str] = None


@dataclass
class ArticlePayload:
    title: str
    importance: int
    color: str
    timestamp: int
    content: str
    id: str
    description: Optional[str] = None
    backgroundImage: Optional[str] = None
    author: Optional[str] = None
    gallery: Optional[List[MediaItem]] = None

    def to_dict(self) -> Dict[str, Any]:
        data: Dict[str, Any] = {
            "title": self.title,
            "importance": self.importance,
            "color": self.color,
            "timestamp": self.timestamp,
            "content": self.content,
            "id": self.id,
        }
        if self.description:
            data["description"] = self.description
        if self.backgroundImage:
            data["backgroundImage"] = self.backgroundImage
        if self.author:
            data["author"] = self.author
        if self.gallery:
            data["gallery"] = [
                {
                    "type": item.type,
                    "src": item.src,
                    **({"alt": item.alt} if item.alt else {}),
                    **({"poster": item.poster} if item.poster else {}),
                }
                for item in self.gallery
            ]
        return data


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Push Weibo posts to Hono /submit")
    parser.add_argument(
        "--input",
        "-i",
        help="Weibo 爬虫输出的 JSON 文件路径；留空则从 stdin 读取",
    )
    hono_base = os.getenv("HONO_BASE_URL")
    default_api_url = (
        f"{hono_base.rstrip('/')}/submit" if hono_base else "http://127.0.0.1:8787/submit"
    )
    parser.add_argument(
        "--api-url",
        default=default_api_url,
        help="Hono /submit 接口地址，默认 HONO_BASE_URL + /submit 或 http://127.0.0.1:8787/submit",
    )
    parser.add_argument(
        "--default-importance",
        type=int,
        default=int(os.getenv("DEFAULT_IMPORTANCE", "2")),
        help="默认 importance (1-4)",
    )
    parser.add_argument(
        "--default-color",
        default=os.getenv("DEFAULT_COLOR", "#e0e7ff"),
        help="默认 color 字段",
    )
    parser.add_argument(
        "--author",
        default=os.getenv("DEFAULT_AUTHOR", "Weibo"),
        help="默认 author 字段",
    )
    return parser.parse_args()


def load_weibo_posts(path: Optional[str]) -> List[Dict[str, Any]]:
    raw = sys.stdin.read() if not path else Path(path).read_text(encoding="utf-8")
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError("Input JSON 必须是数组")
    return data


def normalize_timestamp(date_str: str) -> int:
    """将 weibo.py 输出的 date 字段转换为毫秒级时间戳，失败则返回当前时间。"""
    date_str = (date_str or "").strip()
    formats = ["%Y-%m-%d %H:%M", "%Y-%m-%d", "%Y/%m/%d %H:%M", "%Y/%m/%d"]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            return int(dt.replace(tzinfo=timezone.utc).timestamp() * 1000)
        except ValueError:
            continue
    # 兼容"日期未知"或无法解析的情况
    return int(datetime.now(tz=timezone.utc).timestamp() * 1000)


def guess_media_type(url: str) -> MediaType:
    parsed = urlparse(url)
    ext = os.path.splitext(parsed.path)[1].lower()
    if ext in {".mp4", ".webm", ".mov"}:
        return "video"
    return "image"



def _is_r2_url(url: str, config: R2Config) -> bool:
    """Best-effort check whether a URL already points to this R2 bucket."""
    try:
        parsed = urlparse(url)
    except Exception:
        return False

    # public_base_url 优先，其次是 endpoint/bucket 组合
    if config.public_base_url:
        base = config.public_base_url.rstrip("/")
        if url.startswith(base + "/"):
            return True

    endpoint = config.endpoint.rstrip("/")
    bucket_prefix = f"{endpoint}/{config.bucket}/"
    if url.startswith(bucket_prefix):
        return True

    return False


def _download_to_temp(url: str) -> Optional[str]:
    """Download remote media to a temporary file and return local path."""
    try:
        print(f"[Push] Downloading remote media for R2: {url}")
        with urlopen(url, timeout=30) as resp:
            data = resp.read()
        suffix = os.path.splitext(urlparse(url).path)[1] or ""
        fd, tmp_path = tempfile.mkstemp(prefix="mikunews-media-", suffix=suffix)
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        print(f"[Push] Downloaded to temp file: {tmp_path}")
        return tmp_path
    except Exception as e:  # noqa: BLE001
        print(f"[Push] Failed to download remote media {url}: {e}")
        return None


def build_article_from_weibo(
    post: Dict[str, Any],
    default_color: str,
    author: str,
    date_prefix: Optional[str] = None,
    r2_config: Optional[R2Config] = None,
) -> ArticlePayload:
    title = str(post.get("title") or "未命名微博").strip()
    summary = (post.get("summary") or "").strip()
    content_md = (post.get("content_markdown") or "").strip()
    url = (post.get("url") or "").strip()
    date_str = str(post.get("date") or "").strip()
    timestamp = normalize_timestamp(date_str)

    # 优先使用 post 中 LLM 返回的 importance，如果不存在或无效则使用默认值 2
    importance = post.get("importance")
    if not isinstance(importance, int) or importance not in {1, 2, 3, 4}:
        importance = 2

    media_urls = post.get("media_urls") or []
    gallery: List[MediaItem] = []

    # 如果存在本地文件但没有配置 R2，则直接报错提醒
    has_local_files = any(os.path.isfile(str(media)) for media in media_urls if media)
    if has_local_files and not r2_config:
        raise RuntimeError("R2 未配置，但存在本地文件需要上传")

    uploader = R2Uploader(r2_config, date_prefix=date_prefix) if r2_config else None
    if uploader and r2_config:
        print(f"[Push] R2 uploader enabled. prefix={r2_config.prefix} date_prefix={date_prefix}")

    for media in media_urls:
        if not media:
            continue
        src_str = str(media)

        if uploader and r2_config:
            upload_path: Optional[str] = None

            if os.path.isfile(src_str):
                # 本地文件：直接上传
                upload_path = src_str
            else:
                parsed = urlparse(src_str)
                is_http = parsed.scheme in {"http", "https"}
                if is_http and not _is_r2_url(src_str, r2_config):
                    # 远程 HTTP 媒体且尚未在当前 R2 上：先下载再上传
                    tmp = _download_to_temp(src_str)
                    upload_path = tmp

            if upload_path:
                print(f"[Push] Uploading media to R2: {src_str} -> {upload_path}")
                try:
                    uploaded = uploader.upload_file(upload_path)
                    src_str = uploaded
                    print(f"[Push] Uploaded -> {src_str}")
                except Exception as e:  # noqa: BLE001
                    print(f"[Push] Upload failed for {src_str}: {e}")
                    # Keep original src_str as fallback

        media_type: MediaType = guess_media_type(src_str)
        gallery.append(MediaItem(type=media_type, src=src_str))

    body_lines = [content_md] if content_md else []
    if url:
        body_lines.append(f"\n原文链接：{url}")
    content = "\n\n".join([line for line in body_lines if line])

    # 每篇文章都生成新的 UUID，不依赖爬虫返回的 id/url
    article_id = str(uuid.uuid4())

    background_image = gallery[0].src if gallery and gallery[0].type == "image" else None

    return ArticlePayload(
        title=title,
        importance=importance,
        color=default_color,
        description=summary or None,
        backgroundImage=background_image,
        timestamp=timestamp,
        author=author or None,
        gallery=gallery or None,
        content=content,
        id=str(article_id),
    )


def post_article(api_url: str, payload: ArticlePayload) -> None:
    article_dict = payload.to_dict()
    print(f"[Push] Gallery sources: {[item['src'] for item in article_dict.get('gallery', [])]}")
    data = json.dumps(article_dict).encode("utf-8")
    print(f"[Push] POST {api_url} title={payload.title} id={payload.id}")
    req = Request(
        api_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        body = resp.read().decode("utf-8", errors="ignore")
        print(f"[Push] Response {resp.status}: {body}")
        if resp.status >= 300:
            raise RuntimeError(f"Push failed ({resp.status}): {body}")
        print(f"[OK] 推送成功：{payload.title}")


def main() -> None:
    args = parse_args()
    r2_config = load_config_from_env()
    if not r2_config:
        print("[WARN] 未配置 R2 环境变量，媒体直链将保留原路径/URL。", file=sys.stderr)

    try:
        posts = load_weibo_posts(args.input)
    except Exception as exc:  # noqa: BLE001
        print(f"读取/解析输入失败: {exc}", file=sys.stderr)
        sys.exit(1)

    if not posts:
        print("没有可推送的微博记录")
        return

    for post in posts:
        try:
            article = build_article_from_weibo(
                post,
                default_color=args.default_color,
                author=args.author,
                r2_config=r2_config,
            )
            post_article(args.api_url, article)
        except Exception as exc:  # noqa: BLE001
            title = post.get("title") or post.get("url") or "<unknown>"
            print(f"[ERR] 推送失败 ({title}): {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
