"""
OG Image Generator for Quran Apps Directory — v10

Generates branded Open Graph share card images (1200×630) for social media.

Design:
- Right side: prominent white rounded "hero card" with app icon, name,
  description, and SVG logo branding at the bottom
- Left side: up to 3 upright phone mockups evenly spaced (cover crop)
- Background: soft beige-to-mint horizontal gradient with decorative circles

Font: Tajawal (Google Fonts — Arabic + Latin sans-serif)
Arabic text: shaped word-by-word with arabic-reshaper + python-bidi, then
  wrapped by pixel width (not character count) for correct RTL rendering.
"""

import hashlib
import logging
from io import BytesIO
from pathlib import Path

import arabic_reshaper
import requests
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont, ImageFilter

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
#  Canvas
# ═══════════════════════════════════════════════════════════════════

OG_WIDTH = 1200
OG_HEIGHT = 630

# ═══════════════════════════════════════════════════════════════════
#  Colors
# ═══════════════════════════════════════════════════════════════════

BG_LEFT  = (240, 248, 244)             # soft mint (left edge)
BG_RIGHT = (255, 248, 235)             # warm beige (right edge)
CIRCLE_TEAL = (18, 188, 172)           # decorative circle
CIRCLE_GOLD = (250, 195, 100)          # decorative circle

ACCENT_TEAL = (18, 188, 172)           # brand teal
ACCENT_GOLD = (250, 175, 65)           # brand gold
BRAND_RED   = (231, 76, 60)            # dot color
BRAND_BLUE  = (52, 152, 219)           # dot color

TEXT_DARK  = (35, 40, 50)              # headings
TEXT_GRAY  = (110, 115, 125)           # descriptions
TEXT_MUTED = (160, 165, 170)           # sub-branding
WHITE = (255, 255, 255)

# ═══════════════════════════════════════════════════════════════════
#  Card layout (right side — the "hero card")
# ═══════════════════════════════════════════════════════════════════

CARD_W = 413
CARD_H = 549
CARD_R = 15                            # corner radius
CARD_MARGIN_RIGHT = 49
CARD_X = OG_WIDTH - CARD_W - CARD_MARGIN_RIGHT
CARD_Y = (OG_HEIGHT - CARD_H) // 2

# ═══════════════════════════════════════════════════════════════════
#  Phone mockup layout (left side — up to 3 upright phones)
# ═══════════════════════════════════════════════════════════════════

PHONE_W = 208                          # phone frame width (110 × 1.89)
PHONE_H = 394                          # phone frame height (198 × 1.99)
PHONE_BORDER = 6                       # white border width
PHONE_CORNER_R = 21                    # corner radius (11 × 1.89)
PHONE_ROTATION = 0                     # upright (no tilt)
PHONE_START_X = 98                     # left edge of first phone (52 × 1.89)
PHONE_STEP_X = 223                     # horizontal step between phones
PHONE_TOP_Y = 107                      # top edge of phones (54 × 1.99)

# ═══════════════════════════════════════════════════════════════════
#  Icon
# ═══════════════════════════════════════════════════════════════════

ICON_SIZE = 197
ICON_CORNER_R = 51

# ═══════════════════════════════════════════════════════════════════
#  Font & Cache paths
# ═══════════════════════════════════════════════════════════════════

FONTS_DIR = Path(__file__).parent.parent / "assets" / "fonts"
CACHE_DIR = Path(__file__).parent.parent / "assets" / "og_cache"

CACHE_VERSION = "v12"

# ═══════════════════════════════════════════════════════════════════
#  Logo
# ═══════════════════════════════════════════════════════════════════

LOGO_DIR = Path(__file__).parent.parent / "assets" / "logo"
LOGO_W = 288                           # logo width on card (152 × 1.89)
LOGO_H = 54                            # logo height on card (27 × 1.99)

DECORATIONS_DIR = Path(__file__).parent.parent / "assets" / "decorations"

# ═══════════════════════════════════════════════════════════════════
#  Font configuration
#
#  Arabic text is rendered with Noto Sans Arabic because Tajawal
#  lacks proper Arabic Presentation Forms-B glyphs (U+FE70-U+FEFF)
#  required by arabic-reshaper.  Noto Sans Arabic includes full
#  PF-B coverage so all connected letter forms render correctly.
#  English text continues to use Tajawal (sans-serif, Latin-friendly).
# ═══════════════════════════════════════════════════════════════════

