#!/usr/bin/env python3
"""
Weibo Image Downloader
Downloads all images from a Weibo user profile page.
"""

import asyncio
import os
import re
from pathlib import Path
from urllib.parse import urlparse
import httpx
from playwright.async_api import async_playwright, Page, TimeoutError as PlaywrightTimeoutError
from apps.crawler.r2_uploader import R2Uploader


class WeiboImageDownloader:
    def __init__(
        self,
        profile_url: str,
        download_dir: str = "./weibo_images",
        r2_uploader: R2Uploader | None = None,
    ):
        self.profile_url = profile_url
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        self.downloaded_urls = set()
        self.r2_uploader = r2_uploader
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None

    async def download_image(self, image_url: str, filename: str, dest_dir: Path | None = None) -> str | None:
        """Download an image from URL to local file. Returns the local file path on success."""
        target_dir = dest_dir or self.download_dir
        target_dir.mkdir(parents=True, exist_ok=True)

        if image_url in self.downloaded_urls:
            print(f"Already downloaded: {filename}")
            filepath = target_dir / filename
            if filepath.exists():
                return str(filepath)
            return None

        try:
            headers = {
                "Referer": self.profile_url,
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            }

            original_url = re.sub(r"/(orj360|bmiddle)/", "/mw2000/", image_url)

            async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
                response = await client.get(original_url)
                response.raise_for_status()

                filepath = target_dir / filename
                filepath.write_bytes(response.content)
                self.downloaded_urls.update({image_url, original_url})
                print(f"Downloaded: {filename} ({len(response.content)} bytes)")
                return str(filepath)
        except Exception as e:
            print(f"Error downloading {filename}: {e}")
            return None

    async def download_via_browser(self, page: Page, filename: str, dest_dir: Path | None = None) -> str | None:
        """
        Trigger the built-in "下载保存" button inside the viewer so Weibo keeps referer/cookie headers.
        Returns the saved filepath on success.
        """
        target_dir = dest_dir or self.download_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        try:
            download_button = page.get_by_text("下载保存")
            async with page.expect_download(timeout=15000) as download_info:
                await download_button.click()

            download = await download_info.value
            suggested = download.suggested_filename or filename
            filepath = target_dir / suggested
            await download.save_as(str(filepath))
            print(f"Downloaded via browser: {filepath.name}")
            return str(filepath)
        except Exception as e:
            print(f"Browser download failed: {e}")
            return None

    async def extract_image_url_from_viewer(self, page: Page) -> str | None:
        """Extract the image URL from the fullscreen viewer."""
        selectors = [
            ".imgInstance img",  # viewer after clicking 查看大图
            ".picture-viewer_imgWrap_ICKHT img",  # fallback: legacy viewer class
        ]
        for selector in selectors:
            try:
                handle = page.locator(selector).last
                await handle.wait_for(state="visible", timeout=5000)
                src = await handle.get_attribute("src")
                if src:
                    return src
            except Exception:
                continue

        print("No image src found in viewer")
        return None

    async def close_viewer(self, page: Page):
        """Close the image viewer popup."""
        try:
            # New viewer provides a "关闭弹层" entry; fall back to Escape when not present.
            try:
                await page.get_by_text("关闭弹层").click(timeout=2000)
            except Exception:
                await page.keyboard.press('Escape')
            await asyncio.sleep(0.5)

        except Exception as e:
            print(f"Error closing viewer: {e}")

    async def collapse_expanded_sections(self, page: Page):
        """Collapse any expanded picture toolbars/sections to avoid interfering with later items."""
        try:
            buttons = page.get_by_text("收起")
            count = await buttons.count()
            for i in range(count):
                try:
                    await buttons.nth(i).click(timeout=1000)
                except Exception:
                    continue
        except Exception as e:
            print(f"Error collapsing sections: {e}")

    async def process_image_by_url(self, page: Page, match_fragment: str, index: int, dest_dir: Path | None = None):
        """Process a single image by finding it via a thumbnail URL or filename fragment."""
        try:
            # Find the image element by its thumbnail URL
            target_element = await page.evaluate("""
                (fragment) => {
                    const containers = document.querySelectorAll('.woo-picture-main.woo-picture-hover');
                    for (const container of containers) {
                        const img = container.querySelector('img');
                        if (img && img.src && img.src.includes(fragment)) {
                            return container;
                        }
                    }
                    return null;
                }
            """, match_fragment)

            if not target_element:
                print(f"Image {index}: Element not found for fragment {match_fragment}")
                return

            # Use JavaScript to scroll and click the element
            await page.evaluate("""
                (fragment) => {
                    const containers = document.querySelectorAll('.woo-picture-main.woo-picture-hover');
                    for (const container of containers) {
                        const img = container.querySelector('img');
                        if (img && img.src && img.src.includes(fragment)) {
                            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            return true;
                        }
                    }
                    return false;
                }
            """, match_fragment)
            await asyncio.sleep(1)

            # Click using JavaScript for reliability
            clicked = await page.evaluate("""
                (fragment) => {
                    const containers = document.querySelectorAll('.woo-picture-main.woo-picture-hover');
                    for (const container of containers) {
                        const img = container.querySelector('img');
                        if (img && img.src && img.src.includes(fragment)) {
                            container.click();
                            return true;
                        }
                    }
                    return false;
                }
            """, match_fragment)

            if not clicked:
                print(f"Image {index}: Failed to click element for fragment {match_fragment}")
                return

            await asyncio.sleep(2)

            # Enter the fullscreen viewer to reveal original-size controls
            try:
                await page.get_by_text("查看大图").click(timeout=3000)
                await asyncio.sleep(0.5)
            except Exception:
                pass

            # Clicking "原图" opens a new tab with the real image URL; capture it.
            popup_url = None
            try:
                async with page.context.expect_page(timeout=5000) as popup_info:
                    await page.get_by_text("原图").click(timeout=3000)
                popup_page = await popup_info.value
                await popup_page.wait_for_load_state("load", timeout=5000)
                popup_url = popup_page.url
                await popup_page.close()
            except Exception:
                popup_url = None

            image_url = popup_url or await self.extract_image_url_from_viewer(page)

            if image_url:
                # Generate filename from URL
                parsed_url = urlparse(image_url)
                filename = os.path.basename(parsed_url.path)
                if not filename:
                    filename = f"image_{index}.jpg"

                # Check if already downloaded
                if image_url in self.downloaded_urls:
                    print(f"Image {index}: already downloaded")
                    # Try to find the existing file
                    target_dir = dest_dir or self.download_dir
                    existing_file = target_dir / filename
                    if existing_file.exists():
                        await self.close_viewer(page)
                        return str(existing_file)
                    # If file doesn't exist, continue with download

                saved_path = None
                # If clicking原图 opened a direct URL, download it; otherwise use viewer button fallback.
                if popup_url:
                    saved_path = await self.download_image(image_url, filename, dest_dir)
                else:
                    downloaded_path = await self.download_via_browser(page, filename, dest_dir)
                    if not downloaded_path:
                        saved_path = await self.download_image(image_url, filename, dest_dir)
                    else:
                        self.downloaded_urls.add(image_url)
                        saved_path = downloaded_path
            else:
                print(f"Image {index}: Could not extract URL")
                saved_path = None

            # Close the viewer
            await self.close_viewer(page)
            await asyncio.sleep(0.5)
            await self.collapse_expanded_sections(page)
            return saved_path
        except Exception as e:
            print(f"Error processing image {index}: {e}")
            # Try to close viewer in case of error
            await self.close_viewer(page)
            await self.collapse_expanded_sections(page)
            return None

    async def scroll_and_load_content(self, page: Page, scroll_times: int = 5):
        """Scroll down the page to load more content."""
        print(f"Scrolling to load more content...")
        for i in range(scroll_times):
            await page.evaluate("window.scrollBy(0, 1000)")
            await asyncio.sleep(1.5)
        print(f"Scrolling complete")

    async def start_browser(self, headless: bool = False):
        """Start browser instance with viewport matching crawl4ai (1280x2000)."""
        if self.playwright is None:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=headless)
            self.context = await self.browser.new_context(
                viewport={"width": 1280, "height": 2000},
                user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            self.page = await self.context.new_page()
            print(f"[Downloader] Browser started with viewport 1280x2000")

    async def close_browser(self):
        """Close browser instance."""
        if self.browser:
            await self.browser.close()
            self.browser = None
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
        self.context = None
        self.page = None
        print(f"[Downloader] Browser closed")

    async def prepare_page(self):
        """Navigate to profile URL and scroll 3 page heights to load content."""
        if not self.page:
            raise RuntimeError("Browser not started. Call start_browser() first.")

        print(f"[Downloader] Navigating to {self.profile_url}")
        await self.page.goto(self.profile_url, wait_until="domcontentloaded", timeout=60000)
        await self.page.wait_for_selector(".vue-recycle-scroller__item-wrapper", timeout=30000)

        # Scroll 3 page heights to load more content (matching crawl4ai behavior)
        print(f"[Downloader] Scrolling 3 page heights to load content...")
        await self.page.evaluate("window.scrollTo(0, window.innerHeight);")
        await asyncio.sleep(2)
        await self.page.evaluate("window.scrollTo(0, window.innerHeight * 2);")
        await asyncio.sleep(2)
        await self.page.evaluate("window.scrollTo(0, window.innerHeight * 3);")
        await asyncio.sleep(2)
        print(f"[Downloader] Page prepared and content loaded")

    async def download_media_list(self, media_urls: list[str], post_id: str) -> list[str]:
        """Download all media in a post using filename fragments to locate thumbnails."""
        if not self.page:
            raise RuntimeError("Browser not started. Call start_browser() and prepare_page() first.")

        dest_dir = self.download_dir / post_id
        dest_dir.mkdir(parents=True, exist_ok=True)
        saved_paths: list[str] = []

        for index, media_url in enumerate(media_urls, 1):
            fragment = Path(urlparse(media_url).path).name.split("?")[0]
            print(f"[Downloader] #{index}/{len(media_urls)} fragment={fragment} -> dest={dest_dir}")
            saved = await self.process_image_by_url(self.page, fragment, index, dest_dir=dest_dir)
            if saved:
                uploaded_url = None
                if self.r2_uploader:
                    try:
                        print(f"[Downloader][R2] Uploading saved file {saved}")
                        uploaded_url = self.r2_uploader.upload_file(saved)
                        print(f"[Downloader][R2] Uploaded -> {uploaded_url}")
                    except Exception as e:
                        print(f"[Downloader][R2] Upload failed for {saved}: {e}")
                saved_paths.append(uploaded_url or saved)
            else:
                # fallback: keep original URL for later retry
                saved_paths.append(media_url)

        return saved_paths

    async def run(self, headless: bool = False, scroll_times: int = 5):
        """Main execution method."""
        async with async_playwright() as p:
            # Launch browser
            browser = await p.chromium.launch(headless=headless)
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()

            try:
                print(f"Navigating to {self.profile_url}")
                # Use 'domcontentloaded' instead of 'networkidle' as Weibo has continuous network activity
                await page.goto(self.profile_url, wait_until='domcontentloaded', timeout=60000)
                # Wait for the main content to load
                await page.wait_for_selector('.vue-recycle-scroller__item-wrapper', timeout=30000)
                await asyncio.sleep(3)

                # Initial nudge: scroll a bit to ensure image widgets lazy-load.
                await page.evaluate("window.scrollTo(0, 400)")
                await asyncio.sleep(2)

                # Scroll to load more content (if needed)
                if scroll_times > 0:
                    await self.scroll_and_load_content(page, scroll_times)

                # Collect thumbnail URLs first to use as stable identifiers
                print("Collecting image URLs...")
                thumbnail_urls = await page.evaluate("""
                    () => {
                        const wrappers = document.querySelectorAll('.vue-recycle-scroller__item-wrapper');
                        const urlSet = new Set();

                        wrappers.forEach(wrapper => {
                            const containers = wrapper.querySelectorAll('.woo-picture-main.woo-picture-hover');
                            containers.forEach(container => {
                                const className = container.className || '';
                                if (className.includes('ProfileHeader_pic')) return;

                                const img = container.querySelector('img');
                                const src = img?.src;
                                if (!src) return;
                                if (!src.includes('sinaimg.cn')) return;
                                if (src.includes('/emoticon/')) return; // skip emoji assets

                                urlSet.add(src);
                            });
                        });

                        return Array.from(urlSet);
                    }
                """)

                print(f"Found {len(thumbnail_urls)} images to download")

                # Process each image by its thumbnail URL
                for index, thumbnail_url in enumerate(thumbnail_urls, 1):
                    print(f"\nProcessing image {index}/{len(thumbnail_urls)}")
                    print(f"Thumbnail URL: {thumbnail_url}")
                    await self.process_image_by_url(page, thumbnail_url, index, dest_dir=self.download_dir)

                print(f"\n✓ Download complete! Total images: {len(self.downloaded_urls)}")
                print(f"Images saved to: {self.download_dir.absolute()}")

            except Exception as e:
                print(f"Error during execution: {e}")
                import traceback
                traceback.print_exc()
            finally:
                await browser.close()


async def main():
    """Main entry point."""
    # Configuration
    PROFILE_URL = "https://www.weibo.com/u/2462905490"  # 初音未来 profile
    DOWNLOAD_DIR = "./weibo_images"
    HEADLESS = False  # Set to True to run without GUI
    SCROLL_TIMES = 0  # Number of times to scroll down to load more content (0 = no scrolling)

    downloader = WeiboImageDownloader(PROFILE_URL, DOWNLOAD_DIR)
    await downloader.run(headless=HEADLESS, scroll_times=SCROLL_TIMES)


if __name__ == "__main__":
    asyncio.run(main())
