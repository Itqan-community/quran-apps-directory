"""
Dalil Assistant API

Translates guided question answers into hybrid search parameters
and returns curated app recommendations.
"""
import uuid
import logging
from typing import List, Optional, Dict, Any

from ninja import Router
from pydantic import BaseModel

from apps.api.schemas import HybridSearchResponseSchema
from apps.services.app_service_simple import AppService
from core.services.search import AISearchService

logger = logging.getLogger(__name__)
router = Router(tags=["Assistant"])


# ====================
# Question Bank (static config)
# ====================

QUESTION_BANK = [
    {
        "id": "category",
        "question_en": "What do you want to do with the Quran?",
        "question_ar": "ماذا تريد أن تفعل مع القرآن؟",
        "filter_key": "category",
        "type": "multi-select",
        "options": [
            {"value": "mushaf", "label_en": "Read the Quran (Mushaf)", "label_ar": "قراءة القرآن (مصحف)"},
            {"value": "tafsir", "label_en": "Study Tafsir (Interpretation)", "label_ar": "دراسة التفسير"},
            {"value": "recite", "label_en": "Listen to recitations", "label_ar": "الاستماع للتلاوات"},
            {"value": "memorize", "label_en": "Memorize the Quran", "label_ar": "حفظ القرآن"},
            {"value": "tajweed", "label_en": "Learn Tajweed", "label_ar": "تعلم التجويد"},
            {"value": "translations", "label_en": "Read translations", "label_ar": "قراءة الترجمات"},
            {"value": "kids", "label_en": "Teach children", "label_ar": "تعليم الأطفال"},
            {"value": "audio", "label_en": "Audio / Radio Quran", "label_ar": "راديو القرآن الكريم"},
            {"value": "tools", "label_en": "Islamic tools & utilities", "label_ar": "أدوات إسلامية"},
        ]
    },
    {
        "id": "platform",
        "question_en": "Which platform do you use?",
        "question_ar": "ما هو نظام تشغيل جهازك؟",
        "filter_key": "platform",
        "type": "single-select",
        "options": [
            {"value": "android", "label_en": "Android", "label_ar": "أندرويد"},
            {"value": "ios", "label_en": "iPhone / iPad (iOS)", "label_ar": "آيفون / آيباد"},
            {"value": "cross_platform", "label_en": "Both Android & iOS", "label_ar": "أندرويد وiOS"},
            {"value": "web", "label_en": "Web browser", "label_ar": "متصفح الويب"},
        ]
    },
    {
        "id": "offline",
        "question_en": "Do you need the app to work offline?",
        "question_ar": "هل تحتاج التطبيق يعمل بدون إنترنت؟",
        "filter_key": "features",
        "type": "yes-no",
        "options": [
            {"value": "offline", "label_en": "Yes, offline is important", "label_ar": "نعم، الوضع بدون إنترنت مهم"},
            {"value": "skip", "label_en": "No preference", "label_ar": "لا يهم"},
        ]
    },
    {
        "id": "riwayah",
        "question_en": "Which recitation (riwayah) do you prefer?",
        "question_ar": "ما هي رواية التلاوة المفضلة لديك؟",
        "filter_key": "riwayah",
        "type": "multi-select",
        "options": [
            {"value": "hafs", "label_en": "Hafs (most common)", "label_ar": "حفص (الأكثر شيوعاً)"},
            {"value": "warsh", "label_en": "Warsh", "label_ar": "ورش"},
            {"value": "qalun", "label_en": "Qalun", "label_ar": "قالون"},
            {"value": "skip", "label_en": "No preference", "label_ar": "لا يهم"},
        ]
    },
    {
        "id": "mushaf_type",
        "question_en": "What type of Mushaf do you prefer?",
        "question_ar": "ما نوع المصحف المفضل لديك؟",
        "filter_key": "mushaf_type",
        "type": "multi-select",
        "options": [
            {"value": "uthmani", "label_en": "Uthmani script", "label_ar": "الرسم العثماني"},
            {"value": "indopak", "label_en": "Indo-Pak script", "label_ar": "الرسم الهندي الباكستاني"},
            {"value": "tajweed", "label_en": "Color-coded Tajweed", "label_ar": "مصحف التجويد الملون"},
            {"value": "skip", "label_en": "No preference", "label_ar": "لا يهم"},
        ]
    },
    {
        "id": "features",
        "question_en": "Which features are most important to you?",
        "question_ar": "ما الميزات الأكثر أهمية لك؟",
        "filter_key": "features",
        "type": "multi-select",
        "options": [
            {"value": "audio", "label_en": "Audio recitation", "label_ar": "تلاوة صوتية"},
            {"value": "translation", "label_en": "Translation support", "label_ar": "دعم الترجمة"},
            {"value": "tafsir", "label_en": "Tafsir (commentary)", "label_ar": "التفسير"},
            {"value": "word_by_word", "label_en": "Word-by-word analysis", "label_ar": "التحليل كلمة بكلمة"},
            {"value": "bookmarks", "label_en": "Bookmarks & notes", "label_ar": "الإشارات والملاحظات"},
            {"value": "night_mode", "label_en": "Night / dark mode", "label_ar": "الوضع الليلي"},
        ]
    },
]


# ====================
# Schemas
# ====================

class AssistantAnswers(BaseModel):
    category: List[str] = []
    platform: List[str] = []
    features: List[str] = []
    riwayah: List[str] = []
    mushaf_type: List[str] = []


class RecommendRequest(BaseModel):
    answers: AssistantAnswers
    session_id: Optional[str] = None
    lang: str = "ar"


class QuestionOption(BaseModel):
    value: str
    label_en: str
    label_ar: str