_FONT_URLS = {
    # Tajawal — used for English (Latin) text
    "Tajawal-Bold":    "https://github.com/google/fonts/raw/main/ofl/tajawal/Tajawal-Bold.ttf",
    "Tajawal-Regular": "https://github.com/google/fonts/raw/main/ofl/tajawal/Tajawal-Regular.ttf",
    "Tajawal-Medium":  "https://github.com/google/fonts/raw/main/ofl/tajawal/Tajawal-Medium.ttf",
    # Noto Sans Arabic — used for Arabic (RTL) text
    "NotoSansArabic-Bold":    "https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic%5Bwght%5D.ttf",
    "NotoSansArabic-Regular": "https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic%5Bwght%5D.ttf",
}


# ═══════════════════════════════════════════════════════════════════
#  Font helpers
# ═══════════════════════════════════════════════════════════════════

def _ensure_font(family: str, weight: str = "bold") -> Path:
    """Download and cache a font file by family + weight."""
    FONTS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{family}-{weight.capitalize()}"
    path = FONTS_DIR / f"{filename}.ttf"
    if path.exists():
        return path
    url = _FONT_URLS.get(filename)
    if not url:
        raise FileNotFoundError(f"No font URL for: {filename}")
    logger.info(f"Downloading font: {filename}")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    path.write_bytes(resp.content)
    return path


def _get_font(
    size: int,
    weight: str = "bold",
    is_rtl: bool = False,
) -> ImageFont.FreeTypeFont:
    """Return a font at the given size and weight.

    Arabic (is_rtl=True)  → Noto Sans Arabic  (full PF-B coverage)
    English (is_rtl=False) → Tajawal           (clean Latin sans-serif)
    """
    family = "NotoSansArabic" if is_rtl else "Tajawal"
    try:
        return ImageFont.truetype(str(_ensure_font(family, weight)), size)
    except Exception:
        logger.warning(f"Falling back to default font (wanted {family}-{weight})")
        return ImageFont.load_default()


# ═══════════════════════════════════════════════════════════════════
#  Text helpers — pixel-based wrapping for Arabic
# ═══════════════════════════════════════════════════════════════════

def _shape_arabic(text: str) -> str:
    """Reshape Arabic text for correct Pillow rendering (RTL + ligatures).

    Pillow lacks native harfbuzz/raqm so we use arabic-reshaper to
    select the correct presentation-form glyphs and python-bidi to
    reverse the visual order for right-to-left display.
    """
    return get_display(arabic_reshaper.reshape(text))


def _prepare_text(text: str, is_rtl: bool) -> str:
    """Apply Arabic shaping when rendering RTL text."""
    return _shape_arabic(text) if is_rtl else text


def _wrap_text_pixel(
    text: str,
    font: ImageFont.FreeTypeFont,
    max_width: int,
    max_lines: int,
    is_rtl: bool,
) -> list[str]:
    """Word-wrap text by measuring actual pixel width.

    For Arabic: shapes each candidate line through arabic-reshaper + bidi
    before measuring, so ligature widths are accurate.
    For Latin: measures unshaped text directly.

    Returns a list of display-ready strings (already shaped if RTL).
    """
    words = text.split()
    if not words:
        return []

    # Temporary draw surface for measurements
    _tmp = Image.new("RGB", (1, 1))
    _draw = ImageDraw.Draw(_tmp)

    lines: list[str] = []
    current_words: list[str] = []

    for word in words:
        candidate = " ".join(current_words + [word])
        # Measure the shaped version for Arabic, raw for English
        display = _shape_arabic(candidate) if is_rtl else candidate
        bb = _draw.textbbox((0, 0), display, font=font)
        w = bb[2] - bb[0]

        if w <= max_width or not current_words:
            current_words.append(word)
        else:
            # Finish current line
            raw_line = " ".join(current_words)
            lines.append(_shape_arabic(raw_line) if is_rtl else raw_line)
            current_words = [word]

            if len(lines) >= max_lines:
                break

    # Remaining words
    if current_words and len(lines) < max_lines:
        raw_line = " ".join(current_words)
        lines.append(_shape_arabic(raw_line) if is_rtl else raw_line)

    return lines[:max_lines]


