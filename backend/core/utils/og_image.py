"""
OG Image Generator for Quran Apps Directory.

Generates Open Graph share card images for social media sharing.
Uses Pillow to compose app icon, main image, name, and branding
into a 1200x630 image (standard OG image dimensions).
"""
import hashlib
import logging
import os
import textwrap
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont, ImageFilter

logger = logging.getLogger(__name__)

# OG Image dimensions (standard)
OG_WIDTH = 1200
OG_HEIGHT = 630

# Layout constants
PADDING = 48
ICON_SIZE = 88
ICON_RADIUS = 20
LOGO_HEIGHT = 32

# Colors - Updated for white/light design
BG_COLOR = (255, 255, 255)             # #ffffff (white)
BG_LIGHT = (248, 249, 250)             # #f8f9fa (very light gray)
ACCENT_TEAL = (18, 188, 172)           # #12bcac (teal accent)
ACCENT_GOLD = (250, 175, 65)           # #faaf41 (gold)
TEXT_DARK = (26, 26, 26)               # #1a1a1a (dark text)
TEXT_GRAY = (102, 102, 102)            # #666666 (gray text)
BORDER_COLOR = (230, 230, 230)         # #e6e6e6 (light border)

# Font cache directory
FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"

# Image cache directory
CACHE_DIR = Path(__file__).parent.parent / "assets" / "og_cache"

# Noto Sans Arabic font URLs (Google Fonts - free, supports Arabic + English)
FONT_URLS = {
    "bold": "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf",
    "regular": "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf",
}


def _ensure_font(weight: str = "bold") -> Path:
    """Download and cache Noto Sans Arabic font if not present."""
    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    font_filename = f"NotoSansArabic-{weight.capitalize()}.ttf"
    font_path = FONTS_DIR / font_filename

    if font_path.exists():
        return font_path

    url = FONT_URLS.get(weight)
    if not url:
        raise FileNotFoundError(f"No font URL for weight: {weight}")

    try:
        logger.info(f"Downloading font: {font_filename}")
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        font_path.write_bytes(resp.content)
        logger.info(f"Font cached at: {font_path}")
        return font_path
    except Exception as e:
        logger.error(f"Failed to download font: {e}")
        raise


def _get_font(size: int, weight: str = "bold") -> ImageFont.FreeTypeFont:
    """Get a font object with Arabic support."""
    try:
        font_path = _ensure_font(weight)
        return ImageFont.truetype(str(font_path), size)
    except Exception:
        logger.warning("Falling back to default font")
        return ImageFont.load_default()


def _fetch_image(url: str, timeout: int = 15) -> Image.Image | None:
    """Fetch an image from a URL and return as PIL Image."""
    try:
        resp = requests.get(url, timeout=timeout, stream=True)
        resp.raise_for_status()
        return Image.open(BytesIO(resp.content)).convert("RGBA")
    except Exception as e:
        logger.warning(f"Failed to fetch image from {url}: {e}")
        return None


def _draw_light_background(img: Image.Image):
    """Draw a clean white/light background with subtle gradient."""
    draw = ImageDraw.Draw(img)
    # Simple white background (already set in Image.new, but ensure it's clean)
    draw.rectangle([(0, 0), (OG_WIDTH, OG_HEIGHT)], fill=BG_COLOR + (255,))


def _round_corners(img: Image.Image, radius: int) -> Image.Image:
    """Apply rounded corners to an image."""
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
    result = img.copy()
    result.putalpha(mask)
    return result


