"""
Migrate all 44 Quran apps from the extracted data source.
This command loads the complete dataset extracted from the frontend application.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.models import App
from categories.models import Category
from developers.models import Developer


def get_all_apps_data():
    """All 44 Quran apps data extracted from frontend."""
    return [
        {
            "name_en": """Wahy""",
            "name_ar": """وَحي""",
            "slug": """wahy""",
            "short_description_en": """Learn Holy Quran word-by-word""",
            "short_description_ar": """القرآن تلاوة وتفسير كلمة بكلمة""",
            "description_en": """Holy Quran app with unique features like Highlight the word being recited, word-translation, repeating ayah in recitation (to help in memorization) and many translations/tafsirs, and more ..
Features:
- Highlight the word being recited by the reciter, to help non-arabic speakers and the kids.
- Listen Many recitations, with ayah repeating (to help in memorization).
- Many translations and tafsirs.
- Download recitations to play it without internet.
- Ayah Searching
- Adding Bookmarks.
- Mushaf Mode and List Mode.""",
            "description_ar": """وحي - مصحفك الرقمي المتكامل لتلاوة وفهم واستماع القرآن الكريم
يوفر لك تطبيق وحي تجربة سلسة ومتكاملة لقراءة واستماع وفهم القرآن الكريم بطريقة حديثة ومبتكرة، مع ميزات متقدمة تساعدك على التفاعل مع المصحف بكل سهوله على مستوى السور والآيات والكلمات.
لماذا تختار وحي؟
- مصحف رواية حفص بجميع إصدارات مجمع الملك فهد ورواية ورش.
- أكثر من 64 قارئًا عالميًا لتلاوة القرآن الكريم بجودة عالية
- ميزة نطق كل كلمة منفردة لمساعدتك على الحفظ وتحسين التلاوة
- البحث الذكي بالرسم الإملائي للعثور على الآيات بسهولة
- تفسير القرآن الكريم بـ 184 مصدرًا يشمل أشهر التفاسير والترجمات
- تحميل التلاوات والتفاسير للاستماع والقراءة بدون إنترنت
- صور توضيحية وتقنية الواقع المعزز لفهم معاني الآيات بعمق
- واجهة تدعم أكثر من 34 لغة لتناسب المستخدمين حول العالم
- خطط قرآنية لمتابعة ختمتك وتقدمك فيها
- علامات مرجعية لحفظ مواضع القراءة.
- كتابة التعليقات والملاحظات على الآيات
- مشاركة الآية مع المحتوى المصاحب لها بصيغة نصية أو صور
- تمرير تلقائي للصفحات
- وصول مباشر للمواقع التي تشير لها الكلمات""",
            "avg_rating": 4.9,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 1,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/cover_photo_en.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/1_Wahy/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.logicdev.quran_reader""",
            "app_store_link": """https://apps.apple.com/sa/app/%D9%88-%D8%AD%D9%8A-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D8%A7%D9%84%D9%83%D8%B1%D9%8A%D9%85/id1615454207""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C110460595""",
            "platform": """cross_platform""",
            "developer_name": """Tafsir Center for Qur'anic Studies""",
            "developer_name_ar": """مركز تفسير للدراسات القرآنية""",
            "developer_website": """https://tafsir.net""",
            "categories": ['mushaf', 'tafsir', 'translations', 'riwayat', 'audio'],
        },
        {
            "name_en": """Ayah""",
            "name_ar": """آية""",
            "slug": """ayah""",
            "short_description_en": """Quran App""",
            "short_description_ar": """التطبيق الأمثل لقراءة القرآن""",
            "description_en": """Ayah is a modern, fully-featured Quran app that is beautiful and easy to use.
Ayah's clean, intuitive interface makes for a relaxing reading experience without any visual clutter. It's also fast to help you get back reading as quickly as possible.
With Ayah, you can listen to your favorite Quran recitations, with verse-by-verse highlighting and customizable repeat options.
FEATURES
• The latest edition of the Madinah Mushaf
• Tens of reciters to choose from
• Extensive sharing options
• Khatmah
• Colorful bookmarks
• Starred verses
• Quick searching
• Verse of the day
• Thematic highlighting
• Reminders
• Dark Mode""",
            "description_ar": """آية  تطبيق يوفر تجربة قراءة مريحة بدون أي تشويش بصري. كما أنه سريع ليساعدك على العودة للقراءة بأسرع وقت ممكن
مع آية، يمكنك الاستماع إلى تلاواتك المفضلة من القرآن الكريم، مع تمييز الآيات أثناء التلاوة وخيارات تكرار قابلة للتخصيص.""",
            "avg_rating": 4.3,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 2,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/15_Ayah/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/15_Ayah/cover_photo_en.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/15_Ayah/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.ayah""",
            "app_store_link": """https://apps.apple.com/sa/app/%D8%A2%D9%8A%D8%A9/id706037876""",
            "app_gallery_link": """https://appgallery.huawei.com/app/C101524583""",
            "platform": """cross_platform""",
            "developer_name": """Abdullah Bajaber""",
            "developer_name_ar": """عبدالله باجابر""",
            "developer_website": """""",
            "categories": ['mushaf', 'tafsir', 'translations'],
        },
        {
            "name_en": """Quran Mobasher""",
            "name_ar": """القرآن مباشر""",
            "slug": """quran-mobasher""",
            "short_description_en": """Teaching Quran... anytime, anywhere""",
            "short_description_ar": """تعليم القرآن..في كل زمان ومكان""",
            "description_en": """Quran Mobasher is the first mobile app that allows students to learn Quran using only a mobile phone connected to the internet, from any place and at any time. Quran Mobasher offers different kinds of sessions:
• Recitation Correction : The student can choose any mode of recitation and recite to a teacher who focuses on correcting the provisions and phonetic rules of Quranic recitation.
• Memorization :The student can memorize and recite Quran to any of the available teachers at any time.
• Teaching Kids :Kida are taught Quran using Al-Qaida Noorania method.""",
            "description_ar": """تطبيق 'القرآن مباشر' هو أول تطبيق مجاني في العالم لتصحيح التلاوة يتيح تعلم القرآن الكريم عن بعد بالصوت والصورة عن طريق جلسات تفاعلية مع معلمين ومعلمات مؤهلين ومتميزين؛ حيث يلبي التطبيق احتياجات من يريد تعلم القرآن الكريم من جميع الفئات (ذكوراً وإناثاً – كباراً وصغاراً)
يعمل التطبيق على مدار 24 ساعة مجانًا ويوفر معلمين ومعلمات مجازين بالسند المتصل إلى النبي صلى الله عليه وسلم، كما يتميز التطبيق بتسجيل جميع الجلسات للرجوع إليها لاحقاً، ويمكنك وضع خطتك التعليمية ومتابعة إنجازها.
يهتم التطبيق بجودة التعليم حيث يتم متابعة المعلمين وتقييم أدائهم باستمرار من خلال إدارة الجودة والتطوير وحيث يمكن للطالب تقييم المعلم بعد انتهاء كل جلسة.""",
            "avg_rating": 4.9,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 3,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/14_Quran Mobasher/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/14_Quran Mobasher/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/14_Quran Mobasher/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=maknoon.student""",
            "app_store_link": """https://apps.apple.com/sa/app/quran-mobasher-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D9%85%D8%A8%D8%A7%D8%B4%D8%B1/id1602922387""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Maknon""",
            "developer_name_ar": """مكنون""",
            "developer_website": """https://maknon.org.sa""",
            "categories": ['recite', 'memorize'],
        },
        {
            "name_en": """Adnan The Quran Teacher""",
            "name_ar": """عدنان معلم القرآن""",
            "slug": """adnan-the-quran-teacher""",
            "short_description_en": """Interactive application for children to teach and memorize the full Noble Quran""",
            "short_description_ar": """تطبيق تفاعلي للأطفال لتعلم وحفظ القرآن الكريم""",
            "description_en": """Adnan the Quran teacher app has reached more than 10,000,000 children thanks to Allah, it is an interactive application for children to teach and memorize the full Noble Quran, the alphabet and more than 12 supplications and Hadiths.""",
            "description_ar": """تطبيق تفاعلي للأطفال لتعلم وحفظ القرآن الكريم المصحف كامل بصوت الشيخ المنشاوي وتعليم الأحرف الهجائية وأكثر من 12 دعاء وحديث للأذكار اليومية تطبيق موجه للفئات العمرية من 3 سنوات حتى 12 سنة""",
            "avg_rating": 4.4,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 4,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/10_Adnan The Quran Teacher/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/10_Adnan The Quran Teacher/cover_photo_en.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/10_Adnan The Quran Teacher/cover_photo_ar.jpg""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.tagmedia.adnan""",
            "app_store_link": """https://apps.apple.com/sa/app/%D8%B9%D8%AF%D9%86%D8%A7%D9%86-%D9%85%D8%B9%D9%84%D9%85-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86/id565905501""",
            "app_gallery_link": """https://appgallery.huawei.com/app/C103136965""",
            "platform": """cross_platform""",
            "developer_name": """KidsApp Company""",
            "developer_name_ar": """شركة تطبيقات الطفولة""",
            "developer_website": """https://kidsapp.sa""",
            "categories": ['kids', 'memorize'],
        },
        {
            "name_en": """Al Fatiha""",
            "name_ar": """الفاتحة""",
            "slug": """al-fatiha""",
            "short_description_en": """Teaching Al-Fatihah Online""",
            "short_description_ar": """تصحيح قراءة الفاتحة""",
            "description_en": """Al-Fatiha application is an application that helps students To develop their abilities to read Surah Fatiha in a sound way as they can The app to communicate with competent teachers And listen to their comments for improvement and development.""",
            "description_ar": """تطبيق سورة الفاتحة:
فكرة التطبيق بسيطة جداً، وهدفه الأول هو: هو تصحيح قراءة الفاتحة، كل ما عليك فعله هو الضغط على زر التسجيل، وتسجل قراءتك للفاتحة، ثم الانتظار حتى يرد عليك أحد المعلمين المجازين ذوي الكفاءة.
يهدف التطبيق إلى:
تعليم المستفيدين سورة الفاتحة تلاوةً وحفظاً وفهماً من خلال تصحيح الأخطاء الشائعة في تلاوة الفاتحة وتلقين المستفيد علوم التجويد وفق الأصول العلمية.
تعليم المستفيدين العمل بسورة الفاتحة اعتقاداً وسلوكاً وأخلاقاً.
يحتوى التطبيق بالإضافة إلى خدمة التصحيح بعض المراجع الإثرائية التي تتعلق بالفاتحة، والتي تتضمن بعض التفاسير والفوائد، وقراءات بأصوات مختلفة، بالإضافة إلى المراجع العلمية حول تعليم كيفية قراءة الفاتحة بشكل صحيح.""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 5,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/17_Al Fatiha/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/17_Al Fatiha/cover_photo_ar.jpg""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/17_Al Fatiha/cover_photo_ar.jpg""",
            "google_play_link": """https://play.google.com/store/apps/details?id=org.alfatiha.app""",
            "app_store_link": """https://apps.apple.com/sa/app/al-fatiha-%D8%A7%D9%84%D9%81%D8%A7%D8%AA%D8%AD%D8%A9/id1199635059""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Quran Audio Library""",
            "developer_name_ar": """المكتبة الصوتية للقرآن الكريم""",
            "developer_website": """https://mp3quran.net""",
            "categories": ['recite'],
        },
        {
            "name_en": """Quran""",
            "name_ar": """قرآن""",
            "slug": """quran""",
            "short_description_en": """from Quran.com""",
            "short_description_ar": """من صناع Quran.com""",
            "description_en": """From the makers of Quran.com comes Quran for iOS, a beautiful, and ad-free mushaf app.
It’s now easier to read the Quran on the go, memorize it and listen to your favorite reciters.
As the Hadeeth (prophetic statement) in At-Tirmithi states: “Whoever reads a letter from the Book of Allah, he will have a reward, and this reward will be multiplied by ten. I am not saying that 'Alif, Laam, Meem' (a combination of letters frequently mentioned in the Holy Quran) is a letter, rather I am saying that ‘Alif’ is a letter, ‘Laam’ is a letter and ‘Meem’ is a letter.” [At-Tirmithi] We hope this app will help you increase your recitation of the Quran and increase your blessings in this world and the hereafter.""",
            "description_ar": """من صناع Quran.com يأتي تطبيق القرآن للأجهزة المحمولة، تطبيق للمصحف ذو صفحات جميلة خالي تماما من الاعلانات.
لقد أصبح من السهل قراءة القرآن بالشارع، وحفظه، والاستماع إلى قارئك المفضل.
عَنْ ابْنِ مَسْعُودٍ قَالَ : قَالَ رَسُولُ اللَّهِ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ { مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ حَسَنَةٌ وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا, لَا أَقُولُ الم حَرْفٌ, وَلَكِنْ أَلِفٌ حَرْفٌ, وَلَامٌ حَرْفٌ,وَمِيمٌ حَرْفٌ }. رَوَاهُ التِّرْمِذِيُّ. ونحن نأمل أن يساعدك هذا التطبيق على زيادة قراءتك للقرآن وزيادة حسناتك في الدنيا والآخرة.""",
            "avg_rating": 4.7,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 6,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/5_Quran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/5_Quran/cover_photo_en.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/5_Quran/cover_photo_en.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.quran.labs.androidquran""",
            "app_store_link": """https://apps.apple.com/sa/app/quran-by-quran-com-%D9%82%D8%B1%D8%A2%D9%86/id1118663303""",
            "app_gallery_link": """https://appgallery.huawei.com/app/C101321131""",
            "platform": """cross_platform""",
            "developer_name": """Quran.com""",
            "developer_name_ar": """Quran.com""",
            "developer_website": """https://quran.com""",
            "categories": ['mushaf', 'tafsir', 'translations', 'audio'],
        },
        {
            "name_en": """Mushaf Altdabbor""",
            "name_ar": """مصحف التدبر""",
            "slug": """mushaf-altdabbor""",
            "short_description_en": """تدبر القرآن الكريم""",
            "short_description_ar": """تدبر القرآن الكريم""",
            "description_en": """تطبيق 'مصحف التدبر | القرآن الكريم' هو مصحف إلكتروني تفاعلي مصمم لمساعدتك على تلاوة القرآن الكريم وتدبره والعيش معه، من خلال محتوى فريد مستفاد من أقوال السلف والخلف، بأسلوب معاصر وسهل الفهم.
أبرز الميزات:
نص المصحف بجودة فاخرة لقراءة مريحة ومتفاعلة.
بحث دقيق في المصحف والهدايات والمكتبة.
التنقل السريع بين السور، الأجزاء، والأثمان.
خيارات استماع لتلاوات مجموعة من القرّاء المميزين.
إضافة تعليقات وتأملات قرآنية لكل آية والرجوع إليها لاحقًا.
مشاركة الآيات والهدايات عبر وسائل التواصل الاجتماعي.
إضافة علامات مرجعية وتصنيفها لتسهيل الرجوع إليها.
خطط متعددة لختم القرآن مع تخصيص مدة الختمة، مقدار الورد، والتذكير به.
الوضع الليلي وإمكانية تخصيص لون الخلفية.
متوفر باللغتين العربية والإنجليزية.
يعد التطبيق أحد منتجات مشروع 'مصحف التدبر'، الذي نتج عنه أكثر من 12,000 هداية قرآنية، تم العمل عليها لأكثر من 3 سنوات، بمشاركة 30 باحثًا، واستنادًا إلى أكثر من 30 مرجعًا، كما تم إصدار نسخة مطبوعة وترجمة المحتوى إلى الإنجليزية.""",
            "description_ar": """تطبيق 'مصحف التدبر | القرآن الكريم' هو مصحف إلكتروني تفاعلي مصمم لمساعدتك على تلاوة القرآن الكريم وتدبره والعيش معه، من خلال محتوى فريد مستفاد من أقوال السلف والخلف، بأسلوب معاصر وسهل الفهم.
أبرز الميزات:
نص المصحف بجودة فاخرة لقراءة مريحة ومتفاعلة.
بحث دقيق في المصحف والهدايات والمكتبة.
التنقل السريع بين السور، الأجزاء، والأثمان.
خيارات استماع لتلاوات مجموعة من القرّاء المميزين.
إضافة تعليقات وتأملات قرآنية لكل آية والرجوع إليها لاحقًا.
مشاركة الآيات والهدايات عبر وسائل التواصل الاجتماعي.
إضافة علامات مرجعية وتصنيفها لتسهيل الرجوع إليها.
خطط متعددة لختم القرآن مع تخصيص مدة الختمة، مقدار الورد، والتذكير به.
الوضع الليلي وإمكانية تخصيص لون الخلفية.
متوفر باللغتين العربية والإنجليزية.
يعد التطبيق أحد منتجات مشروع 'مصحف التدبر'، الذي نتج عنه أكثر من 12,000 هداية قرآنية، تم العمل عليها لأكثر من 3 سنوات، بمشاركة 30 باحثًا، واستنادًا إلى أكثر من 30 مرجعًا، كما تم إصدار نسخة مطبوعة وترجمة المحتوى إلى الإنجليزية.""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 7,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/36_Mushaf Altdabbor/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/36_Mushaf Altdabbor/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/36_Mushaf Altdabbor/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.isgapps.tadabor_v1&hl=ar""",
            "app_store_link": """https://apps.apple.com/us/app/%D9%85%D8%B5%D8%AD%D9%81-%D8%A7%D9%84%D8%AA%D8%AF%D8%A8%D8%B1-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D8%A7%D9%84%D9%83%D8%B1%D9%8A%D9%85/id1466597208""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C105763437""",
            "platform": """cross_platform""",
            "developer_name": """Malem Altdabbor""",
            "developer_name_ar": """معالم التدبر""",
            "developer_website": """https://tadabbor.com""",
            "categories": ['tafsir', 'mushaf'],
        },
        {
            "name_en": """Tarteel""",
            "name_ar": """ترتيل""",
            "slug": """tarteel""",
            "short_description_en": """A.I. Quran Mistake Detection""",
            "short_description_ar": """صاحبك للقرآن""",
            "description_en": """No one to recite to? No problem. Tarteel AI is here!
How many times have you wished you knew more surahs to use in salah? That you could get feedback on your recitation whenever you needed it? That you could memorize more, and worry less?
Hide. Tap. Recite. In three easy moves, you’re strengthening your memorization of the Quran with the world’s leading AI Quran memorization companion. Simply hide the verses, tap the mic and start reciting. The pages will fill with your recitation and if you make a mistake, Tarteel’s intuitive AI will be sure let you know INSTANTLY with its flagship feature, Memorization Mistake Detection. That’s live feedback on your recitation, any time, anywhere - even if you whisper!
Whether you’re memorizing for your next Hifz class or revising Juz Amma on your daily commute, Tarteel adapts to your recitation, tracks your progress and aligns with your goals. It’s your companion —helping you memorize better, build confidence, and create a Quran habit that lasts a lifetime. No matter where you are in your memorization, Tarteel is here for the journey.
Tarteel is free to use with no ads and prioritizes user privacy. The team operates within the framework of Ihsan, striving for excellence and using innovative tech to serve the Muslim Ummah.
TARTEEL PREMIUM
Supercharge your Quran memorization with a paid subscription to Tarteel Premium. Try it now for FREE, no credit card required. Features include:
- Memorization Mistake Detection
Start reciting and you’ll be notified whenever you miss a word, use the wrong word or say one word too many! Tarteel will highlight your mistakes and keep track so you can revise and review for next time. Currently, this feature does not include Tajweed or pronunciation correction, but we know there’s community demand and it’s on our roadmap for the future!
- Hidden Verses
Hide the verses and recite; Tarteel will highlight verses and follow along with your recitation so you can check your memorization as you go. You’re one step closer to perfecting that verse!
- Goals
Set custom Goals for what you want to memorize and revise. Choose your portion, deadline and the type of engagement you want; memorization, reading, revision or recitation!
- Historical Mistakes
Progress is key! Tarteel keeps a record of all of your mistakes so you know exactly where your memorization is strong and what could use a little more work.
- Unlimited Listening and Audio
Solidify your memorization with listening and audio! Choose your favourite Qari, the portion and how many times you want to listen.
- Advanced Progress Tracking
Check if you’re reaching your goals with detailed analytics around your Quran engagement.
—
Join the 9M+ Muslims worldwide who are using Tarteel to support their memorization of the Quran!
Do you use Tarteel? Your feedback helps us improve the platform and add to our long-term roadmap. If you’ve benefited from Tarteel, please remember to leave us a review - we’d love to hear from you! Request new features here: [http://feedback.tarteel.ai](http://feedback.tarteel.ai/)
—
NOTES:
Tarteel requires microphone access and a stable internet connection in order for its voice features to function properly. Please ensure you allow Tarteel to access these permissions on your device.""",
            "description_ar": """قوّ علاقتك بالقرآن في هذا الشهر الكريم بالاستعانة بأدوات الذكاء الاصطناعي لدى ترتيل. ترتيل هو تطبيق iOS مجاني يشمل ترقية اختيارية Premium يتيح لك المزيد من التفاعل مع القرآن.
توفر ترتيل حاليًا هذه الميزات:
تلاوة:
- اقرأ الآيات مباشرة من المصحف
- اختر ما بين الخط العثماني والإندو-باكستاني
- ابدأ بتلاوة أي آية واستمر في قراءتها مباشرة من المصحف باستخدام خاصية 'تلاوة'
- اختبر حفظك عن طريق إخفاء الآيات التالية باستخدام وضع الحفظ.
حدد وتعلم:
- ابحث في القرآن من خلال تلاوة آية كامة، جزء من الآية، أو حتى كلمة واحدة
- شاهد الآية التي تبحث عنها باللغة العربية، وترجمتها اللفظية، وتفسيرها، ومعناها باللغات الأخرى.
- حدد أماكن ظهور الآيات أو الألفاظ التي تبحث عنها في المصحف.
- حدد الآية التي يتم تلاوتها فورًا وشاركها مع أصدقائك.
تعزيز القراءة:
- ضبط حجم الخط
- تشغيل وإيقاف الترجمة
- اختر بين الترجمة للإنجليزية والفرنسية والأوردو والهندي، وبين التفسير بالإنجليزية والعربية
- الوضع الفاتح والداكن
- إشارات مرجعية
متابعة التقدم وإنشاء عادة:
- قم بإنشاء حساب مجاني لمراقبة سلسلة الأيام المتواصلة التي تقرأ فيها، الحصول على الشارات، ولمزامنة بياناتك على أجهزة مختلفة.
- اشتر اشتراك Premium للحصول على إحصائيات وتحليلات مفصلة لجلسات قراءتك للقرآن.
في الإصدار القادم إن شاء الله:
- تشغيل صوتي لتلاواتك
- الاستماع لتلاوات قراء متعددين
- لغات أخرى وترجمات متعددة
- مميزات متطورة لجعل حفظ القرآن أكثر سهولة
نسعد بتعليقاتكم واقتراحاتكم بينما نعمل على تطوير البرنامج باستمرار. إذا وجدت برنامج ترتيل مفيدًا لك، فضلًا اترك لنا تقييمك.
تعليقات:
يتطلب برنامج ترتيل الوصول إلى الميكروفون والاتصال المستقر بالانترنت حتى تعمل ميزات الصوت بشكل سلس. فضلًا تأكد من السماح للبرنامج بالوصول لتلك المتطلبات.""",
            "avg_rating": 4.7,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 8,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/11_Tarteel/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/11_Tarteel/cover_photo_en.jpeg""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/11_Tarteel/cover_photo_en.jpeg""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.mmmoussa.iqra""",
            "app_store_link": """https://apps.apple.com/sa/app/tarteel-%D8%AA%D8%B1%D8%AA%D9%8A%D9%84-ai-quran/id1391009396""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Tarteel, Inc""",
            "developer_name_ar": """شركة ترتيل""",
            "developer_website": """https://www.tarteel.ai""",
            "categories": ['recite', 'memorize', 'translations', 'tafsir'],
        },
        {
            "name_en": """Rayyaan & Bayaan""",
            "name_ar": """ريان وبيان""",
            "slug": """rayyaan--bayaan""",
            "short_description_en": """مساعدة الأطفال على حفظ ومراجعة القرآن""",
            "short_description_ar": """مساعدة الأطفال على حفظ ومراجعة القرآن""",
            "description_en": """تطبيق رقمي لمساندة الأطفال على حفظ ومراجعة القرآن الكريم بطريقة ممتعة وفعالة، حيث يستخدم التطبيق أحدث الأساليب التعليمية لتقديم أنشطة تعلم ذاتية وتفاعلية للأطفال، ويسمح لمعلمي القرآن بإنشاء تكليفات ومهام مخصصة لهم؛ كما يوفر التطبيق فرصة للأطفال للتعلم الحر، والتمكن من أنشطة المراجعة والحفظ بشكل مستقل.""",
            "description_ar": """تطبيق رقمي لمساندة الأطفال على حفظ ومراجعة القرآن الكريم بطريقة ممتعة وفعالة، حيث يستخدم التطبيق أحدث الأساليب التعليمية لتقديم أنشطة تعلم ذاتية وتفاعلية للأطفال، ويسمح لمعلمي القرآن بإنشاء تكليفات ومهام مخصصة لهم؛ كما يوفر التطبيق فرصة للأطفال للتعلم الحر، والتمكن من أنشطة المراجعة والحفظ بشكل مستقل.""",
            "avg_rating": 4.3,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 9,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/6_Rayyaan & Bayaan/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/6_Rayyaan & Bayaan/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/6_Rayyaan & Bayaan/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=net.rayyaanbayaan.app""",
            "app_store_link": """https://apps.apple.com/sa/app/%D8%B1%D9%8A%D8%A7%D9%86-%D9%88-%D8%A8%D9%8A%D8%A7%D9%86/id6450221877""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C108861273""",
            "platform": """cross_platform""",
            "developer_name": """Maknon""",
            "developer_name_ar": """مكنون""",
            "developer_website": """https://maknon.org.sa""",
            "categories": ['kids', 'memorize'],
        },
        {
            "name_en": """Ayah widget""",
            "name_ar": """آية ويدجت""",
            "slug": """ayah-widget""",
            "short_description_en": """عرض آيات قرآنية على الويدجت بشكل متغير""",
            "short_description_ar": """عرض آيات قرآنية على الويدجت بشكل متغير""",
            "description_en": """آية ويدجت هو تطبيق يعرض آيات قرآنية على الويدجت بشكل متغير تلقائيًا، حيث يتم تغيير الآية بانتظام. بالإضافة إلى ذلك، يتكيف لون خلفية الويدجت تلقائياً مع وضع الجهاز، حيث يتحول بين الوضع الفاتح والداكن ليتناسب مع إعدادات الهاتف ويضمن تجربة مستخدم مريحة وجذابة.""",
            "description_ar": """آية ويدجت هو تطبيق يعرض آيات قرآنية على الويدجت بشكل متغير تلقائيًا، حيث يتم تغيير الآية بانتظام. بالإضافة إلى ذلك، يتكيف لون خلفية الويدجت تلقائياً مع وضع الجهاز، حيث يتحول بين الوضع الفاتح والداكن ليتناسب مع إعدادات الهاتف ويضمن تجربة مستخدم مريحة وجذابة.""",
            "avg_rating": 4.7,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 10,
            "status": """published""",
            "featured": True,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/39_Ayah widget/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/39_Ayah widget/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/39_Ayah widget/cover_photo_ar.png""",
            "google_play_link": """""",
            "app_store_link": """https://apps.apple.com/sa/app/%D8%A7-%D9%8A%D8%A9-%D9%88%D9%8A%D8%AF%D8%AC%D8%AA/id6497876401""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Badr Alhanaky""",
            "developer_name_ar": """بدر الحناكي""",
            "developer_website": """""",
            "categories": ['tools'],
        },
        {
            "name_en": """Mushaf Mecca""",
            "name_ar": """مصحف مكة""",
            "slug": """mushaf-mecca""",
            "short_description_en": """Your Essential Quran App""",
            "short_description_ar": """تطبيق قرآني متطور بخصائص فريدة""",
            "description_en": """Most Advanced & Authentic Quran App
Multilingual (19 languages)
More than 140 reciters, 40 interpretations & 21 translations
Quran Library: Madinah, Indopak, Kemenag..
Most advanced and authentic Quran app for iOS devices with ease in reading and listening Quran on the go.
This Multilingual (19 languages), Quran application includes more than 140 reciters, 40 interpretations & many translations with a unique Quran Library (Madinah, Indopak, Kemenag, Warsh, Qaloon, Muhammadi, Turkey, and others).
The latest version of the Quran app offers complete Quran in the elegant Uthmanic font, audio recitation, translations and Tafsir, proofread by authentic Muslim scholars. There are many features under development. Please send us your feedback and feature requests. Please do keep us in your prayers!
The Mecca Mushaf is an integrated project in the service of the Holy Quran.
A Muṣḥaf, in literal meaning is an Arabic word for collection of pages and refers to a compiled, written pages of Al Quran.
Mushaf Mecca Quran App provides the following features:
- Reading
Reading the Noble Quran with the narration of Hafs, in the Ottoman script, from the edition of the Quran of al-Madina (1st, 2nd, or 3rd edition), Warsh, Qaloon, Doori, the Qur'an of Indonesia (Kemenag), Indopak Quran, and others, in calm colors that are comfortable for the eye.
Interpretations
Study verses of the al Quran through more than 35 interpretations.
Translations of meanings
Learn the meanings of the verses through translations of the meanings of the Noble Quran in several languages.
- Audio recitations
Listen to Quran recitations with the voice of more than 100 famous reciters, with the recited verses highlighted while reciting the verse.
- Advanced and smart search
Fast and smart search throughout the entire Quran, combining verse and surah names, and even page numbers quick navigation.
- Bookmarks
Set Bookmarks to help you read the daily planned reading or complete your memorizing.
- Adding thoughts and Notes
Jot down thoughts on verses, to reflect while reading and listening, and save them in the application's archives.
- Favorite
Save a number of verses in your favorites for easy return to it at any time.
- The library
Choose the type of Quran, translations and interpretations from among the books available in the application's library.
- Share
The ability to share the verse in text or image format, and to share the interpretation and translation.
- Settings
Interface languages ​​switching, bookmark and note management, page navigation and others.
- Sync
Ability to sync your data across your different devices.
- Auto Scrolling
- And other features
Unique and special Quranic design, Holy Quran memorization through the feature of repeating a verse or a number of verses, and night mode.""",
            "description_ar": """تطبيق قرآني متطور ذو خدمات برمجية متميزة
مع واجهة تدعم 19 لغة
وتلاوات أكثر من 140 قارئ و 40 تفسير و 21 ترجمة موثوقة
مكتبة المصاحف: مصحف المدينة، ورش، قالون، شمرلي، دوري
- القراءة
قراءة القرآن الكريم برواية حفص، بالخط العثماني، من طبعة مصحف المدينة الإصدار الأول أو الثاني أو الثالث، ورش، قالون، دوري، مصحف إندونيسيا، مصحف النستعليق وغيرها من المصاحف، ضمن ألوانٍ هادئة مريحة للعين.
- التفاسير
دراسة آيات القرآن من خلال أكثر من 35 تفسير.
- ترجمات المعاني
تعلم معاني الآيات من خلال تراجم لمعاني القرآن الكريم بعدة لغات.
- التلاوات الصوتية
الاستماع إلى تلاوات القرآن بصوت أكثر من 100 قارئ من مشاهير القُراء، مع تظليل الآيات المتلوة لتلاوات 30 قارئ.
- البحث المتقدم والذكي
بحث سريع وذكي في كامل المصحف، يجمع بين البحث في الآيات وأسماء السور، وحتى الانتقال السريع بأرقام الصفحات.
- العلامات المرجعية
وضع فواصل لمساعدتك على قراءة الورد اليومي أو ختمة الحفظ.
- إضافة الخواطر وتدوين التدبرات
تدوين خواطر على الآيات، للتدبُّر أثناء القراءة والاستماع، وحفظها في محفوظات التطبيق.
- المفضلة
حفظ عدد من الآيات في المفضلة لسهولة العودة إليها في أي وقت.
- المكتبة
اختيار نوعية المصحف، الترجمات والتفاسير من بين الكتب المتاحة في المكتبة الخاصة بالتطبيق.
- المشاركة
إمكانية مشاركة الآية بالنص أو بالصورة، ومشاركة التفسير والترجمة.
- الإعدادات
الانتقال بين لغات الواجهة، إدارة العلامات والملاحظات، وأسلوب التنقل بين الصفحات و...
- المزامنة
إمكانية مزامنة بياناتك على أجهزتك المختلفة.
- وخصائص أخرى
تصميم قرآني فريد وخاص، تحفيظ القرآن الكريم من خلال خاصية تكرار آية أو عدد من الآيات، والقراءة الليلة.""",
            "avg_rating": 4.6,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 11,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/48_Mushaf Mecca/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/48_Mushaf Mecca/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/48_Mushaf Mecca/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.quran.mushaf.mecca""",
            "app_store_link": """https://apps.apple.com/us/app/id1438777424""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C103952077""",
            "platform": """cross_platform""",
            "developer_name": """Mushaf Makkah""",
            "developer_name_ar": """مصحف مكة""",
            "developer_website": """https://mushafmakkah.com""",
            "categories": ['mushaf', 'riwayat', 'tafsir', 'translations', 'audio'],
        },
        {
            "name_en": """Maher""",
            "name_ar": """ماهر""",
            "slug": """maher""",
            "short_description_en": """Live recitation recognition""",
            "short_description_ar": """تسميع القرآن الكريم""",
            "description_en": """A unique application for reciting the Noble Qur’an using artificial intelligence.
Maher is a unique application for reciting the Noble Qur’an using artificial intelligence through real time voice recognition and showing what is being recited on the page of the Qur’an. The application also provides other qualitative features such as showing the meaning of each word of the Noble Qur’an and monitoring the application usage statistics in detail.
This project is supervised by Al-Burhan Association for the Service of the Sunnah and the Qur’an, and sponsored by وقف الملك عبد الله بن عبدالعزيز لوالديه يرحمهم الله.
Current features of Maher include:
- Track your recitations in real time and get feedback!
- Automatic usage tracker.
- Automatic bookmarking recently viewed pages based on usage patterns.
- Distraction free reading in landscape mode.
- Choice between horizontal or vertical mush view.""",
            "description_ar": """ماهر تطبيق فريد لتسميع القرآن الكريم باستخدام الذكاء الاصطناعي
صفحة المصحف، التطبيق يوفر كذلك ميزات نوعية أخرى مثل بيان معنى كل كلمة من كلمات القرآن الكريم ومتابعة معدل استخدام التطبيق بشكل مفصل.
هذا إطلاق تجريبي من التطبيق وجار العمل على إضافة العديد من الميزات الأخرى.
هذا المشروع بإشراف جمعية البرهان لخدمة السنة والقرآن، وبرعاية وقف الملك عبد الله بن عبدالعزيز لوالديه يرحمهم الله.""",
            "avg_rating": 3.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 12,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/9_Maher/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/9_Maher/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/9_Maher/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=app.maher""",
            "app_store_link": """https://apps.apple.com/sa/app/maher-%D9%85%D8%A7%D9%87%D8%B1/id6737059750""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """AL BORHAN CHARITY FOR SUNNAH & QURAN SERVICES""",
            "developer_name_ar": """جمعية البرهان لخدمة السنة والقرآن""",
            "developer_website": """https://www.alborhan.sa""",
            "categories": ['recite', 'mushaf', 'tafsir'],
        },
        {
            "name_en": """Elmohafez""",
            "name_ar": """محفظ الوحيين""",
            "slug": """elmohafez""",
            "short_description_en": """Your companion in memorizing the holy Quran""",
            "short_description_ar": """طريقك الميسر لحفظ كتاب الله""",
            "description_en": """Your companion in memorizing the holy Quran, Hadith and Motoon
Elmohafez app allows you to memorize the noble Qur’an according to the different qira’aat while using the Uthmani script. It also helps you memorize the Prophetic Sunnah and the mutoon (brief Islamic texts) in an easy way. All you have to do is choose the text, read it and listen to the recitation, and then record your voice as the text disappears. After the recording, the application shows the text along with your recorded voice for you to compare it and know how correct it is. You have the ability to follow your progress of memorization of the Qur’an or the books of hadeeth, and you can listen to your recording at any time.
Currently, the app supports the recitation of the Qur’an according to 20 different rewayaat (narrations) and 15 different reciters as well as the coloured Quran. It has Bukhari, Muslim and different mutoon such as “Tuhfat Al-Atfal”, “Al-Jazareyya”, “Ash-Shatebeyya” and other books.
Features
-Read the Qur’an according to the Uthmani script which is used in the mushaf that is printed at King Fahd Printing Complex.
-Listen to the recitation of many reciters.
-Control the speed of the recitation. This helps those who want to revise quickly.
-Choose any verse/hadeeth you want to memorize and repeat it several times.
- Draw and highlight on Quran pages for the purpose of teaching.
- Follow your progress of memorization of a chapter or part of the Qur’an.
- Read the topical interpretation of the Qur’an (tafseer mawdoo’ey).
-Help your children memorize the Qur’an.
-Supports displaying its content on an external display device (AirPlay/Cable).""",
            "description_ar": """محفظ الوحيين يتيح لك إمكانية حفظ القرآن الكريم والسنة النبوية والمتون بطريقة سهلة وبإمكانيات متطورة
محفظ الوحيين يتيح لك إمكانية حفظ القرآن الكريم بالقراءات بالرسم العثماني والسنة النبوية والمتون بطريقة سهلة. كل ما عليك هو اختيار وقراءة النص وسماعه من القارئ ثم تسجيله بصوتك في حين يختفي النص. بعد الانتهاء من التسجيل يقوم التطبيق بعرض النص مرة أخرى وتشغيل صوتك لكي تطابقه بالصواب. يمكنك متابعة نسبة الحفظ في كل سورة أو كتاب حديث وسماع التسجيل في أي وقت.
كما يمكن استخدام محفظ الوحيين في قاعات التدريس وذلك بعرضه على الشاشات الخارجية بكامل مساحتها وظهور الآيات بملء الشاشة عند تلاوتها.
يدعم التطبيق القرآن الكريم بـ ٢٠ رواية و ١٥ قارئًا بالإضافة إلى مصحف التجويد الملون وكتب صحيح البخاري ومسلم وكتب المتون كتحفة الأطفال والشاطبية والجزرية والبيقونية وغيرهم.
مزايا التطبيق:
- قراءة القرآن بالرسم العثماني كما هو موجود في مصحف المدينة طبعة الملك فهد (الإصدار الأول والثاني)
- حفظ القرآن الكريم بالروايات عن طريق السماع والتسجيل والمطابقة
- الختمة ومتابعة الختمات (المعين)
- حصريا وللمرة الأولى تظليل آيات القرآن مع التلاوة على مستوى الكلمة في جميع سور القرآن وجميع قراء حفص عن عاصم
- إمكانية الضغط على أي كلمة وسماع تلاوتها بشكل منفصل
- إمكانية العرض على كامل مساحة الشاشات الخارجية باستخدام تقنية AirPlay للعرض اللاسلكي أو عن طريق التوصيل السلكي باستخدام AV Adapter
- إمكانية الرسم والتظليل على صفحات القرآن الكريم بغرض التعليم
- البحث الفوري في القرآن الكريم وكتب الحديث والمتون
- استماع التلاوة للعديد من القراء
- الاستماع لترجمات القرآن بعدة لغات
- تشغيل متواصل لصفحات كاملة وسور وأرباع وأجزاء والقرآن كاملا
- استمتع بالتشغيل في الخلفية مع بيانات كاملة عن الآية الحالية في شاشة القفل وجميع كماليات iPod
- إمكانية تعيين الآيات أو الأحاديث والمتون المراد حفظها وتكرارها
- إمكانية التحكم في سرعة القراءة للمراجعة السريعة
- سجل المتابعة لمعرفة نسبة الحفظ بحسب السور أو الأجزاء
- قراءة التفسير الموضوعي للقرآن الكريم
- قراءة أيسر التفاسير للشيخ أبي بكر الجزائري
- قراءة تفسير وترحمة معاني القرآن بعدة لغات
- التفسير الصوتي من الميسر في التفسير والمختصر في التفسير
- إمكانية متابعة حفظ الأحاديث على مستوى الفصول والأبواب والكتب والمصنفات
- إمكانية تحميل السور الكاملة وأبواب كتب الحديث دفعة واحدة
- إمكانية وضع الفواصل الذكية بألوان مختلفة وأسماء مميزة وتحريكها على الصفحات أو الآيات، حيث يمكنك تحديد كمية الورد واستقبال تنبيهات للتذكير بالقراءة.
- إمكانية كتابة الملاحظات النصية على الآيات
- إمكانية نسخ ومشاركة الآيات والأحاديث والمتون عبر شبكات التواصل الاجتماعي""",
            "avg_rating": 4.7,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 13,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/49_Elmohafez/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/49_Elmohafez/cover_photo_ar.jpeg""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/49_Elmohafez/cover_photo_ar.jpeg""",
            "google_play_link": """https://play.google.com/store/apps/details?id=net.hammady.android.mohafez""",
            "app_store_link": """https://apps.apple.com/us/app/elmohafez-tv-%D9%85%D8%AD%D9%81%D8%B8-%D8%A7%D9%84%D9%88%D8%AD%D9%8A%D9%8A%D9%86/id560715467""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """elMohafez""",
            "developer_name_ar": """محفظ الوحيين""",
            "developer_website": """https://www.elmohafez.com""",
            "categories": ['memorize', 'mushaf', 'riwayat', 'tafsir', 'translations', 'audio'],
        },
        {
            "name_en": """Moddakir""",
            "name_ar": """مُدَكر""",
            "slug": """moddakir""",
            "short_description_en": """Teaching Quran""",
            "short_description_ar": """لتعليم القرآن""",
            "description_en": """Moddakir's application helps you learn the Holy Qur’an with the most skilled teachers available 24 hours a day
(Approved by the Ministry of Human Resources and Social Development)
- Proficient teachers
- Available 24 hours a day
- Audio or video tutorials
- Audio or video educational sessions
- Available for men, women, and children
- Complete privacy between the teacher and the learner
- Share the package with the family and follow up on their achievement
Educational paths:
- Correction of recitation
- Memorizing and reviewing the Qur’an
- Indoctrination (Talqeen) for young and old
- Reading and Ejaza
Your teacher is waiting for you.. Download the app now""",
            "description_ar": """مُدَكر يعينك على تعلم القرآن الكريم مع أمهر المعلمين والمعلمات المتاحين على مدار 24 ساعة
(معتمد من وزارة الموارد البشرية والتنمية الاجتماعية)
- معلمين ومعلمات متقنين
- متاح على مدار 24 ساعة
- جلسات تعليمية صوتية أو مرئية
- متاح للرجال والنساء والأطفال
- خصوصية تامة بين المعلم والمتعلم
- مشاركة الباقة مع العائلة ومتابعة إنجازهم
المسارات التعليمية:
- تصحيح التلاوة
- الحفظ والمراجعة
- التلقين للصغار والكبار
- الإقراء والإجازة
معلمك بانتظارك .. حمل التطبيق الآن""",
            "avg_rating": 4.1,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 14,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/7_Moddakir/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/7_Moddakir/cover_photo_en.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/7_Moddakir/cover_photo_ar.jpeg""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.moddakir.moddakir""",
            "app_store_link": """https://apps.apple.com/sa/app/moddakir-to-teach-the-quran/id1492246697""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Moddakir""",
            "developer_name_ar": """مدكر""",
            "developer_website": """https://moddakir.com""",
            "categories": ['recite', 'memorize'],
        },
        {
            "name_en": """MA'ANONI DA SHIRIYAR ALQUR'ANI""",
            "name_ar": """تفسير الهوسا""",
            "slug": """maanoni-da-shiriyar-alqurani""",
            "short_description_en": """Hausa Tafsir""",
            "short_description_ar": """معاني وتفسير القرآن بلغة الهوسا""",
            "description_en": """Bijiro da fassara da tafsiri daga littafin FAYYATACCEN BAYANI NA MA'ANONI DA SHIRIYAR ALQUR'ANI
- Tafiya ga aya ta hanyar rubuta lambarta
- Jerin juzu'ai da surori
- Karatun alƙur'ani da muryan Sheikh alhuzaifi
Samun damar bincike a cikin ayoyin alƙur'ani da tafsiri da fassara
- Samun damar kwafa da yaɗa tafsiri ko adreshinsa daga shafi
- Kashe kashen ayoyi gwargwadon abinda suke karantarwa
- Bijiro da fassara da tafsiri daga littafin audahu al- bayan lima'ani wa hidayaati al-ƙur'an
- Bijiro da tarjamar kowace aya a keɓance domin sauƙaƙe fahimtar ta""",
            "description_ar": """مزايا التطبيق:
- عرض التفسير الموثوق بلغة الهاوسا من 'أوضح البيان لمعاني وهدايات القرآن'.
- التصفح من خلال قائمة السور والأجزاء.
- تصفح الآيات من خلال اسم السورة و رقم الآية.
- التلاوة الصوتية للآيات بصوت الشيخ الحذيفي.
- إمكانية البحث في نصوص المصحف.
- إمكانية البحث في التفسير والترجمة.
- إمكانية نسخ النصوص ومشاركتها، أو مشاركة رابط الصفحة.
- إمكانية إرسال الملاحظات على التفسير.
- إمكانية الاستخدام بدون حاجة للإنترنت.""",
            "avg_rating": 4.9,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 15,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/38_MA'ANONI DA SHIRIYAR ALQUR'ANI/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/38_MA'ANONI DA SHIRIYAR ALQUR'ANI/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/38_MA'ANONI DA SHIRIYAR ALQUR'ANI/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=online.smartech.basayir.hausa""",
            "app_store_link": """https://apps.apple.com/sa/app/maanoni-da-shiriyar-alqurani/id6480479512""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Basayir""",
            "developer_name_ar": """وقف بصائر لخدمة القرآن الكريم وعلومه""",
            "developer_website": """https://basayir.net""",
            "categories": ['translations', 'mushaf', 'tafsir'],
        },
        {
            "name_en": """Mofassal""",
            "name_ar": """مفصل""",
            "slug": """mofassal""",
            "short_description_en": """Create Quranic Plans""",
            "short_description_ar": """لإنشاء الخطط القرآنية""",
            "description_en": """Mofassal is an application that helps you create detailed
plans to memorize and review the Holy Qur'an, follow it up,
and share it with others with high professionalism""",
            "description_ar": """هل تحتاج إلى خطة تعينك في حفظ القرآن ؟
هل أنت معلم حلقة وتريد إنشاء خطط لطلابك ومتابعتها بشكل سهل ومريح ؟
سواء كنت معلم حلقة أو ترغب في حفظ القرآن.. نقدم لك تطبيق مفصل..
تطبيق مفصل هو تطبيق يمكنك من إنشاء خطط لحفظ ومراجعة القرآن الكريم بشكل سهل وبسيط ..
ويتيح لك متابعة إنجازك ومشاركة خطتك مع من تريد""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 16,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/50_Mofassal/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/50_Mofassal/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/50_Mofassal/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.mofassal.app""",
            "app_store_link": """https://apps.apple.com/us/app/%D9%85%D9%81%D8%B5%D9%84/id1584188020?l=ar""",
            "app_gallery_link": """https://appgallery.huawei.com/app/C108746233""",
            "platform": """cross_platform""",
            "developer_name": """Tafsir Center for Qur'anic Studies""",
            "developer_name_ar": """مركز تفسير للدراسات القرآنية""",
            "developer_website": """https://tafsir.net""",
            "categories": ['tools', 'memorize'],
        },
        {
            "name_en": """The Correct Quotation""",
            "name_ar": """الاستشهاد الصحيح""",
            "slug": """the-correct-quotation""",
            "short_description_en": """Quran Keyboard""",
            "short_description_ar": """لوحة مفاتيح القرآن""",
            "description_en": """This is a Quran Keyboard and it can be used as a Normal Keyboard.
This Keyboard will help millions of Muslims around the world.""",
            "description_ar": """تعظيماً لنصوص الوحيين وتفادياً لما يحصل من أخطاء أثناء الكتابة تم تنفيذ لوحة مفاتيح تمكن المستخدم من البحث المباشر في نصوص الكتاب والسنة والمشاركة بها في مواقع التواصل الاجتماعي أو استخدامها في التطبيقات الأخرى دون الحاجة إلى كتابتها.
مميزات التطبيق:
1- ضبط كتابة نصوص الوحيين من خلال قواعد بيانات موثوقة.
2- البحث في نصوص القرآن الكريم أو أحاديث الصحيحين وتسهيل استخدام النتيجة أو مشاركتها.
3- إمكانية إدراج ترجمة الآية أو تفسيرها.
4- النص القرآني مأخوذ من مجمع الملك فهد لطباعة المصحف الشريف.
5- نصوص أحاديث الصحيحين مأخوذة من وقفية الشيخ عبدالله بن عقيل رحمه الله لدى دار التأصيل.""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 17,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/51_The Correct Quotation/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/51_The Correct Quotation/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/51_The Correct Quotation/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.moia.qurankeyboard""",
            "app_store_link": """https://apps.apple.com/us/app/id1557031461?l=ar""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Ministry of Islamic Affairs, Dawah and Guidance""",
            "developer_name_ar": """وزارة الشؤون الإسلامية والدعوة والإرشاد""",
            "developer_website": """https://www.moia.gov.sa""",
            "categories": ['tools'],
        },
        {
            "name_en": """Satr""",
            "name_ar": """سطر""",
            "slug": """satr""",
            "short_description_en": """Innovative flexible recitation""",
            "short_description_ar": """تلاوة مبتكرة مرنة""",
            "description_en": """It allows you to read the Holy Quran in an innovative way by displaying all the verses in a single line, with the ability to recite in both horizontal and vertical orientations, as well as control the speed of verse display and font size.""",
            "description_ar": """يُتيح لك قراءة القرآن الكريم بطريقة مبتكرة من خلال عرض جميع الآيات القرآنية على شكل سطر واحد مع إمكانية التلاوة بالوضعين الأفقي والرأسي والتحكم في سرعة عرض الآيات وحجم الخط""",
            "avg_rating": 4,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 18,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/52_Satr/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/52_Satr/cover_photo_ar.jpeg""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/52_Satr/cover_photo_ar.jpeg""",
            "google_play_link": """""",
            "app_store_link": """https://apps.apple.com/us/app/id6446127230?l=ar""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Digital Corners""",
            "developer_name_ar": """شركة الأركان الرقمية""",
            "developer_website": """https://digital-corners.net""",
            "categories": ['tools', 'mushaf'],
        },
        {
            "name_en": """Moeen""",
            "name_ar": """معين""",
            "slug": """moeen""",
            "short_description_en": """مصحف المراجعة""",
            "short_description_ar": """مصحف المراجعة""",
            "description_en": """تطبيق معين، الرفيق المساعد في حفظ وتثبيت القرآن الكريم.
يهدف إلى المساعدة في تقوية الحفظ وتثبيت المراجعة عن طريق معرفة نقاط الضعف من خلال التحديد على التنبيهات والأخطاء""",
            "description_ar": """تطبيق معين، الرفيق المساعد في حفظ وتثبيت القرآن الكريم.
يهدف إلى المساعدة في تقوية الحفظ وتثبيت المراجعة عن طريق معرفة نقاط الضعف من خلال التحديد على التنبيهات والأخطاء""",
            "avg_rating": 5,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 19,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/53_Moeen/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/53_Moeen/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/53_Moeen/cover_photo_ar.png""",
            "google_play_link": """""",
            "app_store_link": """https://apps.apple.com/us/app/%D9%85%D8%B9%D9%8A%D9%86-%D9%85%D8%B5%D8%AD%D9%81-%D8%A7%D9%84%D9%85%D8%B1%D8%A7%D8%AC%D8%B9%D8%A9/id1638765798""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Faisal Haddad""",
            "developer_name_ar": """فيصل حداد""",
            "developer_website": """""",
            "categories": ['memorize', 'mushaf'],
        },
        {
            "name_en": """Quran Tadabbur""",
            "name_ar": """القرآن الكريم تدبر وعمل""",
            "slug": """quran-tadabbur""",
            "short_description_en": """القرآن الكريم تدبر وعمل""",
            "short_description_ar": """منهج متكامل في التدريب على تدبر القرآن الكريم والعمل به""",
            "description_en": """القرآن تدبر وعمل هو منهج متكامل محكَّم ومتخصص في التدريب على تدبر القرآن الكريم والعمل به وفق منهج أهل السنة والجماعة
مكونات المنهج: قسَّمنا المصحف إلى (٦٠٤) وحدات دراسية؛ كل وحدة منها مكونة من وجـه من أوجه المصحـف الشريـف – وفق طبعة مجمع الملك فهد بالمدينة النبوية – مضافًا إليه أربع فقرات رئيسة هي
١ – الوقفات التدبرية: سبع وقفات تدبرية اعتنت بمقاصد الآيات (الإيمانية، والتربوية وغيرها) استخرجناها من ستة عشر كتابًا من أمهات كتب التفسير المعتمدة لدى أهل السنة والجماعة، والتزمنا فيها بنص كلام المفسر إلا إن وُجِد خطأ في بعض الألفاظ من حيث الطباعة أو اللغة والإعراب ولا يحتمل الصحة بأي وجه، فحينها نصحح الكلمة ونضعها بين معكوفين هكذا [ ]. وذكرنا في آخر كل وقفة مرجعها؛ معتمدين في ذلك ذكر اسم المفسر بدلا من اسم الكتاب، ثم رقم الجزء والصفحة وفق الطبعة المعتمدة في المشروع
وقد بلغ مجموع وقفات المنهج (٤٢٢٨) وقفة جرى اختيارها من بين نحو (١٥٠٠٠) وقفة تمثل أرشيف المشروع
والتزمنا ألا يزيد عدد الوقفات في الآية الواحدة أو جزء منها عن ثلاث وقفات، كما التزمنا ألا ننقل عن مفسر واحد أكثر من ثلاث وقفات في الوجه الواحد
ثم وضعنا على الوقفة سؤالاً يساعد المتدرب على تحصيل ملكة التدبر، ويستطيع الإجابة عليه من الوقفة نفسها دون الحاجة إلى الرجوع إلى مراجع أخرى
٢ – جدول معاني الكلمات: وفيه معاني بعض الكلمات الغريبة في وجه المصحف، مأخوذة من كتاب «السراج في غريب القرآن» لفضيلة الشيخ الدكتور محمد بن عبد العزيز الخضيري
٣ – العمل بالآيات: من أجل تدريب القارئ على رتبة العمل بالقرآن الكريم اقترحنا ثلاثة أعمال تطبيقية مقيسة مستنبطة من آيات الوجه، ووضعنا أمام كل عمل نص الآية التي استنبط منها
٤ – التوجيهات: ذكرنا ثلاثة توجيهات عامة مستقاة من آيات الوجه –تربوية أو عقدية أو فقهية...إلخ- وأمام كل توجيه نص الآية التي استنبط منها التوجيه""",
            "description_ar": """القرآن تدبر وعمل هو منهج متكامل محكَّم ومتخصص في التدريب على تدبر القرآن الكريم والعمل به وفق منهج أهل السنة والجماعة
مكونات المنهج: قسَّمنا المصحف إلى (٦٠٤) وحدات دراسية؛ كل وحدة منها مكونة من وجـه من أوجه المصحـف الشريـف – وفق طبعة مجمع الملك فهد بالمدينة النبوية – مضافًا إليه أربع فقرات رئيسة هي
١ – الوقفات التدبرية: سبع وقفات تدبرية اعتنت بمقاصد الآيات (الإيمانية، والتربوية وغيرها) استخرجناها من ستة عشر كتابًا من أمهات كتب التفسير المعتمدة لدى أهل السنة والجماعة، والتزمنا فيها بنص كلام المفسر إلا إن وُجِد خطأ في بعض الألفاظ من حيث الطباعة أو اللغة والإعراب ولا يحتمل الصحة بأي وجه، فحينها نصحح الكلمة ونضعها بين معكوفين هكذا [ ]. وذكرنا في آخر كل وقفة مرجعها؛ معتمدين في ذلك ذكر اسم المفسر بدلا من اسم الكتاب، ثم رقم الجزء والصفحة وفق الطبعة المعتمدة في المشروع
وقد بلغ مجموع وقفات المنهج (٤٢٢٨) وقفة جرى اختيارها من بين نحو (١٥٠٠٠) وقفة تمثل أرشيف المشروع
والتزمنا ألا يزيد عدد الوقفات في الآية الواحدة أو جزء منها عن ثلاث وقفات، كما التزمنا ألا ننقل عن مفسر واحد أكثر من ثلاث وقفات في الوجه الواحد
ثم وضعنا على الوقفة سؤالاً يساعد المتدرب على تحصيل ملكة التدبر، ويستطيع الإجابة عليه من الوقفة نفسها دون الحاجة إلى الرجوع إلى مراجع أخرى
٢ – جدول معاني الكلمات: وفيه معاني بعض الكلمات الغريبة في وجه المصحف، مأخوذة من كتاب «السراج في غريب القرآن» لفضيلة الشيخ الدكتور محمد بن عبد العزيز الخضيري
٣ – العمل بالآيات: من أجل تدريب القارئ على رتبة العمل بالقرآن الكريم اقترحنا ثلاثة أعمال تطبيقية مقيسة مستنبطة من آيات الوجه، ووضعنا أمام كل عمل نص الآية التي استنبط منها
٤ – التوجيهات: ذكرنا ثلاثة توجيهات عامة مستقاة من آيات الوجه –تربوية أو عقدية أو فقهية...إلخ- وأمام كل توجيه نص الآية التي استنبط منها التوجيه""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 20,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/80_Quran Tadabbur/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/80_Quran Tadabbur/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/80_Quran Tadabbur/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.newline.tadabber""",
            "app_store_link": """https://apps.apple.com/us/app/id1565731379""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Almenhaj Center for Educational Supervision and training""",
            "developer_name_ar": """مركز المنهاج للإشراف والتدريب التربوي""",
            "developer_website": """""",
            "categories": ['tafsir', 'mushaf'],
        },
        {
            "name_en": """Translations of Quran meanings""",
            "name_ar": """ترجمات معاني القرآن الكريم""",
            "slug": """translations-of-quran-meanings""",
            "short_description_en": """Quran Encyclopedia""",
            "short_description_ar": """موسوعة تراجم معاني القرآن الكريم""",
            "description_en": """An electronic reference for free, reliable, and advanced translations and interpretations of the meanings of the Holy Quran, available in world languages, prepared and developed under the supervision of the Al-Rabwah Call, Guidance, and Community Awareness Association and the Association for Serving Islamic Content in Languages.
Application Features:
High reliability: selecting the best translations according to precise criteria derived from sources respected by the people of Sunnah and Jama'ah, then reviewing and developing them, creating new translations for some languages, and continuously improving upon them.
User interactivity: the ability to participate in providing feedback and evaluating translations to ensure accuracy and continuous development
Free access: Enjoy full access to the translations for free, with options to download in multiple formats.
Why choose the Encyclopedia of Quran Meanings Translations application?
The Encyclopedia of Quran Meanings Translations application is a strong alternative to other unreliable electronic sources; thanks to our commitment to accuracy, perfection, and continuous updating, we offer you an effective tool to understand the Book of Allah Almighty in your preferred language.
Available translation formats:
XLSX - CSV - XML - API - JSON - PDF - EPUB
List of available translations for the meanings of the Holy Quran:
Assamese
Azerbaijani
Urdu
Spanish
Akan (Ashanti)
Albanian
German
Amharic
English
Indonesian
Anko
Oromo
Uzbek
Ukrainian
Italian
Uighur
Portuguese
Pashto
Bulgarian
Punjabi
Bengali
Bosnian
Tamil
Thai
Tagalog
Turkish
Telugu
Georgian
Khmer
Dari
Dagbani
Romanian
Sinhala
Swahili
Chichewa
Serbian
Somali
Chinese
Tajik
Hebrew
Afar
Gujarati
Persian
French
Fulani (Fula)
Philippine Iranun
Philippine Maguindanao
Vietnamese
Kyrgyz
Kazakh
Kurdish Sorani
Kurdish Kurmanji
Croatian
Kannada
Korean
Kirundi
Kinyarwanda
Luganda
Lithuanian
Lingala
Marathi
Macedonian
Malay
Malayalam
Mauri
Nepali
Hindi
Hausa
Dutch
Yao
Japanese
Yoruba
Join our community:
Be part of our active community and contribute to the development of the translations of the meanings of the Holy Quran. Share your opinions and ratings and help us make this application a primary source for humanity around the world to understand the Holy Quran in different languages.""",
            "description_ar": """مرجعية إلكترونية لترجمات مجانية وموثوقة ومتطورة لمعاني القرآن الكريم وتفسيره، متاحة بلغات العالم ، تم تجهيزها وتطويرها بإشراف جمعية الدعوة والإرشاد وتوعية الجاليات بالربوة وجمعية خدمة المحتوى الإسلامي باللغات.
مميزات التطبيق:
موثوقية عالية: انتقاء أفضل الترجمات وفق معايير دقيقة مستمدة من المصادر المعتبرة لدى أهل السنة والجماعة ثم مراجعتها وتطويرها، وإنشاء ترجمات جديدة لبعض اللغات، ويتم التطوير عليها بشكل مستمر.
تفاعلية المستخدم: إمكانية المشاركة في إبداء الملاحظات وتقييم الترجمات لضمان الدقة والتطوير المستمر.
وصول مجاني: تمتع بالوصول الكامل للترجمات مجاناً ، مع خيارات تحميل صيغ متعددة.
لماذا تختار تطبيق موسوعة تراجم معاني القرآن الكريم؟
التطبيق يعد بديلاً قوياً عن المصادر الإلكترونية الأخرى ؛ بفضل إلتزامنا بالدقة والإتقان والتحديث المستمر، نقدم لك أداة فعالة لفهم كتاب الله عز وجل بلغتك المفضلة.
الصيغ المتوفرة للتراجم:
XLSX - CSV - XML - API - JSON - PDF - EPUB
قائمة الترجمات المتوفرة لمعاني القرآن الكريم:
آسامي
أذري
أردو
إسباني
أكاني ( أشانتي)
ألباني
ألماني
أمهري
إنجليزي
إندونيسي
أنكو
أورومي
أوزبكي
أوكراني
إيطالي
أيغوري
برتغالي
بشتو
بلغاري
بنجابي
بنغالي
بوسني
تاميلي
تايلاندي
تجالوج
تركي
تلغو
جورجي
خميري
دري
دغباني
روماني
سنهالي
سواحيلي
شيشيوا
صربي
صومالي
صيني
طاجيكي
عبري
عفري
غوجاراتي
فارسي
فرنسي
فلاتي(فولاني)
فلبيني إيرانوني
فلبيني مجنداناو
فيتنامي
قرغيزي
كازاخي
كردي سوراني
كردي كرمنجي
كرواتي
كنادي
كوري
كيروندي
كينيارواندي
لوغندي
ليتواني
لينغالا
ماراثي
مقدوني
ملايو
مليالم
موري
نيبالي
هندي
هوسا
هولندي
ياؤو
ياباني
يوربا
انضم إلى مجتمعنا:
كن جزءًا من مجتمعنا النشط وساهم في تطوير ترجمات معاني القرآن الكريم.
شارك بآرائك وتقييماتك وساعدنا في جعل هذا التطبيق مصدراً رئيساً للبشرية حول العالم في فهم القرآن الكريم باللغات.""",
            "avg_rating": 4.5,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 21,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/69_Translations of Quran meanings/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/69_Translations of Quran meanings/cover_photo_en.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/69_Translations of Quran meanings/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.quranenc.app""",
            "app_store_link": """https://apps.apple.com/us/app/translations-of-quran-meanings/id1561769281""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """The Noble Qur'an Encyclopedia""",
            "developer_name_ar": """موسوعة القرآن الكريم""",
            "developer_website": """https://quranenc.com""",
            "categories": ['translations'],
        },
        {
            "name_en": """Ana Atlou""",
            "name_ar": """أنا أتلو""",
            "slug": """ana-atlou""",
            "short_description_en": """A digital audio Quran for the visually impaired""",
            "short_description_ar": """مصحف رقمي صوتي للمكفوفين""",
            "description_en": """An innovative digital Quran designed specifically for the blind and visually impaired, allowing them to listen to Quran recitations, interpretations, and translations. It also enables easy navigation through its content using voice guidance and includes a voice search feature within the Quranic text.""",
            "description_ar": """مصحف رقمي مبتكر تم تصميمه خصيصاً للمكفوفين وضعاف البصر يمكن من خلاله الإستماع لتلاوات القرآن الكريم والتفاسير والترجمات مع سهولة الإنتقال بين محتوياته بإستخدام التوجية الصوتي كما يشمل خاصية البحث صوتياً في نص القرآن الكريم""",
            "avg_rating": 5,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 22,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/54_Ana Atlou/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/54_Ana Atlou/cover_photo_en.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/54_Ana Atlou/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=org.noor.anaatlou.vi""",
            "app_store_link": """https://apps.apple.com/us/app/%D8%A3%D9%86%D8%A7-%D8%A3%D8%AA%D9%84%D9%88/id1620636638""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Noor Taibah Foundation""",
            "developer_name_ar": """مؤسسة نور طيبة""",
            "developer_website": """https://noortaibah.org""",
            "categories": ['accessibility', 'mushaf', 'tafsir', 'translations'],
        },
        {
            "name_en": """Alfanous""",
            "name_ar": """الفانوس""",
            "slug": """alfanous""",
            "short_description_en": """Advanced Quranic search engine""",
            "short_description_ar": """محرك بحث قرآني متقدم""",
            "description_en": """Al-Fanoos is like Google for the internet but is a specialized and advanced search engine for the Quran. Just as you can search the web for the most precise details in various ways, Al-Fanoos will assist you in searching for intricate details in multiple forms. You will navigate through the Quran like never before, helping you find what you seek in the Book of Allah, God willing.""",
            "description_ar": """الفانوس هو كمثل جوجل للإنترنت ولكنه باحث متخصص ومتقدم للقرآن، فكما تستطيع البحث في الشبكة العنكبوتية على أدق الأمور بكافة الأشكال سوف يعينك تطبيق الفانوس في البحث عن أدق الأمور وبعدة أشكال وسوف تبحر كما لم تبحر من قبل لتجد ضالتك في كتاب الله بإذن الله""",
            "avg_rating": 4.5,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 23,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/55_Alfanous/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/55_Alfanous/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/55_Alfanous/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.unchained.alfanous""",
            "app_store_link": """https://apps.apple.com/us/app/id543646326?l=ar""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Islam phone""",
            "developer_name_ar": """إسلام فون""",
            "developer_website": """""",
            "categories": ['tools', 'tafsir'],
        },
        {
            "name_en": """Noor International Quran""",
            "name_ar": """مصحف نور إنترناشيونال""",
            "slug": """noor-international-quran""",
            "short_description_en": """The most reliable translations""",
            "short_description_ar": """قرآن كامل مع ترجمات متعددة، بحث فوري، تلاوات صوتية، وميزات إضافية""",
            "description_en": """A complete Quran with translations in English, French, and Spanish, featuring instant search, audio reading of translations by verse, and the ability to listen to recitations by famous Qaris, along with various other features.""",
            "description_ar": """شامل القرآن الكريم مع ترجمة المعاني باللغة الإنجليزية والفرنسية والإسبانية بالإضافة لخاصية البحث الفوري والقراءة الصوتية للترجمات حسب الآيات وإمكانية إستماع التلاوات بصوت أشهر القراء ومزايا متنوعة أخرى""",
            "avg_rating": 4.2,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 24,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/57_Noor International Quran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/57_Noor International Quran/cover_photo_en.jpeg""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/57_Noor International Quran/cover_photo_en.jpeg""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.smartech.noor.inl&hl=ar&gl=US""",
            "app_store_link": """https://apps.apple.com/us/app/id1525532425?l=ar""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Noor International""",
            "developer_name_ar": """نور انترناشونال""",
            "developer_website": """https://noorinternational.net/ar""",
            "categories": ['translations', 'mushaf', 'audio'],
        },
        {
            "name_en": """Werdy""",
            "name_ar": """وردي""",
            "slug": """werdy""",
            "short_description_en": """رفيقك في ختم القرآن صُمم لمن يفضل المصحف الورقي""",
            "short_description_ar": """رفيقك في ختم القرآن صُمم لمن يفضل المصحف الورقي""",
            "description_en": """An app to track your Quran completion, showing your progress in the physical Quran. It allows creating multiple schedules, setting daily goals, sending daily reminders, and providing detailed daily and weekly reports on completed surahs, verses, and letters.""",
            "description_ar": """وِردي, رفيقك في ختم القرآن صُمم لمن يفضل المصحف الورقي!
ما زال البعض منا يفضل قراءة القرآن الكريم من المصحف الورقي واعتاد ذلك, مثل كبار السن. ولا تكاد تجد تطبيقا يساعد هؤلاء القرّاء في وردهم مع المصحف الورقي, ولذا أحببنا المساعدة.
ببساطة, قمنا بأخذ جدول الورد القرآني -المعتاد قديما عند القرّاء- المحمول في الجيب لمتابعة مكان التوقف والإنجاز اليومي, ثم حولنا هذا الجدول إلى تطبيق إلكتروني يساعدك على متابعة ختمتك دون الحاجة إلى التحول عن المصحف الورقي.
لـ«وِردي» عدة خدمات ومزايا، أهمها:
• إنشاء أكثر من ختمة أو ورد.
• جدولة الختمة وتحديد المقدار اليومي.
• تذكيرات يومية.
• تحديد السور والآيات التي أتممتها.
• نسبة الإنجاز التفصيلي لكل ختمة.
• تقارير تفصيلية يومية وأسبوعية لعدد الختمات والسور والآيات والحروف التي قرأتها.
تطبيق وِردي, تابع ختمتك في المسجد, البيت, العمل, غرف الانتظار, مع المصحف الورقي أو تطبيقك المفضل. حمّل #وِردي وتابع وردك.""",
            "avg_rating": 4.3,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 25,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/58_Werdy/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/58_Werdy/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/58_Werdy/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.arabiait.werdy""",
            "app_store_link": """https://apps.apple.com/us/app/id1475112472?l=ar""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C104710873""",
            "platform": """cross_platform""",
            "developer_name": """Arabia IT""",
            "developer_name_ar": """شركة الدار العربية""",
            "developer_website": """https://arabia-it.com/""",
            "categories": ['tools'],
        },
        {
            "name_en": """Interactive Tafsir""",
            "name_ar": """التفسير التفاعلي""",
            "slug": """interactive-tafsir""",
            "short_description_en": """Read and listen to interpretations""",
            "short_description_ar": """تفسير صوتي ونصي""",
            "description_en": """Read and listen to the following interpretations:
• Facilitated interpretation issued by the King Fahd Complex
• Al-Mukhtasar fi Tafsir of the Noble Qur’an for Interpretation Center
• Interpretation of Allama Saadi, may God have mercy on him (Tayseer al-Karim al-Rahman)
Interpretation of Allama Ibn Jouzi (Facilitation of the science of download)
• The lamp in the strange Qur’an
• Facilitator in the strange Qur’an
• Interpretation of Ibn Jouzi
• Interpretation of Ibn Ashour""",
            "description_ar": """قراءة واستماع إلى التفاسير التالية:
• التفسير الميسر الصادر عن مجمع الملك فهد
• المختصر في تفسير القرآن الكريم لمركز التفسير
• تفسير العلامة السعدي رحمه الله (تيسير الكريم الرحمن)
• تفسير العلامة ابن جُزي (التسهيل لعلوم التنزيل)
• السراج في غريب القرآن
• الميسر في غريب القرآن
• تفسير ابن جُزي
• تفسير ابن عاشور""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 26,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/37_Interactive Tafsir/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/37_Interactive Tafsir/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/37_Interactive Tafsir/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=one.tafsir.read""",
            "app_store_link": """https://apps.apple.com/sa/app/%D8%A7%D9%84%D8%AA%D9%81%D8%B3%D9%8A%D8%B1-%D8%A7%D9%84%D8%AA%D9%81%D8%A7%D8%B9%D9%84%D9%8A/id6503959086""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Nuqayah""",
            "developer_name_ar": """نُقاية""",
            "developer_website": """https://nuqayah.com""",
            "categories": ['tafsir'],
        },
        {
            "name_en": """School Mushaf""",
            "name_ar": """المصحف المدرسي""",
            "slug": """school-mushaf""",
            "short_description_en": """تطبيق لتلاوة وتحفيظ سور المنهج الدراسي مع جوائز، تلاوات بصوت مشاهير القراء، وميزات قابلة للتخصيص""",
            "short_description_ar": """تطبيق لتلاوة وتحفيظ سور المنهج الدراسي مع جوائز، تلاوات بصوت مشاهير القراء، وميزات قابلة للتخصيص""",
            "description_en": """An app for reciting and memorizing the Quranic chapters in the official curriculum of Saudi Arabia, Kuwait, Bahrain, and Oman. It allows creating multiple accounts for different educational stages, changing the Quran’s color, listening to recitations by famous Qaris, and earning rewards for completed surahs.""",
            "description_ar": """المنهج الدراسي:
عرض المصحف وفقا للمنهج الدراسي المعتمد من وزارة التعليم لمادة القرآن الكريم.
- المنهج المعتمد لوزارة التعليم بالسعودية
- المنهج المعتمد لوزارة التعليم بالكويت
- المنهج المعتمد لوزارة التعليم بالبحرين
- المنهج المعتمد لوزارة التعليم بعمان
حسابات للطلاب والمعلمين:
إنشاء أكثر من حساب في مراحل تعليمية مختلفة في جوال واحد.
منهج التلاوة والحفظ:
تمييز منهج التلاوة والحفظ على مختلف الصفوف والفصول الدراسية.
تلاوات لمشاهير القراء:
تلاوات لأكثر من 10 مشاهير من القراء والسماع لها بالإنترنت وبدونه.
1. الشيخ عبدالرحمن السديس
2. الشيخ سعود الشريم
3. الشيخ إبراهيم الأخضر
4. الشيخ عبدالله بصفر
5. الشيخ محمد أيوب
6. الشيخ علي الحذيفي
7. الشيخ مشاري العفاسي
8. الشيخ ماهر المعيقلي
9. الشيخ محمد المنشاوي
10. الشيخ محمد المنشاوي وأطفال
11. الشيخ خليفة الطنيجي
12. الشيخ أحمد العجمي
تصميم جذاب:
يتناسب مع الأطفال في المراحل الدراسية المبكرة.
تغيير لون المصحف:
4 ألوان مختلفة لصفحات المصحف تتلائم مع جميع الأذواق.
إنجازاتي:
جوائز تشجيعية للسور التي أكمل الطالب تلاوتها وحفظها.
خدمة التحفيظ:
تسهيل عملية حفظ الآيات من خلال تكرارها.
الفاصلة:
حفظ آخر موضع انتهى فيه الطالب من التلاوة أو الحفظ.""",
            "avg_rating": 4.6,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 27,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/59_School Mushaf/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/59_School Mushaf/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/59_School Mushaf/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.devlabs.quran""",
            "app_store_link": """https://apps.apple.com/us/app/id1177013583""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Arabia IT""",
            "developer_name_ar": """شركة الدار العربية""",
            "developer_website": """https://arabia-it.com/""",
            "categories": ['memorize', 'mushaf', 'kids'],
        },
        {
            "name_en": """School Mushaf - Sign Language""",
            "name_ar": """المصحف المدرسي الإشاري""",
            "slug": """school-mushaf---sign-language""",
            "short_description_en": """منهج القرآن الكريم المعتمد للطلبة الصم (العوق السمعي) بلغة الإشارة""",
            "short_description_ar": """منهج القرآن الكريم المعتمد للطلبة الصم (العوق السمعي) بلغة الإشارة""",
            "description_en": """Reference School Quran
The Noble Qur’an curriculum approved by the Ministry of Education in Saudi Arabia for the elementary, intermediate and secondary levels for deaf students (hearing impairment) in sign language.
He reviewed the work:
Issam Abdullah Al-Fraih
Abdullah Saad Al-Shuraimi
Awatef Abdulaziz Al Twaim
Fatma Osman Baojeh
Sign language translation
Abdul Wahab Abdulrahman Al-Babtain
Accounts for students and teachers:
Creating more than one account in different educational stages in one mobile phone.
Method of recitation and memorization:
Distinguishing the method of recitation and memorization in the various classes and classes.
Recitations by Famous Reciters:
Recitations by more than 10 famous readers, and listened to online and offline.
1. Sheikh Abdulrahman Al-Sudais
2. Sheikh Saud Al-Shuraim
3. Sheikh Ibrahim Al-Akhdar
4. Sheikh Abdullah Basfar
5. Sheikh Muhammad Ayyub
6. Sheikh Ali Al-Hudhaifi
7. Sheikh Mishary Al-Afasy
8. Sheikh Maher Al-Moaikli
9. Sheikh Muhammad Al-Minshawi
10. Sheikh Muhammad Al-Minshawi and children
11. Sheikh Khalifa Al-Tunaiji
12. Sheikh Ahmed Al-Ajmi
Videos:
Sign language videos of the entire curriculum
Attractive design:
It is suitable for children in the early grades.
Changing the color of the Qur’an:
4 different colors for the pages of the Qur’an to suit all tastes.
My Achievements:
Incentive prizes for the suras that the student completed and memorized.
Memorization service:
Facilitate the process of memorizing verses by repeating them.
interval:
Memorizing the last place in which the student completed his recitation or memorization.""",
            "description_ar": """المصحف المدرسي الإشاري
منهج القرآن الكريم المعتمد بوزارة التعليم بالسعودية للمرحلة الابتدائية والمتوسطة والثانوية للطلبة الصم (العوق السمعي) بلغة الإشارة.
قام بمراجعة العمل :
عصام عبدالله الفريح
عبدالله سعد الشريمي
عواطف عبدالعزيز ال تويم
فاطمة عثمان باوجيه
الترجمة بلغة الإشارة
عبدالوهاب عبدالرحمن البابطين
حسابات للطلاب والمعلمين:
إنشاء أكثر من حساب في مراحل تعليمية مختلفة في جوال واحد.
منهج التلاوة والحفظ:
تمييز منهج التلاوة والحفظ على مختلف الصفوف والفصول الدراسية.
تلاوات لمشاهير القراء:
تلاوات لأكثر من 10 مشاهير من القراء والسماع لها بالإنترنت وبدونه.
1. الشيخ عبدالرحمن السديس
2. الشيخ سعود الشريم
3. الشيخ إبراهيم الأخضر
4. الشيخ عبدالله بصفر
5. الشيخ محمد أيوب
6. الشيخ علي الحذيفي
7. الشيخ مشاري العفاسي
8. الشيخ ماهر المعيقلي
9. الشيخ محمد المنشاوي
10. الشيخ محمد المنشاوي وأطفال
11. الشيخ خليفة الطنيجي
12. الشيخ أحمد العجمي
المقاطع المرئية:
مقاطع مرئية لكامل المنهج بلغة الإشارة
تصميم جذاب:
يتناسب مع الأطفال في المراحل الدراسية المبكرة.
تغيير لون المصحف:
4 ألوان مختلفة لصفحات المصحف تتلائم مع جميع الأذواق.
إنجازاتي:
جوائز تشجيعية للسور التي أكمل الطالب تلاوتها وحفظها.
خدمة التحفيظ:
تسهيل عملية حفظ الآيات من خلال تكرارها.
الفاصلة:
حفظ آخر موضع انتهى فيه الطالب من التلاوة أو الحفظ.""",
            "avg_rating": 4.2,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 28,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/60_School Mushaf - Sign Language/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/60_School Mushaf - Sign Language/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/60_School Mushaf - Sign Language/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.devlabs.qurandeaf""",
            "app_store_link": """https://apps.apple.com/us/app/%D8%A7%D9%84%D9%85%D8%B5%D8%AD%D9%81-%D8%A7%D9%84%D9%85%D8%AF%D8%B1%D8%B3%D9%8A-%D8%A7%D9%84%D8%A5%D8%B4%D8%A7%D8%B1%D9%8A/id1538979237""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C103380003""",
            "platform": """cross_platform""",
            "developer_name": """Arabic IT""",
            "developer_name_ar": """الدار العربية""",
            "developer_website": """https://arabia-it.com/""",
            "categories": ['accessibility', 'kids', 'memorize', 'mushaf'],
        },
        {
            "name_en": """Quran Hafs""",
            "name_ar": """مصحف حفص""",
            "slug": """quran-hafs""",
            "short_description_en": """By King Fahd Quran Printing Complex""",
            "short_description_ar": """من مجمع الملك فهد لطباعة المصحف الشريف""",
            "description_en": """This official app from the King Fahd Quran Printing Complex in Al-Madina Al-Munawwara offers an advanced digital experience for reading the Holy Quran. It provides a high-resolution digital copy of Al-Madina Mushaf (Hafs narration) with a user-friendly interface that adapts to various users, supporting both portrait and landscape modes, and zooming up to 4x while maintaining page-flipping functionality.
The app includes advanced features such as multi-bookmarking, simplified tafsir, meanings of uncommon words, advanced search at the verse and word level, audio recitations by five renowned Qaris, repetition mode for memorization, night mode, and synchronization with system dark mode. Users can customize text and background colors, control Quranic text thickness, and adjust interactive elements.
Additional features include spoken tafsir, a comprehensive user guide (both written and animated), visual indicators for Juzz, Hizb, and Sajdah markings, downloadable recitations, and an intuitive interactive index. This makes the app a reliable and comprehensive resource for studying and reflecting on the Quran.""",
            "description_ar": """
يقدم هذا التطبيق الرسمي من مجمع الملك فهد لطباعة المصحف الشريف في المدينة المنورة تجربة رقمية متقدمة لقراءة القرآن الكريم، حيث يوفر نسخة رقمية عالية الدقة من مصحف المدينة النبوية برواية حفص. يتميز التطبيق بواجهة سهلة الاستخدام تتناسب مع مختلف الفئات، مع إمكانية العرض العمودي والأفقي، والتكبير حتى 4x مع الحفاظ على قابلية التصفح.
يحتوي التطبيق على ميزات متقدمة مثل الإشارات المرجعية المتعددة، التفسير المبسط، معاني الكلمات الغريبة، البحث المتقدم على مستوى الآيات والكلمات، التلاوة الصوتية بـ 5 قرّاء، التكرار لتسهيل الحفظ، الوضع الليلي، ودعم المزامنة مع وضع النظام الداكن. كما يتيح تعديل ألوان النصوص والخلفيات، مع إمكانية التحكم في سمك الخطوط القرآنية.
يوفر التطبيق أيضًا خدمات مثل التفسير الصوتي، دليل المستخدم المكتوب والمرئي، عرض علامات الأجزاء والأحزاب والسجدات، وتحميل التلاوات الصوتية، مما يجعله مصدرًا موثوقًا لدراسة القرآن الكريم وتدبره""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 29,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/23_Quran Hafs/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/23_Quran Hafs/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/23_Quran Hafs/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=sa.QuranComplex.QuranHafs""",
            "app_store_link": """https://apps.apple.com/sa/app/quran-hafs-by-kfgqpc/id1616321992""",
            "app_gallery_link": """https://appgallery.huawei.com/app/C110318817""",
            "platform": """cross_platform""",
            "developer_name": """King Fahd Glorious Quran Printing Complex""",
            "developer_name_ar": """مجمع الملك فهد لطباعة المصحف الشريف""",
            "developer_website": """https://qurancomplex.gov.sa/""",
            "categories": ['mushaf', 'tafsir'],
        },
        {
            "name_en": """Tangheem Al Quran""",
            "name_ar": """تنغيم القرآن""",
            "slug": """tangheem-al-quran""",
            "short_description_en": """Mastering 31 Quranic linguistic styles""",
            "short_description_ar": """تطبيق لإتقان 31 أسلوبًا لغويًا قرآنيًا""",
            "description_en": """An app that helps in mastering Quranic linguistic styles such as interrogation, completion, condition, and oath to enhance contemplative reading and aid listeners in understanding verses. It includes 31 linguistic styles, Quran reading, audio recitation, voice recording, and comment adding features.""",
            "description_ar": """تطبيق يُساعدك على أداء الأساليب اللغوية القرآنية كالإستفهام والإتمام والشرط والقسم بما يخدم معنى الآية لتمكين القارئ من القراءة التدبرية ومساعدة المُستمع على فهم الجُملة وتدبرها حيث يتضمن 31 أسلوباً لغوياً مع إمكانية قراءة القرآن الكريم وسماع تلاوة الآية المُختارة وتسجيل الآية بصوتك وإضافة التعليقات""",
            "avg_rating": 5,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 30,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/65_Tangheem Al Quran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/65_Tangheem Al Quran/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/65_Tangheem Al Quran/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.cloudsolutions.tangheem""",
            "app_store_link": """https://apps.apple.com/us/app/id6445980815""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C107843411""",
            "platform": """cross_platform""",
            "developer_name": """مؤسسة تأثير للنشر""",
            "developer_name_ar": """مؤسسة تأثير للنشر""",
            "developer_website": """""",
            "categories": ['tajweed'],
        },
        {
            "name_en": """Tebyan Quran""",
            "name_ar": """مصحف تبيان للصم""",
            "slug": """tebyan-quran""",
            "short_description_en": """Interactive Quran for the deaf with sign language interpretations""",
            "short_description_ar": """مُصحف تفاعلي للصمّ مع تفسير بلغة الإشارة وميزات متقدمة""",
            "description_en": """An interactive Quran designed for the deaf and hearing-impaired, interpreting the chapters of Juz Amma in sign language to help them reflect on and understand the verses. It also allows downloading, saving, and sharing videos, with features like indexing, night reading mode, bookmarks, and precise search.""",
            "description_ar": """مُصحف تفاعلي مخصص للصُمّ ولمن يُعانون من الإعاقة السمعية يقوم بتفسير سور جزء عم بلغة الإشارة ليتمكنوا من تدبر الآيات وفهم معانيها مع إمكانية تنزيل المرئيات وحفظها ومشاركتها كما يتميز بنظام الفهرسة وخاصية القراءة الليلية والفواصل والمفضلة والبحث الدقيق""",
            "avg_rating": 4.7,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 31,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/56_Tebyan Quran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/56_Tebyan Quran/cover_photo_ar.jpeg""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/56_Tebyan Quran/cover_photo_ar.jpeg""",
            "google_play_link": """https://play.google.com/store/apps/details?id=online.smartech.tebyan""",
            "app_store_link": """https://apps.apple.com/us/app/id1601962979""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C105200513""",
            "platform": """cross_platform""",
            "developer_name": """Liajlehum""",
            "developer_name_ar": """جمعية لأجلهم لخدمة الأشخاص ذوي الإعاقة""",
            "developer_website": """https://www.liajlehum.org.sa""",
            "categories": ['accessibility', 'mushaf', 'tafsir'],
        },
        {
            "name_en": """Quran Warsh""",
            "name_ar": """مصحف ورش""",
            "slug": """quran-warsh""",
            "short_description_en": """By King Fahd Quran Printing Complex""",
            "short_description_ar": """من مجمع الملك فهد لطباعة المصحف الشريف""",
            "description_en": """An app featuring a high-quality digital version of the Madani Mushaf in the Warsh narration, including the reason for naming each surah, its place and order of revelation, the number of verses, simplified interpretation, search capabilities, and options to view the Quran in portrait or landscape mode. It also includes automatic page flipping, reading progress tracking, and audio recitations, published by the King Fahd Complex for the Printing of the Holy Quran in Madinah.""",
            "description_ar": """تطبيق يتضمن نسخة رقمية بدقة عالية من مصحف المدينة النبوية برواية ورش كما يشمل على سبب تسمية كل سورة ومكان نزولها وترتيب نزولها وعدد آياتها مع التفسير الميسر وإمكانية البحث وعرض المصحف بشكل طولي أو عرضي وتقليب الصفحات بشكل تلقائي ومتابعة ورد القراءة وسماع تلاوة الآيات ، صادر عن مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة""",
            "avg_rating": 4.6,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 32,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/62_Quran Warsh/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/62_Quran Warsh/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/62_Quran Warsh/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=sa.QuranComplex.QuranWarsh""",
            "app_store_link": """https://apps.apple.com/us/app/id1603047183""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """King Fahd Glorious Quran Printing Complex""",
            "developer_name_ar": """مجمع الملك فهد لطباعة المصحف الشريف""",
            "developer_website": """https://qurancomplex.gov.sa/""",
            "categories": ['riwayat', 'mushaf', 'tafsir'],
        },
        {
            "name_en": """Quranic Recitations Collection""",
            "name_ar": """جامع التلاوات القرآنية""",
            "slug": """quranic-recitations-collection""",
            "short_description_en": """Quran listening with 900+ reciters""",
            "short_description_ar": """الاستماع إلى القرآن بأكثر من 900 قارئ""",
            "description_en": """An app for listening to the recited Quran by over 900 renowned reciters worldwide in various narrations. It offers background playback, offline downloads, a 50-language interface, voice commands for selection, and accessibility features for the visually impaired.""",
            "description_ar": """تطبيق للاستماع إلى المصحف المُرتل بصوت أكثر من 900 قارئ من مشاهير القراء حول العالم بالروايات المختلفة مع إمكانية استماع التلاوات بالخلفية وتنزيل السور لسماعها لاحقاً دون إتصال بالإنترنت بالإضافة إلى ترجمة الواجهة إلى 50 لغة وميزة الأوامر الصوتية لاختيار القارئ والرواية والسورة مع نظام خاص بالمكفوفين وضعاف البصر""",
            "avg_rating": 4.6,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 33,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/70_Quranic Recitations Collection/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/70_Quranic Recitations Collection/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/70_Quranic Recitations Collection/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.quranic_recitations_collection""",
            "app_store_link": """https://apps.apple.com/us/app/id1508164317""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C105038817""",
            "platform": """cross_platform""",
            "developer_name": """Quranic Recitations Collection""",
            "developer_name_ar": """جامع التلاوات القرآنية""",
            "developer_website": """https://zekr.online""",
            "categories": ['audio', 'riwayat', 'translations'],
        },
        {
            "name_en": """Kaedat Alnoor""",
            "name_ar": """قاعدة النور""",
            "slug": """kaedat-alnoor""",
            "short_description_en": """Noorani Qaida and Arabic alphabet""",
            "short_description_ar": """تعليم القاعدة النورانية""",
            "description_en": """An app to teach the Noorani Qaida and Arabic alphabet in an easy and accessible way, with audio explanations and repetition features, aimed at children, school students, memorization circles, and non-Arabic speakers.""",
            "description_ar": """تطبيق لتعليم القاعدة النورانية والحروف الهجائية بطريقة سهلة وميسرة مع الشرح الصوتي وإمكانية التكرار وهو موجه إلى النشء وطلاب المدارس وحلقات التحفيظ وغير الناطقين باللغة العربية""",
            "avg_rating": 4.6,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 34,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/64_Kaedat Alnoor/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/64_Kaedat Alnoor/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/64_Kaedat Alnoor/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=xsupermu.iesnaad.alnour""",
            "app_store_link": """https://apps.apple.com/us/app/id1594371615""",
            "app_gallery_link": """https://appgallery.huawei.com/#/app/C105336263""",
            "platform": """cross_platform""",
            "developer_name": """Jabal Al-Noor Scientific Complex in Makkah""",
            "developer_name_ar": """مجمع جبل النور العلمي بمكة المكرمة""",
            "developer_website": """""",
            "categories": ['tajweed'],
        },
        {
            "name_en": """Amazighi Quran""",
            "name_ar": """المصحف الأمازيغي""",
            "slug": """amazighi-quran""",
            "short_description_en": """Muhammadi Mushaf with a narration of Warsh""",
            "short_description_ar": """المصحف المحمدي برواية ورش""",
            "description_en": """The Amazigh Qur’an has advanced capabilities and many advantages, through which you can read, hear and memorize the Noble Qur’an from the Muhammed Qur’an with the narration of Warsh or from the Medina Qur’an with the narration of Warsh via Al-Asbahani. The application also allows interpretation in Arabic and translation of the meanings of the Noble Qur’an in French. And the application is designed in calm colors that are easy on the eye.
The Amazigh Qur’an: Your companion in reading and contemplating the Holy Qur’an
====================
*** Possibilities and characteristics of the application: ***
- Reading the Holy Qur’an from the Mushaf Muhammadi with a narration of Warsh.
Reading the Noble Qur’an from the Mushaf of Al-Madina with the narration of Warsh by Al-Asbahani.
- A quick search in the texts of the Qur’an, the names of the surahs, or the page numbers.
Show search results with the name of the surah and the page number on which the search word is located.
Presentation of the translation of the meanings of the Noble Qur’an in French from the most authentic translations.
- Listening to the selected verse or verses in the voice of your favorite reciter from among the famous reciters in Warsh’s narration, with highlighting the recited verses to read them while listening.
- Possibility to download a surah or a complete Qur’an for offline listening.
- Automatic replay options to listen to a surah or a specific part of it, or to repeat the passage or verse one or more times, or to specify the recitation by a desired time period.
- Easy and quick transition in the index between chapters and parts.
- Move between pages by flipping or shifting.
Mark the page with commas for easy reference.
- Writing down thoughts on the verses and reflecting while reading and listening, and keeping them in the application's archives.
- The possibility of copying the verse and sharing it with others, in text form or as an image.
- Smooth user interface in Arabic and French.""",
            "description_ar": """تطبيق موثوق يحتوي على المصحف المحمدي برواية ورش بإمكانيات متطورة: صفحات المصحف بجودة عالية، تلاوات أكثر من 200 قارئ، التفسير، الترجمة، مكتبة المصاحف، إدارة التحميلات
المصحف الأمازيغي بإمكانيات متطورة ومميزات عديدة، حيث يمكنك من خلاله قراءة وسماع وحفظ القرآن الكريم من المصحف المحمدي برواية ورش أو من مصحف المدينة برواية ورش عن طريق الأصبهاني، كما يتيح التطبيق التفسير باللغة العربية وترجمة معاني القرآن الكريم باللغة الفرنسية. وتم تصميم التطبيق بألوان هادئة مريحة للعين.
المصحف الأمازيغي: صاحبك في قراءة وتدبر القرآن الكريم
====================
إمكانيات وخصائص التطبيق:
- قراءة القرآن الكريم من المصحف المحمدي برواية ورش.
قراءة القرآن الكريم من مصحف المدينة برواية ورش عن طريق الأصبهاني.
- بحث سريع في نصوص القرآن أو أسماء السور أو أرقام الصفحات.
- إظهار نتائج البحث مع اسم السورة ورقم الصفحة الموجود بها كلمة البحث.
- عرض ترجمة معاني القرآن الكريم باللغة الفرنسية من أوثق الترجمات.
- الاستماع إلى الآية أو الآيات المختارة بصوت قارئك المفضل من بين مشاهير القرّاء برواية ورش، مع تظليل الآيات المتلوة لمطالعتها أثناء الاستماع.
- إمكانية تحميل سورة أو مصحف كامل للاستماع دون الاتصال بالإنترنت.
- اختيارات الإعادة التلقائية للاستماع إلى سورة أو جزء محدد منها، أو ترديد المقطع أو الآية مرة أو أكثر، أو تحديد التلاوة بمقدار زمني مرغوب.
- الانتقال السهل والسريع في الفهرس بين السور والأجزاء.
- الانتقال بين الصفحات بالتقليب أو الإزاحة.
- تمييز الصفحة بفواصل لسهولة الرجوع إليها.
- تدوين خواطر على الآيات والتدبُّر أثناء القراءة والاستماع، وحفظها في محفوظات التطبيق.
- إمكانية نسخ الآية ومشاركتها مع الآخرين، بشكل نصي أو كصورة.
- واجهة استخدام سلسة باللغتين العربية والفرنسية.""",
            "avg_rating": 5,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 35,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/81_Amazighi Quran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/81_Amazighi Quran/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/81_Amazighi Quran/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=online.smartech.quran.amazighi""",
            "app_store_link": """https://apps.apple.com/us/app/id6446277639?l=ar""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Quran Audio Library""",
            "developer_name_ar": """المكتبة الصوتية للقرآن الكريم""",
            "developer_website": """https://mp3quran.net""",
            "categories": ['riwayat', 'mushaf', 'tafsir', 'translations', 'audio'],
        },
        {
            "name_en": """Quran Indonesia Kemenag koran""",
            "name_ar": """المصحف الإندونيسي""",
            "slug": """quran-indonesia-kemenag-koran""",
            "short_description_en": """Comprehensive Quran app""",
            "short_description_ar": """تطبيق متكامل للقرآن الكريم""",
            "description_en": """QURAN INDONESIA is an integrated project for the holy Quran initiated by Qaf Group. This project is available in Android, iOS, web, and print formats.
The Qur'anic verses in this application use the Indonesian Rasm Usmani Standard Mushaf by the Ministry of Religion c.q. Lajnah Pentashihan Mushaf Al-Qur'an. In addition to presenting the complete 30 juz of the Qur'anic text and pages of the Qur'an from three editions of the Qur'an (Kemenag, and the Madina version), this application is also equipped with several translations, and interpretations of the Quran.
Murattal recitations of more than 20 Quran reciters also have been added. Reciters were selected who are experts in the field of qiraat and have beautiful voices.
●●● APP FEATURES ●●●
● QURAN VERSES
The text of the Qur'anic verses used in this application is available in two types: 1) Image copy (scanned from Rasm Usmani's Indonesian Standard Al-Qur'an Mushaf, and King Fahad Complex copy of Mushaf al-Madinah) and 2) The text of the Qur'anic verses using the LPMQ Isep Misbah font. The source and shape of the Arabic letters and numbers in this font comes from the handwriting of calligrapher H. Isep Misbah, MA, which was developed by the LPMQ IT Team.
● TAFSIR AL-QURAN
Learn the meaning of the verses of the Quran from the selected books of interpretations: Tahlili, Wajiz, and Mukhtasar.
● QURAN TRANSLATION
Translation of the meaning of the verses of the Quran in Indonesian, including version 2002 and 2019 of the translation of the Quran by the Ministry of Religion, translation by the Sabiq company, and others.
● RECITATIONS
Listening to the recitation of the Quran by famous reciters, while highlighting the verse being recited.
● ADVANCED AND SMART SEARCH
A fast and smart search including searching for verses, surah names and page numbers.
● BOOKMARK
Add a bookmark to help you continue reading or memorising.
● ADD THOUGHTS AND NOTES
Write thoughts on the verses, to learn while reading and listening, and save them for later.
● FAVORITES
Save verses in favourites for ease of return and reference.
● LIBRARY
Selecting various versions of the Qur'an from three editions of the Qur'an (Ministry of Religion, and the King Fahad Complex version), translations, interpretations and asbab nuzul.
● SHARE
The possibility of sharing the verse as text or image, sharing interpretations and translations.
● SETTINGS
Switch between interface languages, manage downloads and notes, and change the app style.
● OTHER FEATURES
Unique design, Memorising the Holy Quran through repetition of verses, and Night mode.
● VERSIONS
iOS app (iPhone & iPad), Android and print-ready PDF.
- Free and ads-free
- Special design inspired from Indonesia cluture
- Light and Dark themes
Comprehensive app fulfilling all you need in a Quran app: read, listen, memorise and contemplate the Holy Quran.""",
            "description_ar": """تطبيق متكامل للقرآن الكريم: المصحف الإندونيسي، والترجمات والتفاسير والقراء
المصحف الإندونيسي هو مشروع متكامل للقرآن الكريم تم إنشاؤه بواسطة مجموعة قاف للدراسات والترجمة والتقنية والنشر. هذا المشروع متاح على آي أو إس والويب وبشكل ملف جاهز للطباعة، وعلى المنصات الأخرى.
الآيات القرآنية في هذا التطبيق مبني على مصحف رسم عثماني القياسي الإندونيسي من قبل وزارة الشؤون الدينية الإندونيسية. يقدم التطبيق القرآن الكريم بشكل نصي بالإضافة إلى صفحات القرآن من ثلاث طبعات من القرآن (وزارة الشؤون الدينية الإندونيسية، ومصحف المدينة النبوية)، بالإضافة إلى العديد من الترجمات والتفاسير باللغة الإندونيسية.
يتيح التطبيق تلاوات أكثر من 20 قارئًا من مشاهير القراء، ذوي الخبرة في مجال القراءات وذوي الأصوات الجميلة.
●●● ميزات التطبيق ●●●
●المصاحف الموجودة في التطبيق
الآيات القرآنية المستخدمة في هذا التطبيق متاح بشكل نصي وبشكل مصور: 1) النسخة المصورة، تم مسحها ضوئيًا من المصحف الإندونيسي الرسمي بالرسم العثماني، ومصحف المدينة طبعة مجمع الملك فهد، و 2) نص الآيات القرآنية مكتوبة باستخدام الخط LPMQ Isep Misbah، بخط الخطاط H. Isep Misbah، MA، والتي طورها فريق تكنولوجيا المعلومات في LPMQ.
● التفاسير
تعلُّم معاني آيات القرآن من خلال تفاسير عدة: التحليلي والوجيز والمختصر.
● ترجمات المعاني
عرض ترجمات معاني القرآن الكريم باللغة الإندونيسية: ترجمة وزارة الشؤون الإسلامية الإندونيسية إصدار 2002 و 2019، ترجمة شركة سابق، وغيرهم.
● التلاوات الصوتية
الاستماع إلى تلاوات القرآن بصوت عدد من مشاهير القُراء، مع تظليل الآيات المتلوة.
● البحث المتقدم والذكي
بحث سريع وذكي في كامل المصحف، يجمع بين البحث في الآيات وأسماء السور، وحتى الانتقال السريع بأرقام الصفحات.
● العلامات المرجعية
وضع فواصل لمساعدتك على قراءة الورد اليومي أو ختمة الحفظ.
● إضافة الخواطر وتدوين التدبرات
تدوين خواطر على الآيات، للتدبُّر أثناء القراءة والاستماع، وحفظها في محفوظات التطبيق.
● المفضلة
حفظ عدد من الآيات في المفضلة لسهولة العودة إليها في أي وقت.
● المكتبة
اختيار نسخ مختلفة من القرآن من ثلاث طبعات من القرآن (وزارة الشؤون الدينية، ومصحف المدينة)، بالإضافة إلى اختيار الترجمات والتفاسير من بين الكتب المتاحة في المكتبة الخاصة بالتطبيق.
● المشاركة
إمكانية مشاركة الآية بالنص أو بالصورة، ومشاركة التفسير والترجمة.
● الإعدادات
إدارة التحميلات، والفواصل والملاحظات، واختيار نظام ألوان التطبيق بين الفاتح والداكن.
● وخصائص أخرى
تصميم قرآني فريد وخاص، تحفيظ القرآن الكريم من خلال خاصية تكرار آية أو عدد من الآيات، والقراءة الليلة.
● الإصدارات
تطبيق على الأنطمة المختلفة ومنها بنظام آي أو إس (لأجهزة الآيفون والأيباد) بالإضافة إلى النسخة الجاهزة للطباعة.
- مجاني بدون أي إعلان
- تصميم خاص لهذا المصحف
- مع المظهر الفاتح والداكن.
● الزخارف
لكل أمة سيرة وحكاية تخلدها بفنونها وتراثها الشعبي، وحبًّا منا ومودةً لإخواننا مسلمي إندونيسيا، صممنا هذه النسخة المتميزة من القرآن الكريم وترجمة معانيه إلى اللغة الإندونيسية بشكلَيها الإلكتروني والمطبوع. وقد استوحينا زخارفها من الزخارف التقليدية الشعبية المستخدمة في فن النقش على القماش في إندونيسيا، والذي يسمى 'الباتيك' الذي تُصنع منه الملابس الفاخرة والمفروشات الراقية، ويعتبر هذا الفن من الفنون العريقة المتأصلة في التراث الشعبي الإندونيسي، حيث يتميز بالجمال والدقة في النقش والطباعة واختيار الألوان، وله مكانة عالية في نفوس أهل البلد.
إن هذه النسخة الكريمة هدية غالية لإخواننا مسلمي إندونيسيا، ذلك الشعب الطيب المتمسك بدينه وعقيدته، والمعروف بحبه للقرآن الكريم، ليتيسر له قراءة القرآن وتلاوته وفهم معانيه.
وقد تمّ تلوين زخارف هذه النسخة بمزيج من الألوان الرائعة والزاهية التي تغلب عليها ألوان الطبيعة الخلاّبة، ليصنع منها مصممنا المبدع نسخة مميزة بِهوية إندونيسية، وبطابع زخرفي إسلامي بديع.
تطبيقك القرآني، وكل ما تحتاجه من قراءة واستماع وحفظ وتلاوة القرآن الكريم في تطبيقك""",
            "avg_rating": 4.2,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 36,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/82_Quran Indonesia Kemenag koran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/82_Quran Indonesia Kemenag koran/cover_photo_en.jpeg""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/82_Quran Indonesia Kemenag koran/cover_photo_ar.jpeg""",
            "google_play_link": """https://play.google.com/store/apps/details?id=online.smartech.indonesia_quran""",
            "app_store_link": """https://apps.apple.com/us/app/id1570797810""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Qaf Group for Research, Translation, Publication, and IT Solutions""",
            "developer_name_ar": """مجموعة قاف للدراسات والترجمة والتقنية والنشر""",
            "developer_website": """https://www.qafgroup.net""",
            "categories": ['translations', 'mushaf', 'tafsir'],
        },
        {
            "name_en": """Convey""",
            "name_ar": """بلغوا""",
            "slug": """convey""",
            "short_description_en": """Facilitate the spread and conveyance of Allah's Book""",
            "short_description_ar": """تسهيل نشر وتبليغ كتاب الله""",
            "description_en": """We aim at facilitating the spread and conveyance of Allah's Book (i.e. the Quran), so help us by conveying even a single Verse.
​
Students of knowledge, preachers, Da`wah centers, and charitable bodies face various problems and difficulties to spread Quranic Verses via social media. This is due to the interest of users, particularly the youth and the new generations, in the quality and beauty of the design at the expense of the content. As a result, some students of knowledge and preachers began to use design software such as Photoshop, while others hired professional designers and provide them with data for which the designer creates a beautiful design and then posts it on social media. In fact, this matter costs monthly payments as salaries for the designers, beside a significant waste of time and effort. That is why we have developed Balligho App. The name is derived from the Prophetic hadith in which Allah’s Messenger said, 'Convey (Arabic: Balligho) from me (to people) even a (single) Verse…' The word 'Balligho (i.e. Convey)' is a great and authentic principle of Islam, which urges to conveying Allah’s approach to the world. The Arabic verb 'Balligho' (i.e. convey) is a command of the Prophet to us to convey from him even a single Verse to the world. Complying to such a command helps us attain the great determination, vigor and ambition necessary for learning. After studying the needs of a group of various users (such as, students of knowledge, preachers, Da`wah centers, the elderly, general user, and initiatives and accounts posting Quranic Verses on social media), we concluded that all Quran-related Apps supporting the service of sharing Verses through social media are not sufficiently advanced, and thus they do not meet the purposes required. Balligho is an App aimed at facilitating the conveyance of even a single Verse of the Quran to the whole world in a modern, creative way via various social media. The App is user-friendly and suits all ages and scientific backgrounds. The most important features and services of the App include:
​
Providing more than 300 high quality images for various topics and events.
Quick search in the whole Verses of the Quran.
The ability to share Noor International English, French, Spanish and Latin translations of the Noble Quran.
The ability to edit the designs of posts before sharing them.
The ability to change font size.
The ability to colors of Verses, texts and translations.
Furnished with various filters.
The ability to select an image from your own gallery.
The ability to share cards via social media in all sizes.""",
            "description_ar": """تطبيق بلغوا
هدفنا تسهيل نشر وتبليغ كتاب الله، فساهم معنا ولو بآية واحدة
يواجه طلبة العلم والدعاة ومكاتب الدعوة والجهات الخيرية صعوبة في نشر الآيات القرآنية في وسائل التواصل الإجتماعي الحديثة وذلك لإهتمام المستخدمين وخاصة الشباب والجيل الجديد في جودة وجمال التصميم قبل النظر في المحتوى، فبدأ بعض طلبة العلم والدعاة باستخدام بعض برامج التصميم كالفوتوشوب وغيرها وقام البعض الآخر بتوظيف المصممين ومن ثَّم تزويدهم بالبيانات ويقوم المصمم بتصميمها ومن ثم نشرها. وهذا الأمر يكلفهم مبالغ دورية كرواتب للمصممين على سبيل المثال وكذلك إهدار كبير في الجهد والوقت . فوقع الاختيار في 'بلغوا' ليكون اسمًا للتطبيق، وذلك من حديث رسول الله صلى الله عليه وسلم حيث قال: ))بلغوا عني ولو آية((. فلكلمة'بلغوا' معنى أصيل وعظيم من أصول الإسلام، وهو تبليغ منهج الله للعالم. وجاءت'بلغوا' كفعل أمر؛ أي: أن رسول الله صلى الله عليه وسلم يأمرنا أن نُبلِّغَ ولو آيةً واحدة، فعندما تُبلِّغُ ولو آية واحدة تصبح لديك الهمة العالية والطموح للفعل وللتعلُّم . وبعد دراسة لمجموعة مختلفة من المستخدمين )كطلبة العلم، والدعاة والمتخصصين، والمكاتب ومراكز الدعوة، وكبار السن، وعامة المستخدمين، وكذلك المبادرات والحسابات التي تنشر الآيات القرآنية في وسائل التواصل الاجتماعي( ودراسة احتياجاتهم وجدنا أنه مع موجود تطبيقات القرآن المختلفة والتي تدعم خدمة مشاركة الآيات عبر وسائل التواصل الاجتماعي، إلا أنها تعتبر بدائية وليست متطورة بالحد الكافي ولا تفي بالغرض المطلوب. لذا نهدف من خلال تطبيق 'بلغوا' تسهيل نشر وتبليغ كتاب الله ولو بآية واحدة بطريقة حديثة إبداعية عبر وسائل التواصل الاجتماعي المختلفة. فصممنا التطبيق ليكون سهل الإستخدام وليتناسب مع جميع الفئات العمرية والعلمية. ومن أهم مزايا وخدمات التطبيق:
أكثر من 300 صورة عالية الجودة في مختلف المواضيع والمناسبات.
البحث السريع في آيات القرآن الكريم كاملة.
إمكانية مشاركة ترجمات مركز نور إنترناشيونال للقرآن الكريم لكل من اللغة الإنجليزية والفرنسية والأسبانية واللاتينية.
إمكانية التحكم في تصميم المنشور قبل مشاركته.
تكبير وتصغير الخطوط.
تغيير ألوان الآيات القرآنية والترجمات وكذلك النصوص.
فلاتر متنوعة.
إمكانية اختيار صورة من ألبوم الصور الخاص بك.
المشاركة في جميع وسائل التواصل الإجتماعي وبمختلف المقاسات.""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 37,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/47_Convey/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/47_Convey/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/47_Convey/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.arabia_it.ballegho""",
            "app_store_link": """https://apps.apple.com/sa/app/%D8%A8%D9%84%D8%BA%D9%88%D8%A7-convey/id1463949765""",
            "app_gallery_link": """https://appgallery.huawei.com/app/C102028881""",
            "platform": """cross_platform""",
            "developer_name": """Noor International""",
            "developer_name_ar": """نور إنترناشيونال""",
            "developer_website": """https://noorinternational.net""",
            "categories": ['tools'],
        },
        {
            "name_en": """Salem""",
            "name_ar": """سالم""",
            "slug": """salem""",
            "short_description_en": """Arabic letters and Al-Fatihah""",
            "short_description_ar": """حروف العربية والفاتحة للأطفال""",
            "description_en": """The journey of the hero Salem to recover the boxes of light that contain Arabic letters and also Surat Al-Fateha
Introduction to the application
It is an application that aims to teach children how to pronounce Arabic letters and words until how to recite Surat Al-Fatihah .. within an interesting story for children, using of the state of the art Artificial Intelligence techniques of Speech Recognition with automatic correction for the child when reading the letters and words or when reciting Surat Al-Fatehah
The main idea of the application
The application is in the form of a story that revolves around a hero named (Salem), a sports hero who enjoys high energy, intelligence and good manners. Through the application, he seeks to recover the boxes of light that were stolen by a group of evil creatures and flew those creatures to the forest. The hero accompanies his friend ( a funny bird ) on a journey full of excitement to recover the boxes.
During the Hero's journey, he learns Arabic letters and words, plays various games, and then at the end of his journey he learns to recite the Al-Fatehah
Application contents
* Levels of graduated difficulty
* Interesting educational lessons
* Fun and useful animations
* Lots of of games
* and more""",
            "description_ar": """رحلة البطل سالم لاستعادة صناديق النور التي بها الحروف العربية وأيضا سورة الفاتحة
التعريف بالتطبيق
هو تطبيق يستهدف تعليم الأطفال كيفية نطق الحروف والكلمات العربية حتى الوصول إلى تعليم تلاوة سورة الفاتحة .. وذلك في إطار قصصي مشوق وممتع للأطفال ، مع استخدام أحدث ما توصلت إليه تقنيات الذكاء الاصطناعي للتعرف على الصوت ( Speech Recognition ) مع التصحيح الآلي للطفل عند قراءته للحروف الكلمات أو عند تلاوته لسورة الفاتحة
الفكرة الرئيسية للتطبيق
التطبيق في شكل قصة تدور حول بطل اسمه ( سالم ) وهو بطل رياضي يتمتع بعلو الهمة والذكاء وحسن الخلق ، يسعى خلال التطبيق في استعادة صناديق النور التي سرقتها مجموعة من الكائنات الشريرة وطارت بتلك الصناديق إلى الغابة ، فيصاحب البطل صديقه الطائر في رحلة مليئة بالإثارة والتشويق ليستعيد الصناديق
وفي خلال رحلة الطفل يتعلم الحروف والكلمات العربية ، ويمارس مختلف الألعاب ، ثم في نهاية رحلته يتعلم تلاوة سور الفاتحة
محتويات التطبيق
* مستويات متدرجة في الصعوبة
* دروس تعليمية شيقة
* رسوم متحركة ممتعة ونافعة
* ألعاب متنوعة كثيرة
* وغير ذلك""",
            "avg_rating": 4.3,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 38,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/67_Salem/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/67_Salem/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/67_Salem/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.tafseer.salem""",
            "app_store_link": """https://apps.apple.com/us/app/id1623387105""",
            "app_gallery_link": """https://appgallery.huawei.com/app/C106124481""",
            "platform": """cross_platform""",
            "developer_name": """AL BORHAN CHARITY FOR SUNNAH & QURAN SERVICES""",
            "developer_name_ar": """جمعية البرهان لخدمة السنة والقرآن""",
            "developer_website": """https://www.alborhan.sa""",
            "categories": ['kids', 'memorize'],
        },
        {
            "name_en": """Telawa Warsh""",
            "name_ar": """مصحف التلاوة ورش""",
            "slug": """telawa-warsh""",
            "short_description_en": """القرآن برواية ورش عن نافع""",
            "short_description_ar": """القرآن برواية ورش عن نافع""",
            "description_en": """A comprehensive and developed version of the Holy Quran Audio Library (Quran website and application) dedicated to smart phones to read the Holy Quran and listen to its recitations from the Qur'an and workshops.
Within stylish designs in 4 different colors, of them two for night reading mode, lets see the manual in the interpretation of the Holy Quran.
The application has the most advantages of the 'electronic Koran' ... where the interface easy to use, the ability to read the Koran and flip pages with one of the offset and flipping and choose not to close the screen while reading, quick search possibilities in words, see interpretation, and add your comments on the verses while reading or listening, With the listening feature for a certain amount of sura and repeating the section with a specified number of times, to be set to review and install the save.
Updates for the second version of the application:
(Ramadan 1440 - May 2019)
> Content extensions:
* Add 3 translations of other meanings.
* Addition of 3 other interpretations (other than 'the abbreviated in the interpretation of the Koran, interpretation facilitated, Tafsir Jalalain, interpretation of the statement of the meanings of the Koran,' the summary of Fatah al-Rahman in the interpretation of the Koran ').
 
> Browsing:
* Automatic page navigation (page by page without interruption) in Landscape mode, with the ability to adjust its speed.
* Show the audio player from the Notification Bar notification list, with the listening feature and playback control.
* Improvements in the way the verse is shared or a set of verses.
 
> Breaks:
* Add a break that goes from one verse to another and does not repeat, to find out where to stop when reading.
* Add a save interval, you can add more than one interval to save.
 
> Listen System Improvements:
* Press the Stop button when you want to exit the audio player.
* Improved fonts and icons.
* When listening to any verse starts playback.
* Repeats a section or repeat the verse with the number of times the frequency is increased or decreased with the signs (+) and (-), and the possibility of canceling the activation, by clicking the repeat icon again.
 
> Add Upload Manager:
* Possibility to download a full Quran once, and listen to it without Internet.
* Delete audio files that you do not want to keep.
 
> Add a daily reminder to the Holy Quran:
* Daily alert by reading roses comes out twice a day randomly.
* Daily alert is a short advice or phrase to urge reading the Koran.
Key application possibilities and options:
● Reading the Quran from the Koran and novel workshops.
● Listen to the verse or verses selected.
● Listen to a certain amount of sura and repeat the section with a specified number of times.
● Index of the names of the walls and parts, for easy and quick access to the required part.
● High-speed search of words to reach any verse or word easily.
● Choose a number of verses in the 'Favorites' to quickly return to them.
● Breaks to set the stop position for finished reading, for easy return to follow your daily response.
● Offer a simplified interpretation of the verses from the book 'Al-Maqtas in the interpretation of the Holy Quran', next to each verse, with the possibility of copying and sharing with others.
● Verse options: Take notes and thoughts to help you master while reading, listening or reading the explanation, copying and sharing the verse with others.
● English translation of the meaning of the Koran from the international version of 'saheeh International'.
● Available in a smooth interface in both Arabic and English.""",
            "description_ar": """نسخة شاملة ومطورة من المكتبة الصوتية للقرآن الكريم (موقع وتطبيق MP3 Quran) مخصص للهواتف الذكية لقراءة القرآن الكريم والاستماع إلى تلاواته من مصحف ورش .يُعد هذا التطبيق مكتبة صوتية متكاملة للاستماع إلى تلاوات القرآن الكريم بترتيل مئات من مشاهير وأعلام القُراء في العالم الإسلامي. ويُقدم ضمن تصميمات أنيقة في 4 ألوان مختلفة، منهم اثنان لوضع القراءة الليلية، ويتيح الاطلاع على المختصر في تفسير القرآن الكريم.
التطبيق يتمتع بأغلب مزايا 'المصحف الإلكتروني'... حيث واجهة استخدام سهلة، إمكانية قراءة المصحف وتقليب صفحاته بإحدى خاصيتي الإزاحة والتقليب واختيار عدم إغلاق الشاشة أثناء القراءة، إمكانيات بحث سريعة بالكلمات، الاطلاع على التفسير، وإضافة ملاحظاتك على الآيات أثناء القراءة أو الاستماع، مع خاصية الاستماع لقدر معين من السورة وترديد المقطع بعدد مرات محددة، ليعين على المراجعة وتثبيت الحفظ.
إمكانيات وخيارات التطبيق:
قراءة القرآن الكريم من مصحف رواية ورش.
الاستماع إلى الآية أو الآيات المختارة بصوت قارئك المفضل من بين مئات من مشاهير وأعلام القُراء .
الاستماع لقدر معين من السورة وترديد المقطع بعدد مرات محددة
فهرس بأسماء السور والأجزاء، لسهولة وسرعة الوصول للجزء المطلوب .
بحث فائق السرعة بالكلمات للوصول إلى أي آية أو كلمة بسهولة.
اختيار عدد من الآيات في 'المفضلة' لسرعة العودة إليها.
فواصل لتعيين موضع الوقف عن الانتهاء من القراءة، لسهولة العودة لمتابعة وردك اليومي.
عرض تفسير مُيسّر للآيات من كتاب 'المختصر في تفسير القرآن الكريم'، بجوار كل آية، مع إمكانية نسخه ومشاركته مع الآخرين.
خيارات الآيات: تدوين الملاحظات والخواطر للمساعدة على التدبُّر أثناء القراءة والاستماع أو الاطلاع على التفسير، إمكانية نسخ الآية ومشاركتها مع الآخرين.
ترجمة إنجليزية لمعاني القرآن من نسخة صحيح إنترناشيونال 'saheeh International'
متوفر بواجهة استخدام سلسة باللغتين العربية والإنجليزية.""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 39,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/83_Telawa Warsh/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/83_Telawa Warsh/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/83_Telawa Warsh/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.smartech.quran.mushaf.telawaa.warsh""",
            "app_store_link": """https://apps.apple.com/us/app/id1385695377""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Quran Audio Library""",
            "developer_name_ar": """المكتبة الصوتية للقرآن الكريم""",
            "developer_website": """https://mp3quran.net""",
            "categories": ['riwayat', 'mushaf', 'tafsir', 'translations'],
        },
        {
            "name_en": """Wiqaya""",
            "name_ar": """وقاية اللسان""",
            "slug": """wiqaya""",
            "short_description_en": """Tajweed, correcting pronunciation""",
            "short_description_ar": """الوقاية من اللحن الجلي والخفي""",
            "description_en": """Graduated educational program:
Take care of the prevention of obvious and hidden melody:
First: The learner starts with one page or specific verses, so he listens to the words of protection from a clear melody because it is the most important, and he is the one who takes care of reading the letters and movements correctly without intonation. Then the words of the intermediates, then the words of the advanced ones. (He repeats this several times.)
Each student reads according to his level (the beginner reads the words of all levels, the intermediate reads the words of his level with the words of the advanced students, and the advanced reads the words of the advanced students only), whose level is determined by the tongue guard teacher.
Then the learner chooses an easy intonation sentence at the beginning: such as the stressed noon and meem, while listening to it and practicing pronouncing its examples. (repeat this several times)
Then he listens to the recitation of this page from a reciter from the reading (repeating this several times).
And if he is reciting to a teacher, then the teacher takes care of: the safety of reading from every clear melody, and as for the intonation, he corrects the intonation rule that the student listened to only with what he studied previously, until the student masters the rule he listened to, and thus the rulings are taken gradually, and if he mastered, he moves after him to another rule With him, until the provisions of intonation ends. God bless.""",
            "description_ar": """تطبيق لتعليم تلاوة القرآن الكريم مع أحكام التجويد بطريقة مبتكرة تهدف إلى تصحيح نُطق كلماته وتسهيل قراءتها بشكل سليم خالي من اللحن الجلي والخفي وفق منهج تربوي تعليمي متكامل ومُجرب على ثلاث مراحل عبر أدوات تعليمية سهلة الإستخدام تدعم التعلم الذاتي والتفاعلي لتحقق أفضل النتائج بإتقان وأقل وقت وجهد ممكن""",
            "avg_rating": 4.6,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 40,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/63_Wiqaya/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/63_Wiqaya/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/63_Wiqaya/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.nasaq.wiqaya""",
            "app_store_link": """https://apps.apple.com/us/app/id6448244188?l=ar""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Wiqaya""",
            "developer_name_ar": """وقاية اللسان""",
            "developer_website": """https://wiqayah.net""",
            "categories": ['tajweed', 'mushaf'],
        },
        {
            "name_en": """Study Quran""",
            "name_ar": """تدارس القرآن""",
            "slug": """study-quran""",
            "short_description_en": """Interactive digital Mushaf""",
            "short_description_ar": """مصحف تفاعلي: تدبر، تفسير لكل آية""",
            "description_en": """With an innovative vision and immense effort, we present 'Tadarrus Al-Quran', an interactive Mushaf offering a unique Quranic journey through over 100,000 curated reflections, covering Tafsir, rhetoric, jurisprudence, scientific miracles, and supplications derived from the verses.
The app enables users to engage with the content by adding reflections, commenting, and interacting with insights. It features a vast multimedia library from renowned scholars such as Ibn Baz, Ibn Uthaymeen, and Al-Shinqiti, alongside 27 Tafsir books and direct links to the Durar Al-Sunniyah encyclopedia.
Key Features:
Advanced search in reflections and Tafsir content.
Export insights as PDF or Word files.
Customizable interface with night mode and font options.
Share reflections as graphics with custom backgrounds.
A library of over 2,500 pre-designed reflection graphics.
A dedicated YouTube channel with over 2,200 Tafsir and Tadabbur videos.""",
            "description_ar": """بفكرة إبداعية وجهد هائل، نقدم 'تدارس القرآن'، المصحف التفاعلي الذي يمنحك رحلة قرآنية فريدة من خلال أكثر من 100,000 وقفة تدبرية موزعة على عدة أقسام، تشمل التفسير، البلاغة، الفقه، الإعجاز العلمي، والأدعية المستوحاة من الآيات.
يتيح لك التطبيق التفاعل مع المحتوى، كتابة تأملاتك، التعليق على الوقفات، وإبداء الإعجاب بها. كما يوفر مكتبة مرئية وصوتية من كبار العلماء مثل ابن باز، ابن عثيمين، والشنقيطي، إلى جانب 27 كتاب تفسير وروابط مباشرة لموسوعة الدرر السنية.
أبرز الميزات:
البحث في الوقفات والمحتوى التفسيري.
تصدير الوقفات كملفات PDF أو Word.
تخصيص المظهر، الوضع الليلي، وتعديل الخطوط.
مشاركة التدبرات كلوحات جرافيك مع خلفيات مخصصة.
مكتبة تضم أكثر من 2,500 لوحة تدبرية جاهزة.
قناة يوتيوب تحتوي على أكثر من 2,200 مقطع مرئي حول التفسير والتدبر.""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 41,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/35_Study Quran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/35_Study Quran/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/35_Study Quran/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.tadarose_quran&hl=ar""",
            "app_store_link": """https://apps.apple.com/us/app/%D8%AA%D8%AF%D8%A7%D8%B1%D8%B3-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86/id1409992825""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """مؤسسة النبأ العظيم""",
            "developer_name_ar": """مؤسسة النبأ العظيم""",
            "developer_website": """https://alnpaa.com""",
            "categories": ['tafsir', 'mushaf'],
        },
        {
            "name_en": """The Holy Quran""",
            "name_ar": """القرآن الكريم""",
            "slug": """the-holy-quran""",
            "short_description_en": """The Quran in Virtual Reality""",
            "short_description_ar": """القرآن في الواقع الافتراضي""",
            "description_en": """Read the Quran in 3D with unique spiritual environments that enhance tranquility.
The Quran in Virtual Reality application provides a 3D Quran reading experience. It allows you to read the Quran in distinctive spiritual virtual environments, such as the Holy Kaaba and the Prophet’s Mosque, or even natural landscapes that inspire comfort and tranquility.""",
            "description_ar": """اقرأ القرآن الكريم بتقنية ثلاثية الأبعاد في بيئات روحانية فريدة تعزز السكينة.
تطبيق القرآن في الواقع الافتراضي يقدم تجربة لقراءة القرآن الكريم بتقنية ثلاثية الأبعاد. يسمح لك بقراءة القرآن في بيئات افتراضية روحانية مميزة، مثل الكعبة المشرفة والمسجد النبوي، أو حتى مناظر طبيعية تبعث الراحه والسكينة.""",
            "avg_rating": 3.7,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 42,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/13_The Holy Quran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/13_The Holy Quran/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/13_The Holy Quran/cover_photo_ar.png""",
            "google_play_link": """""",
            "app_store_link": """https://apps.apple.com/sa/app/the-holy-quran/id6667091349""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Maknon""",
            "developer_name_ar": """مكنون""",
            "developer_website": """https://maknon.org.sa""",
            "categories": ['mushaf', 'tools'],
        },
        {
            "name_en": """Ghareeb""",
            "name_ar": """غريب""",
            "slug": """ghareeb""",
            "short_description_en": """تعلم معاني القرآن الكريم، بأسلوب وسهل وممتع، يتناسب مع جميع الأعمار""",
            "short_description_ar": """تعلم معاني القرآن الكريم، بأسلوب وسهل وممتع، يتناسب مع جميع الأعمار""",
            "description_en": """تعلم معاني القرآن الكريم، بأسلوب وسهل وممتع، يتناسب مع جميع الأعمار.
سؤال وجواب
أكثر من 6000 سؤال لفهم معاني القرآن الكريم.
المتابعة
سيذكرك غريب على تعلم معاني كلمات جديدة يوميًا.
الإنجازات
كلما استمريت في التعلم وتقدمت في المستوى كلما حصلت على نقاط وجوائز وإنجازات أكثر.
شهادة إنجاز
احصل على شهادة إنجاز معتمدة من مركز تفسير بعد إنجازك لأي جزء.
برنامج غريب
مقاطع مرئية قصيرة لشرح معاني القرآن الكريم بتقديم الأستاذ الدكتور عبدالرحمن بن معاضة الشهري.""",
            "description_ar": """تعلم معاني القرآن الكريم، بأسلوب وسهل وممتع، يتناسب مع جميع الأعمار.
سؤال وجواب
أكثر من 6000 سؤال لفهم معاني القرآن الكريم.
المتابعة
سيذكرك غريب على تعلم معاني كلمات جديدة يوميًا.
الإنجازات
كلما استمريت في التعلم وتقدمت في المستوى كلما حصلت على نقاط وجوائز وإنجازات أكثر.
شهادة إنجاز
احصل على شهادة إنجاز معتمدة من مركز تفسير بعد إنجازك لأي جزء.
برنامج غريب
مقاطع مرئية قصيرة لشرح معاني القرآن الكريم بتقديم الأستاذ الدكتور عبدالرحمن بن معاضة الشهري.""",
            "avg_rating": 4.8,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 43,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/41_Ghareeb/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/41_Ghareeb/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/41_Ghareeb/cover_photo_ar.png""",
            "google_play_link": """https://play.google.com/store/apps/details?id=com.tafsir.ghareeb""",
            "app_store_link": """https://apps.apple.com/sa/app/%D8%BA%D8%B1%D9%8A%D8%A8-%D9%84%D9%85%D8%B9%D8%A7%D9%86%D9%8A-%D8%A7%D9%84%D9%82%D8%B1%D8%A2%D9%86-%D8%A7%D9%84%D9%83%D8%B1%D9%8A%D9%85/id1532650613""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Tafsir Center for Qur'anic Studies""",
            "developer_name_ar": """مركز تفسير للدراسات القرآنية""",
            "developer_website": """https://tafsir.net""",
            "categories": ['tools'],
        },
        {
            "name_en": """Ehfaz Al Quran""",
            "name_ar": """احفظ القرآن""",
            "slug": """ehfaz-al-quran""",
            "short_description_en": """Memorization of the Holy Quran using theLouh method""",
            "short_description_ar": """حفظ سور القرآن الكريم بطريقة الألواح""",
            "description_en": """EHFAZ app is designed to facilitate memorization of the Holy Quran Surahs “chapters” using theLouh “tablet” method. Each Quran Surah “chapter” of more than 6 Ayahs “verses” is divided into several 6-ayah tablets. Each Louh “tablet”is memorized in 4 phases. Each phase is composed of some sound clipsarranged in a hierarchy to facilitatelistening and repeating untilmemorization by the young, old, and non-Arab.""",
            "description_ar": """تطبيق احفظ مبني علي سهولة وتيسير حفظ سور القرآن الكريم بطريقة الألواح فكل سورة من سور القرآن تزيد عدد آياتها عن 6 آية مقسمة إلي عدة ألواح كل لوح 6 أية واللوح يتم حفظه علي 4 مراحل كل مرحلة عدة مقاطع صوتيه لنفس اللوح مرتبة بشكل هرمي يسهل سماعها وترديدها حتي يتم حفظها بطريقة سهلة للصغير والكبير والعربي والأعجمي.""",
            "avg_rating": 4.4,
            "review_count": 1000,
            "view_count": 5000,
            "sort_order": 44,
            "status": """published""",
            "featured": False,
            "application_icon": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/61_Ehfaz Al Quran/app_icon.png""",
            "main_image_en": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/61_Ehfaz Al Quran/cover_photo_ar.png""",
            "main_image_ar": """https://pub-e11717db663c469fb51c65995892b449.r2.dev/61_Ehfaz Al Quran/cover_photo_ar.png""",
            "google_play_link": """""",
            "app_store_link": """https://apps.apple.com/us/app/id1070807769?l=ar""",
            "app_gallery_link": """""",
            "platform": """cross_platform""",
            "developer_name": """Ealamy group""",
            "developer_name_ar": """شركة إعلامي""",
            "developer_website": """https://ealamy.com/""",
            "categories": ['memorize'],
        }
    ]