# ═══════════════════════════════════════════════════════════════════
#  Image helpers
# ═══════════════════════════════════════════════════════════════════

def _fetch_image(url: str, timeout: int = 15) -> Image.Image | None:
    """Fetch an image from a URL and return as RGBA PIL Image."""
    if not url:
        return None
    try:
        resp = requests.get(url, timeout=timeout, stream=True)
        resp.raise_for_status()
        return Image.open(BytesIO(resp.content)).convert("RGBA")
    except Exception as e:
        logger.warning(f"Failed to fetch image {url}: {e}")
        return None


def _round_corners(img: Image.Image, radius: int) -> Image.Image:
    """Apply rounded corners via an alpha mask."""
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), img.size], radius=radius, fill=255,
    )
    out = img.copy()
    out.putalpha(mask)
    return out


# ═══════════════════════════════════════════════════════════════════
#  Cache
# ═══════════════════════════════════════════════════════════════════

def _cache_key(slug: str, lang: str, updated_at: str) -> str:
    return hashlib.md5(
        f"{CACHE_VERSION}_{slug}_{lang}_{updated_at}".encode()
    ).hexdigest()


def _get_cached_image(slug: str, lang: str, updated_at: str) -> bytes | None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    p = CACHE_DIR / f"{_cache_key(slug, lang, updated_at)}.png"
    return p.read_bytes() if p.exists() else None


def _save_cached_image(slug: str, lang: str, updated_at: str, data: bytes):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    (CACHE_DIR / f"{_cache_key(slug, lang, updated_at)}.png").write_bytes(data)


# ═══════════════════════════════════════════════════════════════════
#  Background — soft beige ↔ mint gradient + circles
# ═══════════════════════════════════════════════════════════════════

def _draw_gradient(canvas: Image.Image):
    """Horizontal gradient from soft mint (left) to warm beige (right)."""
    draw = ImageDraw.Draw(canvas)
    for x in range(OG_WIDTH):
        t = x / OG_WIDTH
        r = int(BG_LEFT[0] + (BG_RIGHT[0] - BG_LEFT[0]) * t)
        g = int(BG_LEFT[1] + (BG_RIGHT[1] - BG_LEFT[1]) * t)
        b = int(BG_LEFT[2] + (BG_RIGHT[2] - BG_LEFT[2]) * t)
        draw.line([(x, 0), (x, OG_HEIGHT)], fill=(r, g, b))


def _draw_decorative_circles(canvas: Image.Image):
    """Paste pre-made decorative circle assets onto the canvas.

    Left:  circle_left.png  — blurred teal SVG (pre-rendered via cairosvg)
    Right: circle_right.png — golden glow PNG

    The JSON placeholder rects are small (159×151) but the real images
    include gaussian blur halos, so they're much bigger (310×317 / 405×317).
    We center each image on its placeholder rect center, then scale to OG.
    """
    SX, SY = OG_WIDTH / 634, OG_HEIGHT / 317  # designer → OG scale

    # ── Left decoration (teal blur) ──
    # Designer placeholder: x=-50, y=230, w=159, h=151 → center (29.5, 305.5)
    # SVG viewBox: 310×317, circle center at ~(56, 242)
    left_path = DECORATIONS_DIR / "circle_left.png"
    if left_path.exists():
        left_img = Image.open(left_path).convert("RGBA")
        lw = int(310 * SX)
        lh = int(317 * SY)
        left_img = left_img.resize((lw, lh), Image.Resampling.LANCZOS)
        # Center on placeholder center
        cx_d, cy_d = -50 + 159 / 2, 230 + 151 / 2  # (29.5, 305.5)
        lx = int(cx_d * SX - lw / 2)
        ly = int(cy_d * SY - lh / 2)
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        overlay.paste(left_img, (lx, ly), left_img)
        canvas.alpha_composite(overlay)

    # ── Right decoration (golden glow) ──
    # Designer placeholder: x=530, y=240, w=159, h=151 → center (609.5, 315.5)
    # PNG source: 405×317
    right_path = DECORATIONS_DIR / "circle_right.png"
    if right_path.exists():
        right_img = Image.open(right_path).convert("RGBA")
        rw = int(405 * SX)
        rh = int(317 * SY)
        right_img = right_img.resize((rw, rh), Image.Resampling.LANCZOS)
        # Center on placeholder center
        cx_d, cy_d = 530 + 159 / 2, 240 + 151 / 2  # (609.5, 315.5)
        rx = int(cx_d * SX - rw / 2)
        ry = int(cy_d * SY - rh / 2)
        overlay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        overlay.paste(right_img, (rx, ry), right_img)
        canvas.alpha_composite(overlay)


