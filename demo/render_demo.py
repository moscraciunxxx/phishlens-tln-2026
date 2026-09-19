#!/opt/anaconda3/bin/python3
"""Record a short, synthetic-data-only PhishLens walkthrough from the local app.

Requires the local server to be running at http://127.0.0.1:4173 and the
macOS Anaconda Python environment that provides Playwright.
"""

from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parent
CAPTURES = ROOT / "captures"
RAW = CAPTURES / "raw"
URL = "http://127.0.0.1:4173"


def hold(page, milliseconds):
    page.wait_for_timeout(milliseconds)


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1280, "height": 720},
            record_video_dir=str(RAW),
            record_video_size={"width": 1280, "height": 720},
        )
        page = context.new_page()
        page.goto(URL, wait_until="networkidle")
        page.wait_for_selector("#results-area")

        # Scene 1: purpose and privacy promise.
        page.evaluate("window.scrollTo(0, 0)")
        hold(page, 7000)

        # Scene 2: explainable outcome and suggested safe move.
        page.locator("#analyze-button").click()
        hold(page, 2000)
        hold(page, 8500)

        # Scene 3: literal evidence and locally parsed link.
        page.locator(".message-card").scroll_into_view_if_needed()
        hold(page, 8500)

        # Scene 4: optional local semantic review.
        page.locator("#ai-review-button").click()
        try:
            page.get_by_text("local AI complete", exact=True).wait_for(timeout=20000)
        except Exception:
            try:
                page.get_by_text("evidence fallback", exact=True).wait_for(timeout=5000)
            except Exception:
                pass
        hold(page, 7000)

        # Scene 5: transparent behavior regression check.
        page.locator("#evaluation-button").click()
        hold(page, 1000)
        page.locator(".evaluation-card").scroll_into_view_if_needed()
        hold(page, 8000)

        # Scene 6: product promise.
        page.locator(".how-it-works").scroll_into_view_if_needed()
        hold(page, 6000)

        page.close()
        context.close()
        browser.close()

    videos = sorted(RAW.glob("*.webm"), key=lambda path: path.stat().st_mtime)
    if not videos:
        raise SystemExit("Playwright did not produce a WebM video.")
    print(videos[-1])


if __name__ == "__main__":
    main()
