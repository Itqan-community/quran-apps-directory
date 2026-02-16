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

# Colors
BG_GRADIENT_START = (18, 188, 172)    # #12bcac (teal)
BG_GRADIENT_END = (13, 61, 56)        # #0d3d38 (dark teal)
ACCENT_COLOR = (250, 175, 65)          # #faaf41 (gold)
TEXT_WHITE = (255, 255, 255)
TEXT_LIGHT = (220, 240, 238)
OVERLAY_DARK = (10, 40, 36, 160)

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


def _draw_gradient(img: Image.Image):
    """Draw a diagonal gradient background."""
    draw = ImageDraw.Draw(img)
    for y in range(OG_HEIGHT):
        # Diagonal gradient: mix based on x + y position
        for x in range(OG_WIDTH):
            ratio = (x / OG_WIDTH * 0.4 + y / OG_HEIGHT * 0.6)
            r = int(BG_GRADIENT_START[0] + (BG_GRADIENT_END[0] - BG_GRADIENT_START[0]) * ratio)
            g = int(BG_GRADIENT_START[1] + (BG_GRADIENT_END[1] - BG_GRADIENT_START[1]) * ratio)
            b = int(BG_GRADIENT_START[2] + (BG_GRADIENT_END[2] - BG_GRADIENT_START[2]) * ratio)
            draw.point((x, y), fill=(r, g, b))


def _draw_gradient_fast(img: Image.Image):
    """Draw a gradient background using row-based fills (much faster)."""
    draw = ImageDraw.Draw(img)
    for y in range(OG_HEIGHT):
        ratio = y / OG_HEIGHT
        r = int(BG_GRADIENT_START[0] + (BG_GRADIENT_END[0] - BG_GRADIENT_START[0]) * ratio)
        g = int(BG_GRADIENT_START[1] + (BG_GRADIENT_END[1] - BG_GRADIENT_START[1]) * ratio)
        b = int(BG_GRADIENT_START[2] + (BG_GRADIENT_END[2] - BG_GRADIENT_START[2]) * ratio)
        draw.line([(0, y), (OG_WIDTH, y)], fill=(r, g, b))


def _round_corners(img: Image.Image, radius: int) -> Image.Image:
    """Apply rounded corners to an image."""
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
    result = img.copy()
    result.putalpha(mask)
    return result