def _add_decorative_elements(img: Image.Image):
    """Add subtle decorative elements to the background."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Subtle teal accent shape (top-right)
    draw.ellipse(
        [OG_WIDTH - 300, -150, OG_WIDTH + 50, 200],
        fill=ACCENT_TEAL + (12,),  # Very subtle
    )

    # Light gray background accent (bottom-left)
    draw.rectangle(
        [0, OG_HEIGHT - 100, 300, OG_HEIGHT],
        fill=BG_LIGHT + (255,),
    )

    img.paste(Image.alpha_composite(Image.new("RGBA", img.size, (0, 0, 0, 0)), overlay), (0, 0), overlay)


def _cache_key(app_slug: str, lang: str) -> str:
    """Generate a cache key for the OG image."""
    return f"{app_slug}_{lang}"


def _get_cached_image(app_slug: str, lang: str, updated_at: str) -> bytes | None:
    """Get cached OG image if it exists and is fresh."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_hash = hashlib.md5(f"{app_slug}_{lang}_{updated_at}".encode()).hexdigest()
    cache_path = CACHE_DIR / f"{cache_hash}.png"

    if cache_path.exists():
        return cache_path.read_bytes()
    return None


def _save_cached_image(app_slug: str, lang: str, updated_at: str, image_bytes: bytes):
    """Save OG image to cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_hash = hashlib.md5(f"{app_slug}_{lang}_{updated_at}".encode()).hexdigest()
    cache_path = CACHE_DIR / f"{cache_hash}.png"
    cache_path.write_bytes(image_bytes)


def generate_og_image(app_data: dict, lang: str = "ar") -> bytes:
    """
    Generate an OG share card image for an app.

    Args:
        app_data: Dictionary with app fields:
            - name_en, name_ar
            - short_description_en, short_description_ar
            - application_icon (URL)
            - main_image_en, main_image_ar (URL)
            - slug
            - updated_at
        lang: Language code ("ar" or "en")

    Returns:
        PNG image bytes
    """
    slug = app_data.get("slug", "")
    updated_at = app_data.get("updated_at", "")

    # Check cache
    cached = _get_cached_image(slug, lang, updated_at)
    if cached:
        logger.info(f"OG image cache hit for {slug}/{lang}")
        return cached

    is_rtl = lang == "ar"
    name = app_data.get(f"name_{lang}", app_data.get("name_en", ""))
    description = app_data.get(f"short_description_{lang}", app_data.get("short_description_en", ""))
    icon_url = app_data.get("application_icon", "")
    screenshots = app_data.get(f"screenshots_{lang}", app_data.get("screenshots_ar", []))

    # Fallback to main_image if no screenshots
    if not screenshots:
        main_image_url = app_data.get(f"main_image_{lang}", app_data.get("main_image_en", ""))
        screenshots = [main_image_url] if main_image_url else []

    # Create base image with white background (RGBA for better compositing)
    img = Image.new("RGBA", (OG_WIDTH, OG_HEIGHT), BG_COLOR + (255,))

    # Draw light background
    _draw_light_background(img)

    # Add subtle decorative elements
    _add_decorative_elements(img)

    draw = ImageDraw.Draw(img)

    # Load fonts
    font_name = _get_font(42, "bold")
    font_desc = _get_font(20, "regular")
    font_brand = _get_font(16, "regular")
    font_brand_bold = _get_font(18, "bold")

    # New Layout:
    # - Left side (55%): 2-3 overlapping phone mockups with screenshots
    # - Right side (45%): App icon, name, description, branding

    left_area_width = int(OG_WIDTH * 0.55)
    right_area_start = left_area_width

    # ---- LEFT SIDE: Overlapping Phone Mockups with Screenshots ----
    phone_width = 200
    phone_height = 420
    phone_y = (OG_HEIGHT - phone_height) // 2
    phone_overlap = 80  # How much phones overlap

    # Fetch up to 3 screenshots
    screenshot_images = []
    for i, screenshot_url in enumerate(screenshots[:3]):
        if not screenshot_url:
            continue
        screenshot_img = _fetch_image(screenshot_url)
        if screenshot_img:
            screenshot_images.append(screenshot_img)

    # Display overlapping phones (2-3 screenshots)
    num_phones = min(len(screenshot_images), 3)
    if num_phones > 0:
        total_width = phone_width + (num_phones - 1) * (phone_width - phone_overlap)
        start_x = PADDING + (left_area_width - total_width) // 2

        for i, screenshot_img in enumerate(screenshot_images):
            phone_x = start_x + i * (phone_width - phone_overlap)

            # Resize screenshot to fit phone
            screenshot_img = screenshot_img.resize((phone_width, phone_height), Image.Resampling.LANCZOS)
            screenshot_img = _round_corners(screenshot_img, 20)

            # Add shadow
            shadow = Image.new("RGBA", (phone_width + 16, phone_height + 16), (0, 0, 0, 0))
            shadow_draw = ImageDraw.Draw(shadow)
            shadow_draw.rounded_rectangle(
                [(0, 0), (phone_width + 16, phone_height + 16)],
                radius=20,
                fill=(0, 0, 0, 60)
            )
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=14))

            # Paste shadow and phone
            img.paste(shadow, (phone_x - 8, phone_y - 8), shadow)
            img.paste(screenshot_img, (phone_x, phone_y), screenshot_img)

    # ---- RIGHT SIDE: App Icon, Name, Description ----
    content_x = right_area_start + 50
    current_y = 100

    # App Icon
    icon_img = _fetch_image(icon_url)
    if icon_img:
        icon_size = 90
        icon_img = icon_img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        icon_img = _round_corners(icon_img, 18)

        # Icon shadow
        icon_shadow = Image.new("RGBA", (icon_size + 10, icon_size + 10), (0, 0, 0, 0))
        icon_shadow_draw = ImageDraw.Draw(icon_shadow)
        icon_shadow_draw.rounded_rectangle(
            [(0, 0), (icon_size + 10, icon_size + 10)],
            radius=18,
            fill=(0, 0, 0, 40)
        )
        icon_shadow = icon_shadow.filter(ImageFilter.GaussianBlur(radius=8))

        img.paste(icon_shadow, (content_x - 5, current_y - 5), icon_shadow)
        img.paste(icon_img, (content_x, current_y), icon_img)
        current_y += icon_size + 24

    # App Name
    name_lines = textwrap.wrap(name, width=22 if is_rtl else 25)
    for line in name_lines[:2]:  # Max 2 lines
        bbox = draw.textbbox((0, 0), line, font=font_name)
        text_h = bbox[3] - bbox[1]
        draw.text((content_x, current_y), line, font=font_name, fill=TEXT_DARK)
        current_y += text_h + 10

    current_y += 8

    # Short Description
    desc_lines = textwrap.wrap(description, width=30 if is_rtl else 35)
    for line in desc_lines[:3]:  # Max 3 lines
        bbox = draw.textbbox((0, 0), line, font=font_desc)
        text_h = bbox[3] - bbox[1]
        draw.text((content_x, current_y), line, font=font_desc, fill=TEXT_GRAY)
        current_y += text_h + 6

    # ---- BOTTOM: Branding ----
    branding_y = OG_HEIGHT - 80
    brand_text = "دليل التطبيقات القرآنية" if is_rtl else "Quran Apps Directory"
    bbox = draw.textbbox((0, 0), brand_text, font=font_brand_bold)
    draw.text((content_x, branding_y), brand_text, font=font_brand_bold, fill=ACCENT_TEAL)

    branding_y += bbox[3] - bbox[1] + 6
    sub_brand = "itqan.dev"
    draw.text((content_x, branding_y), sub_brand, font=font_brand, fill=TEXT_GRAY)

    # ---- Convert to PNG bytes ----
    final = img.convert("RGB")
    buffer = BytesIO()
    final.save(buffer, format="PNG", optimize=True)
    image_bytes = buffer.getvalue()

    # Cache the result
    _save_cached_image(slug, lang, updated_at, image_bytes)

    logger.info(f"Generated OG image for {slug}/{lang} ({len(image_bytes)} bytes)")
    return image_bytes