class AssistantQuestion(BaseModel):
    id: str
    question_en: str
    question_ar: str
    filter_key: str
    type: str
    options: List[QuestionOption]


class QuestionsResponse(BaseModel):
    questions: List[AssistantQuestion]


class SelectAppRequest(BaseModel):
    session_id: str
    app_id: str


# ====================
# Helpers
# ====================

def _build_natural_query(answers: AssistantAnswers) -> str:
    """Convert structured answers into a natural language query for hybrid_search."""
    parts = []

    if answers.category:
        category_map = {
            "mushaf": "Quran reading mushaf",
            "tafsir": "Quran tafsir interpretation",
            "recite": "Quran recitation audio",
            "memorize": "Quran memorization hifz",
            "tajweed": "tajweed learning",
            "translations": "Quran translation",
            "kids": "Quran for children kids",
            "audio": "Quran audio radio",
            "tools": "Islamic tools",
        }
        for cat in answers.category:
            parts.append(category_map.get(cat, cat))

    if answers.features:
        feature_map = {
            "offline": "works offline without internet",
            "audio": "audio recitation",
            "translation": "translation support",
            "tafsir": "tafsir commentary",
            "word_by_word": "word by word",
            "bookmarks": "bookmarks notes",
            "night_mode": "dark mode",
        }
        for feat in answers.features:
            if feat != "skip":
                parts.append(feature_map.get(feat, feat))

    if answers.riwayah:
        for r in answers.riwayah:
            if r != "skip":
                parts.append(f"riwayah {r}")

    if answers.mushaf_type:
        for mt in answers.mushaf_type:
            if mt != "skip":
                parts.append(f"mushaf {mt}")

    return " ".join(parts) if parts else "quran app"


def _build_filters(answers: AssistantAnswers) -> Dict[str, List[str]]:
    """Build hybrid_search filter dict from answers (skip 'skip' values)."""
    filters: Dict[str, List[str]] = {}

    if answers.category:
        filters["category"] = answers.category

    if answers.platform:
        platform_vals = [p for p in answers.platform if p != "skip"]
        if platform_vals:
            filters["platform"] = platform_vals

    features = [f for f in answers.features if f not in ("skip",)]
    if features:
        filters["features"] = features

    riwayah = [r for r in answers.riwayah if r != "skip"]
    if riwayah:
        filters["riwayah"] = riwayah

    mushaf_type = [m for m in answers.mushaf_type if m != "skip"]
    if mushaf_type:
        filters["mushaf_type"] = mushaf_type

    return filters


# ====================
# Endpoints
# ====================

@router.get("/questions/", response=QuestionsResponse)
def get_questions(request):
    """Return the static question bank for the assistant flow."""
    return {"questions": QUESTION_BANK}


@router.post("/recommend/", response=HybridSearchResponseSchema)
def recommend(request, payload: RecommendRequest):
    """
    Translate assistant answers into hybrid search parameters and return recommendations.

    Logs the conversation for future personalization.
    """
    app_service = AppService()
    search_service = AISearchService()

    query = _build_natural_query(payload.answers)
    filters = _build_filters(payload.answers)

    logger.info(f"Assistant recommend: query='{query}' filters={filters} lang={payload.lang}")

    try:
        search_result = search_service.hybrid_search(
            query=query,
            filters=filters if filters else None,
            limit=20,
            include_facets=False,
            apply_boost=True
        )
    except Exception as e:
        logger.exception(f"Assistant search error: {e}")
        return {
            "results": [], "count": 0,
            "next": None, "previous": None, "facets": {}
        }

    all_results = search_result.get("results", [])

    # Log conversation
    result_app_ids = [str(app.id) for app in all_results[:20]]
    _log_conversation(payload, result_app_ids)

    # Build response
    items_data = []
    for app in all_results:
        app_dict = app_service._app_to_dict(app)
        app_dict["ai_reasoning"] = getattr(app, "ai_reasoning", None)
        app_dict["match_reasons"] = getattr(app, "_match_reasons", [])
        app_dict["relevance_score"] = getattr(app, "_combined_score", None)
        items_data.append(app_dict)

    return {
        "results": items_data,
        "count": len(items_data),
        "next": None,
        "previous": None,
        "facets": {},
        "fallback_mode": search_result.get("_fallback_mode", False),
        "suggested_query": search_result.get("suggested_query", None),
    }


@router.post("/select-app/")
def select_app(request, payload: SelectAppRequest):
    """Record which app the user tapped from assistant results."""
    from .models import AssistantConversation
    from apps.models import App

    try:
        session_uuid = uuid.UUID(payload.session_id)
        conversation = AssistantConversation.objects.filter(
            session_id=session_uuid
        ).first()

        if not conversation:
            return {"ok": False, "error": "session not found"}

        app = App.objects.filter(id=payload.app_id).first()
        if app:
            conversation.selected_app = app
            conversation.save(update_fields=["selected_app"])

        return {"ok": True}
    except Exception as e:
        logger.warning(f"select_app error: {e}")
        return {"ok": False, "error": str(e)}


def _log_conversation(payload: RecommendRequest, result_app_ids: List[str]) -> None:
    """Save conversation to DB. Non-fatal - errors are logged only."""
    from .models import AssistantConversation

    try:
        session_id = uuid.UUID(payload.session_id) if payload.session_id else uuid.uuid4()
        AssistantConversation.objects.update_or_create(
            session_id=session_id,
            defaults={
                "answers": payload.answers.model_dump(),
                "result_app_ids": result_app_ids,
                "lang": payload.lang,
            }
        )
    except Exception as e:
        logger.warning(f"Failed to log assistant conversation: {e}")
