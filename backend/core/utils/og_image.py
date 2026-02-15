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
    main_image_url = app_data.get(f"main_image_{lang}", app_data.get("main_image_en", ""))

    # Create base image with white background (RGBA for better compositing)
    img = Image.new("RGBA", (OG_WIDTH, OG_HEIGHT), BG_COLOR + (255,))

    # Draw light background
    _draw_light_background(img)

    # Add subtle decorative elements
    _add_decorative_elements(img)

    draw = ImageDraw.Draw(img)

    # Load fonts
    font_name = _get_font(44, "bold")
    font_desc = _get_font(22, "regular")
    font_brand = _get_font(18, "regular")
    font_brand_bold = _get_font(20, "bold")

    # New Layout:
    # - Left side (60%): App name, description, branding
    # - Right side (40%): Screenshot + App icon

    left_area_width = int(OG_WIDTH * 0.58)
    right_area_start = left_area_width

    # ---- LEFT SIDE: Text Content ----
    text_x = PADDING + 60
    current_y = 120

    # App Name
    name_lines = textwrap.wrap(name, width=25 if is_rtl else 28)
    for line in name_lines[:2]:  # Max 2 lines
        bbox = draw.textbbox((0, 0), line, font=font_name)
        text_h = bbox[3] - bbox[1]
        if is_rtl:
            text_w = bbox[2] - bbox[0]
            draw.text((text_x, current_y), line, font=font_name, fill=TEXT_DARK, anchor="ra" if is_rtl else "la")
        else:
            draw.text((text_x, current_y), line, font=font_name, fill=TEXT_DARK)
        current_y += text_h + 12

    current_y += 10

    # Short Description
    desc_lines = textwrap.wrap(description, width=40 if is_rtl else 45)
    for line in desc_lines[:3]:  # Max 3 lines
        bbox = draw.textbbox((0, 0), line, font=font_desc)
        text_h = bbox[3] - bbox[1]
        draw.text((text_x, current_y), line, font=font_desc, fill=TEXT_GRAY)
        current_y += text_h + 8

    # ---- RIGHT SIDE: Screenshot + Icon ----
    # Position for screenshot (phone mockup)
    screenshot_x = right_area_start + 60
    screenshot_y = 80
    screenshot_max_width = 320
    screenshot_max_height = 460

    main_img = _fetch_image(main_image_url)
    if main_img:
        # Resize to fit phone screen proportions
        img_ratio = main_img.width / main_img.height
        if img_ratio > (screenshot_max_width / screenshot_max_height):
            target_w = screenshot_max_width
            target_h = int(target_w / img_ratio)
        else:
            target_h = screenshot_max_height
            target_w = int(target_h * img_ratio)

        main_img = main_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        main_img = _round_corners(main_img, 24)

        # Add shadow
        shadow = Image.new("RGBA", (target_w + 16, target_h + 16), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle(
            [(0, 0), (target_w + 16, target_h + 16)],
            radius=24,
            fill=(0, 0, 0, 40)
        )
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=12))

        # Paste shadow and screenshot
        img.paste(shadow, (screenshot_x - 8, screenshot_y - 8), shadow)
        img.paste(main_img, (screenshot_x, screenshot_y), main_img)

    # App Icon (top-right corner of screenshot area)
    icon_img = _fetch_image(icon_url)
    if icon_img:
        icon_size = 100
        icon_img = icon_img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        icon_img = _round_corners(icon_img, 22)

        # Position icon at top-right with shadow
        icon_x = OG_WIDTH - icon_size - 60
        icon_y = 60

        # Icon shadow
        icon_shadow = Image.new("RGBA", (icon_size + 12, icon_size + 12), (0, 0, 0, 0))
        icon_shadow_draw = ImageDraw.Draw(icon_shadow)
        icon_shadow_draw.rounded_rectangle(
            [(0, 0), (icon_size + 12, icon_size + 12)],
            radius=22,
            fill=(0, 0, 0, 50)
        )
        icon_shadow = icon_shadow.filter(ImageFilter.GaussianBlur(radius=8))

        img.paste(icon_shadow, (icon_x - 6, icon_y - 6), icon_shadow)
        img.paste(icon_img, (icon_x, icon_y), icon_img)

    # ---- BOTTOM: Branding ----
    branding_y = OG_HEIGHT - 90
    brand_text = "دليل التطبيقات القرآنية" if is_rtl else "Quran Apps Directory"
    bbox = draw.textbbox((0, 0), brand_text, font=font_brand_bold)
    draw.text((PADDING + 60, branding_y), brand_text, font=font_brand_bold, fill=ACCENT_TEAL)

    branding_y += bbox[3] - bbox[1] + 8
    sub_brand = "itqan.dev"
    draw.text((PADDING + 60, branding_y), sub_brand, font=font_brand, fill=TEXT_GRAY)

    # ---- Convert to PNG bytes ----
    final = img.convert("RGB")
    buffer = BytesIO()
    final.save(buffer, format="PNG", optimize=True)
    image_bytes = buffer.getvalue()

    # Cache the result
    _save_cached_image(slug, lang, updated_at, image_bytes)

    logger.info(f"Generated OG image for {slug}/{lang} ({len(image_bytes)} bytes)")
    return image_bytes