def _add_decorative_circles(img: Image.Image):
    """Add subtle decorative circles to the background."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Large teal circle (top-left)
    draw.ellipse(
        [-200, -200, 300, 300],
        fill=(18, 188, 172, 25),
    )

    # Gold circle (bottom-right)
    draw.ellipse(
        [OG_WIDTH - 250, OG_HEIGHT - 200, OG_WIDTH + 100, OG_HEIGHT + 100],
        fill=(250, 175, 65, 30),
    )

    # Small accent circle
    draw.ellipse(
        [OG_WIDTH - 400, -100, OG_WIDTH - 200, 100],
        fill=(250, 175, 65, 15),
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

    # Create base image
    img = Image.new("RGBA", (OG_WIDTH, OG_HEIGHT), (0, 0, 0, 255))

    # Draw gradient background
    _draw_gradient_fast(img)

    # Add decorative circles
    _add_decorative_circles(img)

    # Layout: main image on left (or right for RTL), text on the other side
    # Split: ~55% image, ~45% text
    image_width = int(OG_WIDTH * 0.50)
    text_area_width = OG_WIDTH - image_width

    # ---- Main Image Section ----
    main_img = _fetch_image(main_image_url)
    if main_img:
        # Scale main image to fill the image area
        img_ratio = main_img.width / main_img.height
        target_h = OG_HEIGHT - 80  # Some padding
        target_w = int(target_h * img_ratio)

        if target_w > image_width - 40:
            target_w = image_width - 40
            target_h = int(target_w / img_ratio)

        main_img = main_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        main_img = _round_corners(main_img, 16)

        # Add subtle shadow
        shadow = Image.new("RGBA", (target_w + 20, target_h + 20), (0, 0, 0, 0))
        shadow_inner = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 60))
        shadow.paste(shadow_inner, (10, 10))
        shadow = shadow.filter(ImageFilter.GaussianBlur(radius=10))

        # Position main image
        if is_rtl:
            # Image on the left for RTL (text on right)
            img_x = PADDING
        else:
            # Image on the left for LTR
            img_x = PADDING

        img_y = (OG_HEIGHT - target_h) // 2

        # Paste shadow then image
        img.paste(shadow, (img_x - 10, img_y - 5), shadow)
        img.paste(main_img, (img_x, img_y), main_img)

    # ---- Text Section ----
    draw = ImageDraw.Draw(img)

    # Load fonts
    font_name = _get_font(38, "bold")
    font_desc = _get_font(20, "regular")
    font_brand = _get_font(16, "regular")
    font_brand_bold = _get_font(18, "bold")

    # Text area position
    if is_rtl:
        text_x_start = image_width + PADDING
        text_x_end = OG_WIDTH - PADDING
    else:
        text_x_start = image_width + PADDING
        text_x_end = OG_WIDTH - PADDING

    text_max_width = text_x_end - text_x_start
    text_center_x = text_x_start + text_max_width // 2

    # ---- App Icon ----
    current_y = PADDING + 40
    icon_img = _fetch_image(icon_url)
    if icon_img:
        icon_img = icon_img.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)
        icon_img = _round_corners(icon_img, ICON_RADIUS)

        # Center icon in text area
        icon_x = text_center_x - ICON_SIZE // 2
        img.paste(icon_img, (icon_x, current_y), icon_img)
        current_y += ICON_SIZE + 24
    else:
        current_y += 24

    # ---- App Name ----
    # Wrap name if too long
    name_lines = textwrap.wrap(name, width=20)
    for line in name_lines[:2]:  # Max 2 lines
        bbox = draw.textbbox((0, 0), line, font=font_name)
        text_w = bbox[2] - bbox[0]
        text_x = text_center_x - text_w // 2
        draw.text((text_x, current_y), line, font=font_name, fill=TEXT_WHITE)
        current_y += bbox[3] - bbox[1] + 8

    current_y += 12

    # ---- Short Description ----
    desc_lines = textwrap.wrap(description, width=35)
    for line in desc_lines[:3]:  # Max 3 lines
        bbox = draw.textbbox((0, 0), line, font=font_desc)
        text_w = bbox[2] - bbox[0]
        text_x = text_center_x - text_w // 2
        draw.text((text_x, current_y), line, font=font_desc, fill=TEXT_LIGHT)
        current_y += bbox[3] - bbox[1] + 6

    # ---- Gold accent line ----
    current_y += 20
    line_width = 60
    line_x = text_center_x - line_width // 2
    draw.rounded_rectangle(
        [(line_x, current_y), (line_x + line_width, current_y + 3)],
        radius=2,
        fill=ACCENT_COLOR,
    )
    current_y += 24

    # ---- Branding ----
    brand_text = "دليل التطبيقات القرآنية" if is_rtl else "Quran Apps Directory"
    bbox = draw.textbbox((0, 0), brand_text, font=font_brand_bold)
    text_w = bbox[2] - bbox[0]
    text_x = text_center_x - text_w // 2
    draw.text((text_x, current_y), brand_text, font=font_brand_bold, fill=ACCENT_COLOR)

    current_y += bbox[3] - bbox[1] + 6
    sub_brand = "itqan.dev" if not is_rtl else "itqan.dev"
    bbox = draw.textbbox((0, 0), sub_brand, font=font_brand)
    text_w = bbox[2] - bbox[0]
    text_x = text_center_x - text_w // 2
    draw.text((text_x, current_y), sub_brand, font=font_brand, fill=TEXT_LIGHT)

    # ---- Convert to PNG bytes ----
    final = img.convert("RGB")
    buffer = BytesIO()
    final.save(buffer, format="PNG", optimize=True)
    image_bytes = buffer.getvalue()

    # Cache the result
    _save_cached_image(slug, lang, updated_at, image_bytes)

    logger.info(f"Generated OG image for {slug}/{lang} ({len(image_bytes)} bytes)")
    return image_bytes