# ═══════════════════════════════════════════════════════════════════
#  Phone mockups (left side) — up to 3 upright screens
# ═══════════════════════════════════════════════════════════════════

def _create_phone_mockup(screenshot: Image.Image) -> Image.Image:
    """Wrap a screenshot in a phone-like frame (white border + rounded corners).

    Uses PHONE_W × PHONE_H from constants. The screenshot is cover-cropped
    to fill the inner area (crops center of the source image).
    """
    inner_w = PHONE_W - PHONE_BORDER * 2
    inner_h = PHONE_H - PHONE_BORDER * 2

    # Cover crop: scale to fill, then center-crop
    src_ratio = screenshot.width / screenshot.height
    target_ratio = inner_w / inner_h
    if src_ratio > target_ratio:
        # Source is wider → crop sides
        new_w = int(screenshot.height * target_ratio)
        offset = (screenshot.width - new_w) // 2
        screenshot = screenshot.crop((offset, 0, offset + new_w, screenshot.height))
    else:
        # Source is taller → crop top/bottom
        new_h = int(screenshot.width / target_ratio)
        offset = (screenshot.height - new_h) // 2
        screenshot = screenshot.crop((0, offset, screenshot.width, offset + new_h))

    screenshot = screenshot.resize((inner_w, inner_h), Image.Resampling.LANCZOS)

    # Round the screenshot corners to match the inner radius of the phone
    # frame, eliminating white corner triangles.
    inner_r = max(0, PHONE_CORNER_R - PHONE_BORDER)
    screenshot = _round_corners(screenshot, inner_r)

    frame = Image.new("RGBA", (PHONE_W, PHONE_H), (*WHITE, 255))
    frame.paste(screenshot, (PHONE_BORDER, PHONE_BORDER), screenshot)
    return _round_corners(frame, PHONE_CORNER_R)


def _paste_with_shadow(
    canvas: Image.Image,
    img: Image.Image,
    x: int,
    y: int,
    shadow_alpha: int = 28,
    blur: int = 14,
):
    """Paste an image with a soft drop shadow underneath."""
    pad = 18
    shadow = Image.new(
        "RGBA",
        (img.width + pad * 2, img.height + pad * 2),
        (0, 0, 0, 0),
    )
    shadow_fill = Image.new("RGBA", img.size, (0, 0, 0, shadow_alpha))
    shadow.paste(shadow_fill, (pad, pad))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=blur))

    sx, sy = max(0, x - pad + 4), max(0, y - pad + 6)
    canvas.paste(shadow, (sx, sy), shadow)
    canvas.paste(img, (max(0, x), max(0, y)), img)


def _draw_phones(canvas: Image.Image, screenshots: list[Image.Image]):
    """Draw up to 3 upright phone mockups on the left side.

    Phones are evenly spaced at fixed positions (PHONE_START_X,
    PHONE_TOP_Y) with PHONE_STEP_X between each.
    """
    if not screenshots:
        return

    phones = screenshots[:3]
    n = len(phones)

    mockups: list[Image.Image] = []
    for ss in phones:
        mockups.append(_create_phone_mockup(ss))

    if n == 1:
        area_w = CARD_X - 20
        px = (area_w - mockups[0].width) // 2
        py = (OG_HEIGHT - mockups[0].height) // 2
        _paste_with_shadow(canvas, mockups[0], px, py, shadow_alpha=35)
        return

    # Fixed positions — evenly spaced row
    for i, mockup in enumerate(mockups):
        px = PHONE_START_X + i * PHONE_STEP_X
        py = PHONE_TOP_Y
        _paste_with_shadow(
            canvas, mockup, px, py,
            shadow_alpha=20 + i * 8,
            blur=10 + i * 2,
        )