class Command(BaseCommand):
    help = 'Migrate all 44 Quran apps from extracted data source'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true',
                          help='Clear existing apps before loading')

    def handle(self, *args, **options):
        force = options['force']

        # Check existing data
        if force:
            self.stdout.write(self.style.WARNING('Clearing existing apps...'))
            App.objects.all().delete()

        # Get all apps data
        all_apps = get_all_apps_data()
        self.stdout.write(f'Found {len(all_apps)} apps to migrate')

        with transaction.atomic():
            # Create developers if they don't exist
            self.stdout.write('Creating developers...')
            developers_map = {}
            for app_data in all_apps:
                dev_name = app_data["developer_name"]
                if dev_name not in developers_map:
                    developer, created = Developer.objects.get_or_create(
                        name_en=dev_name,
                        defaults={
                            'name_ar': app_data["developer_name_ar"],
                            'website': app_data.get("developer_website") or '',
                            'logo_url': '',
                            'is_verified': True
                        }
                    )
                    developers_map[dev_name] = developer
                    if created:
                        self.stdout.write(f'  Created developer: {dev_name}')

            # Create categories if they don't exist
            self.stdout.write('Creating/updating categories...')
            category_names = {
                'accessibility': {'en': 'Accessibility', 'ar': 'إمكانية الوصول'},
                'audio': {'en': 'Audio', 'ar': 'صوتي'},
                'kids': {'en': 'Kids', 'ar': 'للأطفال'},
                'memorize': {'en': 'Memorization', 'ar': 'حفظ'},
                'mushaf': {'en': 'Mushaf', 'ar': 'المصحف'},
                'recite': {'en': 'Recitation', 'ar': 'تلاوة'},
                'riwayat': {'en': 'Riwayat', 'ar': 'روايات'},
                'tafsir': {'en': 'Tafsir', 'ar': 'تفسير'},
                'tajweed': {'en': 'Tajweed', 'ar': 'تجويد'},
                'tools': {'en': 'Tools', 'ar': 'أدوات'},
                'translations': {'en': 'Translations', 'ar': 'ترجمات'},
            }
            
            for app_data in all_apps:
                for cat_slug in app_data["categories"]:
                    cat_info = category_names.get(cat_slug, {'en': cat_slug.capitalize(), 'ar': cat_slug})
                    category, created = Category.objects.get_or_create(
                        slug=cat_slug.lower(),
                        defaults={
                            'name_en': cat_info['en'],
                            'name_ar': cat_info['ar'],
                            'description_en': f'{cat_info["en"]} applications',
                            'description_ar': f'تطبيقات {cat_info["ar"]}',
                            'sort_order': 0,
                            'is_active': True,
                        }
                    )
                    if created:
                        self.stdout.write(f'  Created category: {cat_slug}')

            # Create or update apps
            self.stdout.write('Migrating apps...')
            created = 0
            updated = 0

            for app_data in all_apps:
                # Get developer
                developer = developers_map.get(app_data["developer_name"])
                if not developer:
                    self.stdout.write(self.style.WARNING(f'  Developer not found for: {app_data["name_en"]}'))
                    continue

                # Get or create app
                app, app_created = App.objects.get_or_create(
                    slug=app_data["slug"],
                    defaults={
                        'name_en': app_data["name_en"],
                        'name_ar': app_data["name_ar"],
                        'short_description_en': app_data["short_description_en"],
                        'short_description_ar': app_data["short_description_ar"],
                        'description_en': app_data["description_en"],
                        'description_ar': app_data["description_ar"],
                        'avg_rating': app_data["avg_rating"],
                        'review_count': app_data["review_count"],
                        'view_count': app_data["view_count"],
                        'sort_order': app_data["sort_order"],
                        'status': app_data["status"],
                        'featured': app_data["featured"],
                        'application_icon': app_data["application_icon"],
                        'main_image_en': app_data["main_image_en"],
                        'main_image_ar': app_data["main_image_ar"],
                        'google_play_link': app_data["google_play_link"] or '',
                        'app_store_link': app_data["app_store_link"] or '',
                        'app_gallery_link': app_data.get("app_gallery_link") or '',
                        'platform': app_data["platform"],
                        'developer': developer,
                    }
                )

                # Update categories
                category_objs = []
                for cat_slug in app_data["categories"]:
                    category = Category.objects.filter(slug=cat_slug.lower()).first()
                    if category:
                        category_objs.append(category)
                app.categories.set(category_objs)

                if app_created:
                    created += 1
                    self.stdout.write(f'  Created app: {app.name_en}')
                else:
                    updated += 1
                    self.stdout.write(f'  Updated app: {app.name_en}')

        self.stdout.write(
            self.style.SUCCESS(
                f'\n✅ Migration completed! Created {created} apps, Updated {updated} apps'
            )
        )