# ═══════════════════════════════════════════════════════════════════
#  Info card (right side — the "hero card")
# ═══════════════════════════════════════════════════════════════════

def _draw_card_shadow(canvas: Image.Image):
    """Draw a soft shadow behind the white info card."""
    blur = 20
    pad = blur * 2
    shadow = Image.new(
        "RGBA",
        (CARD_W + pad * 2, CARD_H + pad * 2),
        (0, 0, 0, 0),
    )
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(pad, pad), (pad + CARD_W, pad + CARD_H)],
        radius=CARD_R,
        fill=(0, 0, 0, 20),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=blur))
    canvas.paste(shadow, (CARD_X - pad + 5, CARD_Y - pad + 8), shadow)


def _load_logo() -> Image.Image | None:
    """Load the pre-rendered logo PNG."""
    logo_png = LOGO_DIR / "logo.png"
    if logo_png.exists():
        return Image.open(logo_png).convert("RGBA")
    # Try converting from SVG on-the-fly
    logo_svg = LOGO_DIR / "logo.svg"
    if logo_svg.exists():
        try:
            import cairosvg
            png_data = cairosvg.svg2png(
                url=str(logo_svg), output_width=LOGO_W * 2, output_height=LOGO_H * 2,
            )
            logo_png.write_bytes(png_data)
            return Image.open(BytesIO(png_data)).convert("RGBA")
        except Exception as e:
            logger.warning(f"Failed to convert logo SVG: {e}")
    return None


def _draw_info_card(
    canvas: Image.Image,
    icon_img: Image.Image | None,
    name: str,
    description: str,
    is_rtl: bool,
):
    """Draw the white rounded 'hero card' with app info on the right side.

    Content (top to bottom, centered):
      1. App icon (rounded square)
      2. App name (bold, 1-2 lines)
      3. Short description (regular, up to 3 lines)
      — gap —
      4. Logo image (brand)

    Arabic text is wrapped by measuring pixel widths so ligatures
    don't break across lines.
    """

    # ── Shadow ──
    _draw_card_shadow(canvas)

    # ── White card background ──
    card = Image.new("RGBA", (CARD_W, CARD_H), (*WHITE, 255))
    card = _round_corners(card, CARD_R)
    canvas.paste(card, (CARD_X, CARD_Y), card)

    draw = ImageDraw.Draw(canvas)
    cx = CARD_X + CARD_W // 2           # horizontal centre of card
    card_inner_w = CARD_W - 60          # usable text width (30px padding each side)

    # ── Fonts (Arabic → Noto Sans Arabic, English → Tajawal) ──
    font_name = _get_font(36, "bold", is_rtl)
    font_desc = _get_font(19, "regular", is_rtl)

    cy = CARD_Y + 48                    # start y inside card

    # ── App icon ──
    if icon_img:
        icon = icon_img.resize((ICON_SIZE, ICON_SIZE), Image.Resampling.LANCZOS)
        # Composite onto white to remove transparent-edge fringe
        white_bg = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (*WHITE, 255))
        icon = Image.alpha_composite(white_bg, icon)
        icon = _round_corners(icon, ICON_CORNER_R)
        canvas.paste(icon, (cx - ICON_SIZE // 2, cy), icon)
        cy += ICON_SIZE + 26

    # ── App name (pixel-wrapped, max 2 lines) ──
    name_lines = _wrap_text_pixel(name, font_name, card_inner_w, 2, is_rtl)
    for line in name_lines:
        bb = draw.textbbox((0, 0), line, font=font_name)
        tw = bb[2] - bb[0]
        draw.text((cx - tw // 2, cy), line, font=font_name, fill=TEXT_DARK)
        cy += bb[3] - bb[1] + 8

    cy += 14

    # ── Short description (pixel-wrapped, max 3 lines) ──
    desc_lines = _wrap_text_pixel(description, font_desc, card_inner_w, 3, is_rtl)
    for line in desc_lines:
        bb = draw.textbbox((0, 0), line, font=font_desc)
        tw = bb[2] - bb[0]
        draw.text((cx - tw // 2, cy), line, font=font_desc, fill=TEXT_GRAY)
        cy += bb[3] - bb[1] + 5

    # ── Logo branding (anchored at card bottom) ──
    logo_img = _load_logo()
    if logo_img:
        logo = logo_img.resize((LOGO_W, LOGO_H), Image.Resampling.LANCZOS)
        logo_x = cx - LOGO_W // 2
        logo_y = CARD_Y + CARD_H - LOGO_H - 30
        canvas.paste(logo, (logo_x, logo_y), logo)
    else:
        # Fallback to text branding if logo not available
        font_brand = _get_font(16, "bold", is_rtl)
        font_sub = _get_font(13, "regular", is_rtl)
        brand_y = CARD_Y + CARD_H - 60
        brand_text = _prepare_text(
            "دليل التطبيقات القرآنية" if is_rtl else "Quran Apps Directory",
            is_rtl,
        )
        bb = draw.textbbox((0, 0), brand_text, font=font_brand)
        draw.text(
            (cx - (bb[2] - bb[0]) // 2, brand_y),
            brand_text, font=font_brand, fill=ACCENT_TEAL,
        )
        brand_y += bb[3] - bb[1] + 5
        bb = draw.textbbox((0, 0), "itqan.dev", font=font_sub)
        draw.text(
            (cx - (bb[2] - bb[0]) // 2, brand_y),
            "itqan.dev", font=font_sub, fill=TEXT_MUTED,
        )


# ═══════════════════════════════════════════════════════════════════
#  Main entry point
# ═══════════════════════════════════════════════════════════════════

def generate_og_image(app_data: dict, lang: str = "ar") -> bytes:
    """
    Generate a branded 1200×630 OG share card for an app.

    Layout:
      Left  — up to 4 phone mockups in slanted 3D cascade
      Right — white hero card with icon, name, description, branding

    Args:
        app_data: Dictionary with app fields:
            - name_en, name_ar
            - short_description_en, short_description_ar
            - application_icon (URL)
            - screenshots_en, screenshots_ar (list of URLs)
            - main_image_en, main_image_ar (URL, used as fallback)
            - slug
            - updated_at
        lang: Language code ("ar" or "en")

    Returns:
        PNG image bytes
    """
    slug = app_data.get("slug", "")
    updated_at = app_data.get("updated_at", "")

    # ── Cache check ──
    cached = _get_cached_image(slug, lang, updated_at)
    if cached:
        logger.info(f"OG cache hit: {slug}/{lang}")
        return cached

    is_rtl = lang == "ar"
    name = app_data.get(f"name_{lang}", app_data.get("name_en", ""))
    desc = app_data.get(
        f"short_description_{lang}", app_data.get("short_description_en", ""),
    )
    icon_url = app_data.get("application_icon", "")

    # ── Gather screenshot URLs ──
    ss_urls = app_data.get(f"screenshots_{lang}", []) or []
    if not ss_urls:
        other = "en" if lang == "ar" else "ar"
        ss_urls = app_data.get(f"screenshots_{other}", []) or []
    if not ss_urls:
        main_img = app_data.get(
            f"main_image_{lang}", app_data.get("main_image_en", ""),
        )
        if main_img:
            ss_urls = [main_img]

    # Fetch up to 3 screenshots
    screenshots: list[Image.Image] = [
        img for url in ss_urls[:3] if (img := _fetch_image(url))
    ]
    icon_img = _fetch_image(icon_url)

    # ── Compose ──
    canvas = Image.new("RGBA", (OG_WIDTH, OG_HEIGHT), (*WHITE, 255))
    _draw_gradient(canvas)
    _draw_decorative_circles(canvas)
    _draw_phones(canvas, screenshots)
    _draw_info_card(canvas, icon_img, name, desc, is_rtl)

    # ── Export PNG ──
    final = canvas.convert("RGB")
    buf = BytesIO()
    final.save(buf, format="PNG", optimize=True)
    image_bytes = buf.getvalue()

    _save_cached_image(slug, lang, updated_at, image_bytes)
    logger.info(f"Generated OG image: {slug}/{lang} ({len(image_bytes):,} bytes)")
    return image_bytes
